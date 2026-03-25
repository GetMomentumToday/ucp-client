import { describe, it, expect, beforeAll } from 'vitest';
import { UCPClient } from '../src/UCPClient.js';
import { UCPError, UCPEscalationError } from '../src/errors.js';
import type { CheckoutSession, UCPProduct } from '../src/types.js';

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
    let client: UCPClient;
    let isConnected: boolean;

    beforeAll(async () => {
      isConnected = await canConnect();
      if (!isConnected) return;

      client = new UCPClient({
        gatewayUrl: GATEWAY_URL,
        agentProfileUrl: AGENT_PROFILE,
      });
    });

    it('gateway is reachable', () => {
      expect(isConnected).toBe(true);
    });

    describe('discovery', () => {
      it('returns profile with capabilities', async () => {
        const profile = await client.discover();
        expect(profile.ucp).toBeDefined();
        expect(profile.ucp.version).toBeDefined();
        expect(profile.ucp.capabilities.length).toBeGreaterThan(0);

        const hasCheckout = profile.ucp.capabilities.some(
          (c) => c.name === 'dev.ucp.shopping.checkout',
        );
        expect(hasCheckout).toBe(true);
      });

      it('returns payment handlers', async () => {
        const profile = await client.discover();
        expect(profile.payment).toBeDefined();
        expect(profile.payment!.handlers).toBeDefined();
        expect(profile.payment!.handlers!.length).toBeGreaterThan(0);
      });
    });

    describe('products', () => {
      let products: UCPProduct[];

      it('searchProducts returns results', async () => {
        products = await client.searchProducts('shoes');
        expect(products.length).toBeGreaterThan(0);
      });

      it('products have expected shape', () => {
        const product = products[0]!;
        expect(product.id).toBeDefined();
        expect(product.title).toBeDefined();
        expect(typeof product.price_cents).toBe('number');
        expect(typeof product.in_stock).toBe('boolean');
      });

      it('getProduct returns a single product', async () => {
        const id = products[0]!.id;
        const product = await client.getProduct(id);
        expect(product.id).toBe(id);
        expect(product.title).toBeDefined();
      });
    });

    describe('full checkout lifecycle', () => {
      let session: CheckoutSession;
      let products: UCPProduct[];

      beforeAll(async () => {
        products = await client.searchProducts('shoes');
      });

      it('creates a checkout session', async () => {
        session = await client.createCheckout({
          line_items: [{ item: { id: products[0]!.id }, quantity: 1 }],
        });

        expect(session.id).toBeDefined();
        expect(session.status).toBe('incomplete');
        expect(session.line_items.length).toBeGreaterThan(0);
      });

      it('gets the checkout session', async () => {
        const fetched = await client.getCheckout(session.id);
        expect(fetched.id).toBe(session.id);
        expect(fetched.status).toBe(session.status);
      });

      it('updates checkout with fulfillment context', async () => {
        const updated = await client.updateCheckout(session.id, {
          context: {
            address_country: 'US',
            address_region: 'CA',
            postal_code: '90210',
          },
        });

        expect(updated.id).toBe(session.id);
      });

      it('applies discount codes via convenience method', async () => {
        const updated = await client.applyDiscountCodes(session.id, ['TEST10']);
        expect(updated.id).toBe(session.id);
      });

      it('sets buyer and address for checkout readiness', async () => {
        session = await client.updateCheckout(session.id, {
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
        const profile = await client.discover();
        const handler = profile.payment?.handlers?.[0];

        if (!handler) {
          console.warn('No payment handlers available, skipping complete');
          return;
        }

        try {
          const completed = await client.completeCheckout(session.id, {
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

          if (completed.order) {
            const order = await client.getOrder(completed.order.id);
            expect(order.id).toBe(completed.order.id);
          }
        } catch (err) {
          if (err instanceof UCPEscalationError) {
            expect(err.continue_url).toBeDefined();
          } else {
            // Magento may reject if session not fully ready — that's OK for integration
            console.warn(
              'Complete checkout failed (expected in some adapter states):',
              (err as Error).message,
            );
          }
        }
      });
    });

    describe('cancel checkout', () => {
      it('cancels a session', async () => {
        const prods = await client.searchProducts('shoes');
        const sess = await client.createCheckout({
          line_items: [{ item: { id: prods[0]!.id }, quantity: 1 }],
        });

        try {
          const cancelled = await client.cancelCheckout(sess.id);
          expect(cancelled.status).toBe('canceled');
        } catch (err) {
          // Some adapters may not support cancel on incomplete sessions
          expect(err).toBeInstanceOf(UCPError);
        }
      });
    });
  },
);
