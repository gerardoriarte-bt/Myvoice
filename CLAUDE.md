# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

My Voice is a multi-brand copy generation engine: a React SPA at the repo root and an
Express + Prisma + PostgreSQL API under `server/`. It takes a brand DNA profile (brief) and
produces channel-specific ad copy across 14 channels, then routes it through an internal
library and a client approval portal.

Codebase language: **code and comments are in Spanish** (user-facing strings, error messages,
and most comments). Match that when editing.

## Commands

Two separate npm projects. Root = frontend, `server/` = API.

```bash
# Frontend (root)
npm run dev            # Vite on :3000, proxies /api → localhost:3001
npm run build          # Vite production build — does NOT typecheck
npm run preview

# Backend (server/)
npm run dev            # tsx watch on :3001
npm run build          # tsc → server/dist
npm run prisma:generate
npm run prisma:migrate
npm run seed           # base workspace + admin; requires SEED_ADMIN_PASSWORD
npm run seed:lobueno   # full LoBueno mock brand (fixture in shared/lobuenoBrand.ts)
npm run smoke          # one real generation against the live provider — costs money
npm run backfill:tenancy      # dry-run; `-- --apply` to write
npm run backfill:telemetria   # fills cost/tokens on historical rows from outputJson
npm run backfill:slots        # infers slot/slotLabel on saved copy (heuristic)
npm run recrypt:keys          # encrypts any aiApiKey still stored in plaintext
npm run verify:isolation      # cross-tenant isolation suite; needs the API running
npm run verify:resiliencia    # retry/backoff/timeout against a fake client; spends no API credit
```

The four writing scripts (`backfill:*`, `recrypt:keys`) are **dry-run by default** and only
write with `-- --apply`, inside a single transaction.

**Typechecking is the only gate, and it takes three commands.** `npm run build` uses esbuild
and strips types without checking them, so type errors ship silently. Each project is checked
with the config it actually compiles with — the root tsconfig `exclude`s `server/`, because it
used to check the server with `moduleResolution: bundler` while the server emits NodeNext/CJS:

```bash
npx tsc --noEmit                                  # frontend
cd server && npx tsc --noEmit                     # server/src (strict)
cd server && npx tsc --noEmit -p tsconfig.scripts.json   # + scripts/ and prisma/ (strict)
```

Run the three before considering any change done. The root config is **not** `strict` yet:
React types are installed so the component tree is really checked, but turning on `strict`
raises far more errors than one sitting can pay, and has its own ticket (roadmap E2).
A gate that certifies green over code it does not read is worse than no gate — if you touch
the tsconfigs, verify with a probe file containing deliberate errors that the files you expect
are actually being read (`npx tsc --noEmit --listFiles`).

There are **no unit tests**, but there is CI: `.github/workflows/ci.yml` runs four jobs on every
push — the three type gates plus both builds (with a deliberate-error probe that fails if the
frontend gate stops reading files), `verify:resiliencia`, and `verify:isolation` against a
Postgres service container plus a `migrate diff` drift check. A fourth job checks that the
links between `CLAUDE.md` and `docs/*.md` resolve. Nothing in CI touches production or spends
AI credit. `verify:isolation` is the closest thing to an integration suite; run locally it
needs a running API and a throwaway database.

## Architecture

### Generation pipeline (`server/src/services/openaiService.ts`)

One request fans out through five LLM stages. Understanding this file plus `channels/` is the
fastest way to understand the product.

```
directorService   → CampaignSpine (concept, key message, angles) — one call per generation
  ↓ buildBrief()
per channel, concurrency-capped at 5 by an in-file semaphore:
  writer          → raw JSON variations (channel spec drives slots and budgets)
  validators.ts   → deterministic checks: char/word budgets, prohibitions, voseo
  criticService   → editorFlags per variation
  fixerService    → rewrites only flagged variations, then re-validates
  ↓
superCritic       → CoherenceReport across all channels
```

`generateCopyWithOpenAI` and `streamGenerateCopyWithOpenAI` are two wrappers over the same
`runGeneration`; the streaming one emits SSE `StreamEvent`s and is what the UI uses. A channel
that exhausts its retries emits `channel-error` (with `terminal`/`codigo`/`intentos`) and is
dropped from the result; `components/FailedChannelsPanel.tsx` offers to regenerate just those.
Retry, backoff and timeouts live in `aiClient.ts` — see below.

### Channel specs (`server/src/channels/`)

`specs/*.ts` are the source of truth for what each channel produces: `SlotSpec` defines slot
id, label, how many variations, and the char/word budget. `registry.ts` maps the `Platform`
enum value (e.g. `"Instagram Post"`) to its spec. `promptBuilder.ts` turns a spec + brief into
the system/user prompts. Changing a char limit means editing the spec, not a prompt.

Four channels emit production-instruction slots rather than publishable copy
(`visualBrief`, `animationBrief`, `structure`, `production`).

### Provider abstraction (`server/src/services/aiClient.ts`)

All four providers (openrouter/openai/anthropic/gemini) are driven through the OpenAI SDK by
swapping `baseURL`. Per-provider quirks are centralized here and detected from the client's
`baseURL`, so call sites stay clean: Anthropic rejects `response_format: json_object`, needs
an explicit `cache_control` breakpoint for prompt caching and an `anthropic-version` header,
and newer Claude models reject sampling params. `DEFAULT_MODELS` / `MINI_MODELS` set
production cost — the file documents why they must not be changed casually.

This file also owns resilience: `chatCompletionConRetry` is the **only** call site of
`chat.completions.create` in `server/src` (keep it that way), with exponential backoff +
equal jitter, honoring the provider's `retry-after`, a per-call timeout and per-channel /
per-generation time budgets (`TIEMPOS`, `REINTENTOS`, overridable by env). `clasificarError`
checks the terminal error *code* before the HTTP status, so `insufficient_quota` (a 429 on
OpenAI, a 402 on OpenRouter) is not retried; an unknown error is treated as terminal.
The SDK's own `maxRetries` is pinned to 0 so the two retry layers don't multiply.

Config resolution: a workspace's own `aiProvider`/`aiApiKey` wins; otherwise `serverAIConfig()`
from env. `pricing.ts` computes real per-stage cost, which is returned to the client **and** persisted
as queryable columns on `GenerationLog` (`costUsd`, `cachedTokens`, `model`, `provider`,
`stageBreakdown`, …). `GET /analytics/usage` reads them; `services/usageService.ts` turns
them into a per-period quota over `UsagePeriod`, gated by `QUOTA_ENFORCE` (default `false`
= observe and warn, don't block).

### Tenancy (`server/src/lib/tenancy.ts`, `server/src/middleware/auth.ts`)

A **workspace is a company**. Access comes from exactly one place: a `Membership(userId,
workspaceId, role)` row, with roles `OWNER` / `ADMIN` / `MEMBER` scoped to that workspace. A
user may have memberships in several workspaces (an agency admin invited into a client's
workspace). All members of a workspace see all brands (`Client`) in it.

Three middleware levels, composed in `routes/index.ts`:

- `authenticateToken` — valid JWT, sets `req.auth`. Only for routes touching the user's own session.
- `requireWorkspace` — **queries `Membership` on every request** and sets `req.tenant`. The
  token's `workspaceId` is a preference, never a permission: revoking a membership takes
  effect immediately instead of waiting out the 24 h token.
- `requireManager` — OWNER or ADMIN of the active workspace.

**Every handler that touches a resource by `id` must call a guard from `lib/tenancy.ts` first**
(`assertClientInWorkspace`, `assertVariationInWorkspace`, …). This is deliberately not a
generic middleware — the resource differs per endpoint, so the guard is visible in the diff.
Cross-tenant resources return **404, not 403**: a 403 confirms the id exists and turns the
endpoint into an existence oracle. Updates use `pickFields()` allow-lists so a body cannot
reassign `clientId` or `workspaceId`.

`User.role` and `User.clientId` are legacy columns kept only for the backfill; they authorize
nothing. `User.workspaceId` is the *active* workspace pointer, not a membership.

### Review portal

`ReviewSession` carries a `token` served at `GET /review/public/:token` with **no auth**. Any
data reachable from a review session is effectively public, so anything that adds items to a
session must be workspace-filtered.

### Frontend

No router. `App.tsx` (~1000 lines, the god component holding nearly all state) switches on
query params: `?review=<token>` renders `ReviewPortal`, `?invite=<token>` is picked up by the
login components. `isAdmin` derives from `canManageWorkspace(currentUser.role)` — the role in
the *active* workspace, refreshed via `authApi.me()` on mount and swapped by
`POST /auth/switch-workspace`.

`services/api.ts` wraps every call; a 401 clears localStorage and dispatches a
`vt:session-expired` event rather than hard-reloading.

`shared/lobuenoBrand.ts` is imported by both projects and must stay import-free — the two
tsconfigs differ.

## Gotchas

- **The server compiles to CommonJS.** `server/tsconfig.json` uses `module: NodeNext` and
  `server/package.json` has no `"type": "module"`, so despite the `.js` import specifiers the
  output is CJS and `require` order is preserved. `src/index.ts` depends on this: it runs
  `dotenv.config()` and a fatal env check *before* importing routes. Adding `"type": "module"`
  would hoist those imports and break the env check.
- `JWT_SECRET` and `ENCRYPTION_KEY` are mandatory; the process exits at boot without either,
  and `middleware/auth.ts` throws at module load. `ENCRYPTION_KEY` decrypts
  `Workspace.aiApiKey` (AES-256-GCM, `v1:iv:tag:ciphertext`): losing it means every tenant
  re-enters its own AI key. `lib/workspaceSecret.ts` is the single decryption point.
- Prisma client is a singleton in `server/src/lib/prisma.ts` — import it, don't construct one.
- `SavedVariation` now persists `slot`, `slotLabel`, `variationIndex` and `slotInferred`.
  `slotInferred = true` means the heuristic backfill guessed the slot from unit counts, not
  that the writer reported it — don't treat those rows as ground truth. `slotLabel` comes
  from `channels/registry.ts` (`resolveSlotLabel`), never from the request body.
- Uploads are written to the container's local disk (`server/uploads`), served via
  `express.static`. A disk-full incident already caused one production outage.
- Migrations must run in order with a data step between them:
  `20260826000000_workspace_memberships` → `npm run backfill:tenancy -- --apply` →
  `20260826000001_workspace_required` → `20260827000000_cost_quota_slot` → the two backfills
  (`backfill:telemetria`, `backfill:slots`). The `_workspace_required` one fails on purpose
  if orphan rows remain. See `docs/runbook-tenancy.md` and `docs/runbook-mejoras-h1.md`.
- `GenerationLog.workspaceId` is nullable **for now**: the migration backfills every existing
  row but defers `SET NOT NULL` to a later one. A `NULL` there means "written by old code",
  not "no workspace".

## Deployment

EC2 + Docker Compose behind a two-layer nginx (host terminates SSL, container serves the SPA).
`docker-compose.prod.yaml` at the root; `deploy/deploy.sh` runs on the server from
`/opt/myvoice` and does pull → rebuild → workspace seed → image prune. Production is
myvoice.lobueno.co. `aws_deployment_plan.md` has the server setup and incident history.

## Planning docs

`docs/ROADMAP.md` is the living roadmap (three horizons plus cross-cutting enablers) and the
place to update status. `docs/plan-h1-multitenant-motor.md` is the detailed plan for the
current horizon, with file:line references for known open issues.
`docs/despliegue-h1.md` is the single sheet for the H1 deploy — the whole ordered sequence,
including the three steps that surprise an operator. `docs/runbook-tenancy.md` and
`docs/runbook-mejoras-h1.md` remain the detail behind each step.
`docs/plan-h2-produccion-auditoria.md` is the next phase (approved copy → assigned piece → AI
audit); it is design-first and shares no code with the H1 deploy.
`docs/diseno-sistema.md` holds the design decisions — screen names live in `screens.ts`, colors
in `tailwind.config.js`; the `.pen` source file is local-only and gitignored.
