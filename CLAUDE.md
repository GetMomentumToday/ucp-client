# UCPClient — Project Rules

## What This Is

`@omnixhq/ucp-client` is a capability-aware TypeScript HTTP client for any UCP-compliant server.
It is a **library, not a server** — no port, no process, no Docker container.

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
  http.ts          — Shared HttpClient (headers, idempotency, error parsing)
  errors.ts        — UCPError, UCPEscalationError, UCPIdempotencyConflictError, UCPOAuthError
  schemas.ts       — Zod schemas (SDK re-exports)
  UCPClient.ts     — connect() → ConnectedClient with describeTools()
  index.ts         — Public API
```

### Capability Mapping

| Server Capability                 | Client Property          | Null when absent      |
| --------------------------------- | ------------------------ | --------------------- |
| `dev.ucp.shopping.checkout`       | `client.checkout`        | Yes                   |
| `dev.ucp.shopping.order`          | `client.order`           | Yes                   |
| `dev.ucp.common.identity_linking` | `client.identityLinking` | Yes                   |
| _(gateway-specific)_              | `client.products`        | No (always available) |

Extensions (`fulfillment`, `discount`, `buyerConsent`, `ap2Mandate`) are booleans on `checkout.extensions`.

## Project Context Maintenance

The canonical project context file is `docs/project-context.md`. For any material change — architecture, new modules, new exports, auth flows, or data-model behavior — update `docs/project-context.md` in the same workstream. Do not leave context updates implicit.

## Workflow

### Jira Intake + User Approval Gate

Before starting any implementation:

1. Ask whether the work already exists in Jira.
2. If not, draft a Jira ticket before implementation starts. Use `docs/jira-template.md` as the template. Every ticket must include an original estimate in hours.
3. For large work, create an Epic first and organize implementation tickets under it.
4. If work depends on other tickets, add explicit Jira links (`blocks`, `is blocked by`, `relates to`).
5. Share the ticket or Epic breakdown with the user and wait for explicit approval (`yes`, `approved`, `go ahead`).
6. Only start implementation after approval.
7. When implementation starts, immediately transition the ticket to `In Development`.
8. If scope changes materially during work, stop, update the Jira ticket, and re-confirm before continuing.

### Plan Mode

Enter plan mode for any non-trivial task (3+ steps or architectural decisions). If something goes sideways, stop and re-plan — don't keep pushing.

### Subagent Strategy

- Use subagents to keep the main context window clean.
- Offload research, exploration, and parallel analysis to subagents.
- One focused task per subagent.

### Verification Before Done

- Never mark a task complete without proving it works.
- Run tests, check logs, demonstrate correctness.
- When asked to review a ticket, treat it as a readiness review by default.
- Before starting a readiness review, transition the ticket to `CR In Progress`.
- Check whether a GitHub PR exists; create one if it doesn't.
- Verify the implementation against the ticket's acceptance criteria and Definition of Done.
- Update the Jira description to mark completed AC and DoD items explicitly.
- After a successful review, add a Jira comment stating the PR can be approved.
- If readiness review passes and the user didn't ask to stop before merge, merge the PR.
- When ticket work is complete and deployment is pending, transition to `Pending Deployment`.

### Self-Improvement

After any correction from the user, update `tasks/lessons.md` with the pattern. Write rules that prevent the same mistake. Review lessons at session start.

## Work Management

1. **Jira First** — Jira is the canonical work tracker. Draft the ticket before implementation.
2. **Branch from Jira key** — Name branches from the ticket key and summary slug, e.g. `UCPM-239-fix-ucp-agent-header`.
3. **One commit per small scope** — Commit after each small, verified, reviewable change inside a ticket.
4. **Include ticket key** — Put the Jira ticket key in progress updates and commit messages where relevant.
5. **Track progress** — Keep ticket status reflected in Jira as you work.

## Git Workflow

**NEVER push directly to `main`.** All changes go through a branch + PR:

```bash
git checkout -b <type>/<jira-key>-<short-description>
# make changes
git add <files>
git commit -m "<type>: <description>"
git push -u origin <branch>
gh pr create --title "<type>: <description>" --body "..."
```

Commit types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

Release-please reads conventional commits and opens a Release PR automatically on merge to `main`. Merge the Release PR → npm publish fires.

## Code Rules

### Pre-commit Hooks

`husky` + `lint-staged` run automatically on every commit:

- **lint-staged**: runs `prettier --check` and `eslint --max-warnings 0` on staged `*.ts` and `*.md` files
- **typecheck**: runs `tsc --noEmit` (full project) on every commit

Hooks install automatically via `prepare` script on `npm install`. Do not bypass with `--no-verify`.

### No Descriptive Comments

Enforced by `scripts/no-descriptive-comments.sh`. Comments must explain WHY, never WHAT.

### Code Quality

- Optimize for readability first. Code must be easy to read before it is clever.
- Prefer straightforward control flow, shallow nesting, and explicit data flow.
- Function names must explain intent without requiring surrounding context.
- Target ~20–30 lines per function. Extract helpers with meaningful names when logic grows.
- A function should do one coherent thing. Avoid hidden side effects.
- Prefer explicit contracts, validation, and typed boundaries over implicit assumptions.

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

## Framework Adapters

Five subpath exports ship zero-dependency framework adapters:

| Subpath                         | Adapter fn(s)                                  |
| ------------------------------- | ---------------------------------------------- |
| `@omnixhq/ucp-client/openai`    | `toOpenAITools`, `executeOpenAIToolCall`       |
| `@omnixhq/ucp-client/anthropic` | `toAnthropicTools`, `executeAnthropicToolCall` |
| `@omnixhq/ucp-client/vercel-ai` | `toVercelAITools`                              |
| `@omnixhq/ucp-client/langchain` | `toLangChainTools`                             |
| `@omnixhq/ucp-client/mcp`       | `toMCPTools`, `executeMCPToolCall`             |

No external SDK imports — adapters are pure TypeScript mappings over `AgentTool[]`.

## Build & Test

```bash
npm install
npm run build        # tsdown (dual ESM + CJS)
npm test             # vitest run
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format:check # prettier --check
npm run check:exports # attw (validates exports map)
npm run check:publish # publint (validates package)
```

## Dependencies

| Package                | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `@ucp-js/sdk`          | UCP spec types and Zod schemas                    |
| `zod`                  | Runtime validation of gateway responses           |
| Node 22 native `fetch` | HTTP calls                                        |
| `node:crypto`          | `randomUUID()` for idempotency-key and request-id |

## Backward Compatibility (CRITICAL)

`@omnixhq/ucp-client` is a **public npm library**. Every published minor and patch release must be fully backward compatible. Breaking changes require a major version bump and must be explicitly agreed with the user before implementation.

### What counts as a breaking change

- Removing or renaming any export from `src/index.ts` or any adapter subpath
- Removing or renaming a public interface property or method
- Changing a method signature in a way that breaks existing call sites (new required parameter, changed return type, narrowed accepted type)
- Changing the shape of `AgentTool`, `ConnectedClient`, or any capability class that consumers depend on
- Removing or renaming a subpath export (`/openai`, `/anthropic`, `/vercel-ai`, `/langchain`, `/mcp`)
- Throwing where previously resolving, or resolving where previously throwing
- Changing error class hierarchy in a way that breaks `instanceof` checks

### What is safe

- Adding new optional properties to existing interfaces (`readonly newProp?: T`)
- Adding new exports to `index.ts` or a subpath
- Adding new methods to a capability class
- Adding new subpath exports
- Internal refactors that do not touch `index.ts` or adapter surfaces
- Bug fixes that correct behavior that was never documented or intended

### Before any change to the public API surface

1. Check `src/index.ts` and all adapter files to understand what is currently exported.
2. Run `npm run check:exports` and `npm run check:publish` after the change.
3. If the change is breaking, stop and discuss with the user. Do not proceed without explicit approval.
4. Add or update tests that cover the old call signature to confirm it still works.

### Semver

| Change type     | Version bump                             |
| --------------- | ---------------------------------------- |
| Breaking change | major (`X.0.0`) — requires user approval |
| New feature     | minor (`0.X.0`)                          |
| Bug fix / patch | patch (`0.0.X`)                          |

Release-please derives the version bump automatically from conventional commit types. Use `feat:` for minor, `fix:` for patch. For breaking changes, add `BREAKING CHANGE:` in the commit body — release-please will bump major.

## Core Principles

- **Simplicity First** — Make every change as simple as possible. Minimal code impact.
- **No Laziness** — Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact** — Changes should only touch what's necessary.
- **Public Contract** — This is a published library. Consumers depend on the API surface. Never break it silently.
