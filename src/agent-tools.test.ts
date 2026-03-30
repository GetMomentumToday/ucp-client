import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UCPClient } from './UCPClient.js';
import { getAgentTools } from './agent-tools.js';
import type { AgentTool } from './agent-tools.js';

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

beforeEach(() => {
  mockFetch.mockReset();
});

async function connectWithCapabilities(capabilities: string[] = ['dev.ucp.shopping.checkout']) {
  mockResponse(makeProfile(capabilities));
  return UCPClient.connect(CONFIG);
}

describe('getAgentTools', () => {
  it('returns empty tools when no capabilities declared', async () => {
    const client = await connectWithCapabilities([]);
    const tools = client.getAgentTools();

    expect(tools).toHaveLength(0);
  });

  it('returns checkout tools when checkout is available', async () => {
    const client = await connectWithCapabilities(['dev.ucp.shopping.checkout']);
    const names = client.getAgentTools().map((t) => t.name);

    expect(names).toContain('create_checkout');
    expect(names).toContain('get_checkout');
    expect(names).toContain('update_checkout');
    expect(names).toContain('complete_checkout');
    expect(names).toContain('cancel_checkout');
  });

  it('returns fulfillment tools when fulfillment extension is available', async () => {
    const client = await connectWithCapabilities([
      'dev.ucp.shopping.checkout',
      'dev.ucp.shopping.fulfillment',
    ]);
    const names = client.getAgentTools().map((t) => t.name);

    expect(names).toContain('set_fulfillment');
    expect(names).toContain('select_destination');
    expect(names).toContain('select_fulfillment_option');
  });

  it('returns discount tools when discount extension is available', async () => {
    const client = await connectWithCapabilities([
      'dev.ucp.shopping.checkout',
      'dev.ucp.shopping.discount',
    ]);
    const names = client.getAgentTools().map((t) => t.name);

    expect(names).toContain('apply_discount_codes');
  });

  it('returns order tools when order capability is available', async () => {
    const client = await connectWithCapabilities([
      'dev.ucp.shopping.checkout',
      'dev.ucp.shopping.order',
    ]);
    const names = client.getAgentTools().map((t) => t.name);

    expect(names).toContain('get_order');
    expect(names).toContain('update_order');
  });

  it('does NOT return fulfillment/discount/order tools when not available', async () => {
    const client = await connectWithCapabilities(['dev.ucp.shopping.checkout']);
    const names = client.getAgentTools().map((t) => t.name);

    expect(names).not.toContain('set_fulfillment');
    expect(names).not.toContain('apply_discount_codes');
    expect(names).not.toContain('get_order');
  });

  it('standalone getAgentTools() returns same as client.getAgentTools()', async () => {
    const client = await connectWithCapabilities(['dev.ucp.shopping.checkout']);
    const fromClient = client.getAgentTools();
    const fromStandalone = getAgentTools(client);

    expect(fromClient.map((t) => t.name)).toEqual(fromStandalone.map((t) => t.name));
  });
});

describe('AgentTool structure', () => {
  it('every tool has name, description, parameters, and execute', async () => {
    const client = await connectWithCapabilities([
      'dev.ucp.shopping.checkout',
      'dev.ucp.shopping.fulfillment',
      'dev.ucp.shopping.discount',
      'dev.ucp.shopping.order',
    ]);

    for (const tool of client.getAgentTools()) {
      expect(tool.name).toBeDefined();
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.parameters.type).toBe('object');
      expect(typeof tool.execute).toBe('function');
    }
  });

  it('parameters have required array and properties', async () => {
    const client = await connectWithCapabilities(['dev.ucp.shopping.checkout']);
    const createTool = client.getAgentTools().find((t) => t.name === 'create_checkout')!;

    expect(createTool.parameters.required).toContain('line_items');
    expect(createTool.parameters.properties).toBeDefined();
    expect(createTool.parameters.properties!['line_items']).toBeDefined();
  });
});

describe('AgentTool.execute', () => {
  let tools: readonly AgentTool[];

  beforeEach(async () => {
    const client = await connectWithCapabilities([
      'dev.ucp.shopping.checkout',
      'dev.ucp.shopping.fulfillment',
      'dev.ucp.shopping.discount',
      'dev.ucp.shopping.order',
    ]);
    tools = client.getAgentTools();
  });

  function findTool(name: string): AgentTool {
    return tools.find((t) => t.name === name)!;
  }

  it('create_checkout calls checkout.create', async () => {
    mockResponse(makeSession());
    const result = (await findTool('create_checkout').execute({
      line_items: [{ item: { id: 'p1' }, quantity: 1 }],
    })) as Record<string, unknown>;
    expect(result['id']).toBe('chk_1');
  });

  it('get_checkout calls checkout.get', async () => {
    mockResponse(makeSession());
    const result = (await findTool('get_checkout').execute({ id: 'chk_1' })) as Record<
      string,
      unknown
    >;
    expect(result['id']).toBe('chk_1');
  });

  it('update_checkout calls checkout.update', async () => {
    mockResponse(makeSession());
    const result = (await findTool('update_checkout').execute({
      id: 'chk_1',
      buyer: { first_name: 'Test' },
    })) as Record<string, unknown>;
    expect(result['id']).toBe('chk_1');
  });

  it('complete_checkout calls checkout.complete', async () => {
    mockResponse(makeSession({ status: 'completed' }));
    const result = (await findTool('complete_checkout').execute({
      id: 'chk_1',
      payment: {
        instruments: [{ id: 'i1', handler_id: 'h1', type: 'card' }],
      },
    })) as Record<string, unknown>;
    expect(result['status']).toBe('completed');
  });

  it('cancel_checkout calls checkout.cancel', async () => {
    mockResponse(makeSession({ status: 'canceled' }));
    const result = (await findTool('cancel_checkout').execute({ id: 'chk_1' })) as Record<
      string,
      unknown
    >;
    expect(result['status']).toBe('canceled');
  });

  it('set_fulfillment calls checkout.setFulfillment', async () => {
    mockResponse(makeSession());
    await findTool('set_fulfillment').execute({ id: 'chk_1', type: 'shipping' });

    const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    const fulfillment = body['fulfillment'] as Record<string, unknown>;
    const methods = fulfillment['methods'] as Array<Record<string, unknown>>;
    expect(methods[0]!['type']).toBe('shipping');
  });

  it('select_destination calls checkout.selectDestination', async () => {
    mockResponse(makeSession());
    await findTool('select_destination').execute({ id: 'chk_1', destination_id: 'dest_1' });

    const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    const fulfillment = body['fulfillment'] as Record<string, unknown>;
    const methods = fulfillment['methods'] as Array<Record<string, unknown>>;
    expect(methods[0]!['selected_destination_id']).toBe('dest_1');
  });

  it('select_fulfillment_option calls checkout.selectFulfillmentOption', async () => {
    mockResponse(makeSession());
    await findTool('select_fulfillment_option').execute({
      id: 'chk_1',
      option_id: 'opt_express',
      destination_id: 'dest_1',
    });

    const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    const fulfillment = body['fulfillment'] as Record<string, unknown>;
    const methods = fulfillment['methods'] as Array<Record<string, unknown>>;
    const groups = methods[0]!['groups'] as Array<Record<string, unknown>>;
    expect(groups[0]!['selected_option_id']).toBe('opt_express');
  });

  it('apply_discount_codes calls checkout.applyDiscountCodes', async () => {
    mockResponse(makeSession());
    await findTool('apply_discount_codes').execute({ id: 'chk_1', codes: ['10OFF'] });

    const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    const discounts = body['discounts'] as Record<string, unknown>;
    expect(discounts['codes']).toEqual(['10OFF']);
  });

  it('get_order calls order.get', async () => {
    mockResponse({
      id: 'ord_1',
      checkout_id: 'chk_1',
      permalink_url: 'https://store.example/orders/1',
      line_items: [],
      fulfillment: {},
      totals: [],
      ucp: { version: '2026-01-23', capabilities: {} },
    });
    const result = (await findTool('get_order').execute({ id: 'ord_1' })) as Record<
      string,
      unknown
    >;
    expect(result['id']).toBe('ord_1');
  });

  it('update_order calls order.update', async () => {
    mockResponse({
      id: 'ord_1',
      checkout_id: 'chk_1',
      permalink_url: 'https://store.example/orders/1',
      line_items: [],
      fulfillment: {},
      totals: [],
      ucp: { version: '2026-01-23', capabilities: {} },
    });
    const result = (await findTool('update_order').execute({
      id: 'ord_1',
      fulfillment: {},
    })) as Record<string, unknown>;
    expect(result['id']).toBe('ord_1');
  });
});
