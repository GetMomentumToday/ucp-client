import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartCapability } from './cart.js';
import { HttpClient } from '../http.js';
import { UCPError, UCPIdempotencyConflictError } from '../errors.js';

const MINIMAL_CART = {
  ucp: { version: '2026-01-23', status: 'success' },
  id: 'cart_123',
  line_items: [],
  currency: 'USD',
  totals: [],
  messages: [],
};

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockOk(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  });
}

function mockError(status: number, body: unknown = {}) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  });
}

function mockNetworkFailure() {
  mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
}

let http: HttpClient;
let capability: CartCapability;

beforeEach(() => {
  mockFetch.mockReset();
  http = new HttpClient({
    gatewayUrl: 'https://gateway.example.com',
    agentProfileUrl: 'https://agent.example.com/profile',
    ucpVersion: '2024-01-01',
  });
  capability = new CartCapability(http);
});

describe('CartCapability.create', () => {
  it('sends POST /cart with payload and returns validated cart', async () => {
    mockOk(MINIMAL_CART);
    const payload = { line_items: [{ item: { id: 'prod_1' }, quantity: 2 }] };
    const cart = await capability.create(payload);
    expect(cart.id).toBe('cart_123');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/cart')).toBe(true);
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body['line_items']).toEqual(payload.line_items);
  });

  it('sends idempotency-key header on POST', async () => {
    mockOk(MINIMAL_CART);
    await capability.create({ line_items: [] });
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['idempotency-key']).toBeDefined();
  });

  it('throws UCPError on 400', async () => {
    mockError(400);
    await expect(capability.create({ line_items: [] })).rejects.toBeInstanceOf(UCPError);
  });

  it('throws UCPIdempotencyConflictError on 409', async () => {
    mockError(409);
    await expect(capability.create({ line_items: [] })).rejects.toBeInstanceOf(
      UCPIdempotencyConflictError,
    );
  });

  it('throws UCPError on 500', async () => {
    mockError(500);
    await expect(capability.create({ line_items: [] })).rejects.toBeInstanceOf(UCPError);
  });

  it('propagates network errors', async () => {
    mockNetworkFailure();
    await expect(capability.create({ line_items: [] })).rejects.toThrow('Failed to fetch');
  });
});

describe('CartCapability.get', () => {
  it('sends GET /cart/:id and returns validated cart', async () => {
    mockOk(MINIMAL_CART);
    const cart = await capability.get('cart_123');
    expect(cart.id).toBe('cart_123');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/cart/cart_123')).toBe(true);
    expect(init.method).toBe('GET');
  });

  it('URL-encodes the cart ID', async () => {
    mockOk({ ...MINIMAL_CART, id: 'cart/special' });
    await capability.get('cart/special');
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/cart/cart%2Fspecial');
  });

  it('does not send idempotency-key on GET', async () => {
    mockOk(MINIMAL_CART);
    await capability.get('cart_123');
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['idempotency-key']).toBeUndefined();
  });

  it('falls back to raw data on schema validation failure', async () => {
    const malformed = { id: 'cart_123', unexpected: 'shape' };
    mockOk(malformed);
    const cart = await capability.get('cart_123');
    expect((cart as Record<string, unknown>)['id']).toBe('cart_123');
  });

  it('throws UCPError on 404', async () => {
    mockError(404);
    await expect(capability.get('cart_missing')).rejects.toBeInstanceOf(UCPError);
  });

  it('propagates network errors', async () => {
    mockNetworkFailure();
    await expect(capability.get('cart_123')).rejects.toThrow('Failed to fetch');
  });
});

describe('CartCapability.update', () => {
  it('sends PUT /cart/:id with payload and returns validated cart', async () => {
    mockOk(MINIMAL_CART);
    const payload = { line_items: [{ item: { id: 'prod_1' }, quantity: 3 }] };
    const cart = await capability.update('cart_123', payload);
    expect(cart.id).toBe('cart_123');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/cart/cart_123')).toBe(true);
    expect(init.method).toBe('PUT');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body['line_items']).toEqual(payload.line_items);
  });

  it('URL-encodes the cart ID on update', async () => {
    mockOk(MINIMAL_CART);
    await capability.update('cart/123', {});
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/cart/cart%2F123');
  });

  it('sends idempotency-key header on PUT', async () => {
    mockOk(MINIMAL_CART);
    await capability.update('cart_123', {});
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['idempotency-key']).toBeDefined();
  });

  it('throws UCPError with gateway message on structured error', async () => {
    mockError(422, {
      messages: [{ type: 'error', code: 'INVALID_QUANTITY', content: 'Quantity must be > 0' }],
    });
    const err = await capability.update('cart_123', {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UCPError);
    expect((err as UCPError).code).toBe('INVALID_QUANTITY');
  });

  it('throws UCPIdempotencyConflictError on 409', async () => {
    mockError(409);
    await expect(capability.update('cart_123', {})).rejects.toBeInstanceOf(
      UCPIdempotencyConflictError,
    );
  });

  it('throws UCPError on 404', async () => {
    mockError(404);
    await expect(capability.update('cart_missing', {})).rejects.toBeInstanceOf(UCPError);
  });

  it('propagates network errors', async () => {
    mockNetworkFailure();
    await expect(capability.update('cart_123', {})).rejects.toThrow('Failed to fetch');
  });
});
