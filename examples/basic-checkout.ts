/**
 * Basic checkout flow — connect, create checkout, complete.
 *
 * Usage:
 *   npx tsx examples/basic-checkout.ts
 *
 * Requires a running UCP-compliant server at GATEWAY_URL.
 */

import { UCPClient, UCPEscalationError } from '../src/index.js';

const GATEWAY_URL = process.env['GATEWAY_URL'] ?? 'http://localhost:3000';
const AGENT_PROFILE = process.env['AGENT_PROFILE'] ?? 'https://agent.example.com/.well-known/ucp';

async function main() {
  const client = await UCPClient.connect({
    gatewayUrl: GATEWAY_URL,
    agentProfileUrl: AGENT_PROFILE,
  });

  console.log(
    'Connected. Available tools:',
    client.describeTools().map((t) => t.name),
  );

  if (!client.checkout) {
    console.log('Server does not support checkout.');
    return;
  }

  const session = await client.checkout.create({
    line_items: [{ item: { id: 'prod_roses' }, quantity: 1 }],
  });
  console.log(`Checkout created: ${session.id} (status: ${session.status})`);

  if (client.checkout.extensions.fulfillment) {
    await client.checkout.setFulfillment(session.id, 'shipping');
    console.log('Fulfillment set to shipping');
  }

  try {
    const completed = await client.checkout.complete(session.id, {
      payment: {
        instruments: [
          {
            id: 'instr_1',
            handler_id: 'mock',
            type: 'offline',
            credential: { type: 'token', token: 'tok_test' },
          },
        ],
      },
    });
    console.log(`Checkout completed! Order: ${completed.order?.id}`);

    if (completed.order && client.order) {
      const order = await client.order.get(completed.order.id);
      console.log(`Order status: ${order.id}`);
    }
  } catch (err) {
    if (err instanceof UCPEscalationError) {
      console.log(`Escalation required: redirect buyer to ${err.continue_url}`);
    } else {
      throw err;
    }
  }
}

main().catch(console.error);
