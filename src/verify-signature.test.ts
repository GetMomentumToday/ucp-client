import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { verifyRequestSignature, createWebhookVerifier } from './verify-signature.js';
import type { JWK } from './types/common.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function generateKeyPair(): Promise<{ publicJWK: JWK; privateKey: CryptoKey }> {
  const { publicKey, privateKey } = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const exported = await crypto.subtle.exportKey('jwk', publicKey);
  const publicJWK: JWK = { ...exported, kid: 'test-key-1' };
  return { publicJWK, privateKey };
}

function buildDetachedJWT(headerB64: string, sigB64: string): string {
  return `${headerB64}..${sigB64}`;
}

async function signDetachedJWT(body: string, privateKey: CryptoKey, kid: string): Promise<string> {
  const header = JSON.stringify({ alg: 'ES256', kid });
  const headerB64 = Buffer.from(header).toString('base64url');
  const bodyB64 = Buffer.from(body).toString('base64url');
  const signingInput = `${headerB64}.${bodyB64}`;
  const sigBytes = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput),
  );
  const sigB64 = Buffer.from(sigBytes).toString('base64url');
  return buildDetachedJWT(headerB64, sigB64);
}

// ─── verifyRequestSignature ───────────────────────────────────────────────────

describe('verifyRequestSignature', () => {
  let publicJWK: JWK;
  let privateKey: CryptoKey;
  const BODY = JSON.stringify({ event: 'order.shipped', order_id: 'ord_123' });

  beforeAll(async () => {
    ({ publicJWK, privateKey } = await generateKeyPair());
  });

  it('returns true for a valid signature', async () => {
    const sig = await signDetachedJWT(BODY, privateKey, 'test-key-1');
    expect(await verifyRequestSignature(BODY, sig, [publicJWK])).toBe(true);
  });

  it('returns false when body is tampered', async () => {
    const sig = await signDetachedJWT(BODY, privateKey, 'test-key-1');
    expect(await verifyRequestSignature('{"tampered":true}', sig, [publicJWK])).toBe(false);
  });

  it('returns false when signature bytes are tampered', async () => {
    const sig = await signDetachedJWT(BODY, privateKey, 'test-key-1');
    const tampered = `${sig.split('.')[0]}..AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    expect(await verifyRequestSignature(BODY, tampered, [publicJWK])).toBe(false);
  });

  it('returns false when kid is absent from JWT header (required per spec)', async () => {
    const header = JSON.stringify({ alg: 'ES256' }); // no kid
    const headerB64 = Buffer.from(header).toString('base64url');
    const sig = buildDetachedJWT(headerB64, 'fakesig');
    expect(await verifyRequestSignature(BODY, sig, [publicJWK])).toBe(false);
  });

  it('returns false when kid does not match any key', async () => {
    const sig = await signDetachedJWT(BODY, privateKey, 'unknown-kid');
    expect(await verifyRequestSignature(BODY, sig, [publicJWK])).toBe(false);
  });

  it('returns false for malformed signature (not 3 parts)', async () => {
    expect(await verifyRequestSignature(BODY, 'not-a-jwt', [publicJWK])).toBe(false);
  });

  it('returns false for non-detached JWT (payload not empty)', async () => {
    expect(await verifyRequestSignature(BODY, 'header.payload.signature', [publicJWK])).toBe(false);
  });

  it('returns false when signingKeys is empty', async () => {
    const sig = await signDetachedJWT(BODY, privateKey, 'test-key-1');
    expect(await verifyRequestSignature(BODY, sig, [])).toBe(false);
  });

  it('finds correct key by kid when multiple keys present', async () => {
    const other = await generateKeyPair();
    const otherJWK = { ...other.publicJWK, kid: 'other-key' };
    const sig = await signDetachedJWT(BODY, privateKey, 'test-key-1');
    expect(await verifyRequestSignature(BODY, sig, [otherJWK, publicJWK])).toBe(true);
  });

  it('returns false for unsupported algorithm', async () => {
    const header = JSON.stringify({ alg: 'RS256', kid: 'test-key-1' });
    const sig = buildDetachedJWT(Buffer.from(header).toString('base64url'), 'fakesig');
    expect(await verifyRequestSignature(BODY, sig, [publicJWK])).toBe(false);
  });
});

// ─── createWebhookVerifier ────────────────────────────────────────────────────

describe('createWebhookVerifier', () => {
  const mockFetch = vi.fn();
  vi.stubGlobal('fetch', mockFetch);

  let publicJWK: JWK;
  let privateKey: CryptoKey;
  const BODY = JSON.stringify({ event: 'order.created', order_id: 'ord_456' });
  const GATEWAY = 'https://store.example.com';

  beforeAll(async () => {
    ({ publicJWK, privateKey } = await generateKeyPair());
  });

  beforeEach(() => {
    mockFetch.mockReset();
  });

  function mockProfile(keys: JWK[]) {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ucp: { version: '2026-01-23' }, signing_keys: keys }),
    });
  }

  it('verifies a valid signature after fetching keys from profile', async () => {
    mockProfile([publicJWK]);
    const verifier = createWebhookVerifier(GATEWAY);
    const sig = await signDetachedJWT(BODY, privateKey, 'test-key-1');
    expect(await verifier.verify(BODY, sig)).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(`${GATEWAY}/.well-known/ucp`);
  });

  it('returns false when signature is invalid', async () => {
    mockProfile([publicJWK]);
    const verifier = createWebhookVerifier(GATEWAY);
    const sig = await signDetachedJWT(BODY, privateKey, 'test-key-1');
    expect(await verifier.verify('{"tampered":true}', sig)).toBe(false);
  });

  it('re-fetches profile on kid cache miss (key rotation)', async () => {
    const rotated = await generateKeyPair();
    const rotatedJWK = { ...rotated.publicJWK, kid: 'rotated-key' };

    mockProfile([publicJWK]); // initial fetch — old key only
    mockProfile([publicJWK, rotatedJWK]); // re-fetch — new key added

    const verifier = createWebhookVerifier(GATEWAY);

    // Warm the cache with the old key
    const oldSig = await signDetachedJWT(BODY, privateKey, 'test-key-1');
    expect(await verifier.verify(BODY, oldSig)).toBe(true);

    // New key — triggers re-fetch
    const newSig = await signDetachedJWT(BODY, rotated.privateKey, 'rotated-key');
    expect(await verifier.verify(BODY, newSig)).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns false when kid is absent from signature', async () => {
    mockProfile([publicJWK]);
    const verifier = createWebhookVerifier(GATEWAY);
    const header = JSON.stringify({ alg: 'ES256' }); // no kid
    const sig = buildDetachedJWT(Buffer.from(header).toString('base64url'), 'fakesig');
    expect(await verifier.verify(BODY, sig)).toBe(false);
  });

  it('returns false when profile fetch always fails', async () => {
    // Use mockResolvedValue (not Once) so both the initial load and kid-miss
    // re-fetch attempts also fail.
    mockFetch.mockResolvedValue({ ok: false, status: 503 });
    const verifier = createWebhookVerifier(GATEWAY);
    const sig = await signDetachedJWT(BODY, privateKey, 'test-key-1');
    expect(await verifier.verify(BODY, sig)).toBe(false);
  });

  it('caches keys — only fetches profile once for repeated verifications', async () => {
    mockProfile([publicJWK]);
    const verifier = createWebhookVerifier(GATEWAY);
    const sig = await signDetachedJWT(BODY, privateKey, 'test-key-1');

    await verifier.verify(BODY, sig);
    await verifier.verify(BODY, sig);
    await verifier.verify(BODY, sig);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
