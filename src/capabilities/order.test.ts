import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderCapability } from './order.js';
import { HttpClient } from '../http.js';
import { UCPError, UCPIdempotencyConflictError } from '../errors.js';

const MINIMAL_ORDER = {
  id: 'ord_123',
  checkout_id: 'chk_456',
  permalink_url: 'https://store.example.com/orders/ord_123',
  ucp: { version: '2024-01-01' },
  line_items: [],
  fulfillment: {},
  totals: [],
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
let capability: OrderCapability;

beforeEach(() => {
  mockFetch.mockReset();
  http = new HttpClient({
    gatewayUrl: 'https://gateway.example.com',
    agentProfileUrl: 'https://agent.example.com/profile',
    ucpVersion: '2024-01-01',
  });
  capability = new OrderCapability(http);
});

describe('OrderCapability.get', () => {
  it('sends GET /orders/:id and returns validated order', async () => {
    mockOk(MINIMAL_ORDER);
    const order = await capability.get('ord_123');
    expect(order.id).toBe('ord_123');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/orders/ord_123')).toBe(true);
    expect(init.method).toBe('GET');
  });

  it('URL-encodes the order ID', async () => {
    mockOk({ ...MINIMAL_ORDER, id: 'ord/with/slashes' });
    await capability.get('ord/with/slashes');
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/orders/ord%2Fwith%2Fslashes');
  });

  it('does not send an idempotency-key header on GET', async () => {
    mockOk(MINIMAL_ORDER);
    await capability.get('ord_123');
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['idempotency-key']).toBeUndefined();
  });

  it('falls back to raw data when response fails schema validation', async () => {
    const malformed = { id: 'ord_123', unexpected: 'shape' };
    mockOk(malformed);
    // validate() logs a warning and returns raw data rather than throwing
    const order = await capability.get('ord_123');
    expect((order as Record<string, unknown>)['id']).toBe('ord_123');
  });

  it('throws UCPError on 404', async () => {
    mockError(404);
    await expect(capability.get('ord_missing')).rejects.toBeInstanceOf(UCPError);
  });

  it('throws UCPError on 500', async () => {
    mockError(500);
    await expect(capability.get('ord_123')).rejects.toBeInstanceOf(UCPError);
  });

  it('throws UCPError with gateway message on structured error response', async () => {
    mockError(404, {
      messages: [{ type: 'error', code: 'ORDER_NOT_FOUND', content: 'Order not found' }],
    });
    const err = await capability.get('ord_123').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UCPError);
    expect((err as UCPError).code).toBe('ORDER_NOT_FOUND');
  });

  it('propagates network errors', async () => {
    mockNetworkFailure();
    await expect(capability.get('ord_123')).rejects.toThrow('Failed to fetch');
  });
});

describe('OrderCapability.update', () => {
  it('sends PUT /orders/:id with payload and returns validated order', async () => {
    mockOk(MINIMAL_ORDER);
    const order = await capability.update('ord_123', { fulfillment: { status: 'shipped' } });
    expect(order.id).toBe('ord_123');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/orders/ord_123')).toBe(true);
    expect(init.method).toBe('PUT');
    const sentBody = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(sentBody['fulfillment']).toEqual({ status: 'shipped' });
  });

  it('URL-encodes the order ID on update', async () => {
    mockOk({ ...MINIMAL_ORDER, id: 'ord/123' });
    await capability.update('ord/123', {});
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/orders/ord%2F123');
  });

  it('sends empty payload when no fields provided', async () => {
    mockOk(MINIMAL_ORDER);
    await capability.update('ord_123', {});
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({});
  });

  it('sends adjustments payload', async () => {
    mockOk(MINIMAL_ORDER);
    const adjustments = [{ type: 'refund', amount: 1000 }];
    await capability.update('ord_123', { adjustments });
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const sentBody = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(sentBody['adjustments']).toEqual(adjustments);
  });

  it('sends both fulfillment and adjustments together', async () => {
    mockOk(MINIMAL_ORDER);
    const payload = {
      fulfillment: { status: 'shipped' },
      adjustments: [{ type: 'refund', amount: 500 }],
    };
    await capability.update('ord_123', payload);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const sentBody = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(sentBody['fulfillment']).toEqual(payload.fulfillment);
    expect(sentBody['adjustments']).toEqual(payload.adjustments);
  });

  it('sends idempotency-key header on PUT', async () => {
    mockOk(MINIMAL_ORDER);
    await capability.update('ord_123', {});
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['idempotency-key']).toBeDefined();
  });

  it('throws UCPError with gateway message on structured error response', async () => {
    mockError(422, {
      messages: [{ type: 'error', code: 'INVALID_UPDATE', content: 'Cannot update order' }],
    });
    const err = await capability.update('ord_123', {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UCPError);
    expect((err as UCPError).code).toBe('INVALID_UPDATE');
  });

  it('throws UCPIdempotencyConflictError on 409', async () => {
    mockError(409);
    await expect(capability.update('ord_123', {})).rejects.toBeInstanceOf(
      UCPIdempotencyConflictError,
    );
  });

  it('throws UCPError on 404 (order not found)', async () => {
    mockError(404);
    await expect(capability.update('ord_missing', {})).rejects.toBeInstanceOf(UCPError);
  });

  it('throws UCPError on 500', async () => {
    mockError(500);
    await expect(capability.update('ord_123', {})).rejects.toBeInstanceOf(UCPError);
  });

  it('propagates network errors', async () => {
    mockNetworkFailure();
    await expect(capability.update('ord_123', {})).rejects.toThrow('Failed to fetch');
  });
});
