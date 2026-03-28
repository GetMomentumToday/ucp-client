# UCPClient — Project Rules

## What This Is

`@omnixhq/ucp-client` is a capability-aware TypeScript HTTP client for any UCP-compliant server.
It is a **library, not a server** — no port, no process, no Docker container.

## Git Workflow

- **Never push directly to `main`** — all changes go through a PR branch
- Branch naming: `feat/<description>`, `fix/<description>`, `chore/<description>`
- PRs require CI to pass before merging
- Use squash merge only

## Architecture

- **Single package**: `src/` at root, no monorepo
- **Runtime**: Node 22+ native `fetch` (no Axios, no ky)
- **Validation**: Zod schemas via `@ucp-js/sdk` for runtime response validation
- **Capability-aware**: `UCPClient.connect()` discovers server capabilities and exposes only supported features
- **Build**: tsdown → dual ESM (`.js`) + CJS (`.cjs`) with `.d.ts` + `.d.cts` declarations

### File Structure

```
src/
  types/           — Domain-split types (config, checkout, order, payment, identity-linking, common, product)
  capabilities/    — CheckoutCapability, OrderCapability, IdentityLinkingCapability, ProductsCapability
  adapters/        — Framework adapters: openai, anthropic, vercel-ai, langchain, mcp
  http.ts          — Shared HttpClient (headers, idempotency, error parsing)
  errors.ts        — UCPError, UCPEscalationError, UCPIdempotencyConflictError, UCPOAuthError
  schemas.ts       — Zod schemas (SDK re-exports)
  agent-tools.ts   — AgentTool interface + getAgentTools() returning per-capability tools
  UCPClient.ts     — connect() → ConnectedClient with describeTools() + getAgentTools()
  index.ts         — Public API
examples/          — Illustrative agent loop examples per framework
scripts/           — mock-ucp-server.ts, agent-demo.ts, test-gateway-connection.ts
```

### Capability Mapping

| Server Capability                 | Client Property          | Null when absent      |
| --------------------------------- | ------------------------ | --------------------- |
| `dev.ucp.shopping.checkout`       | `client.checkout`        | Yes                   |
| `dev.ucp.shopping.order`          | `client.order`           | Yes                   |
| `dev.ucp.common.identity_linking` | `client.identityLinking` | Yes                   |
| _(gateway-specific)_              | `client.products`        | No (always available) |

Extensions (`fulfillment`, `discount`, `buyerConsent`, `ap2Mandate`) are booleans on `checkout.extensions`.

### Framework Adapters (subpath exports)

| Import                            | Function(s)                                    |
| --------------------------------- | ---------------------------------------------- |
| `@omnixhq/ucp-client/openai`      | `toOpenAITools()`, `executeOpenAIToolCall()`    |
| `@omnixhq/ucp-client/anthropic`   | `toAnthropicTools()`, `executeAnthropicToolCall()` |
| `@omnixhq/ucp-client/vercel-ai`   | `toVercelAITools()`                            |
| `@omnixhq/ucp-client/langchain`   | `toLangChainTools()`                           |
| `@omnixhq/ucp-client/mcp`         | `toMCPTools()`, `executeMCPToolCall()`         |

All adapters are zero-dependency pure mappings — no external SDK imports.

## Code Rules

### No Descriptive Comments

Enforced by `scripts/no-descriptive-comments.sh`. Comments must explain WHY, never WHAT.

### Immutability

All interfaces use `readonly` properties. Never mutate existing objects — create new ones.

### File Size

200–400 lines typical, 800 max. Extract utilities from large modules.

### Error Handling

- Parse gateway `messages[]` errors into typed `UCPError` (with `type`, `path`, `content_type`, full `messages[]`)
- Detect `requires_escalation` status and throw `UCPEscalationError`
- Throw `UCPIdempotencyConflictError` on 409 responses
- Throw `UCPOAuthError` for identity linking failures
- Never silently swallow errors

### Testing

- Vitest for unit tests, 80% coverage threshold
- Mock `fetch` for unit tests, real gateway for integration tests
- TDD: write test first (RED), implement (GREEN), refactor (IMPROVE)

## Build & Test

```bash
npm install
npm run build        # tsdown (dual ESM + CJS)
npm test             # vitest run
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format:check # prettier --check
npm run check:exports # attw (validates exports map, node10 no-resolution ignored)
npm run check:publish # publint (validates package)
```

## Release Flow

```
Feature PR → merge to main → release-please opens Release PR → merge Release PR → npm publishes
```

- Versioning: conventional commits (`feat:` → minor, `fix:` → patch)
- Config: `release-please-config.json` + `.release-please-manifest.json`
- Publish: GitHub Actions `release.yml` with `NPM_TOKEN` + `RELEASE_PLEASE_TOKEN` secrets

## Dependencies

| Package                | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `@ucp-js/sdk`          | UCP spec types and Zod schemas                    |
| `zod`                  | Runtime validation of gateway responses           |
| Node 22 native `fetch` | HTTP calls                                        |
| `node:crypto`          | `randomUUID()` for idempotency-key and request-id |
