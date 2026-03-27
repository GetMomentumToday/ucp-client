# @getmomentumtoday/ucp-client

Capability-aware TypeScript client for the [UCP Gateway](https://github.com/GetMomentumToday/ucp-gateway).

Connects to a UCP server, discovers what it supports, and exposes only the available tools to your agent.

## Quick Start

```typescript
import { UCPClient } from '@getmomentumtoday/ucp-client';

const client = await UCPClient.connect({
  gatewayUrl: 'https://shoes-store.example.com/ucp',
  agentProfileUrl: 'https://our-platform.com/.well-known/ucp',
});

// Only use what the server supports
if (client.checkout) {
  const session = await client.checkout.create({
    line_items: [{ item: { id: 'prod-001' }, quantity: 1 }],
  });
}
```

## How It Works

### Step 1: Connect to a merchant

```typescript
const client = await UCPClient.connect({
  gatewayUrl: 'https://shoes-store.example.com/ucp',
  agentProfileUrl: 'https://our-platform.com/.well-known/ucp',
});
```

`connect()` calls `GET /.well-known/ucp` and reads the server's discovery profile:

```json
{
  "ucp": {
    "version": "2026-01-23",
    "capabilities": [
      { "name": "dev.ucp.shopping.checkout", "version": "2026-01-23" },
      { "name": "dev.ucp.shopping.fulfillment", "version": "2026-01-23" },
      { "name": "dev.ucp.shopping.order", "version": "2026-01-23" }
    ]
  }
}
```

This server has **checkout + fulfillment + order** but no identity linking, no discount, no buyer consent.

### Step 2: Client exposes only what the server supports

```typescript
client.checkout; // CheckoutCapability  ← server has it
client.order; // OrderCapability     ← server has it
client.identityLinking; // null                ← server doesn't have it
client.paymentHandlers; // PaymentHandler[]    ← from profile
```

The checkout capability knows which extensions are available:

```typescript
client.checkout.extensions.fulfillment; // true   ← server has it
client.checkout.extensions.discount; // false  ← server doesn't
client.checkout.extensions.buyerConsent; // false  ← server doesn't
```

### Step 3: Agent asks "what tools do I have?"

```typescript
const tools = client.describeTools();
```

Returns only the tools this server supports:

```typescript
[
  { name: 'search_products', capability: 'products' },
  { name: 'get_product', capability: 'products' },
  { name: 'create_checkout', capability: 'checkout' },
  { name: 'get_checkout', capability: 'checkout' },
  { name: 'update_checkout', capability: 'checkout' },
  { name: 'complete_checkout', capability: 'checkout' },
  { name: 'cancel_checkout', capability: 'checkout' },
  { name: 'set_fulfillment', capability: 'checkout.fulfillment' },
  { name: 'select_destination', capability: 'checkout.fulfillment' },
  { name: 'select_fulfillment_option', capability: 'checkout.fulfillment' },
  { name: 'get_order', capability: 'order' },
  // NO apply_discount_codes    ← server doesn't support discount
  // NO identity linking tools  ← server doesn't support it
];
```

### Step 4: Agent uses the tools

```typescript
const products = await client.products.search('running shoes');

const session = await client.checkout.create({
  line_items: [{ item: { id: products[0].id }, quantity: 1 }],
});

await client.checkout.setFulfillment(session.id, 'shipping');

await client.checkout.complete(session.id, {
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

const order = await client.order.get(session.order.id);
```

### Different server = different tools

Connect to a different merchant that only has checkout + discount (no fulfillment, no order):

```typescript
const client2 = await UCPClient.connect({
  gatewayUrl: 'https://digital-store.example.com/ucp',
  agentProfileUrl: 'https://our-platform.com/.well-known/ucp',
});

client2.checkout; // CheckoutCapability
client2.checkout.extensions.discount; // true
client2.checkout.extensions.fulfillment; // false
client2.order; // null
client2.identityLinking; // null

client2.describeTools();
// [
//   search_products, get_product,
//   create_checkout, get_checkout, update_checkout, complete_checkout, cancel_checkout,
//   apply_discount_codes,         ← available here
//   // NO fulfillment tools
//   // NO order tools
// ]
```

## Connect Flow

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
import {
  UCPError,
  UCPEscalationError,
  UCPIdempotencyConflictError,
} from '@getmomentumtoday/ucp-client';

try {
  await client.checkout.complete(id, payload);
} catch (err) {
  if (err instanceof UCPEscalationError) {
    // Redirect buyer to err.continue_url
  }
  if (err instanceof UCPIdempotencyConflictError) {
    // 409: idempotency key reused with different body
  }
  if (err instanceof UCPError) {
    // err.code, err.messages[], err.path, err.contentType
  }
}
```

## Development

```bash
npm install
npm run build        # tsc
npm test             # vitest
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format:check # prettier --check
```

## License

Elastic License 2.0
