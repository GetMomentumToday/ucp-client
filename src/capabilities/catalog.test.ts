import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogCapability } from './catalog.js';
import { HttpClient } from '../http.js';
import { UCPError, UCPIdempotencyConflictError } from '../errors.js';

const MINIMAL_SEARCH_RESPONSE = { products: [], pagination: {} };
const MINIMAL_LOOKUP_RESPONSE = {
  product: { id: 'prod_123', title: 'Test Product' },
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
let capability: CatalogCapability;

beforeEach(() => {
  mockFetch.mockReset();
  http = new HttpClient({
    gatewayUrl: 'https://gateway.example.com',
    agentProfileUrl: 'https://agent.example.com/profile',
    ucpVersion: '2024-01-01',
  });
  capability = new CatalogCapability(http);
});

describe('CatalogCapability.search', () => {
  it('sends POST /catalog/search with query and returns response', async () => {
    mockOk(MINIMAL_SEARCH_RESPONSE);
    const result = await capability.search('shoes');
    expect(result).toEqual(MINIMAL_SEARCH_RESPONSE);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/catalog/search')).toBe(true);
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body['query']).toBe('shoes');
  });

  it('includes filters when provided', async () => {
    mockOk(MINIMAL_SEARCH_RESPONSE);
    const filters = { categories: [{ value: 'footwear' }] };
    await capability.search('shoes', filters);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body['filters']).toEqual(filters);
  });

  it('includes pagination when provided', async () => {
    mockOk(MINIMAL_SEARCH_RESPONSE);
    const pagination = { limit: 10, cursor: 'abc' };
    await capability.search('shoes', undefined, pagination);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body['pagination']).toEqual(pagination);
  });

  it('sends idempotency-key header on POST', async () => {
    mockOk(MINIMAL_SEARCH_RESPONSE);
    await capability.search('shoes');
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['idempotency-key']).toBeDefined();
  });

  it('throws UCPError on 500', async () => {
    mockError(500);
    await expect(capability.search('shoes')).rejects.toBeInstanceOf(UCPError);
  });

  it('throws UCPIdempotencyConflictError on 409', async () => {
    mockError(409);
    await expect(capability.search('shoes')).rejects.toBeInstanceOf(UCPIdempotencyConflictError);
  });

  it('throws UCPError with gateway message on structured error', async () => {
    mockError(400, {
      messages: [{ type: 'error', code: 'INVALID_QUERY', content: 'Query too short' }],
    });
    const err = await capability.search('a').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UCPError);
    expect((err as UCPError).code).toBe('INVALID_QUERY');
  });

  it('propagates network errors', async () => {
    mockNetworkFailure();
    await expect(capability.search('shoes')).rejects.toThrow('Failed to fetch');
  });
});

describe('CatalogCapability.lookup', () => {
  it('sends GET /catalog/products/:id and returns response', async () => {
    mockOk(MINIMAL_LOOKUP_RESPONSE);
    const result = await capability.lookup('prod_123');
    expect(result).toEqual(MINIMAL_LOOKUP_RESPONSE);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/catalog/products/prod_123')).toBe(true);
    expect(init.method).toBe('GET');
  });

  it('URL-encodes the product ID', async () => {
    mockOk(MINIMAL_LOOKUP_RESPONSE);
    await capability.lookup('prod/with/slashes');
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/catalog/products/prod%2Fwith%2Fslashes');
  });

  it('does not send idempotency-key on GET', async () => {
    mockOk(MINIMAL_LOOKUP_RESPONSE);
    await capability.lookup('prod_123');
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['idempotency-key']).toBeUndefined();
  });

  it('throws UCPError on 404', async () => {
    mockError(404);
    await expect(capability.lookup('prod_missing')).rejects.toBeInstanceOf(UCPError);
  });

  it('throws UCPError on 500', async () => {
    mockError(500);
    await expect(capability.lookup('prod_123')).rejects.toBeInstanceOf(UCPError);
  });

  it('propagates network errors', async () => {
    mockNetworkFailure();
    await expect(capability.lookup('prod_123')).rejects.toThrow('Failed to fetch');
  });
});
