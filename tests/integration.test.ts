import { describe, it, expect, beforeAll } from 'vitest';
import { UCPClient } from '../src/UCPClient.js';
import { UCPError, UCPEscalationError } from '../src/errors.js';
import type { ConnectedClient } from '../src/UCPClient.js';
import type { CheckoutSession } from '../src/types/checkout.js';
import type { UCPProduct } from '../src/types/product.js';

const GATEWAY_URL = process.env['GATEWAY_URL'] ?? 'http://localhost:3000';
const AGENT_PROFILE = process.env['UCP_AGENT_PROFILE'] ?? 'https://agent.test/profile';

const canConnect = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${GATEWAY_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
};

describe.skipIf(process.env['INTEGRATION'] !== 'true')(
  'UCPClient integration (live gateway)',
  () => {
    let client: ConnectedClient;
    let isConnected: boolean;

    beforeAll(async () => {
      isConnected = await canConnect();
      if (!isConnected) return;

      client = await UCPClient.connect({
        gatewayUrl: GATEWAY_URL,
        agentProfileUrl: AGENT_PROFILE,
      });
    });

    it('gateway is reachable', () => {
      expect(isConnected).toBe(true);
    });

    describe('discovery + capabilities', () => {
      it('returns profile with capabilities', () => {
        expect(client.profile.ucp).toBeDefined();
        expect(client.profile.ucp.version).toBeDefined();
        expect(client.profile.ucp.capabilities.length).toBeGreaterThan(0);
      });

      it('detects checkout capability', () => {
        expect(client.checkout).not.toBeNull();
      });

      it('describeTools returns available tools', () => {
        const tools = client.describeTools();
        expect(tools.length).toBeGreaterThan(0);

        const toolNames = tools.map((t) => t.name);
        expect(toolNames).toContain('search_products');
        expect(toolNames).toContain('create_checkout');
      });

      it('returns payment handlers from profile', () => {
        expect(client.paymentHandlers).toBeDefined();
      });
    });

    describe('products', () => {
      let products: readonly UCPProduct[];

      it('search returns results', async () => {
        products = await client.products.search('shoes');
        expect(products.length).toBeGreaterThan(0);
      });

      it('products have expected shape', () => {
        const product = products[0]!;
        expect(product.id).toBeDefined();
        expect(product.title).toBeDefined();
        expect(typeof product.price_cents).toBe('number');
        expect(typeof product.in_stock).toBe('boolean');
      });

      it('get returns a single product', async () => {
        const id = products[0]!.id;
        const product = await client.products.get(id);
        expect(product.id).toBe(id);
        expect(product.title).toBeDefined();
      });
    });

    describe('full checkout lifecycle', () => {
      let session: CheckoutSession;
      let products: readonly UCPProduct[];

      beforeAll(async () => {
        products = await client.products.search('shoes');
      });

      it('creates a checkout session', async () => {
        session = await client.checkout!.create({
          line_items: [{ item: { id: products[0]!.id }, quantity: 1 }],
        });

        expect(session.id).toBeDefined();
        expect(session.status).toBe('incomplete');
        expect(session.line_items.length).toBeGreaterThan(0);
      });

      it('gets the checkout session', async () => {
        const fetched = await client.checkout!.get(session.id);
        expect(fetched.id).toBe(session.id);
        expect(fetched.status).toBe(session.status);
      });

      it('updates checkout with fulfillment context', async () => {
        const updated = await client.checkout!.update(session.id, {
          context: {
            address_country: 'US',
            address_region: 'CA',
            postal_code: '90210',
          },
        });

        expect(updated.id).toBe(session.id);
      });

      it('applies discount codes via convenience method', async () => {
        if (!client.checkout!.extensions.discount) return;

        const updated = await client.checkout!.applyDiscountCodes(session.id, ['TEST10']);
        expect(updated.id).toBe(session.id);
      });

      it('sets buyer and shipping for checkout readiness', async () => {
        session = await client.checkout!.update(session.id, {
          buyer: {
            first_name: 'Test',
            last_name: 'User',
            email: 'test@example.com',
          },
          fulfillment: {
            destinations: [
              {
                id: 'dest_home',
                address: {
                  street_address: '123 Main St',
                  address_locality: 'Los Angeles',
                  address_region: 'CA',
                  postal_code: '90210',
                  address_country: 'US',
                },
              },
            ],
            methods: [{ id: 'default', type: 'shipping' }],
          },
        });

        expect(session.id).toBeDefined();
      });

      it('completes checkout with payment', async () => {
        const handlerNamespaces = Object.keys(client.paymentHandlers);
        if (handlerNamespaces.length === 0) return;

        const firstHandlers = client.paymentHandlers[handlerNamespaces[0]!];
        if (!firstHandlers || firstHandlers.length === 0) return;
        const handler = firstHandlers[0]!;

        try {
          const completed = await client.checkout!.complete(session.id, {
            payment: {
              instruments: [
                {
                  id: 'instr_test',
                  handler_id: handler.id,
                  type: 'offline',
                  credential: { type: 'token', token: 'success_token' },
                },
              ],
            },
          });

          expect(['completed', 'complete_in_progress']).toContain(completed.status);

          if (completed.order && client.order) {
            const order = await client.order.get(completed.order.id);
            expect(order.id).toBe(completed.order.id);
          }
        } catch (err) {
          if (err instanceof UCPEscalationError) {
            expect(err.continue_url).toBeDefined();
          }
        }
      });
    });

    describe('cancel checkout', () => {
      it('cancels a session', async () => {
        const products = await client.products.search('shoes');
        const sess = await client.checkout!.create({
          line_items: [{ item: { id: products[0]!.id }, quantity: 1 }],
        });

        try {
          const cancelled = await client.checkout!.cancel(sess.id);
          expect(cancelled.status).toBe('canceled');
        } catch (err) {
          expect(err).toBeInstanceOf(UCPError);
        }
      });
    });
  },
);
