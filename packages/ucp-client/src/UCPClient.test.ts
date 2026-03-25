import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UCPClient } from './UCPClient.js';
import { UCPError, UCPEscalationError } from './errors.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
vi.spyOn(console, 'warn').mockImplementation(() => {});

function mockResponse(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'chk_1',
    status: 'incomplete',
    line_items: [],
    currency: 'USD',
    totals: [],
    buyer: null,
    fulfillment: null,
    discounts: null,
    continue_url: null,
    messages: [],
    expires_at: '2026-04-01T00:00:00Z',
    created_at: '2026-03-25T12:00:00Z',
    order: null,
    ...overrides,
  };
}

const client = new UCPClient({
  gatewayUrl: 'http://localhost:3000',
  agentProfileUrl: 'https://agent.example.com/profile.json',
});

beforeEach(() => {
  mockFetch.mockReset();
});

describe('UCPClient', () => {
  describe('headers', () => {
    it('attaches UCP-Agent header on every request', async () => {
      mockResponse({
        ucp: { version: '2026-01-23', services: {}, capabilities: [] },
      });
      await client.discover();

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['UCP-Agent']).toBe(
        'profile="https://agent.example.com/profile.json", version="2026-01-23"',
      );
    });

    it('attaches Content-Type: application/json when body is present', async () => {
      mockResponse(makeSession());
      await client.createCheckout({
        line_items: [{ item: { id: 'prod-001' }, quantity: 1 }],
      });

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('does NOT attach Content-Type on bodiless requests', async () => {
      mockResponse({ products: [] });
      await client.searchProducts('shoes');

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['Content-Type']).toBeUndefined();
    });

    it('attaches request-id on every request', async () => {
      mockResponse({ products: [] });
      await client.searchProducts('shoes');

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      const requestId = headers['request-id'];
      expect(requestId).toBeDefined();
      expect(requestId!.length).toBeGreaterThan(0);
    });

    it('generates unique request-id per call', async () => {
      mockResponse({ products: [] });
      mockResponse({ products: [] });
      await client.searchProducts('shoes');
      await client.searchProducts('boots');

      const headers1 = (mockFetch.mock.calls[0] as [string, RequestInit])[1].headers as Record<
        string,
        string
      >;
      const headers2 = (mockFetch.mock.calls[1] as [string, RequestInit])[1].headers as Record<
        string,
        string
      >;
      expect(headers1['request-id']).not.toBe(headers2['request-id']);
    });

    it('attaches idempotency-key on POST requests with body', async () => {
      mockResponse(makeSession());
      await client.createCheckout({
        line_items: [{ item: { id: 'prod-001' }, quantity: 1 }],
      });

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['idempotency-key']).toBeDefined();
    });

    it('attaches idempotency-key on POST requests without body (cancel)', async () => {
      mockResponse(makeSession({ status: 'canceled' }));
      await client.cancelCheckout('chk_1');

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['idempotency-key']).toBeDefined();
    });

    it('does NOT attach idempotency-key on GET requests', async () => {
      mockResponse({ products: [] });
      await client.searchProducts('shoes');

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['idempotency-key']).toBeUndefined();
    });

    it('does NOT attach idempotency-key on PUT requests', async () => {
      mockResponse(makeSession());
      await client.updateCheckout('chk_1', { buyer: { first_name: 'Jan' } });

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['idempotency-key']).toBeUndefined();
    });
  });

  describe('discover', () => {
    it('calls GET /.well-known/ucp and returns profile', async () => {
      const profile = {
        ucp: {
          version: '2026-01-23',
          services: {},
          capabilities: [{ name: 'dev.ucp.shopping.checkout', version: '1.0' }],
        },
      };
      mockResponse(profile);
      const result = await client.discover();

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('http://localhost:3000/.well-known/ucp');
      expect(init.method).toBe('GET');
      const firstCapability = result.ucp.capabilities[0];
      expect(firstCapability).toBeDefined();
      expect(firstCapability!.name).toBe('dev.ucp.shopping.checkout');
    });
  });

  describe('searchProducts', () => {
    it('passes query as q param', async () => {
      mockResponse({ products: [] });
      await client.searchProducts('waterproof jacket');

      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain('q=waterproof+jacket');
    });

    it('passes all filters as URL params', async () => {
      mockResponse({ products: [] });
      await client.searchProducts('shoes', {
        max_price_cents: 10000,
        min_price_cents: 500,
        in_stock: true,
        category: 'footwear',
        limit: 5,
        page: 2,
      });

      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain('max_price_cents=10000');
      expect(url).toContain('min_price_cents=500');
      expect(url).toContain('in_stock=true');
      expect(url).toContain('category=footwear');
      expect(url).toContain('limit=5');
      expect(url).toContain('page=2');
    });

    it('returns products array from { products: [...] } envelope', async () => {
      mockResponse({
        products: [
          {
            id: 'prod-001',
            title: 'Shoes',
            price_cents: 9999,
            currency: 'USD',
            in_stock: true,
            stock_quantity: 5,
            images: [],
            variants: [],
            description: null,
          },
        ],
      });
      const products = await client.searchProducts('shoes');
      expect(products).toHaveLength(1);
      expect(products[0]?.id).toBe('prod-001');
    });

    it('handles direct array response', async () => {
      mockResponse([{ id: 'prod-001', title: 'Shoes' }]);
      const products = await client.searchProducts('shoes');
      expect(products).toHaveLength(1);
    });
  });

  describe('getProduct', () => {
    it('URL-encodes the product ID', async () => {
      mockResponse({ id: 'prod/special', title: 'Special' });
      await client.getProduct('prod/special');

      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain('prod%2Fspecial');
    });
  });

  describe('createCheckout', () => {
    it('sends POST to /checkout-sessions with payload', async () => {
      mockResponse(makeSession());
      const session = await client.createCheckout({
        line_items: [{ item: { id: 'prod-001' }, quantity: 2 }],
        currency: 'EUR',
      });

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('http://localhost:3000/checkout-sessions');
      expect(init.method).toBe('POST');
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body['currency']).toBe('EUR');
      expect(session.id).toBe('chk_1');
    });
  });

  describe('getCheckout', () => {
    it('sends GET to /checkout-sessions/:id', async () => {
      mockResponse(makeSession({ id: 'chk_42' }));
      const session = await client.getCheckout('chk_42');

      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toBe('http://localhost:3000/checkout-sessions/chk_42');
      expect(session.id).toBe('chk_42');
    });
  });

  describe('updateCheckout', () => {
    it('sends PUT with id merged into body', async () => {
      mockResponse(makeSession());
      await client.updateCheckout('chk_1', {
        buyer: { first_name: 'Jan' },
      });

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('http://localhost:3000/checkout-sessions/chk_1');
      expect(init.method).toBe('PUT');
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body['id']).toBe('chk_1');
      expect(body['buyer']).toEqual({ first_name: 'Jan' });
    });
  });

  describe('completeCheckout', () => {
    const paymentPayload = {
      payment: {
        instruments: [
          {
            id: 'instr_1',
            handler_id: 'mock',
            type: 'offline',
            credential: { type: 'token', token: 'tok_success' },
          },
        ],
      },
    };

    it('returns session on successful completion', async () => {
      mockResponse(makeSession({ status: 'completed' }));
      const session = await client.completeCheckout('chk_1', paymentPayload);
      expect(session.status).toBe('completed');
    });

    it('throws UCPEscalationError when status is requires_escalation', async () => {
      mockResponse(
        makeSession({
          status: 'requires_escalation',
          continue_url: 'https://store.com/pay',
        }),
      );

      const err = await client.completeCheckout('chk_1', paymentPayload).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(UCPEscalationError);
      expect((err as UCPEscalationError).continue_url).toBe('https://store.com/pay');
      expect((err as UCPEscalationError).name).toBe('UCPEscalationError');
    });
  });

  describe('cancelCheckout', () => {
    it('sends POST to /checkout-sessions/:id/cancel', async () => {
      mockResponse(makeSession({ status: 'canceled' }));
      const session = await client.cancelCheckout('chk_1');

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('http://localhost:3000/checkout-sessions/chk_1/cancel');
      expect(init.method).toBe('POST');
      expect(session.status).toBe('canceled');
    });
  });

  describe('getOrder', () => {
    it('sends GET to /orders/:id and URL-encodes', async () => {
      mockResponse({
        id: 'order/123',
        status: 'processing',
        total_cents: 5000,
        currency: 'USD',
        created_at_iso: '2026-03-25T12:00:00Z',
      });
      const order = await client.getOrder('order/123');

      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain('order%2F123');
      expect(order.status).toBe('processing');
    });
  });

  describe('error handling', () => {
    it('throws UCPError when gateway returns messages[]', async () => {
      mockResponse(
        {
          messages: [
            {
              type: 'error',
              code: 'PRODUCT_NOT_FOUND',
              content: 'Product xyz not found',
              severity: 'error',
            },
          ],
        },
        404,
      );

      try {
        await client.getProduct('xyz');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(UCPError);
        const ucpErr = err as UCPError;
        expect(ucpErr.code).toBe('PRODUCT_NOT_FOUND');
        expect(ucpErr.message).toBe('Product xyz not found');
        expect(ucpErr.severity).toBe('error');
        expect(ucpErr.statusCode).toBe(404);
      }
    });

    it('throws generic HTTP_ERROR when no messages[] in response', async () => {
      mockResponse({}, 500);

      try {
        await client.discover();
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(UCPError);
        const ucpErr = err as UCPError;
        expect(ucpErr.code).toBe('HTTP_ERROR');
        expect(ucpErr.message).toBe('Gateway returned 500');
        expect(ucpErr.statusCode).toBe(500);
      }
    });

    it('handles JSON parse failure gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error('invalid json')),
      });

      try {
        await client.discover();
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(UCPError);
        expect((err as UCPError).code).toBe('HTTP_ERROR');
      }
    });
  });

  describe('constructor', () => {
    it('strips trailing slashes from gatewayUrl', async () => {
      const c = new UCPClient({
        gatewayUrl: 'http://localhost:3000///',
        agentProfileUrl: 'https://agent.test/profile',
      });
      mockResponse({ ucp: { version: '2026-01-23', services: {}, capabilities: [] } });
      await c.discover();

      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toBe('http://localhost:3000/.well-known/ucp');
    });

    it('uses custom ucpVersion when provided', async () => {
      const c = new UCPClient({
        gatewayUrl: 'http://localhost:3000',
        agentProfileUrl: 'https://agent.test/profile',
        ucpVersion: '2025-06-01',
      });
      mockResponse({ ucp: { version: '2025-06-01', services: {}, capabilities: [] } });
      await c.discover();

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['UCP-Agent']).toContain('version="2025-06-01"');
    });

    it('throws on invalid gatewayUrl', () => {
      expect(
        () =>
          new UCPClient({
            gatewayUrl: 'not-a-url',
            agentProfileUrl: 'https://agent.test/profile',
          }),
      ).toThrow();
    });

    it('throws on agentProfileUrl containing double quotes', () => {
      expect(
        () =>
          new UCPClient({
            gatewayUrl: 'http://localhost:3000',
            agentProfileUrl: 'https://agent.test/profile"injected',
          }),
      ).toThrow('must not contain double quotes');
    });

    it('throws on invalid agentProfileUrl', () => {
      expect(
        () =>
          new UCPClient({
            gatewayUrl: 'http://localhost:3000',
            agentProfileUrl: 'not-a-url',
          }),
      ).toThrow();
    });
  });

  describe('Zod validation', () => {
    it('warns on invalid response but still returns data (graceful degradation)', async () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const invalidSession = { id: 'chk_1', status: 'incomplete' };
      mockResponse(invalidSession);
      const session = await client.createCheckout({
        line_items: [{ item: { id: 'prod-001' }, quantity: 1 }],
      });

      expect(warnSpy).toHaveBeenCalledWith(
        '[UCPClient] Response validation failed:',
        expect.any(String),
      );
      expect(session.id).toBe('chk_1');
    });

    it('returns validated data when response matches schema', async () => {
      const validProduct = {
        id: 'prod-001',
        title: 'Shoes',
        description: null,
        price_cents: 9999,
        currency: 'USD',
        in_stock: true,
        stock_quantity: 5,
        images: ['https://example.com/shoe.jpg'],
        variants: [],
      };
      const warnSpy = vi.spyOn(console, 'warn').mockClear();
      mockResponse(validProduct);
      const product = await client.getProduct('prod-001');

      expect(product.id).toBe('prod-001');
      expect(product.title).toBe('Shoes');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('validates order responses', async () => {
      const validOrder = {
        id: 'order-001',
        status: 'processing',
        total_cents: 5000,
        currency: 'USD',
        created_at_iso: '2026-03-25T12:00:00Z',
      };
      const warnSpy = vi.spyOn(console, 'warn').mockClear();
      mockResponse(validOrder);
      const order = await client.getOrder('order-001');

      expect(order.id).toBe('order-001');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('request-signature header', () => {
    it('attaches request-signature when configured', async () => {
      const signedClient = new UCPClient({
        gatewayUrl: 'http://localhost:3000',
        agentProfileUrl: 'https://agent.test/profile',
        requestSignature: 'sig_abc123',
      });
      mockResponse({ ucp: { version: '2026-01-23', services: {}, capabilities: [] } });
      await signedClient.discover();

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['request-signature']).toBe('sig_abc123');
    });

    it('does NOT attach request-signature when not configured', async () => {
      mockResponse({ ucp: { version: '2026-01-23', services: {}, capabilities: [] } });
      await client.discover();

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['request-signature']).toBeUndefined();
    });
  });

  describe('completeCheckout with payment_data format', () => {
    it('sends payment_data (single instrument) + risk_signals', async () => {
      mockResponse(makeSession({ status: 'completed' }));
      await client.completeCheckout('chk_1', {
        payment_data: {
          id: 'instr_card',
          handler_id: 'mock_handler',
          type: 'card',
          brand: 'Visa',
          last_digits: '4242',
          credential: { type: 'token', token: 'tok_success' },
        },
        risk_signals: { ip: '127.0.0.1', browser: 'test' },
      });

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body['payment_data']).toBeDefined();
      expect((body['payment_data'] as Record<string, unknown>)['brand']).toBe('Visa');
      expect(body['risk_signals']).toEqual({ ip: '127.0.0.1', browser: 'test' });
    });
  });

  describe('fulfillment convenience methods', () => {
    it('setFulfillment sends correct fulfillment payload', async () => {
      mockResponse(makeSession());
      await client.setFulfillment('chk_1', 'shipping');

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      const fulfillment = body['fulfillment'] as Record<string, unknown>;
      const methods = fulfillment['methods'] as Array<Record<string, unknown>>;
      expect(methods[0]!['type']).toBe('shipping');
    });

    it('selectDestination sends destination ID', async () => {
      mockResponse(makeSession());
      await client.selectDestination('chk_1', 'dest_home');

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      const fulfillment = body['fulfillment'] as Record<string, unknown>;
      const methods = fulfillment['methods'] as Array<Record<string, unknown>>;
      expect(methods[0]!['selected_destination_id']).toBe('dest_home');
    });

    it('selectFulfillmentOption sends option and destination IDs', async () => {
      mockResponse(makeSession());
      await client.selectFulfillmentOption('chk_1', 'opt_express', 'dest_home');

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      const fulfillment = body['fulfillment'] as Record<string, unknown>;
      const methods = fulfillment['methods'] as Array<Record<string, unknown>>;
      expect(methods[0]!['selected_destination_id']).toBe('dest_home');
      const groups = methods[0]!['groups'] as Array<Record<string, unknown>>;
      expect(groups[0]!['selected_option_id']).toBe('opt_express');
    });

    it('applyDiscountCodes sends discount codes', async () => {
      mockResponse(makeSession());
      await client.applyDiscountCodes('chk_1', ['10OFF', 'FREESHIP']);

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      const discounts = body['discounts'] as Record<string, unknown>;
      expect(discounts['codes']).toEqual(['10OFF', 'FREESHIP']);
    });
  });
});
