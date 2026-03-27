import { z } from 'zod';
import { UCPOAuthError } from '../errors.js';
import type {
  OAuthServerMetadata,
  AuthorizationParams,
  TokenResponse,
  TokenExchangeParams,
  TokenRefreshParams,
  TokenRevokeParams,
} from '../types/identity-linking.js';

const TokenResponseSchema = z
  .object({
    access_token: z.string(),
    token_type: z.string(),
    expires_in: z.number().optional(),
    refresh_token: z.string().optional(),
    scope: z.string().optional(),
  })
  .passthrough();

export class IdentityLinkingCapability {
  constructor(private readonly metadata: OAuthServerMetadata) {}

  getAuthorizationUrl(params: AuthorizationParams): string {
    const url = new URL(this.metadata.authorization_endpoint);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', params.client_id);
    url.searchParams.set('redirect_uri', params.redirect_uri);
    url.searchParams.set('scope', params.scope ?? 'ucp:scopes:checkout_session');
    if (params.state !== undefined) {
      url.searchParams.set('state', params.state);
    }
    return url.toString();
  }

  async exchangeCode(params: TokenExchangeParams): Promise<TokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: params.redirect_uri,
    });

    return this.tokenRequest(params.client_id, params.client_secret, body);
  }

  async refreshToken(params: TokenRefreshParams): Promise<TokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: params.refresh_token,
    });

    return this.tokenRequest(params.client_id, params.client_secret, body);
  }

  async revokeToken(params: TokenRevokeParams): Promise<void> {
    const body = new URLSearchParams({ token: params.token });
    if (params.token_type_hint !== undefined) {
      body.set('token_type_hint', params.token_type_hint);
    }

    const res = await fetch(this.metadata.revocation_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: encodeBasicAuth(params.client_id, params.client_secret),
      },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new UCPOAuthError(`Token revocation failed: ${res.status}`, res.status);
    }
  }

  getMetadata(): Readonly<OAuthServerMetadata> {
    return this.metadata;
  }

  private async tokenRequest(
    clientId: string,
    clientSecret: string,
    body: URLSearchParams,
  ): Promise<TokenResponse> {
    const res = await fetch(this.metadata.token_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: encodeBasicAuth(clientId, clientSecret),
      },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new UCPOAuthError(`Token exchange failed with status ${res.status}`, res.status);
    }

    const raw: unknown = await res.json();
    const parsed = TokenResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new UCPOAuthError(`Invalid token response: ${parsed.error.message}`, res.status);
    }

    return parsed.data as TokenResponse;
  }
}

function encodeBasicAuth(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}
