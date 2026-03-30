import type { JWK } from './types/common.js';

/**
 * Verifies a `Request-Signature` header (detached JWS per RFC 7797) over a raw request body.
 *
 * The header contains a detached JWT: `<base64url-header>..<base64url-signature>`
 * The `kid` in the JWT header identifies which key from `signingKeys` to use.
 * Only ES256 (ECDSA P-256) is supported, matching the UCP spec requirement.
 *
 * @returns `true` if the signature is valid, `false` otherwise.
 *
 * @example
 * ```typescript
 * const valid = await verifyRequestSignature(
 *   rawBody,
 *   req.headers['request-signature'],
 *   client.signingKeys,
 * );
 * if (!valid) throw new Error('Invalid webhook signature');
 * ```
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
    const decoded = new TextDecoder().decode(base64urlDecode(headerB64));
    header = JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return false;
  }

  if (typeof header['alg'] !== 'undefined' && header['alg'] !== 'ES256') return false;

  const kid = typeof header['kid'] === 'string' ? header['kid'] : undefined;
  const key = findKey(signingKeys, kid);
  if (!key) return false;

  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      'jwk',
      key as unknown as JsonWebKey,
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

function findKey(signingKeys: readonly JWK[], kid: string | undefined): JWK | undefined {
  if (kid !== undefined) return signingKeys.find((k) => k.kid === kid);
  return signingKeys.find((k) => k.alg === 'ES256' || k.crv === 'P-256');
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
