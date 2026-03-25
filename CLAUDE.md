# UCPClient — Project Rules

## What This Is

`@momentum/ucp-client` is a typed TypeScript HTTP client wrapping the ucp-gateway REST API.
It is a **library, not a server** — no port, no process, no Docker container.

## Architecture

- **Monorepo**: npm workspaces, single package at `packages/ucp-client`
- **Runtime**: Node 22+ native `fetch` (no Axios, no ky)
- **Validation**: Zod schemas for runtime response validation
- **Headers**: Auto-attached `UCP-Agent`, `idempotency-key`, `request-id` on every request

### Gateway HTTP Surface (9 endpoints)

```
GET  /.well-known/ucp                    → discover()
GET  /ucp/products?q=...                 → searchProducts()
GET  /ucp/products/:id                   → getProduct()
POST /checkout-sessions                  → createCheckout()
GET  /checkout-sessions/:id              → getCheckout()
PUT  /checkout-sessions/:id              → updateCheckout()
POST /checkout-sessions/:id/complete     → completeCheckout()
POST /checkout-sessions/:id/cancel       → cancelCheckout()
GET  /orders/:id                         → getOrder()
```

## Code Rules

### No Descriptive Comments

Enforced by `scripts/no-descriptive-comments.sh`. Comments must explain WHY, never WHAT.

### Immutability

All interfaces use `readonly` properties. Never mutate existing objects — create new ones.

### File Size

200–400 lines typical, 800 max. Extract utilities from large modules.

### Error Handling

- Parse gateway `messages[]` errors into typed `UCPError`
- Detect `requires_escalation` status and throw `UCPEscalationError`
- Never silently swallow errors

### Testing

- Vitest for unit tests, 80% coverage threshold
- Mock `fetch` for unit tests, real gateway for integration tests
- TDD: write test first (RED), implement (GREEN), refactor (IMPROVE)

## Build & Test

```bash
npm install
npm run build        # tsc
npm test             # vitest run
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format:check # prettier --check
```

## Build Order

Single package — just `packages/ucp-client`.

## Dependencies

| Package                | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `zod`                  | Runtime validation of gateway responses           |
| Node 22 native `fetch` | HTTP calls                                        |
| `node:crypto`          | `randomUUID()` for idempotency-key and request-id |
