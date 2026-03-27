import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IdentityLinkingCapability } from './identity-linking.js';
import { UCPOAuthError } from '../errors.js';
import type { OAuthServerMetadata } from '../types/identity-linking.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const METADATA: OAuthServerMetadata = {
  issuer: 'https://merchant.example.com',
  authorization_endpoint: 'https://merchant.example.com/oauth2/authorize',
  token_endpoint: 'https://merchant.example.com/oauth2/token',
  revocation_endpoint: 'https://merchant.example.com/oauth2/revoke',
  scopes_supported: ['ucp:scopes:checkout_session'],
  response_types_supported: ['code'],
  grant_types_supported: ['authorization_code', 'refresh_token'],
  token_endpoint_auth_methods_supported: ['client_secret_basic'],
};

function mockOk(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function mockError(status: number) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  });
}

let capability: IdentityLinkingCapability;

beforeEach(() => {
  mockFetch.mockReset();
  capability = new IdentityLinkingCapability(METADATA);
});

describe('IdentityLinkingCapability', () => {
  describe('getAuthorizationUrl', () => {
    it('builds URL with required params', () => {
      const url = capability.getAuthorizationUrl({
        client_id: 'client_123',
        redirect_uri: 'https://platform.example.com/callback',
      });

      expect(url).toContain('response_type=code');
      expect(url).toContain('client_id=client_123');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('scope=ucp');
    });

    it('includes state when provided', () => {
      const url = capability.getAuthorizationUrl({
        client_id: 'client_123',
        redirect_uri: 'https://platform.example.com/callback',
        state: 'csrf_abc',
      });

      expect(url).toContain('state=csrf_abc');
    });

    it('uses custom scope when provided', () => {
      const url = capability.getAuthorizationUrl({
        client_id: 'client_123',
        redirect_uri: 'https://platform.example.com/callback',
        scope: 'custom:scope',
      });

      expect(url).toContain('scope=custom');
    });

    it('omits state when not provided', () => {
      const url = capability.getAuthorizationUrl({
        client_id: 'client_123',
        redirect_uri: 'https://platform.example.com/callback',
      });

      expect(url).not.toContain('state=');
    });
  });

  describe('exchangeCode', () => {
    it('exchanges code for tokens', async () => {
      mockOk({
        access_token: 'access_abc',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh_xyz',
      });

      const result = await capability.exchangeCode({
        client_id: 'client_123',
        client_secret: 'secret_456',
        code: 'auth_code_789',
        redirect_uri: 'https://platform.example.com/callback',
      });

      expect(result.access_token).toBe('access_abc');
      expect(result.token_type).toBe('Bearer');
      expect(result.expires_in).toBe(3600);
      expect(result.refresh_token).toBe('refresh_xyz');

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://merchant.example.com/oauth2/token');
      expect(init.method).toBe('POST');
      expect(init.headers).toHaveProperty('Authorization');
      const body = init.body as string;
      expect(body).toContain('grant_type=authorization_code');
      expect(body).toContain('code=auth_code_789');
    });

    it('sends Basic auth header', async () => {
      mockOk({ access_token: 'tok', token_type: 'Bearer' });

      await capability.exchangeCode({
        client_id: 'my_id',
        client_secret: 'my_secret',
        code: 'code',
        redirect_uri: 'https://example.com/cb',
      });

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      const expected = `Basic ${Buffer.from('my_id:my_secret').toString('base64')}`;
      expect(headers['Authorization']).toBe(expected);
    });

    it('throws UCPOAuthError on failure', async () => {
      mockError(401);

      await expect(
        capability.exchangeCode({
          client_id: 'client_123',
          client_secret: 'secret_456',
          code: 'bad_code',
          redirect_uri: 'https://example.com/cb',
        }),
      ).rejects.toThrow(UCPOAuthError);
    });

    it('throws UCPOAuthError on invalid response shape', async () => {
      mockOk({ not_a_token: true });

      await expect(
        capability.exchangeCode({
          client_id: 'client_123',
          client_secret: 'secret_456',
          code: 'code',
          redirect_uri: 'https://example.com/cb',
        }),
      ).rejects.toThrow(UCPOAuthError);
    });
  });

  describe('refreshToken', () => {
    it('refreshes an access token', async () => {
      mockOk({
        access_token: 'new_access',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      const result = await capability.refreshToken({
        client_id: 'client_123',
        client_secret: 'secret_456',
        refresh_token: 'refresh_xyz',
      });

      expect(result.access_token).toBe('new_access');

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = init.body as string;
      expect(body).toContain('grant_type=refresh_token');
      expect(body).toContain('refresh_token=refresh_xyz');
    });

    it('throws UCPOAuthError on failure', async () => {
      mockError(400);

      await expect(
        capability.refreshToken({
          client_id: 'client_123',
          client_secret: 'secret_456',
          refresh_token: 'expired_token',
        }),
      ).rejects.toThrow(UCPOAuthError);
    });
  });

  describe('revokeToken', () => {
    it('revokes an access token', async () => {
      mockOk({});

      await capability.revokeToken({
        client_id: 'client_123',
        client_secret: 'secret_456',
        token: 'access_abc',
        token_type_hint: 'access_token',
      });

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://merchant.example.com/oauth2/revoke');
      expect(init.method).toBe('POST');
      const body = init.body as string;
      expect(body).toContain('token=access_abc');
      expect(body).toContain('token_type_hint=access_token');
    });

    it('works without token_type_hint', async () => {
      mockOk({});

      await capability.revokeToken({
        client_id: 'client_123',
        client_secret: 'secret_456',
        token: 'some_token',
      });

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = init.body as string;
      expect(body).not.toContain('token_type_hint');
    });

    it('throws UCPOAuthError on failure', async () => {
      mockError(500);

      await expect(
        capability.revokeToken({
          client_id: 'client_123',
          client_secret: 'secret_456',
          token: 'bad_token',
        }),
      ).rejects.toThrow(UCPOAuthError);
    });
  });

  describe('getMetadata', () => {
    it('returns the OAuth server metadata', () => {
      const meta = capability.getMetadata();
      expect(meta.issuer).toBe('https://merchant.example.com');
      expect(meta.authorization_endpoint).toContain('/oauth2/authorize');
      expect(meta.token_endpoint).toContain('/oauth2/token');
      expect(meta.revocation_endpoint).toContain('/oauth2/revoke');
    });
  });
});
