/**
 * Test connecting ucp-client to a live ucp-gateway.
 *
 * Usage:
 *   npx tsx scripts/test-gateway-connection.ts
 *
 * Requires gateway running at GATEWAY_URL (default: http://localhost:3000)
 */

import { UCPClient } from '../src/index.js';
import type { ConnectedClient } from '../src/index.js';

const GATEWAY_URL = process.env['GATEWAY_URL'] ?? 'http://localhost:3000';
const AGENT_PROFILE = 'https://test-agent.example.com/.well-known/ucp';

async function main() {
  console.log(`\n=== Connecting to ${GATEWAY_URL} ===\n`);

  let client: ConnectedClient;
  try {
    client = await UCPClient.connect({
      gatewayUrl: GATEWAY_URL,
      agentProfileUrl: AGENT_PROFILE,
    });
  } catch (err) {
    console.error('FAILED to connect:', (err as Error).message);
    process.exit(1);
  }

  console.log('Connected successfully!\n');

  console.log('--- Profile ---');
  console.log('UCP Version:', client.profile.ucp.version);
  console.log('Capabilities:', Object.keys(client.profile.ucp.capabilities ?? {}));
  console.log('');

  console.log('--- Capability Detection ---');
  console.log('  checkout:', client.checkout ? 'YES' : 'no');
  if (client.checkout) {
    console.log('    fulfillment:', client.checkout.extensions.fulfillment);
    console.log('    discount:', client.checkout.extensions.discount);
    console.log('    buyerConsent:', client.checkout.extensions.buyerConsent);
    console.log('    ap2Mandate:', client.checkout.extensions.ap2Mandate);
  }
  console.log('  order:', client.order ? 'YES' : 'no');
  console.log('  identityLinking:', client.identityLinking ? 'YES' : 'no');
  console.log('');

  console.log('--- Payment Handlers ---');
  console.log(JSON.stringify(client.paymentHandlers, null, 2));
  console.log('');

  console.log('--- Available Tools ---');
  for (const tool of client.describeTools()) {
    console.log(`  ${tool.name} (${tool.capability})`);
  }
  console.log('');

  if (!client.checkout) {
    console.log('No checkout capability — stopping here.');
    return;
  }

  console.log('--- Checkout Flow ---');

  console.log('Creating checkout with: prod_roses');

  const session = await client.checkout.create({
    line_items: [{ item: { id: 'prod_roses' }, quantity: 1 }],
  });
  console.log(`  Session: ${session.id} (status: ${session.status})`);

  console.log('Updating with buyer info...');
  const updated = await client.checkout.update(session.id, {
    buyer: {
      first_name: 'Test',
      last_name: 'Agent',
      email: 'test@example.com',
    },
    context: {
      address_country: 'US',
      address_region: 'CA',
      postal_code: '90210',
    },
  });
  console.log(`  Status after update: ${updated.status}`);

  if (client.checkout.extensions.fulfillment) {
    console.log('Setting fulfillment...');
    const fulfilled = await client.checkout.setFulfillment(session.id, 'shipping', {
      buyer: {
        first_name: 'Test',
        last_name: 'Agent',
        email: 'test@example.com',
      },
    });
    console.log(`  Status after fulfillment: ${fulfilled.status}`);
  }

  console.log(`\n  Final session status: ${updated.status}`);
  console.log('  (Skipping complete — no real payment handler for test)\n');

  console.log('Canceling session...');
  try {
    const canceled = await client.checkout.cancel(session.id);
    console.log(`  Status after cancel: ${canceled.status}`);
  } catch (err) {
    console.log(`  Cancel result: ${(err as Error).message}`);
  }

  console.log('\n=== Done ===\n');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
