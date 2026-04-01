import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UCPClient, connect } from './UCPClient.js';
import { UCPError, UCPEscalationError, UCPIdempotencyConflictError } from './errors.js';

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

function makeProfile(capabilities: string[] = ['dev.ucp.shopping.checkout']) {
  return {
    ucp: {
      version: '2026-01-23',
      services: {},
      capabilities: Object.fromEntries(
        capabilities.map((name) => [name, [{ version: '2026-01-23' }]]),
      ),
    },
  };
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

const CONFIG = {
  gatewayUrl: 'http://localhost:3000',
  agentProfileUrl: 'https://agent.example.com/profile.json',
};

async function connectWithCapabilities(capabilities: string[] = ['dev.ucp.shopping.checkout']) {
  mockResponse(makeProfile(capabilities));
  return UCPClient.connect(CONFIG);
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('UCPClient.connect', () => {
  it('discovers profile and returns connected client', async () => {
    const client = await connectWithCapabilities();
    expect(client.profile.ucp.version).toBe('2026-01-23');
  });

  it('throws on invalid gatewayUrl', async () => {
    await expect(UCPClient.connect({ ...CONFIG, gatewayUrl: 'not-a-url' })).rejects.toThrow();
  });

  it('throws on agentProfileUrl containing double quotes', async () => {
    await expect(
      UCPClient.connect({ ...CONFIG, agentProfileUrl: 'https://agent.test/profile"injected' }),
    ).rejects.toThrow('must not contain double quotes');
  });

  it('strips trailing slashes from gatewayUrl', async () => {
    mockResponse(makeProfile());
    await UCPClient.connect({ ...CONFIG, gatewayUrl: 'http://localhost:3000///' });

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe('http://localhost:3000/.well-known/ucp');
  });
});

describe('capability detection', () => {
  it('exposes checkout when server has checkout capability', async () => {
    const client = await connectWithCapabilities(['dev.ucp.shopping.checkout']);
    expect(client.checkout).not.toBeNull();
    expect(client.order).toBeNull();
    expect(client.identityLinking).toBeNull();
  });

  it('exposes order when server has order capability', async () => {
    const client = await connectWithCapabilities([
      'dev.ucp.shopping.checkout',
      'dev.ucp.shopping.order',
    ]);
    expect(client.checkout).not.toBeNull();
    expect(client.order).not.toBeNull();
  });

  it('sets checkout extensions based on server capabilities', async () => {
    const client = await connectWithCapabilities([
      'dev.ucp.shopping.checkout',
      'dev.ucp.shopping.fulfillment',
      'dev.ucp.shopping.discount',
    ]);
    expect(client.checkout!.extensions.fulfillment).toBe(true);
    expect(client.checkout!.extensions.discount).toBe(true);
    expect(client.checkout!.extensions.buyerConsent).toBe(false);
    expect(client.checkout!.extensions.ap2Mandate).toBe(false);
  });

  it('returns null checkout when server has no checkout capability', async () => {
    const client = await connectWithCapabilities(['dev.ucp.shopping.order']);
    expect(client.checkout).toBeNull();
  });
});

describe('describeTools', () => {
  it('returns only tools for available capabilities', async () => {
    const client = await connectWithCapabilities(['dev.ucp.shopping.checkout']);
    const tools = client.describeTools();
    const toolNames = tools.map((t) => t.name);

    expect(toolNames).toContain('create_checkout');
    expect(toolNames).not.toContain('get_order');
    expect(toolNames).not.toContain('update_order');
    expect(toolNames).not.toContain('set_fulfillment');
    expect(toolNames).not.toContain('apply_discount_codes');
  });

  it('includes fulfillment tools when extension is available', async () => {
    const client = await connectWithCapabilities([
      'dev.ucp.shopping.checkout',
      'dev.ucp.shopping.fulfillment',
    ]);
    const toolNames = client.describeTools().map((t) => t.name);

    expect(toolNames).toContain('set_fulfillment');
    expect(toolNames).toContain('select_destination');
    expect(toolNames).toContain('select_fulfillment_option');
    expect(toolNames).toContain('create_fulfillment_method');
    expect(toolNames).toContain('update_fulfillment_method');
    expect(toolNames).toContain('update_fulfillment_group');
  });

  it('includes discount tools when extension is available', async () => {
    const client = await connectWithCapabilities([
      'dev.ucp.shopping.checkout',
      'dev.ucp.shopping.discount',
    ]);
    const toolNames = client.describeTools().map((t) => t.name);

    expect(toolNames).toContain('apply_discount_codes');
  });

  it('includes order tools when capability is available', async () => {
    const client = await connectWithCapabilities([
      'dev.ucp.shopping.checkout',
      'dev.ucp.shopping.order',
    ]);
    const toolNames = client.describeTools().map((t) => t.name);

    expect(toolNames).toContain('get_order');
    expect(toolNames).toContain('update_order');
    expect(toolNames).toContain('update_order_line_item');
  });

  it('returns no tools when server has no capabilities', async () => {
    const client = await connectWithCapabilities([]);
    const tools = client.describeTools();

    expect(tools).toHaveLength(0);
  });
});

describe('headers', () => {
  it('attaches UCP-Agent header on every request', async () => {
    const client = await connectWithCapabilities();
    mockResponse(makeSession());
    await client.checkout!.create({
      line_items: [{ item: { id: 'prod-001' }, quantity: 1 }],
    });

    const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['UCP-Agent']).toBe(
      'profile="https://agent.example.com/profile.json", version="2026-01-23"',
    );
  });

  it('attaches Content-Type when body is present', async () => {
    const client = await connectWithCapabilities();
    mockResponse(makeSession());
    await client.checkout!.create({
      line_items: [{ item: { id: 'prod-001' }, quantity: 1 }],
    });

    const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('does NOT attach Content-Type on bodiless requests', async () => {
    const client = await connectWithCapabilities();
    mockResponse(makeSession({ id: 'chk_1' }));
    await client.checkout!.get('chk_1');

    const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('attaches request-id on every request', async () => {
    const client = await connectWithCapabilities();
    mockResponse(makeSession({ id: 'chk_1' }));
    await client.checkout!.get('chk_1');

    const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['request-id']).toBeDefined();
  });

  it('generates unique request-id per call', async () => {
    const client = await connectWithCapabilities();
    mockResponse(makeSession({ id: 'chk_1' }));
    mockResponse(makeSession({ id: 'chk_2' }));
    await client.checkout!.get('chk_1');
    await client.checkout!.get('chk_2');

    const h1 = (mockFetch.mock.calls[1] as [string, RequestInit])[1].headers as Record<
      string,
      string
    >;
    const h2 = (mockFetch.mock.calls[2] as [string, RequestInit])[1].headers as Record<
      string,
      string
    >;
    expect(h1['request-id']).not.toBe(h2['request-id']);
  });

  it('attaches idempotency-key on POST requests', async () => {
    const client = await connectWithCapabilities();
    mockResponse(makeSession());
    await client.checkout!.create({
      line_items: [{ item: { id: 'prod-001' }, quantity: 1 }],
    });

    const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['idempotency-key']).toBeDefined();
  });

  it('attaches idempotency-key on PUT requests', async () => {
    const client = await connectWithCapabilities();
    mockResponse(makeSession());
    await client.checkout!.update('chk_1', { buyer: { first_name: 'Jan' } });

    const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['idempotency-key']).toBeDefined();
  });

  it('does NOT attach idempotency-key on GET requests', async () => {
    const client = await connectWithCapabilities();
    mockResponse(makeSession({ id: 'chk_1' }));
    await client.checkout!.get('chk_1');

    const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['idempotency-key']).toBeUndefined();
  });

  it('attaches request-signature when configured', async () => {
    mockResponse(makeProfile());
    const client = await UCPClient.connect({ ...CONFIG, requestSignature: 'sig_abc123' });

    mockResponse(makeSession({ id: 'chk_1' }));
    await client.checkout!.get('chk_1');

    const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['request-signature']).toBe('sig_abc123');
  });
});

describe('checkout capability', () => {
  it('creates checkout session', async () => {
    const client = await connectWithCapabilities();
    mockResponse(makeSession());
    const session = await client.checkout!.create({
      line_items: [{ item: { id: 'prod-001' }, quantity: 2 }],
      currency: 'EUR',
    });

    const [url, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/checkout-sessions');
    expect(init.method).toBe('POST');
    expect(session.id).toBe('chk_1');
  });

  it('gets checkout session', async () => {
    const client = await connectWithCapabilities();
    mockResponse(makeSession({ id: 'chk_42' }));
    const session = await client.checkout!.get('chk_42');

    const [url] = mockFetch.mock.calls[1] as [string];
    expect(url).toBe('http://localhost:3000/checkout-sessions/chk_42');
    expect(session.id).toBe('chk_42');
  });

  it('updates checkout via PUT', async () => {
    const client = await connectWithCapabilities();
    mockResponse(makeSession());
    await client.checkout!.update('chk_1', { buyer: { first_name: 'Jan' } });

    const [url, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/checkout-sessions/chk_1');
    expect(init.method).toBe('PUT');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body['buyer']).toEqual({ first_name: 'Jan' });
  });

  it('completes checkout', async () => {
    const client = await connectWithCapabilities();
    mockResponse(makeSession({ status: 'completed' }));
    const session = await client.checkout!.complete('chk_1', {
      payment: {
        instruments: [
          {
            id: 'instr_1',
            handler_id: 'mock',
            type: 'offline',
            credential: { type: 'token', token: 'tok' },
          },
        ],
      },
    });
    expect(session.status).toBe('completed');
  });

  it('cancels checkout', async () => {
    const client = await connectWithCapabilities();
    mockResponse(makeSession({ status: 'canceled' }));
    const session = await client.checkout!.cancel('chk_1');

    const [url, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/checkout-sessions/chk_1/cancel');
    expect(init.method).toBe('POST');
    expect(session.status).toBe('canceled');
  });
});

describe('escalation detection', () => {
  it('throws UCPEscalationError on create when requires_escalation', async () => {
    const client = await connectWithCapabilities();
    mockResponse(
      makeSession({ status: 'requires_escalation', continue_url: 'https://store.com/pay' }),
    );
    const err = await client
      .checkout!.create({ line_items: [{ item: { id: 'prod-001' }, quantity: 1 }] })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(UCPEscalationError);
    expect((err as UCPEscalationError).continue_url).toBe('https://store.com/pay');
  });

  it('throws UCPEscalationError on update when requires_escalation', async () => {
    const client = await connectWithCapabilities();
    mockResponse(
      makeSession({ status: 'requires_escalation', continue_url: 'https://store.com/pay' }),
    );
    const err = await client
      .checkout!.update('chk_1', { buyer: { email: 'a@b.com' } })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(UCPEscalationError);
  });

  it('does NOT throw when continue_url is absent', async () => {
    const client = await connectWithCapabilities();
    mockResponse(makeSession({ status: 'requires_escalation', continue_url: null }));
    const session = await client.checkout!.get('chk_1');
    expect(session.status).toBe('requires_escalation');
  });
});

describe('fulfillment convenience methods', () => {
  it('setFulfillment sends correct payload', async () => {
    const client = await connectWithCapabilities([
      'dev.ucp.shopping.checkout',
      'dev.ucp.shopping.fulfillment',
    ]);
    mockResponse(makeSession());
    await client.checkout!.setFulfillment('chk_1', 'shipping');

    const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    const fulfillment = body['fulfillment'] as Record<string, unknown>;
    const methods = fulfillment['methods'] as Array<Record<string, unknown>>;
    expect(methods[0]!['type']).toBe('shipping');
  });

  it('selectDestination sends destination ID', async () => {
    const client = await connectWithCapabilities([
      'dev.ucp.shopping.checkout',
      'dev.ucp.shopping.fulfillment',
    ]);
    mockResponse(makeSession());
    await client.checkout!.selectDestination('chk_1', 'dest_home');

    const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    const fulfillment = body['fulfillment'] as Record<string, unknown>;
    const methods = fulfillment['methods'] as Array<Record<string, unknown>>;
    expect(methods[0]!['selected_destination_id']).toBe('dest_home');
  });

  it('selectFulfillmentOption sends option and destination IDs', async () => {
    const client = await connectWithCapabilities([
      'dev.ucp.shopping.checkout',
      'dev.ucp.shopping.fulfillment',
    ]);
    mockResponse(makeSession());
    await client.checkout!.selectFulfillmentOption('chk_1', 'opt_express', 'dest_home');

    const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    const fulfillment = body['fulfillment'] as Record<string, unknown>;
    const methods = fulfillment['methods'] as Array<Record<string, unknown>>;
    expect(methods[0]!['selected_destination_id']).toBe('dest_home');
    const groups = methods[0]!['groups'] as Array<Record<string, unknown>>;
    expect(groups[0]!['selected_option_id']).toBe('opt_express');
  });

  it('applyDiscountCodes sends discount codes', async () => {
    const client = await connectWithCapabilities([
      'dev.ucp.shopping.checkout',
      'dev.ucp.shopping.discount',
    ]);
    mockResponse(makeSession());
    await client.checkout!.applyDiscountCodes('chk_1', ['10OFF', 'FREESHIP']);

    const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    const discounts = body['discounts'] as Record<string, unknown>;
    expect(discounts['codes']).toEqual(['10OFF', 'FREESHIP']);
  });
});

describe('order capability', () => {
  it('gets order with spec-compliant schema', async () => {
    const client = await connectWithCapabilities([
      'dev.ucp.shopping.checkout',
      'dev.ucp.shopping.order',
    ]);
    mockResponse({
      id: 'order/123',
      checkout_id: 'chk_1',
      permalink_url: 'https://store.example/orders/123',
      line_items: [
        {
          id: 'li_1',
          status: 'processing',
          item: { id: 'prod-001', title: 'Shoes', price: 5000 },
          quantity: { total: 1, fulfilled: 0 },
          totals: [{ type: 'total', amount: 5000 }],
        },
      ],
      fulfillment: {},
      totals: [{ type: 'total', amount: 5000 }],
      ucp: { version: '2026-01-23', capabilities: {} },
    });
    const order = await client.order!.get('order/123');

    const [url] = mockFetch.mock.calls[1] as [string];
    expect(url).toContain('order%2F123');
    expect(order.id).toBe('order/123');
  });
});

describe('error handling', () => {
  it('throws UCPError with enriched fields from messages[]', async () => {
    const client = await connectWithCapabilities();
    mockResponse(
      {
        messages: [
          {
            type: 'error',
            code: 'CHECKOUT_NOT_FOUND',
            content: 'Checkout xyz not found',
            severity: 'recoverable',
            path: '$.checkout',
            content_type: 'plain',
          },
          { type: 'warning', code: 'LOW_STOCK', content: 'Nearly out of stock' },
        ],
      },
      404,
    );

    try {
      await client.checkout!.get('xyz');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UCPError);
      const ucpErr = err as UCPError;
      expect(ucpErr.code).toBe('CHECKOUT_NOT_FOUND');
      expect(ucpErr.path).toBe('$.checkout');
      expect(ucpErr.contentType).toBe('plain');
      expect(ucpErr.messages).toHaveLength(2);
      expect(ucpErr.messages[1]!.code).toBe('LOW_STOCK');
    }
  });

  it('throws UCPIdempotencyConflictError on 409', async () => {
    const client = await connectWithCapabilities();
    mockResponse({}, 409);

    try {
      await client.checkout!.create({
        line_items: [{ item: { id: 'prod-001' }, quantity: 1 }],
      });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UCPIdempotencyConflictError);
      expect((err as UCPError).statusCode).toBe(409);
    }
  });

  it('throws generic HTTP_ERROR when no messages[]', async () => {
    const client = await connectWithCapabilities();
    mockResponse({}, 500);

    try {
      await client.checkout!.get('xyz');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UCPError);
      expect((err as UCPError).code).toBe('HTTP_ERROR');
    }
  });

  it('handles JSON parse failure gracefully', async () => {
    const client = await connectWithCapabilities();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error('invalid json')),
    });

    try {
      await client.checkout!.get('xyz');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UCPError);
      expect((err as UCPError).code).toBe('HTTP_ERROR');
    }
  });
});

describe('Zod validation', () => {
  it('warns on invalid response but still returns data', async () => {
    const warnSpy = vi.spyOn(console, 'warn');
    const client = await connectWithCapabilities();
    const invalidSession = { id: 'chk_1', status: 'incomplete' };
    mockResponse(invalidSession);
    const session = await client.checkout!.create({
      line_items: [{ item: { id: 'prod-001' }, quantity: 1 }],
    });

    expect(warnSpy).toHaveBeenCalledWith(
      '[UCPClient] Response validation failed:',
      expect.any(String),
    );
    expect(session.id).toBe('chk_1');
  });

  it('uses custom onValidationWarning callback when provided', async () => {
    const warnings: string[] = [];
    mockResponse(makeProfile());
    const client = await connect(CONFIG, {
      onValidationWarning: (msg) => warnings.push(msg),
    });

    const invalidSession = { id: 'chk_1', status: 'incomplete' };
    mockResponse(invalidSession);
    await client.checkout!.create({
      line_items: [{ item: { id: 'prod-001' }, quantity: 1 }],
    });

    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings.some((w) => w === '[UCPClient] Response validation failed:')).toBe(true);
  });
});

describe('standalone connect function', () => {
  it('works identically to UCPClient.connect', async () => {
    mockResponse(makeProfile());
    const client = await connect(CONFIG);
    expect(client.profile.ucp.version).toBe('2026-01-23');
    expect(client.checkout).not.toBeNull();
  });
});

describe('ConnectedClient immutability', () => {
  it('is frozen and cannot be mutated', async () => {
    const client = await connectWithCapabilities();
    expect(Object.isFrozen(client)).toBe(true);
  });
});

describe('payment handler extraction', () => {
  it('extracts valid payment handlers from profile', async () => {
    mockResponse({
      ...makeProfile(),
      payment_handlers: {
        'com.google.pay': [
          {
            id: 'gpay_1',
            version: '2026-01-23',
            spec: 'https://example.com',
            schema: 'https://example.com/schema',
          },
        ],
      },
    });
    const client = await UCPClient.connect(CONFIG);
    const gpay = client.paymentHandlers['com.google.pay'];
    expect(gpay).toBeDefined();
    expect(gpay![0]!.id).toBe('gpay_1');
  });

  it('returns empty map for invalid payment handlers', async () => {
    mockResponse({
      ...makeProfile(),
      payment_handlers: 'not-an-object',
    });
    const client = await UCPClient.connect(CONFIG);
    expect(Object.keys(client.paymentHandlers)).toHaveLength(0);
  });

  it('returns empty map when payment handlers missing', async () => {
    const client = await connectWithCapabilities();
    expect(Object.keys(client.paymentHandlers)).toHaveLength(0);
  });
});

// ─── signingKeys ──────────────────────────────────────────────────────────────

describe('signingKeys', () => {
  const TEST_JWK = {
    kty: 'EC',
    crv: 'P-256',
    alg: 'ES256',
    use: 'sig',
    kid: 'key-1',
    x: 'f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU',
    y: 'x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0',
  };

  it('extracts signing keys from profile', async () => {
    mockResponse({ ...makeProfile(), signing_keys: [TEST_JWK] });
    const client = await UCPClient.connect(CONFIG);
    expect(client.signingKeys).toHaveLength(1);
    expect(client.signingKeys[0]!.kid).toBe('key-1');
  });

  it('returns empty array when signing_keys missing', async () => {
    const client = await connectWithCapabilities();
    expect(client.signingKeys).toHaveLength(0);
  });

  it('skips entries that fail JWK validation (missing kty)', async () => {
    mockResponse({ ...makeProfile(), signing_keys: [{ kid: 'bad' }, TEST_JWK] });
    const client = await UCPClient.connect(CONFIG);
    expect(client.signingKeys).toHaveLength(1);
    expect(client.signingKeys[0]!.kid).toBe('key-1');
  });

  it('returns empty array when signing_keys is not an array', async () => {
    mockResponse({ ...makeProfile(), signing_keys: 'not-an-array' });
    const client = await UCPClient.connect(CONFIG);
    expect(client.signingKeys).toHaveLength(0);
  });
});

describe('identity linking', () => {
  it('is null when server does not declare identity_linking', async () => {
    const client = await connectWithCapabilities(['dev.ucp.shopping.checkout']);
    expect(client.identityLinking).toBeNull();
  });

  it('throws when identity_linking declared but metadata fetch fails', async () => {
    mockResponse(makeProfile(['dev.ucp.shopping.checkout', 'dev.ucp.common.identity_linking']));
    mockResponse({}, 404);

    await expect(UCPClient.connect(CONFIG)).rejects.toThrow('OAuth metadata fetch failed');
  });

  it('instantiates when metadata fetch succeeds', async () => {
    mockResponse(makeProfile(['dev.ucp.shopping.checkout', 'dev.ucp.common.identity_linking']));
    mockResponse({
      issuer: 'https://merchant.example.com',
      authorization_endpoint: 'https://merchant.example.com/oauth2/authorize',
      token_endpoint: 'https://merchant.example.com/oauth2/token',
      revocation_endpoint: 'https://merchant.example.com/oauth2/revoke',
      scopes_supported: ['ucp:scopes:checkout_session'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_methods_supported: ['client_secret_basic'],
    });

    const client = await UCPClient.connect(CONFIG);
    expect(client.identityLinking).not.toBeNull();
  });

  it('builds correct authorization URL', async () => {
    mockResponse(makeProfile(['dev.ucp.shopping.checkout', 'dev.ucp.common.identity_linking']));
    mockResponse({
      issuer: 'https://merchant.example.com',
      authorization_endpoint: 'https://merchant.example.com/oauth2/authorize',
      token_endpoint: 'https://merchant.example.com/oauth2/token',
      revocation_endpoint: 'https://merchant.example.com/oauth2/revoke',
      scopes_supported: ['ucp:scopes:checkout_session'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      token_endpoint_auth_methods_supported: ['client_secret_basic'],
    });

    const client = await UCPClient.connect(CONFIG);
    const url = client.identityLinking!.getAuthorizationUrl({
      client_id: 'my_client',
      redirect_uri: 'https://platform.example.com/callback',
      state: 'csrf_token_123',
    });

    expect(url).toContain('response_type=code');
    expect(url).toContain('client_id=my_client');
    expect(url).toContain('state=csrf_token_123');
    expect(url).toContain('scope=ucp');
  });

  it('includes identity linking tools in describeTools', async () => {
    mockResponse(makeProfile(['dev.ucp.shopping.checkout', 'dev.ucp.common.identity_linking']));
    mockResponse({
      issuer: 'https://merchant.example.com',
      authorization_endpoint: 'https://merchant.example.com/oauth2/authorize',
      token_endpoint: 'https://merchant.example.com/oauth2/token',
      revocation_endpoint: 'https://merchant.example.com/oauth2/revoke',
      scopes_supported: ['ucp:scopes:checkout_session'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      token_endpoint_auth_methods_supported: ['client_secret_basic'],
    });

    const client = await UCPClient.connect(CONFIG);
    const toolNames = client.describeTools().map((t) => t.name);

    expect(toolNames).toContain('get_authorization_url');
    expect(toolNames).toContain('exchange_auth_code');
    expect(toolNames).toContain('refresh_access_token');
    expect(toolNames).toContain('revoke_token');
  });
});

describe('409 with messages preserves error detail', () => {
  it('throws UCPError with messages when 409 has message body', async () => {
    const client = await connectWithCapabilities();
    mockResponse(
      {
        messages: [{ type: 'error', code: 'DUPLICATE_REQUEST', content: 'Key already used' }],
      },
      409,
    );

    try {
      await client.checkout!.create({
        line_items: [{ item: { id: 'prod-001' }, quantity: 1 }],
      });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UCPError);
      const ucpErr = err as UCPError;
      expect(ucpErr.code).toBe('DUPLICATE_REQUEST');
      expect(ucpErr.messages).toHaveLength(1);
    }
  });

  it('throws UCPIdempotencyConflictError when 409 has no messages', async () => {
    const client = await connectWithCapabilities();
    mockResponse({}, 409);

    try {
      await client.checkout!.create({
        line_items: [{ item: { id: 'prod-001' }, quantity: 1 }],
      });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UCPIdempotencyConflictError);
    }
  });
});
