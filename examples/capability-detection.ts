/**
 * Capability detection — show what a UCP server supports.
 *
 * Usage:
 *   npx tsx examples/capability-detection.ts
 */

import { UCPClient } from '../src/index.js';

const GATEWAY_URL = process.env['GATEWAY_URL'] ?? 'http://localhost:3000';
const AGENT_PROFILE = process.env['AGENT_PROFILE'] ?? 'https://agent.example.com/.well-known/ucp';

async function main() {
  const client = await UCPClient.connect({
    gatewayUrl: GATEWAY_URL,
    agentProfileUrl: AGENT_PROFILE,
  });

  console.log('UCP Version:', client.profile.ucp.version);
  console.log('');

  console.log('Capabilities:');
  console.log('  Checkout:', client.checkout ? 'YES' : 'no');

  if (client.checkout) {
    console.log('    Fulfillment:', client.checkout.extensions.fulfillment ? 'YES' : 'no');
    console.log('    Discount:', client.checkout.extensions.discount ? 'YES' : 'no');
    console.log('    Buyer Consent:', client.checkout.extensions.buyerConsent ? 'YES' : 'no');
    console.log('    AP2 Mandate:', client.checkout.extensions.ap2Mandate ? 'YES' : 'no');
  }

  console.log('  Order:', client.order ? 'YES' : 'no');
  console.log('  Identity Linking:', client.identityLinking ? 'YES' : 'no');
  console.log('');

  const handlerNamespaces = Object.keys(client.paymentHandlers);
  console.log(
    'Payment Handlers:',
    handlerNamespaces.length > 0 ? handlerNamespaces.join(', ') : 'none',
  );
  console.log('');

  console.log('Signing Keys (for webhook verification):');
  if (client.signingKeys.length === 0) {
    console.log('  none');
  } else {
    for (const key of client.signingKeys) {
      console.log(
        `  kid=${key.kid ?? '(none)'}  alg=${key.alg ?? '(none)'}  crv=${key.crv ?? '(none)'}`,
      );
    }
  }
  console.log('');

  console.log('Available tools for agent:');
  for (const tool of client.describeTools()) {
    console.log(`  ${tool.name} (${tool.capability}) — ${tool.description}`);
  }
}

main().catch(console.error);
