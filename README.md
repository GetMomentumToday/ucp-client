# @omnix/ucp-client

[![npm version](https://img.shields.io/npm/v/@omnix/ucp-client.svg)](https://www.npmjs.com/package/@omnix/ucp-client)
[![CI](https://github.com/OmnixHQ/ucp-client/actions/workflows/ci.yml/badge.svg)](https://github.com/OmnixHQ/ucp-client/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)

Capability-aware TypeScript client for any [UCP](https://ucp.dev)-compliant server.

Connects to a UCP server, discovers what it supports, and exposes only the available tools to your agent.

## Install

```bash
npm install @omnix/ucp-client
```

## Quick Start

```typescript
import { UCPClient } from '@omnix/ucp-client';

const client = await UCPClient.connect({
  gatewayUrl: 'https://shoes-store.example.com/ucp',
  agentProfileUrl: 'https://our-platform.com/.well-known/ucp',
});

// Only capabilities the server supports are non-null
if (client.checkout) {
  const session = await client.checkout.create({
    line_items: [{ item: { id: 'prod-001' }, quantity: 1 }],
  });
}
```

## Integration Guide

### Using with a UCP gateway

Start your UCP-compliant server (e.g., [omnix-gateway](https://github.com/OmnixHQ/omnix-gateway)):

```bash
# Start the gateway
cd omnix-gateway
docker compose up -d
# Gateway is now at http://localhost:3000
```

Connect the client:

```typescript
import { UCPClient } from '@omnix/ucp-client';

const client = await UCPClient.connect({
  gatewayUrl: 'http://localhost:3000',
  agentProfileUrl: 'https://your-platform.com/.well-known/ucp',
});
```

`connect()` calls `GET /.well-known/ucp` automatically and reads the server's capabilities.

### Checking what the server supports

```typescript
// Capabilities are null when the server doesn't support them
client.checkout; // CheckoutCapability | null
client.order; // OrderCapability | null
client.identityLinking; // IdentityLinkingCapability | null
client.products; // ProductsCapability (always available)

// Check checkout extensions
if (client.checkout) {
  client.checkout.extensions.fulfillment; // boolean
  client.checkout.extensions.discount; // boolean
  client.checkout.extensions.buyerConsent; // boolean
  client.checkout.extensions.ap2Mandate; // boolean
}

// See payment handlers the server declared
console.log(Object.keys(client.paymentHandlers));
// e.g., ['com.google.pay', 'dev.shopify.shop_pay']
```

### Integrating with an AI agent

The client provides `describeTools()` for dynamic tool registration. Your agent framework calls it to know what the server supports, then registers only those tools:

```typescript
import { UCPClient } from '@omnix/ucp-client';
import type { ConnectedClient, ToolDescriptor } from '@omnix/ucp-client';

// 1. Connect to the merchant
const client = await UCPClient.connect({
  gatewayUrl: process.env.MERCHANT_GATEWAY_URL,
  agentProfileUrl: process.env.AGENT_PROFILE_URL,
});

// 2. Get available tools for this specific server
const tools = client.describeTools();
// [
//   { name: 'search_products',   capability: 'products',             description: 'Search product catalog' },
//   { name: 'create_checkout',   capability: 'checkout',             description: 'Create a checkout session' },
//   { name: 'set_fulfillment',   capability: 'checkout.fulfillment', description: 'Set fulfillment method' },
//   ...only tools the server supports
// ]

// 3. Register tools with your agent framework
for (const tool of tools) {
  agent.registerTool(tool.name, tool.description, async (params) => {
    return executeUCPTool(client, tool.name, params);
  });
}

// 4. Route tool calls to the right capability
function executeUCPTool(client: ConnectedClient, toolName: string, params: any) {
  switch (toolName) {
    case 'search_products':
      return client.products.search(params.query, params.filters);
    case 'create_checkout':
      return client.checkout!.create(params);
    case 'complete_checkout':
      return client.checkout!.complete(params.id, params.payment);
    case 'get_order':
      return client.order!.get(params.id);
    // ...
  }
}
```

### Full checkout flow

```typescript
// Search → Create → Fulfill → Complete → Track
const products = await client.products.search('running shoes');

const session = await client.checkout.create({
  line_items: [{ item: { id: products[0].id }, quantity: 1 }],
});

// Set shipping (only if server supports fulfillment)
if (client.checkout.extensions.fulfillment) {
  await client.checkout.setFulfillment(session.id, 'shipping');
  await client.checkout.selectDestination(session.id, 'dest_home');
  await client.checkout.selectFulfillmentOption(session.id, 'opt_express', 'dest_home');
}

// Apply discount (only if server supports discount)
if (client.checkout.extensions.discount) {
  await client.checkout.applyDiscountCodes(session.id, ['10OFF']);
}

// Complete with payment
const completed = await client.checkout.complete(session.id, {
  payment: {
    instruments: [
      {
        id: 'instr_1',
        handler_id: 'gpay',
        type: 'card',
        credential: { type: 'PAYMENT_GATEWAY', token: '...' },
      },
    ],
  },
});

// Track the order (only if server supports orders)
if (completed.order && client.order) {
  const order = await client.order.get(completed.order.id);
}
```

## How It Works

### Different server = different tools

The same client code works with any UCP server. The tools available depend on what the server declares:

**Server A** (checkout + fulfillment + order):

```typescript
const client = await UCPClient.connect({ gatewayUrl: 'https://shoes-store.example.com/ucp', ... });
client.describeTools();
// → search_products, get_product, create_checkout, ..., set_fulfillment, select_destination, get_order
```

**Server B** (checkout + discount only):

```typescript
const client = await UCPClient.connect({ gatewayUrl: 'https://digital-store.example.com/ucp', ... });
client.describeTools();
// → search_products, get_product, create_checkout, ..., apply_discount_codes
// NO fulfillment tools, NO order tools
```

### Connect flow

```
UCPClient.connect(config)
    │
    ├── 1. Validate config (URLs)
    ├── 2. Create HttpClient (shared HTTP layer)
    ├── 3. GET /.well-known/ucp → parse profile
    ├── 4. Read profile.capabilities[]
    ├── 5. Instantiate only supported capability classes:
    │       ├── dev.ucp.shopping.checkout      → CheckoutCapability
    │       ├── dev.ucp.shopping.order          → OrderCapability
    │       └── dev.ucp.common.identity_linking → IdentityLinkingCapability
    ├── 6. Always instantiate ProductsCapability (gateway-specific)
    └── 7. Return frozen ConnectedClient
```

## Capabilities

| Server Capability                 | Client Property                    | Methods                                                              |
| --------------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| `dev.ucp.shopping.checkout`       | `checkout`                         | `create`, `get`, `update`, `complete`, `cancel`                      |
| `dev.ucp.shopping.fulfillment`    | `checkout.extensions.fulfillment`  | `setFulfillment`, `selectDestination`, `selectFulfillmentOption`     |
| `dev.ucp.shopping.discount`       | `checkout.extensions.discount`     | `applyDiscountCodes`                                                 |
| `dev.ucp.shopping.buyer_consent`  | `checkout.extensions.buyerConsent` | consent fields in buyer payloads                                     |
| `dev.ucp.shopping.order`          | `order`                            | `get`                                                                |
| `dev.ucp.common.identity_linking` | `identityLinking`                  | `getAuthorizationUrl`, `exchangeCode`, `refreshToken`, `revokeToken` |
| _(gateway-specific)_              | `products`                         | `search`, `get`                                                      |

## Headers

Auto-attached on every request:

| Header                           | When                     |
| -------------------------------- | ------------------------ |
| `UCP-Agent`                      | Every request            |
| `Request-Id`                     | Every request            |
| `Content-Type: application/json` | When body is present     |
| `Idempotency-Key`                | POST and PUT requests    |
| `Request-Signature`              | When configured          |
| `Authorization: Bearer`          | When access token is set |

## Error Handling

```typescript
import { UCPError, UCPEscalationError, UCPIdempotencyConflictError } from '@omnix/ucp-client';

try {
  await client.checkout.complete(id, payload);
} catch (err) {
  if (err instanceof UCPEscalationError) {
    // Redirect buyer to err.continue_url for merchant-hosted checkout UI
  }
  if (err instanceof UCPIdempotencyConflictError) {
    // 409: same idempotency key reused with different request body
  }
  if (err instanceof UCPError) {
    // err.code — error code (e.g., 'PRODUCT_NOT_FOUND')
    // err.messages[] — all messages from the gateway
    // err.path — JSONPath to the field that caused the error
    // err.type — 'error' | 'warning' | 'info'
  }
}
```

## Development

```bash
npm install
npm run build        # tsdown (dual ESM + CJS)
npm test             # vitest
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format:check # prettier --check
npm run check:exports # attw (validates exports map)
npm run check:publish # publint (validates package)
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development workflow, code style, and CLA.

## License

[MIT](./LICENSE)
