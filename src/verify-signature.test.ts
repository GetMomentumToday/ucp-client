import { describe, it, expect, beforeAll } from 'vitest';
import { verifyRequestSignature } from './verify-signature.js';
import type { JWK } from './types/common.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function generateKeyPair(): Promise<{ publicJWK: JWK; privateKey: CryptoKey }> {
  const { publicKey, privateKey } = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const exported = await crypto.subtle.exportKey('jwk', publicKey);
  const publicJWK: JWK = {
    kty: exported.kty ?? 'EC',
    kid: 'test-key-1',
    use: 'sig',
    alg: 'ES256',
    crv: exported.crv,
    x: exported.x,
    y: exported.y,
  };
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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('verifyRequestSignature', () => {
  let publicJWK: JWK;
  let privateKey: CryptoKey;
  const BODY = JSON.stringify({ event: 'order.shipped', order_id: 'ord_123' });

  beforeAll(async () => {
    ({ publicJWK, privateKey } = await generateKeyPair());
  });

  it('returns true for a valid signature', async () => {
    const sig = await signDetachedJWT(BODY, privateKey, 'test-key-1');
    const valid = await verifyRequestSignature(BODY, sig, [publicJWK]);
    expect(valid).toBe(true);
  });

  it('returns false when body is tampered', async () => {
    const sig = await signDetachedJWT(BODY, privateKey, 'test-key-1');
    const valid = await verifyRequestSignature('{"tampered":true}', sig, [publicJWK]);
    expect(valid).toBe(false);
  });

  it('returns false when signature is tampered', async () => {
    const sig = await signDetachedJWT(BODY, privateKey, 'test-key-1');
    const parts = sig.split('.');
    const tampered = `${parts[0]}..AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    const valid = await verifyRequestSignature(BODY, tampered, [publicJWK]);
    expect(valid).toBe(false);
  });

  it('returns false when no matching key found', async () => {
    const sig = await signDetachedJWT(BODY, privateKey, 'unknown-kid');
    const valid = await verifyRequestSignature(BODY, sig, [publicJWK]);
    expect(valid).toBe(false);
  });

  it('returns false for malformed signature (not 3 parts)', async () => {
    const valid = await verifyRequestSignature(BODY, 'not-a-jwt', [publicJWK]);
    expect(valid).toBe(false);
  });

  it('returns false for non-detached JWT (payload not empty)', async () => {
    const valid = await verifyRequestSignature(BODY, 'header.payload.signature', [publicJWK]);
    expect(valid).toBe(false);
  });

  it('returns false when signingKeys is empty', async () => {
    const sig = await signDetachedJWT(BODY, privateKey, 'test-key-1');
    const valid = await verifyRequestSignature(BODY, sig, []);
    expect(valid).toBe(false);
  });

  it('finds key by kid when multiple keys present', async () => {
    const other = await generateKeyPair();
    const otherJWK = { ...other.publicJWK, kid: 'other-key' };
    const sig = await signDetachedJWT(BODY, privateKey, 'test-key-1');
    const valid = await verifyRequestSignature(BODY, sig, [otherJWK, publicJWK]);
    expect(valid).toBe(true);
  });

  it('returns false for unsupported algorithm in header', async () => {
    const header = JSON.stringify({ alg: 'RS256', kid: 'test-key-1' });
    const headerB64 = Buffer.from(header).toString('base64url');
    const sig = buildDetachedJWT(headerB64, 'fakesig');
    const valid = await verifyRequestSignature(BODY, sig, [publicJWK]);
    expect(valid).toBe(false);
  });
});
