# UCPClient — Project Rules

## What This Is

`@omnixhq/ucp-client` is a capability-aware TypeScript HTTP client for any UCP-compliant server.
It is a **library, not a server** — no port, no process, no Docker container.

## Architecture

- **Single package**: `src/` at root, no monorepo
- **Runtime**: Node 22+ native `fetch` (no Axios, no ky)
- **Validation**: Zod schemas via `@omnixhq/ucp-js-sdk` for runtime response validation
- **Capability-aware**: `UCPClient.connect()` discovers server capabilities and exposes only supported features
- **Build**: tsdown → dual ESM (`.js`) + CJS (`.cjs`) with `.d.ts` + `.d.cts` declarations

### File Structure

```
src/
  types/           — Domain-split types (config, checkout, order, payment, identity-linking, common)
  capabilities/    — CheckoutCapability, OrderCapability, IdentityLinkingCapability
  adapters/        — Framework adapters (openai, anthropic, vercel-ai, langchain, mcp, catch-errors)
  http.ts          — Shared HttpClient (headers, idempotency, error parsing)
  errors.ts        — UCPError, UCPEscalationError, UCPIdempotencyConflictError, UCPOAuthError
  schemas.ts       — Zod schemas (SDK re-exports)
  agent-tools.ts   — AgentTool interface, getAgentTools(), JsonSchema
  UCPClient.ts     — connect() → ConnectedClient with describeTools()
  index.ts         — Public API

scripts/
  agents/          — Per-adapter example scripts (run in CI): openai, anthropic, mcp, vercel-ai, langchain
  agent-demo.ts    — Full end-to-end demo with real Anthropic Claude (manual only, costs API credits)
  mock-ucp-server.ts — Local mock server for integration tests
```

### Capability Mapping

| Server Capability                 | Client Property          | Null when absent |
| --------------------------------- | ------------------------ | ---------------- |
| `dev.ucp.shopping.checkout`       | `client.checkout`        | Yes              |
| `dev.ucp.shopping.order`          | `client.order`           | Yes              |
| `dev.ucp.common.identity_linking` | `client.identityLinking` | Yes              |

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
- If any public export changed: rebuild and regenerate the API baseline (`npx api-extractor run --local`), commit `docs/ucp-client.api.md` alongside the code.
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

**NEVER manually edit the `version` field in `package.json` or `.release-please-manifest.json`.** Version bumps are fully automated — release-please derives the next version from conventional commits and updates these files in the Release PR. Manual edits will conflict with or confuse the automation.

## Code Rules

### Pre-commit Hooks

`husky` + `lint-staged` run automatically on every commit:

- **lint-staged**: runs `prettier --check` and `eslint --max-warnings 0` on staged `src/**/*.ts`,
  `*.md`, and `*.json` files
- **typecheck**: runs `tsc --noEmit` (full project) on every commit

Hooks install automatically via `prepare` script on `npm install`. Do not bypass with `--no-verify`.

### Backward Compatibility (CRITICAL)

This is a **public npm library**. Every change to the public API surface must be intentional and explicit.

**Triggers — regenerate the API baseline whenever you:**

- Add, remove, or rename any export in `src/index.ts`
- Change a public interface (add/remove/rename fields)
- Change a public function signature (parameters, return type)
- Add a new subpath export

**How to update the baseline:**

```bash
npm run build
npx api-extractor run --local   # rewrites docs/ucp-client.api.md
git add docs/ucp-client.api.md  # commit alongside the code change
```

CI (`Check API surface` step) re-generates the report and runs `git diff --exit-code` — any uncommitted diff fails the build. The baseline file (`docs/ucp-client.api.md`) is the source of truth for what consumers depend on.

**Semver classification:**

- New optional param / new optional field / new export → `feat:` → minor bump
- Removed export / changed required signature / narrowed type → `BREAKING CHANGE:` in commit body → major bump
- Bug fix with no API change → `fix:` → patch bump

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

All adapters accept an optional `AdapterOptions` (`catchErrors?: boolean`). When `catchErrors: true`, errors are returned as `ToolErrorResult` objects instead of throwing — agents can observe and recover from failures without crashing the stream. Default is `false` (original throw behavior preserved).

No external SDK imports — adapters are pure TypeScript mappings over `AgentTool[]`.

## Build & Test

```bash
npm install
npm run build        # tsdown (dual ESM + CJS)
npm test             # vitest run
npm run test:types   # vitest run --typecheck.only (type-level tests in src/__tests__/types/)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format:check # prettier --check
npm run check:exports # attw (validates exports map)
npm run check:publish # publint (validates package)
```

## Dependencies

| Package                | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `@omnixhq/ucp-js-sdk`  | UCP spec types and Zod schemas                    |
| `zod`                  | Runtime validation of gateway responses           |
| Node 22 native `fetch` | HTTP calls                                        |
| `node:crypto`          | `randomUUID()` for idempotency-key and request-id |

## Core Principles

- **Simplicity First** — Make every change as simple as possible. Minimal code impact.
- **No Laziness** — Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact** — Changes should only touch what's necessary.
