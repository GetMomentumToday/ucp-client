export interface OAuthServerMetadata {
  readonly issuer: string;
  readonly authorization_endpoint: string;
  readonly token_endpoint: string;
  readonly revocation_endpoint: string;
  readonly scopes_supported: readonly string[];
  readonly response_types_supported: readonly string[];
  readonly grant_types_supported: readonly string[];
  readonly token_endpoint_auth_methods_supported: readonly string[];
  readonly service_documentation?: string;
}

export interface AuthorizationParams {
  readonly client_id: string;
  readonly redirect_uri: string;
  readonly scope?: string;
  readonly state?: string;
}

export interface TokenResponse {
  readonly access_token: string;
  readonly token_type: string;
  readonly expires_in?: number;
  readonly refresh_token?: string;
  readonly scope?: string;
}

export interface TokenExchangeParams {
  readonly client_id: string;
  readonly client_secret: string;
  readonly code: string;
  readonly redirect_uri: string;
}

export interface TokenRefreshParams {
  readonly client_id: string;
  readonly client_secret: string;
  readonly refresh_token: string;
}

export interface TokenRevokeParams {
  readonly client_id: string;
  readonly client_secret: string;
  readonly token: string;
  readonly token_type_hint?: 'access_token' | 'refresh_token';
}
