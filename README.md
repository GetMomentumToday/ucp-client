# @momentum/ucp-client

Typed TypeScript HTTP client for the UCP Gateway REST API.

## Overview

`@momentum/ucp-client` is a thin, typed wrapper over the [ucp-gateway](https://github.com/GetMomentumToday/ucp-gateway) HTTP surface. It provides:

- Auto-attached UCP headers (`UCP-Agent`, `idempotency-key`, `request-id`)
- Typed inputs/outputs with Zod runtime validation
- `requires_escalation` detection with `continue_url` extraction
- UCP `messages[]` error parsing into typed `UCPError`

## Quick Start

```typescript
import { UCPClient } from '@momentum/ucp-client';

const client = new UCPClient({
  gatewayUrl: 'http://localhost:3000',
  agentProfileUrl: 'https://agent.example.com/profile.json',
});

const profile = await client.discover();
const products = await client.searchProducts('waterproof jacket', { max_price_cents: 10000 });
const session = await client.createCheckout({
  line_items: [{ item: { id: products[0].id }, quantity: 1 }],
});
```

## Development

```bash
npm install
npm run build        # Compile TypeScript
npm test             # Run tests
npm run typecheck    # Type check
npm run lint         # ESLint
npm run format:check # Prettier check
```

## API

| Method                            | Gateway Endpoint                       |
| --------------------------------- | -------------------------------------- |
| `discover()`                      | `GET /.well-known/ucp`                 |
| `searchProducts(query, filters?)` | `GET /ucp/products?q=...`              |
| `getProduct(id)`                  | `GET /ucp/products/:id`                |
| `createCheckout(payload)`         | `POST /checkout-sessions`              |
| `getCheckout(id)`                 | `GET /checkout-sessions/:id`           |
| `updateCheckout(id, patch)`       | `PUT /checkout-sessions/:id`           |
| `completeCheckout(id, payment)`   | `POST /checkout-sessions/:id/complete` |
| `cancelCheckout(id)`              | `POST /checkout-sessions/:id/cancel`   |
| `getOrder(id)`                    | `GET /orders/:id`                      |

## License

Private — Momentum
