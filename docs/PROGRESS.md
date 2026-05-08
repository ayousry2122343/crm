# CRM Platform — Progress Plan & Status

> **Last update:** 2026-05-08
> **Current state:** Phase 2 complete (Sprints 6–14), 439 backend + 160 frontend tests, tagged `v2.0.0`.
> **Repo:** `/home/ayousry/Desktop/db_manager/systems/crm/`
> **Spec:** [`docs/specs/2026-04-30-crm-design.md`](specs/2026-04-30-crm-design.md) (954 lines)
> **Plan:** [`docs/plans/2026-04-30-crm-mvp-phase1.md`](plans/2026-04-30-crm-mvp-phase1.md) (4170 lines, full TDD breakdown)
> **Modules catalog:** [`research/MODULES.md`](../research/MODULES.md) (986 lines, 16 domains)

---

## 1. Overall snapshot

| Metric | Value |
|---|---|
| Sprints completed | 15 (S0 → S14) across Phase 1 + Phase 2 |
| Total passing tests | **599** (439 backend + 160 frontend) |
| Pre-existing failures | 7 (DB-dependent integration: search.service + prisma-tenant) |
| Tagged releases | `v0.1.0-sprint0` … `v1.0.0` (Phase 1), `v2.0.0` (Phase 2) |
| Backend test suites | 50 |
| Frontend test suites | 36 |
| TypeScript errors | 0 |

---

## 2. Phases timeline

### Phase 1 — Research (✅ DONE)
- 5 parallel forks researched: Salesforce, HubSpot, Zoho, Dynamics+Pipedrive+Monday, 7 open-source CRMs.
- Output: `research/01-salesforce.md` … `05-opensource-crms.md`, ~4 256 lines.

### Phase 2 — MODULES.md synthesis (✅ DONE)
- Single 986-line catalog of 16 domains with ~250 modules, MUST/SHOULD/NICE/SKIP-v1 tier assignments, distinctive primitives, anti-patterns, recommended phase map, tech architecture.

### Phase 3 — Brainstorming (✅ DONE)
- Decisions locked: Multi-tenant SaaS · MENA Arabic-first RTL · Sales-deep MVP · AI-light Phase 1 · Vue 3 + Vite SPA website · Customer Portal in Phase 2 · 6-week timeline.

### Phase 4 — Design spec (✅ DONE)
- 954-line spec at `docs/specs/2026-04-30-crm-design.md`. Architecture, data model (Universal Person + polymorphic Activity + metadata-driven custom fields), auth/rbac, customization engine, AI layer, public website, i18n, deployment, testing strategy.

### Phase 5 — Implementation plan (✅ DONE)
- 4 170-line plan at `docs/plans/2026-04-30-crm-mvp-phase1.md`. 72 tasks across 6 sprints, TDD per task with full code blocks, security guards documented, no placeholders.

### Phase 6 — Sprint 0: Monorepo scaffold (✅ DONE — `v0.1.0-sprint0`)
- Tasks 0.1–0.10 complete. 11 commits.
- Outcome: `make dev` starts api (3001), dashboard (5174), website (5173). CI green.
- Stack: pnpm workspaces · NestJS 10 · Vue 3 + PrimeVue 4 · Postgres 16 + pgvector · Redis · MinIO · MailHog (dev).
- Plan corrections discovered during execution → committed: pgvector image registers as `vector` not `pgvector`; `nestjs-pino` Logger is instance-only, use `Logger as PinoLogger`.

### Phase 7 — Sprint 1: Auth + RBAC + Audit + Custom Fields (✅ DONE — `v0.2.0-sprint1`)
- Tasks 1.1–1.12 complete. 13 commits. **162 tests passing at end of S1.**
- Modules delivered:
  - **Prisma + Workspace + Tenant scoping** (ALS via `AsyncLocalStorage`, `PrismaService.tenantClient` extension).
  - **Auth**: signup (creates workspace + Admin profile + assigns) · login by `workspaceSlug` · refresh-token rotation · logout · JWT global guard with `@Public()` opt-out.
  - **Email**: NodeMailer + MailHog dev, password reset (1 h TTL), email verification (24 h TTL).
  - **RBAC**: 31 permission keys, 3 default profiles (Admin/Sales Manager/Sales Rep), `@RequiresPermission(...)` guard.
  - **Audit log**: `AuditService.log/logUpdate` + per-record listing endpoint.
  - **Custom Fields engine**: 16 field types · sanitized DDL with 14 SQL-injection guard tests · transactional create (DDL rollback on failure) · indexed-column generation for TEXT/NUMBER/DATE on Person/Company/Deal/Activity.
  - **MetadataService**: merges built-in entityDefs (`packages/metadata/entityDefs/{Person,Company,Deal,Activity}.json`) with workspace-scoped custom fields.
  - **Workspace settings + invite flow**: 7-day TTL invite tokens, accept = signed-in.
  - **Dashboard auth UI**: SignUp/Login/PasswordReset/AcceptInvite views · Pinia store · axios client with auto-refresh · nav guards · RTL primary.
  - **Dashboard admin UI**: Workspace settings · Users (list + invite dialog) · Custom Fields admin (per-entity, type-aware editor with indexed=true whitelist).

### Phase 7 — Sprint 2: People + Companies + Tags + Lists + Search (🟡 IN PROGRESS — 33%)
- **Backend (Tasks 2.1–2.4):** ✅ DONE. 4 commits. **+57 tests** (144 api total).
  - Universal Person model (`isCompany` flag, `parentId` hierarchy, lifecycle stage, custom fields validated against metadata).
  - Tag + polymorphic EntityTag (`entityType + entityId`, no Prisma relation — clean).
  - Lists: saved-query (live) + static (snapshot) modes; query-builder with `customFields.<key>` JSONB path + metadata field whitelist.
  - Postgres FTS: `search_tsv` tsvector column on Person, GIN index, plpgsql trigger maintaining it from `fullName/email/phone/customFields::text`. Prefix-matched tsquery for partial-string search.
- **Dashboard DynamicForm (Task 2.5):** ✅ DONE. 1 commit. **+11 tests** (25 dashboard total).
  - `buildZodSchema(fields)` derives Zod validation from FieldDef[].
  - `DynamicForm.vue` + 14 field wrappers around PrimeVue inputs.
  - Smoke test mounts with mocked metadata.
- **Tasks 2.6–2.12:** Completed. PeopleList, PersonDetail, Companies, Lists UI, Global Search, e2e, tag `v0.3.0-sprint2`.

### Sprint 3 — Pipelines + Deals + Activities + Calendar + Kanban (✅ DONE — `v0.4.0-sprint3`)
- Pipeline + Stage CRUD, Deal model with multi-pipeline + won/lost reasons.
- Polymorphic Activity (Call/Meeting/Task/Note) + lastActivityAt rollup.
- Deals Kanban (drag-drop) + Deals list/detail. Calendar UI. Pipeline admin UI.

### Sprint 4 — Email + Forms + Workflow Engine + Webhooks + Validation (✅ DONE — `v0.5.0-sprint4`)
- Outbound SMTP + EmailTemplate, Form builder + public endpoint.
- Workflow engine (event-based TCA, 6 action types, BullMQ). Webhooks + HMAC.
- Validation rules. Workflow admin UI.

### Sprint 5 — Reports + Dashboards + AI + Public Website + Launch (✅ DONE — `v1.0.0`)
- 5 standard reports, Dashboard widgets (Number/Chart/List/Kanban).
- AIProvider adapter + AI Email Composer + pgvector embeddings.
- Public website pages. Tag `v1.0.0`.

### Phase 2 — Sprints 6–14 (✅ DONE — `v2.0.0`)

### Sprint 6 — Products + Pricebooks (✅ DONE)
- Product + ProductCategory models, CRUD with cursor pagination, Pricebook + PricebookEntry.

### Sprint 7 — Quotes / Proposals (✅ DONE)
- Quote + QuoteLineItem models, QuoteBuilder UI, PDF-ready totals calculation.

### Sprint 8 — Email Marketing Campaigns (✅ DONE)
- Campaign + CampaignRecipient models, send/schedule, tracking, analytics UI.

### Sprint 9 — Drip Sequences (✅ DONE)
- Sequence + SequenceStep + SequenceEnrollment, enrollment engine, step execution.

### Sprint 10 — Time-based Workflow Triggers + Cron Runner (✅ DONE)
- SCHEDULED trigger event, cronExpression on Workflow, CronRunnerService.

### Sprint 11 — Two-way Email Sync (✅ DONE)
- EmailAccount + EmailThread + EmailMessage models, OAuth sync, person email tab.

### Sprint 12 — Copilot Sidebar (✅ DONE)
- RAG pipeline, pgvector embeddings, context-aware chat, suggested prompts.

### Sprint 13 — Customer Portal (✅ DONE)
- Portal + PortalUser models, separate JWT auth, settings UI.

### Sprint 14 — Blog + Phase 2 Closeout (✅ DONE — `v2.0.0`)
- Blog + BlogCategory models, CRUD + publish/unpublish + markdown rendering (markdown-it).
- BlogsIndex + BlogEditor + BlogView frontend. i18n en+ar. Tag `v2.0.0`.

---

## 4. Issues encountered (and how they were resolved)

| # | Sprint | Issue | Resolution |
|---|---|---|---|
| 1 | S0 | `pgvector` extension creation failed — image registers it as `vector` | Updated SQL to `CREATE EXTENSION vector;`, plan corrected, committed. |
| 2 | S0 | Host machine had native Postgres on 5432 + Redis on 6379 | Used local-only `.env` overrides (`POSTGRES_PORT=15432`, `REDIS_PORT=16379`). `.env.example` keeps spec defaults. |
| 3 | S0 | Docker volume teardown permission denied (root-owned files in bind mount) | Workaround via `docker run --rm -v ...:/data alpine rm -rf ...`. Worth a `make` helper later. |
| 4 | S0 | `nestjs-pino`'s `Logger` has no static `.log()`; spec assumed it did | Imported as `PinoLogger` for `app.useLogger()` and `Logger` from `@nestjs/common` for the static line. Plan fixed. |
| 5 | S1 | `tsbuildinfo` files leaked into working tree | Added `*.tsbuildinfo` to `.gitignore`. |
| 6 | S1 (recurring) | API rate limit on long implementer dispatches (especially heavy Sprint 1 tasks) | Saved partial work landed in working tree; verified, committed manually after limit reset. Strategy: smaller batches per dispatch. |
| 7 | S1 | `MetadataService` couldn't `import { loadEntityDefs } from '@crm/metadata'` (ESM/CJS clash — package is `"type":"module"` but api is CommonJS) | Service resolves entityDefs path via `require.resolve('@crm/metadata/package.json')` and reads JSON files with `node:fs`. |
| 8 | S1 | Smoke test of `POST /custom-fields` with `indexed=true` returned 500 because `Person` table didn't yet exist (Sprint 2) | Wrapped CustomFieldDef row + DDL in `prisma.$transaction(...)` — DDL failure now rolls back the row. Resolved before tagging S1. |
| 9 | S1 | `POST /users/invite` returned 500 in smoke test | Environmental (MailHog port mismatch in `.env`). Code path itself is unit-tested. Will revisit when wiring email envs in Sprint 4. |
| 10 | S1 | `GET /users` shape mismatch — plan said `{users, pendingInvites}`, api returned `{members, invites}` | Updated dashboard typed wrapper to match actual api. Minor spec drift. |
| 11 | S2 backend | Postgres `simple` text-search dictionary tokenized full email addresses; partial searches like `sara` didn't match `sara.m@example.com` | Switched to **prefix-matched tsquery** (`token:*`) instead of `websearch_to_tsquery`. Multilingual-friendly (no stemming). |
| 12 | S2 backend | Person.merge initially scoped before EntityTag schema landed | Tag-handling extended into Task 2.2's commit (the entityTag-aware merge). Acceptable: each commit's tests pass at HEAD. |

---

## 5. Issues we expect to hit (and pre-mitigations)

| # | Likely point of pain | Why | Pre-mitigation |
|---|---|---|---|
| 1 | **Sprint 3 Deal stage transitions with required-fields-per-stage** | Field validation needs to consult both first-class columns and `customFields` JSONB simultaneously, plus metadata for required-field config | Reuse Sprint 2's metadata + JSONB query patterns; centralize the validator in a shared service. Failing tests first. |
| 2 | **Sprint 3 Kanban drag-drop with required-fields gate** | UX: when drag fails server validation, we need a smooth rollback in the UI without flicker | Optimistic update with rollback on 4xx; inline modal that pre-fills missing required fields. |
| 3 | **Sprint 4 Workflow engine — race conditions + idempotency** | Multiple events for the same trigger could double-execute actions | BullMQ unique job IDs derived from `(workflowId, entityType, entityId, eventTs)`; first-write-wins on `WorkflowRun`. |
| 4 | **Sprint 4 Forms public endpoint security** | Public POST means scraping risk + spam | reCAPTCHA on form schema; per-form daily-rate-limit per IP; honeypot field; sanitized input mapping. |
| 5 | **Sprint 4 outbound email deliverability** | Self-SMTP gets blocked fast; even mailhog → SES handoff misroutes if sender domain not verified | Use SES from day 1 in non-dev; document SPF/DKIM; alarm on bounce rate. |
| 6 | **Sprint 5 AIProvider mock vs real divergence** | Mock returns deterministic strings; real LLM JSON output may not parse cleanly | Strict JSON mode (OpenAI/Anthropic) + retry-on-parse-fail + log raw response on failure. |
| 7 | **Sprint 5 OpenAPI doc snapshot drifts** | NestJS Swagger reflects every PR's controller changes | Snapshot test on PR; instructions to acknowledge intentional drift in commit body. |
| 8 | **Phase 2: Customer Portal auth scope** | Customer-facing auth is a different model (magic links, no workspace selection) | Separate `customer-auth` module with its own User-shaped table (or User type discriminator). Plan in Phase 2 spec. |
| 9 | **Phase 2: Quotes/PDF generation** | PDF generation in Node is heavy (puppeteer ~150 MB) and slow | Use a thin templating layer (`pdfmake` for simple invoices) before reaching for puppeteer. |
| 10 | **Phase 3: GraphQL API addition** | Adding GraphQL atop NestJS REST risks duplicate endpoints + schema drift | Generate GraphQL schema from the same metadata source; treat REST + GraphQL as different views of one core. |
| 11 | **Multi-tenancy + row-level security at scale** | At 100k+ tenants, Prisma middleware + `workspaceId` filter scales fine; queries past 50M rows may need partitioning | Plan partitioning by `workspaceId` once a single workspace exceeds 1M Person rows. |
| 12 | **Arabic search edge cases** | `unaccent` doesn't normalize Arabic diacritics; `العربية` vs `العربیة` may not match | Custom Arabic normalizer (strip diacritics, normalize alef forms, normalize ya/yeh). Phase 3. |
| 13 | **Postgres pgvector dimensionality mismatch** | Embedding model upgrades change vector dim; existing index doesn't cover new dim | Embedding worker stores `embeddingModel` per row; dual-index pattern during migrations. |
| 14 | **Sprint 5 launch checklist e2e flakiness** | Playwright tests against live api/dashboard/website + Postgres + Redis can be brittle in CI | Stand-alone CI compose stack; reset DB between tests; deterministic clock; record + replay on failure. |

---

## 6. Recommended skills (Claude Code) for next steps

### Active / required for daily work
- **`superpowers:test-driven-development`** — every implementation task; non-negotiable for the Iron Law.
- **`superpowers:subagent-driven-development`** — current execution mode; one fresh subagent per task batch.
- **`superpowers:executing-plans`** — fallback when subagent dispatching is rate-limited.
- **`superpowers:systematic-debugging`** — when a bug spans api+dashboard+db (e.g., issue #8 above).
- **`superpowers:verification-before-completion`** — before tagging each sprint.

### Per-domain (use when entering matching sprint)
- **`spec-kit:spec-writing`** — before starting a new sprint, write a focused sprint spec referencing the master plan.
- **`abstract:create-skill`** + **`abstract:skill-authoring`** — if any internal pattern starts repeating across services (e.g., a common service template), extract it to a skill.
- **`document-skills:frontend-design`** — when polishing dashboard visual quality (Sprint 5 polish).
- **`document-skills:webapp-testing`** — Playwright e2e in S2, S3, S5.
- **`document-skills:claude-api`** — Sprint 5 AIProvider implementation; ensures prompt caching + correct Claude model selection.
- **`pensive:code-reviewer`** + **`pensive:bug-review`** — at the end of each sprint, run a code-review subagent on the diff.
- **`pensive:architecture-review`** — before Sprint 4 (workflow engine) and before Sprint 5 (AI), to validate boundaries.
- **`pensive:test-review`** — every sprint closeout to evaluate coverage gaps.
- **`pensive:safety-critical-patterns`** — for Sprint 1 custom-fields DDL and Sprint 4 workflow engine; both touch destructive operations.

### Cross-cutting workflow
- **`sanctum:doc-updates`** — when README + RUNBOOK + API docs land in S5.
- **`sanctum:pr-prep`** + **`sanctum:commit-messages`** — already followed naturally; codify when externalized to git review.
- **`sanctum:update-tests`** — between sprints to fill coverage gaps.
- **`leyline:risk-classification`** — for any change touching auth, DDL, or workflows.
- **`leyline:error-patterns`** — once we have user-facing errors in dashboard (S2 polish).
- **`abstract:bulletproof-skill`** — apply to skills we create internally before using them at scale.

### Worth knowing about, lower priority for v1
- **`static-analysis:semgrep`** + **`static-analysis:codeql`** — security scan after S1 (auth + DDL) and before any deploy.
- **`spec-kit:speckit-checklist`** — generate per-sprint checklists from the spec.
- **`linux-sysadmin:sysadmin`** — Sprint 5 production runbook.

---

## 7. Recommendations going forward

### Workflow recommendations

1. **Tighten subagent batch sizes.** Tasks 1.5–1.7 (~3 tasks bundled) and 2.1–2.4 (~4 tasks bundled) hit rate-limit windows on the heavy users. Stick to 2 tasks per dispatch for substantive work; 5 tasks only for boilerplate.

2. **Always run typecheck after each task even before tests.** The dashboard typecheck has caught silent breakage from PrimeVue version mismatches twice. Add `pnpm -r typecheck` to Makefile `test` target.

3. **Re-run `make dogfood` after every commit that touches docker-compose, schemas, or env vars.** Sprint 1 had two near-misses where a migration was applied but the api didn't pick it up until restart.

4. **Tag sprints aggressively (`v0.X.0-sprintN`).** Already happening; keep doing it. Eases revert-to-known-good when an experiment goes sideways.

5. **Add a `docs/CHANGELOG.md` per sprint closeout.** Currently relying on `git log` + this PROGRESS.md.

### Code-quality recommendations

6. **Lint + typecheck must be CI gates.** `.github/workflows/ci.yml` already has them — verify on first push.

7. **Add `prisma format` to pre-commit.** The schema's growing; manual formatting drift will hurt readability.

8. **Centralize `requireWs()` in a base service class.** It's now duplicated across PersonService, CustomFieldService, ListService, MetadataService, AuditService. A `TenantScopedService` base class will DRY it.

9. **Audit the audit log.** Every entity service writes audit events manually. Move to a Prisma extension OR a NestJS interceptor that reads `@AuditedAction(...)` decorators on controllers. Phase 2 cleanup.

10. **Document the `customFields` validation flow.** `MetadataService.getEntity → validateCustomFields` is implicit; add a README in `apps/api/src/core/metadata/` explaining the contract.

### Architecture recommendations

11. **Reserve Phase 2 for the chatter/timeline mixin.** Spec'd `mail.thread` pattern is not yet implemented. It will make Activities + comments + email gateway much cleaner; do it before adding Quotes (Phase 2).

12. **Plan now for organization-level audit retention.** AuditLog grows linearly with activity; after 50k events per workspace, list endpoints will be slow. Add `archivedAt` + monthly partitioning early in Phase 2.

13. **Choose the email transactional provider before Sprint 4.** SES is cheap + reliable in MENA but requires SPF/DKIM. Mailgun is friendlier for fast verification. Decide and hard-code in `apps/api/.env.example`.

14. **Reuse `DynamicForm` for the public Forms module in Sprint 4.** The form builder JSON schema and the metadata FieldDef are 80% the same — share a renderer.

### Process recommendations

15. **Add a `docs/RUNBOOK.md` early.** Document local-dev port overrides (15432/16379), Postgres extension setup, MailHog port, MinIO credentials. New contributors will trip on these on day 1.

16. **Maintain a `docs/DECISIONS.md` (ADR-lite).** Capture: why universal Person, why metadata-driven, why prisma over typeorm, why SES over Mailgun (when chosen). Each decision: 5 lines, dated.

17. **Set up a fresh GitHub repo + first push.** Currently local only. Once we have CI green (S0 already does), push to GitHub for backup + actual CI runs + branch protection.

18. **Designate a "sprint review" subagent dispatch at end of each sprint.** Use `pensive:code-reviewer` on the sprint diff. We've been skipping this; it's worth ~10 min per sprint to catch late issues.

---

## 8. Files map (what's where)

```
crm/
├── README.md                    (TBD — write in Sprint 5)
├── Makefile                     ✅
├── docker-compose.yml           ✅
├── docker/postgres-init/01-extensions.sql  ✅
├── package.json                 ✅
├── pnpm-workspace.yaml          ✅
├── pnpm-lock.yaml               ✅
├── tsconfig.base.json           ✅
├── tsconfig.json                ✅
├── .env.example                 ✅
├── .env                         (gitignored, host-specific port overrides)
├── .github/workflows/ci.yml     ✅
├── apps/
│   ├── api/                     ✅ feature-complete through Sprint 2 backend
│   ├── dashboard/               ✅ auth + admin + DynamicForm; PeopleList/Detail pending
│   └── website/                 ✅ scaffold only; pages pending Sprint 5
├── packages/
│   ├── shared-types/            ✅ Locale, LocalizedString
│   └── metadata/                ✅ entityDefs/{Person,Company,Deal,Activity}.json + loader
├── docs/
│   ├── PROGRESS.md              👈 this file
│   ├── specs/2026-04-30-crm-design.md         ✅
│   └── plans/2026-04-30-crm-mvp-phase1.md     ✅
└── research/
    ├── MODULES.md               ✅
    ├── 01-salesforce.md         ✅
    ├── 02-hubspot.md            ✅
    ├── 03-zoho.md               ✅
    ├── 04-dynamics-pipedrive-monday.md  ✅
    └── 05-opensource-crms.md    ✅
```

---

## 9. Feature completeness (v2.0.0)

### API modules (63 permission keys)

| Domain | Endpoints | Permissions |
|--------|-----------|-------------|
| Auth | signup, login, refresh, logout, password reset, email verify, accept invite | public + auth |
| Workspace | settings, users, invite | workspace:*, user:* |
| Metadata + Custom Fields | CRUD, entity defs | custom-field:write |
| Audit | per-record log | audit:read |
| People + Companies | CRUD, merge, duplicates | person:*, company:* |
| Tags + Lists | CRUD, assign/unassign, query-builder | tag:write, list:* |
| Search | full-text search | — |
| Pipelines + Deals | CRUD, stage transitions, won/lost | pipeline:*, deal:* |
| Activities | CRUD, calendar | activity:* |
| Email Templates + Outbound | CRUD, send | email-template:*, email:send |
| Forms | builder + public submission | form:* |
| Workflows + Webhooks | engine, triggers, cron runner | workflow:write, webhook:write |
| Validation Rules | pre-save rules | validation-rule:* |
| Reports + Dashboards | 5 report types, widget CRUD | report:read, dashboard:write |
| AI | email composer, embeddings, copilot | ai:use |
| Products + Pricebooks | CRUD + categories + entries | product:*, pricebook:* |
| Quotes | CRUD + line items + builder | quote:* |
| Campaigns | CRUD + recipients + send | campaign:* |
| Sequences | CRUD + enrollment + execution | sequence:* |
| Email Sync | accounts, threads, messages | email-account:*, email-sync:read |
| Portal | settings, portal users, separate auth | portal:* |
| **Blog** | **CRUD + categories + publish + markdown** | **blog:*** |

### Dashboard pages (all live)

```
/sign-up, /login, /forgot-password, /reset-password, /accept-invite (public)
/dashboard, /people, /people/:id, /companies, /companies/:id
/deals, /deals/list, /deals/:id, /calendar
/lists, /lists/:id, /forms, /forms/:id
/quotes, /quotes/new, /quotes/:id
/campaigns, /campaigns/:id, /sequences, /sequences/:id
/blogs, /blogs/:id, /blog/:slug
/automation/workflows, /automation/workflows/:id, /automation/webhooks
/reports, /dashboards, /dashboards/:id
/settings/workspace, /settings/users, /settings/custom-fields
/settings/pipelines, /settings/won-lost-reasons
/settings/products, /settings/pricebooks
/settings/email-templates, /settings/email-accounts, /settings/portal
```

---

## 10. How to resume (Phase 3 planning)

Phase 2 is complete and tagged `v2.0.0`. Next steps:

1. **Verify state**: `pnpm install && pnpm -r typecheck && pnpm -r test`.
2. **Plan Phase 3** — potential areas: GraphQL API, advanced analytics, mobile app, multi-language search, organization-level features, marketplace integrations.
3. **Pre-existing test failures** to address: `search.service.spec.ts` + `prisma-tenant.spec.ts` (7 DB-dependent integration tests needing live Postgres).

---

*End of PROGRESS.md.*
