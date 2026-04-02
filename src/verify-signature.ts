import { JWKSchema } from './schemas.js';
import type { JWK } from './types/common.js';

/**
 * Verifies a `Request-Signature` header (detached JWS per RFC 7797) over a raw request body.
 *
 * Per UCP spec, the JWT header MUST include a `kid` claim identifying the signing key.
 * Returns `false` if `kid` is absent — do not fall back to guessing.
 *
 * @returns `true` if the signature is valid, `false` for any verification failure.
 */
export async function verifyRequestSignature(
  body: string,
  signature: string,
  signingKeys: readonly JWK[],
): Promise<boolean> {
  const parts = signature.split('.');
  // Detached JWS: exactly 3 parts, middle (payload) is empty
  if (parts.length !== 3 || parts[1] !== '') return false;

  const [headerB64, , sigB64] = parts as [string, string, string];

  let header: Record<string, unknown>;
  try {
    header = JSON.parse(new TextDecoder().decode(base64urlDecode(headerB64))) as Record<
      string,
      unknown
    >;
  } catch {
    return false;
  }

  if (typeof header['alg'] !== 'undefined' && header['alg'] !== 'ES256') return false;

  // kid is required per UCP spec — reject if absent
  if (typeof header['kid'] !== 'string') return false;
  const kid = header['kid'];

  const key = signingKeys.find((k) => k.kid === kid);
  if (!key) return false;

  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      'jwk',
      key as JsonWebKey,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
  } catch {
    return false;
  }

  let sigBytes: Uint8Array<ArrayBuffer>;
  try {
    sigBytes = base64urlDecode(sigB64);
  } catch {
    return false;
  }

  // Signing input: base64url(header) + "." + base64url(body)
  const signingInput = `${headerB64}.${Buffer.from(body).toString('base64url')}`;

  try {
    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      sigBytes,
      new TextEncoder().encode(signingInput),
    );
  } catch {
    return false;
  }
}

// ─── WebhookVerifier ─────────────────────────────────────────────────────────

/**
 * A stateful verifier that fetches signing keys from a business's UCP discovery
 * profile and caches them for subsequent verifications.
 *
 * Keys are re-fetched from `/.well-known/ucp` when an unknown `kid` is encountered,
 * supporting zero-downtime key rotation as defined by the UCP spec.
 */
export interface WebhookVerifier {
  /**
   * Verify a webhook `Request-Signature` header against the business's current
   * signing keys. Automatically re-fetches the discovery profile on `kid` cache miss.
   */
  readonly verify: (body: string, signature: string) => Promise<boolean>;
}

/**
 * Creates a {@link WebhookVerifier} bound to a specific business's UCP gateway.
 *
 * Signing keys are lazily loaded from `<gatewayUrl>/.well-known/ucp` on the first call
 * and cached by `kid`. A cache miss triggers a re-fetch to support key rotation.
 *
 * @example
 * ```typescript
 * import { createWebhookVerifier } from '@omnixhq/ucp-client';
 *
 * const verifier = createWebhookVerifier('https://store.example.com');
 *
 * // In your webhook handler:
 * const valid = await verifier.verify(rawBody, req.headers['request-signature']);
 * if (!valid) return res.status(401).send('Invalid signature');
 * ```
 */
export function createWebhookVerifier(gatewayUrl: string): WebhookVerifier {
  const baseUrl = gatewayUrl.replace(/\/+$/, '');
  const keyCache = new Map<string, JWK>();
  let fetched = false;
  // Single in-flight promise prevents concurrent fetches from hammering the endpoint
  // and avoids TOCTOU races that could leave the cache partially cleared.
  let loadingPromise: Promise<void> | null = null;

  async function loadKeys(): Promise<void> {
    const res = await fetch(`${baseUrl}/.well-known/ucp`);
    if (!res.ok) {
      // Mark fetched so callers don't retry on every verify() call while the endpoint is down.
      fetched = true;
      return;
    }
    let profile: unknown;
    try {
      profile = await res.json();
    } catch {
      fetched = true;
      return;
    }
    const rawKeys = (profile as Record<string, unknown>)['signing_keys'];
    if (!Array.isArray(rawKeys)) {
      fetched = true;
      return;
    }
    keyCache.clear();
    for (const item of rawKeys) {
      const parsed = JWKSchema.safeParse(item);
      if (parsed.success && typeof parsed.data.kid === 'string') {
        keyCache.set(parsed.data.kid, parsed.data);
      }
    }
    fetched = true;
  }

  function ensureKeys(): Promise<void> {
    loadingPromise ??= loadKeys().finally(() => {
      loadingPromise = null;
    });
    return loadingPromise;
  }

  return {
    async verify(body: string, signature: string): Promise<boolean> {
      const kid = extractKid(signature);
      if (kid === null) return false;

      if (!fetched) await ensureKeys();

      // Re-fetch on kid miss to support key rotation (new key added to signing_keys)
      if (!keyCache.has(kid)) await ensureKeys();

      const key = keyCache.get(kid);
      if (!key) return false;

      return verifyRequestSignature(body, signature, [key]);
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extracts the `kid` from a detached JWS header without full verification. */
function extractKid(signature: string): string | null {
  const parts = signature.split('.');
  if (parts.length !== 3 || parts[1] !== '') return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(base64urlDecode(parts[0]!))) as Record<
      string,
      unknown
    >;
    return typeof header['kid'] === 'string' ? header['kid'] : null;
  } catch {
    return null;
  }
}

function base64urlDecode(b64url: string): Uint8Array<ArrayBuffer> {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binaryStr = atob(padded);
  const result = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    result[i] = binaryStr.charCodeAt(i);
  }
  return result;
}
