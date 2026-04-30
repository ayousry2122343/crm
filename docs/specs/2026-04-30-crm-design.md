# CRM Platform — Design Specification

> **Date**: 2026-04-30
> **Status**: Approved (pending user spec review)
> **Authors**: Ahmed Yousry + Claude (Opus 4.7)
> **Related**: [`research/MODULES.md`](../../research/MODULES.md) (986-line catalog) · [`research/01-salesforce.md`](../../research/01-salesforce.md) · [`research/02-hubspot.md`](../../research/02-hubspot.md) · [`research/03-zoho.md`](../../research/03-zoho.md) · [`research/04-dynamics-pipedrive-monday.md`](../../research/04-dynamics-pipedrive-monday.md) · [`research/05-opensource-crms.md`](../../research/05-opensource-crms.md)

---

## 1. Vision & Positioning

A **multi-tenant SaaS CRM** purpose-built for the **MENA market**, **Arabic-first with full RTL**, opening with a **Sales-deep MVP** (Pipedrive-like depth) and growing into a comprehensive customer platform across Sales, Marketing, and Service.

The product differentiates on three axes:

1. **Arabic-native UX** — true RTL, Arabic-first labels, Hijri calendar option, MENA currencies (EGP/SAR/AED) + Stripe for global, WhatsApp Business as a first-class channel.
2. **No-code customization** (EspoCRM-grade) — admins add fields, custom modules, layouts, validation rules, and workflows without code changes.
3. **AI-ready foundation** — pluggable AI provider, pgvector embeddings, and Copilot-friendly metadata so we can add Email Composer in v1, Copilot/Agents in v2-v3 without rearchitecture.

---

## 2. Scope

### 2.1 In Scope (v1, MVP — 6 weeks)

| Sprint | Week | Modules | Outcome |
|---|---|---|---|
| **0** | 1 | Monorepo · Docker Compose · CI · i18n skeleton · base tests | Skeleton runs `make dev` and serves three apps. |
| **1** | 1 | Auth · Workspaces · Users · Teams · Roles · Audit · **Custom Fields engine** (metadata-driven) | Multi-tenant foundation; admin can add a custom text/number/date/picklist field via UI without migrations. |
| **2** | 1 | **People** · **Companies** · Tags · Lists (saved-query) · global search · merge/dedupe | Lub of CRM. Person + Company with parent-child orgs and lifecycle stage. |
| **3** | 1 | **Deals** (multi-pipeline · per-stage required fields · won/lost reasons · rotting indicator) · **Activities** (polymorphic) · Calendar UI | Pipedrive-grade pipeline experience. |
| **4** | 1 | Email send (SMTP outbound) · Forms · Web-to-Lead · Workflow engine (event-based, no time-based) · Webhooks-out · Validation Rules | Engagement + automation. |
| **5** | 1 | 5 standard reports + 4 dashboard widget types · AI Email Composer (single endpoint) · AIProvider adapter · REST API polish · Public website (Home + Pricing + Contact) · e2e + smoke tests · launch checklist | Shippable v1. |

### 2.2 Out of Scope (deferred to v2 or later)

- Time-based workflow triggers (cron-style)
- Two-way Email Sync (Gmail OAuth + MS Graph)
- Copilot Sidebar with RAG
- Customer Portal (logged-in customer self-service)
- Blog on website (markdown-driven, Phase 2)
- Quotes / Products / Pricebooks (Phase 2 first)
- Email Marketing campaigns (Phase 2 second)
- Service / Tickets / Knowledge Base (Phase 3)
- Live Chat
- Telephony / CTI / WhatsApp / SMS
- Predictive AI (lead scoring, deal scoring, forecasting)
- AI Agents (autonomous workflows)
- Visual flow builder (BPMN-lite)
- Server-side custom functions
- App Marketplace
- GraphQL API
- MCP Server
- Field Service · CPQ · Industry Clouds

### 2.3 Phased Roadmap (post-v1)

- **Phase 2** (~8 weeks): Quotes + Products + Email Marketing (campaigns + drip) + Time-based Workflows + Email Sync 2-way + Copilot Sidebar + Customer Portal + Blog.
- **Phase 3** (~12 weeks): Service Cloud (Tickets + KB + SLAs + Email-to-Case) + Live Chat + Conversation Intelligence + Predictive Lead Scoring + Customer Journey Builder + GraphQL API + MCP Server.
- **Phase 4** (later): Field Service · CPQ · Subscriptions · Industry verticals · Sandboxes · Advanced compliance (HIPAA, data residency).

---

## 3. Architecture

### 3.1 High-level diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                  apps/website (Vue 3 + Vite SPA)                  │
│   Home · Pricing · Features · Contact · Sign-up · embedded forms  │
│                          AR-RTL primary                           │
└──────────────────────────┬───────────────────────────────────────┘
                           │ REST (public endpoints + sign-up)
┌──────────────────────────────────────────────────────────────────┐
│              apps/dashboard (Vue 3 + PrimeVue 4 + Pinia)          │
│   People · Companies · Deals · Activities · Lists · Reports       │
│   Settings (Custom Fields, Layouts, Workflows, Users, Teams)      │
│   DynamicForm renders from packages/metadata layouts              │
│   AR-RTL primary · Vue I18n                                       │
└──────────────────────────┬───────────────────────────────────────┘
                           │ REST + Socket.io
┌──────────────────────────────────────────────────────────────────┐
│                  apps/api (NestJS modular monolith)               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ src/core/                                                    │ │
│  │   auth · workspaces · users · teams · roles · profiles      │ │
│  │   audit · custom-fields · metadata · i18n                   │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ src/crm/                                                     │ │
│  │   people · companies · deals · pipelines · activities       │ │
│  │   lists · tags · forms                                      │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ src/automation/                                              │ │
│  │   workflow · webhooks-out · validation                      │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ src/integrations/                                            │ │
│  │   email-smtp · stripe (our SaaS billing)                    │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ src/reports/                                                 │ │
│  │   reports · dashboards · widgets                            │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ src/ai/                                                      │ │
│  │   provider-adapter · email-composer · embeddings (pgvector) │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ src/notifications/                                           │ │
│  │   in-app (Socket.io) · email · push (later)                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│         Prisma 6 ORM ── reads schema.prisma                       │
└──────────────────────────────────────────────────────────────────┘
        │              │              │              │            │
   PostgreSQL 16   Redis+BullMQ    MinIO/S3      SES/SendGrid   pgvector
   (relational)   (queues+cache)  (files+att.)  (transactional) (embeddings)
```

### 3.2 Apps

| App | Stack | Port (dev) | Purpose |
|---|---|---|---|
| `apps/api` | NestJS 10 + Prisma 6 + Postgres 16 + Redis + BullMQ + Socket.io + Pino + Swagger | 3001 | Backend API, websocket, queues, AI |
| `apps/dashboard` | Vue 3 + Vite 5 + PrimeVue 4 + Pinia + Vue Router 4 + Vee-validate + Zod + Tailwind + vue-i18n + socket.io-client + Chart.js | 5174 | Admin/user dashboard (RBAC-gated) |
| `apps/website` | Vue 3 + Vite 5 + Tailwind + vue-i18n | 5173 | Public marketing site + sign-up + embeddable forms |

### 3.3 Shared packages

| Package | Purpose |
|---|---|
| `packages/shared-types` | TypeScript types — generated from Prisma schema + manual union types · published as `@crm/shared-types`. |
| `packages/metadata` | `entityDefs/*.json`, `clientDefs/*.json`, `layouts/<Entity>/<list\|detail\|edit>.json`, `i18n/*.json`. Single source of truth read by both API (codegen + runtime metadata service) and dashboard (DynamicForm renderer). |
| `packages/ui-kit` (later) | Shared Vue components between dashboard and website — defer to Phase 2. |

### 3.4 Infrastructure (Docker Compose)

| Service | Image | Port | Notes |
|---|---|---|---|
| postgres | postgres:16-alpine | 5432 | Database with `pgvector` extension enabled. |
| redis | redis:7-alpine | 6379 | Cache + BullMQ queue store. |
| minio | minio/minio:latest | 9000 (api), 9001 (console) | S3-compatible object storage (dev). |
| mailhog | mailhog/mailhog | 1025 (smtp), 8025 (ui) | Catches outbound mail in dev. |

Production swaps MinIO → S3 (or compatible), MailHog → SES/SendGrid/Mailgun, and adds CDN in front of websites.

---

## 4. Data Model

### 4.1 First-class entities (typed Prisma columns)

The following entities are **first-class** with strongly-typed columns. They have `customFields JSONB` for admin-added custom fields.

```
Workspace, User, Team, TeamMember, Role, Profile, PermissionSet, AuditLog,
Person, Company, Deal, Pipeline, Stage, Activity,
List, Tag, EntityTag, Form, FormSubmission,
Workflow, WorkflowRun, Webhook, WebhookDelivery, ValidationRule,
Report, Dashboard, Widget,
Notification, EmailMessage,
CustomFieldDef, CustomModuleDef, CustomRecord, Layout
```

### 4.2 Key design decisions

#### 4.2.1 Universal Person model (no Lead/Contact split)

```prisma
model Person {
  id              String         @id @default(cuid())
  workspaceId     String
  workspace       Workspace      @relation(fields: [workspaceId], references: [id])

  isCompany       Boolean        @default(false)  // distinguishes Person from Company-as-Person
  parentId        String?                          // sub-org / employee-of relation
  parent          Person?        @relation("Hierarchy", fields: [parentId], references: [id])
  children        Person[]       @relation("Hierarchy")

  firstName       String?
  lastName        String?
  fullName        String         // computed; useful for indexing
  companyName     String?         // when isCompany=true
  email           String?         @db.VarChar(320)
  emailNormalized String?         @db.VarChar(320)  // lowercased+trimmed for indexing/dedupe
  phone           String?
  phoneNormalized String?         // E.164 for indexing/dedupe
  title           String?         // job title (when person)
  industry        String?         // (when company)
  website         String?
  address         Json?

  lifecycleStage  LifecycleStage @default(LEAD)  // LEAD | MQL | SQL | OPP | CUSTOMER | EVANGELIST
  source          String?
  ownerId         String?
  owner           User?          @relation("OwnedPeople", fields: [ownerId], references: [id])

  customFields    Json           @default("{}")   // metadata-driven custom fields

  doNotContact    Boolean        @default(false)
  consent         Json?           // GDPR-style consent ledger

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  createdById     String?
  updatedById     String?

  @@index([workspaceId, emailNormalized])
  @@index([workspaceId, phoneNormalized])
  @@index([workspaceId, ownerId])
  @@index([workspaceId, lifecycleStage])
}

enum LifecycleStage {
  LEAD
  MQL
  SQL
  OPP
  CUSTOMER
  EVANGELIST
}
```

We treat both natural persons and companies in the same table. `isCompany=true` means "this row represents a Company". `parentId` lets companies have employees and sub-organizations have parents.

> **Why**: Avoids the dreaded "Convert Lead" workflow that loses data history, mirrors Twenty's modern unified model and Odoo's `res.partner`, and simplifies merge/dedupe.

#### 4.2.2 Polymorphic Activity

```prisma
model Activity {
  id            String       @id @default(cuid())
  workspaceId   String
  parentEntity  String       // "Person" | "Company" | "Deal" | "Form" | "CustomRecord:<moduleSlug>"
  parentId      String

  type          ActivityType // CALL | MEETING | EMAIL | TASK | NOTE | SYSTEM | FORM_SUBMISSION
  subject       String
  body          String?
  status        ActivityStatus @default(OPEN)  // OPEN | DONE | CANCELED

  ownerId       String?
  dueAt         DateTime?
  completedAt   DateTime?

  metadata      Json         @default("{}")  // type-specific: call duration, email message-id, ...

  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  createdById   String?

  @@index([workspaceId, parentEntity, parentId, createdAt])
  @@index([workspaceId, ownerId, status, dueAt])
  @@index([workspaceId, type, createdAt])
}

enum ActivityType {
  CALL
  MEETING
  EMAIL
  TASK
  NOTE
  SYSTEM
  FORM_SUBMISSION
}

enum ActivityStatus {
  OPEN
  DONE
  CANCELED
}
```

One table for the entire activity timeline, chatter feed, system events, and email log. Polymorphic to any entity (including custom modules).

#### 4.2.3 Multi-pipeline Deals

```prisma
model Pipeline {
  id           String   @id @default(cuid())
  workspaceId  String
  name         String   // "Direct Sales", "Channel Partner", "Renewals"
  entityType   String   // "Deal" — but reusable for other entities later (Tickets in v3)
  isDefault    Boolean  @default(false)
  archivedAt   DateTime?
  stages       Stage[]

  @@unique([workspaceId, entityType, name])
}

model Stage {
  id              String   @id @default(cuid())
  pipelineId      String
  pipeline        Pipeline @relation(fields: [pipelineId], references: [id])
  name            String
  order           Int
  probability     Int      // 0-100 (used for forecasting)
  color           String   @default("#3b82f6")
  isWon           Boolean  @default(false)
  isLost          Boolean  @default(false)
  requiredFieldKeys String[] // keys of Deal fields (typed or custom) that must be set to enter this stage

  @@unique([pipelineId, name])
  @@index([pipelineId, order])
}

model Deal {
  id            String     @id @default(cuid())
  workspaceId   String

  name          String
  pipelineId    String
  pipeline      Pipeline   @relation(fields: [pipelineId], references: [id])
  stageId       String
  stage         Stage      @relation(fields: [stageId], references: [id])

  amount        Decimal    @db.Decimal(15, 2)
  currency      String     @db.Char(3)  // ISO-4217
  expectedCloseDate DateTime?
  probability   Int?

  ownerId       String?
  owner         User?      @relation(fields: [ownerId], references: [id])

  primaryContactId String?  // FK to Person
  primaryContact   Person?  @relation("DealPrimaryContact", fields: [primaryContactId], references: [id])
  primaryCompanyId String?  // FK to Company-as-Person
  primaryCompany   Person?  @relation("DealPrimaryCompany", fields: [primaryCompanyId], references: [id])

  source        String?
  status        DealStatus @default(OPEN)  // OPEN | WON | LOST
  wonAt         DateTime?
  lostAt         DateTime?
  lostReason    String?
  wonReason     String?

  lastActivityAt DateTime?  // for "rotting deal" detection
  customFields   Json       @default("{}")

  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  @@index([workspaceId, pipelineId, stageId, status])
  @@index([workspaceId, ownerId, status])
  @@index([workspaceId, lastActivityAt])
}

enum DealStatus {
  OPEN
  WON
  LOST
}
```

Per-pipeline stages with **required fields per stage** baked in. Rotting deals computed from `lastActivityAt`.

#### 4.2.4 Custom Fields (metadata-driven, no migrations)

```prisma
model CustomFieldDef {
  id           String           @id @default(cuid())
  workspaceId  String
  entityType   String           // "Person" | "Company" | "Deal" | "Activity" | "CustomModule:<slug>"
  key          String           // snake_case; how it's stored in customFields JSONB
  label        Json             // {ar: "...", en: "..."}
  type         CustomFieldType  // TEXT | LONG_TEXT | NUMBER | DECIMAL | BOOLEAN | DATE | DATETIME | PICKLIST | MULTI_PICKLIST | LOOKUP | URL | EMAIL | PHONE | FILE | FORMULA | ROLLUP
  options      Json?             // for picklists: [{value, label_ar, label_en}], for lookup: {entityType, ...}
  required     Boolean          @default(false)
  unique       Boolean          @default(false)
  indexed      Boolean          @default(false)  // when true, we generate a Postgres generated column + index
  default      Json?
  validation   Json?             // { regex?, min?, max?, ... }
  helpText     Json?             // {ar, en}
  visibleToProfileIds String[]   // FLS: empty = visible to all
  editableByProfileIds String[]  // FLS edit
  formulaExpr  String?           // for FORMULA type
  rollupConfig Json?             // for ROLLUP: {childEntity, op, field, filter}

  archivedAt   DateTime?
  createdAt    DateTime         @default(now())

  @@unique([workspaceId, entityType, key])
}

enum CustomFieldType {
  TEXT
  LONG_TEXT
  NUMBER
  DECIMAL
  BOOLEAN
  DATE
  DATETIME
  PICKLIST
  MULTI_PICKLIST
  LOOKUP
  URL
  EMAIL
  PHONE
  FILE
  FORMULA
  ROLLUP
}
```

- **Storage**: when `indexed=false`, value lives in `customFields JSONB` on the entity. When `indexed=true`, the system generates a Postgres `GENERATED ALWAYS AS ((customFields->>'<key>')::<type>) STORED` column + B-tree index. Migration is auto-generated and applied during a maintenance window.
- **Validation**: server-side via the metadata service. The frontend `<DynamicForm>` reads the same definition for client-side validation.
- **i18n**: labels are JSON `{ar, en}` so admins translate at definition time.

#### 4.2.5 Custom Modules (admin-defined entities)

```prisma
model CustomModuleDef {
  id            String   @id @default(cuid())
  workspaceId   String
  slug          String   // snake_case; unique per workspace; used as moduleSlug
  labelSingular Json     // {ar, en}
  labelPlural   Json     // {ar, en}
  icon          String   @default("pi pi-table")
  color         String   @default("#3b82f6")
  archivedAt   DateTime?

  @@unique([workspaceId, slug])
}

model CustomRecord {
  id           String   @id @default(cuid())
  workspaceId  String
  moduleSlug   String

  data         Json     @default("{}")   // includes both required + custom fields per CustomFieldDef
  ownerId      String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([workspaceId, moduleSlug, updatedAt])
}
```

Same custom fields engine works on `CustomRecord` (entityType `CustomModule:<slug>`). Indexed fields generate per-module-slug indexes.

#### 4.2.6 Lists (Active = saved query)

```prisma
model List {
  id            String   @id @default(cuid())
  workspaceId   String
  entityType    String   // "Person" | "Deal" | ...
  name          String
  description   String?
  isActive      Boolean  @default(true)  // active = saved query (live); static = snapshot of memberIds
  query         Json     // {filters: [...], sort, ...} — interpreted at query time
  memberIds     String[] // for isActive=false, frozen membership
  ownerId       String
  isShared      Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([workspaceId, entityType])
}
```

Active lists are saved queries persisted as JSON; the API expands them on demand. Static lists hold a snapshot.

#### 4.2.7 Workflow (Trigger-Condition-Action)

```prisma
model Workflow {
  id            String           @id @default(cuid())
  workspaceId   String
  name          String
  entityType    String
  enabled       Boolean          @default(true)
  trigger       Json             // {event: "CREATED" | "UPDATED" | "FIELD_CHANGED", fieldKey?: string}
  conditions    Json             // tree {op: "AND"|"OR", items: [{field, op, value}, ...]}
  actions       Json             // [{type: "UPDATE_FIELD"|"SEND_EMAIL"|"CREATE_TASK"|"CALL_WEBHOOK"|"NOTIFY_USER"|"ASSIGN", params: {...}}]
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  @@index([workspaceId, entityType, enabled])
}

model WorkflowRun {
  id            String   @id @default(cuid())
  workflowId    String
  workspaceId   String
  triggeredAt   DateTime @default(now())
  triggeredByEntity String
  triggeredById  String
  status        String   // QUEUED | RUNNING | SUCCESS | FAILED
  log           Json?
  error         String?
}
```

v1 supports event-based triggers only. Time-based triggers are v2.

#### 4.2.8 Audit Log

```prisma
model AuditLog {
  id           String   @id @default(cuid())
  workspaceId  String
  entityType   String
  entityId     String
  fieldKey     String?  // null = created/deleted; non-null = field change
  oldValue     Json?
  newValue     Json?
  action       AuditAction  // CREATE | UPDATE | DELETE | RESTORE
  userId       String?
  ipAddress    String?
  userAgent    String?
  createdAt    DateTime @default(now())

  @@index([workspaceId, entityType, entityId, createdAt])
  @@index([workspaceId, userId, createdAt])
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  RESTORE
}
```

Written by Prisma middleware on every save. Enables Field History views per record.

### 4.3 Multi-tenancy

Every workspace-scoped table has `workspaceId String` (no nullable). A Prisma extension/middleware **automatically injects** `where.workspaceId = ctx.workspaceId` on every read and `data.workspaceId = ctx.workspaceId` on every create. Cross-workspace queries are explicit and audited.

The `ctx.workspaceId` is set at request-handler time from the JWT's workspace claim.

---

## 5. Authentication & Authorization

### 5.1 Authentication

- **Email + password** with Argon2 hashing.
- **JWT access tokens** (15 min) + **refresh tokens** (30 days, stored hashed in DB, rotation on use).
- **Password reset** via email link with single-use token (Redis, 1-hour TTL).
- **Email verification** on sign-up via single-use token.
- **2FA (TOTP)** opt-in (Phase 2 enforce for admins).

### 5.2 Authorization

Three-layer model (matches Salesforce Profiles + Permission Sets):

1. **Profiles** — named bundles of base permissions (e.g., "Sales Rep", "Sales Manager", "Admin").
2. **Permission Sets** — additive permissions stackable on top of a profile.
3. **Field-Level Security** — per-profile `visibleToProfileIds` / `editableByProfileIds` on every CustomFieldDef and built-in field metadata.

**Per-record visibility:**
- `ownerId` on every record.
- Hierarchical sharing: managers see records owned by their reports (via Role hierarchy) — Phase 2.
- Team scoping: records can be shared with a Team — v1 supports basic team-shared records via `Team.members`.

**RBAC enforcement:**
- NestJS guards — `@RequiresPermission('person:read')`, `@RequiresPermission('person:write')`, etc.
- Frontend uses the same permission strings to gate routes/components via `usePermissions()` composable.

### 5.3 API authentication

- **OAuth2** for human users (in dashboard).
- **Personal Access Tokens (PATs)** for personal scripting.
- **API Keys** scoped to a workspace for server-to-server.
- **Webhook signing** with HMAC-SHA256 (per-webhook secret).

---

## 6. Customization Engine (the metadata-driven heart)

This is the most important architectural piece. Almost every other module depends on it.

### 6.1 Metadata sources

```
packages/metadata/
├── entityDefs/
│   ├── Person.json       # core fields, types, validation, indexes
│   ├── Company.json      # (a view of Person with isCompany=true; entityDef declares the override)
│   ├── Deal.json
│   └── Activity.json
├── clientDefs/
│   ├── Person.json       # icon, color, default kanban grouping, list columns
│   └── Deal.json
├── layouts/
│   ├── Person/
│   │   ├── list.json     # {columns: [...], filters: [...], sort: ...}
│   │   ├── detail.json   # {sections: [{label, fields: [...]}]}
│   │   └── edit.json     # {sections: [...]}
│   └── Deal/
│       └── ...
└── i18n/
    ├── ar.json
    └── en.json
```

### 6.2 Runtime behavior

- **Server (NestJS)**: the `MetadataModule` reads `packages/metadata` at boot, plus `CustomFieldDef` and `CustomModuleDef` rows from the workspace. Provides `MetadataService.getEntity(workspaceId, entityType)` returning a merged definition (built-in + custom).
- **Client (Vue dashboard)**: the dashboard fetches `/api/metadata/:entityType` on auth and caches in Pinia. Components use `useMetadata('Person')` to render dynamic forms, lists, and detail views.

### 6.3 DynamicForm component

```html
<DynamicForm
  :entity="'Person'"
  :record="person"
  :layout="'edit'"
  @submit="handleSubmit"
/>
```

Iterates the layout sections, renders a typed field component per CustomFieldType (`TextField`, `NumberField`, `PicklistField`, ...), wires Vee-validate + Zod validation from the entity definition, handles per-profile FLS.

### 6.4 Admin UI for customization

In `apps/dashboard/views/settings/`:

- **Custom Fields Manager** — per entity, add/edit/archive fields. Live preview.
- **Layout Manager** — drag-drop builder for `list/detail/edit` layouts per entity per profile.
- **Picklist Manager** — central management of picklist options + dependent picklists.
- **Validation Rules Manager** — define rules with expression + message.
- **Custom Modules Manager** — create new entities (slug, labels, icon, color), then define fields and layouts as usual.

---

## 7. Workflow Engine

### 7.1 Triggers (v1)

- `RECORD_CREATED` (any entity)
- `RECORD_UPDATED` (any entity, any field, or specific field key)
- `RECORD_DELETED` (any entity)
- `MANUAL` (admin clicks "Run Workflow")
- `WEBHOOK_INBOUND` (external HTTP → workflow)

(Time-based triggers are v2.)

### 7.2 Conditions

Tree of `{op: "AND"|"OR", items: [{field, op, value}, ...]}`. Operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `notIn`, `contains`, `startsWith`, `endsWith`, `isNull`, `isNotNull`. Field references support traversal: `owner.email`, `primaryContact.fullName`.

### 7.3 Actions (v1)

- `UPDATE_FIELD` — set a field on the record (or related record) to a value or template.
- `CREATE_TASK` — create an Activity of type TASK assigned to user/team.
- `SEND_EMAIL` — send templated email to a recipient (Person ref or static address).
- `CALL_WEBHOOK` — POST JSON to a URL with HMAC signature.
- `NOTIFY_USER` — in-app + email notification to a user.
- `ASSIGN` — set ownership.

### 7.4 Execution

Domain events emitted by NestJS event bus → matched against Workflows → BullMQ jobs enqueued → `WorkflowRunner` processor evaluates conditions, runs actions sequentially, writes WorkflowRun log. Idempotent: each run gets a unique key; duplicate enqueues are no-ops.

---

## 8. AI Layer

### 8.1 AIProvider abstraction

```ts
// packages/shared-types/ai.ts
export interface AIProvider {
  chat(opts: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    tools?: ToolDefinition[];
  }): Promise<{ content: string; toolCalls?: ToolCall[] }>;

  embed(text: string, opts?: { model?: string }): Promise<number[]>;

  transcribe(audioBuffer: Buffer): Promise<{ text: string; language?: string }>;
}
```

### 8.2 v1 implementations

- `OpenAIProvider` — OpenAI API.
- `AnthropicProvider` — Claude API (recommended default for Arabic — Claude Opus 4.7 leads on Arabic generation in our internal testing).

Configured per workspace via `Workspace.aiConfig`. Defaults to env-level provider for self-hosted.

### 8.3 v1 features built on top

- **Email Composer endpoint**: `POST /api/ai/email-composer` with `{intent, language, recordContext?}` → returns subject + body draft.
- **Embedding ingestion job**: BullMQ worker that embeds Person/Company/Deal/Activity records on save into `pgvector`. Used by Phase 2's RAG-Copilot.

### 8.4 Future capabilities (interface-ready, not built in v1)

- Copilot Sidebar (RAG over the CRM).
- Predictive lead/deal scoring.
- Conversation Intelligence.
- Autonomous agents.

---

## 9. Public Website

`apps/website` is a Vue 3 + Vite SPA in **Arabic-first with RTL** plus English. Pages:

- `/` — Home (hero + features + testimonials + CTA).
- `/pricing` — Plans (Free trial, Starter, Growth, Enterprise — pricing TBD).
- `/features` — Module showcase (subset of MODULES.md catalog, marketing language).
- `/contact` — Contact form → creates Lead in our marketing workspace.
- `/sign-up` — Self-serve registration; creates Workspace + admin user; auto-login → redirect to dashboard onboarding.
- `/legal/{terms,privacy,refund}` — Static legal pages.
- `/forms/:formId` — Public-form rendering page (for embeddable forms hosted by us).

The website also hosts the **embeddable form snippet**: `<script src="https://cdn.crm.com/forms/embed.js" data-form-id="..."></script>` which mounts the form into a host page.

SEO via vite-ssg (static-site generation at build) for the marketing pages. `apps/website` uses the same Tailwind theme tokens as the dashboard for visual consistency.

---

## 10. Internationalization & Localization

### 10.1 Strategy

- **Arabic-first**: default locale is `ar-EG` (Egyptian Arabic for the canonical labels; cleanly understood across MENA). English (`en`) ships fully translated as a co-first-class locale.
- **RTL primary**: dashboard and website default to `dir="rtl"`. CSS uses logical properties (`margin-inline-start`) to flip cleanly.
- **PrimeVue locale**: use built-in PrimeVue Arabic locale; extend with custom labels.
- **Date/number/currency formatting**: `Intl` API. Default currency `EGP` per workspace, override at workspace settings.
- **Hijri calendar**: optional secondary calendar shown alongside Gregorian (Phase 2; v1 ships Gregorian only).

### 10.2 Translation source

Translations live in `packages/metadata/i18n/{ar,en}.json` for entity/field labels (admin-editable). UI strings in each app's `src/i18n/{ar,en}.json`.

---

## 11. Public API

### 11.1 Style

- **REST + OpenAPI 3.1**. Generated by NestJS Swagger module from decorators. Served at `/api/v1/docs`.
- All endpoints versioned at `/api/v1/`.
- JSON-only.
- Cursor-based pagination (`?cursor=...&limit=50`).
- Filtering: `?filter[fieldKey][op]=value` (e.g., `?filter[email][contains]=acme.com`).
- Sorting: `?sort=-createdAt,fullName`.
- Sparse fieldsets: `?fields=id,fullName,email`.

### 11.2 Auth

- Bearer token (JWT or PAT) in `Authorization: Bearer <token>`.
- API Key via `X-API-Key: <key>` for server-to-server.

### 11.3 Rate limiting

Per-token: 100 req/min default; configurable per plan tier in workspace settings.

---

## 12. Reports & Dashboards

### 12.1 v1 Reports (5 standard, hardcoded)

1. **Pipeline Funnel** — count + value per stage per pipeline.
2. **Activities by Owner** — calls/meetings/emails/tasks per owner per period.
3. **Conversion Rates** — Lead → MQL → SQL → Won, by source.
4. **Forecast** — probability-weighted pipeline value by close-month.
5. **Won/Lost Reasons** — counts and revenue by reason.

Each report supports filters (period, pipeline, owner, team). Export CSV.

### 12.2 v1 Dashboard

Composable per-user dashboard with 4 widget types:

- **Number** — single metric + trend indicator.
- **Chart** — bar / line / pie / donut (Chart.js).
- **List** — top-N records by metric.
- **Kanban** — pipeline view embedded.

Widgets pull from the report engine. Drill-through opens the underlying record list.

(Pivot, gauge, map widgets in Phase 2.)

---

## 13. Notifications

- **In-app** — Socket.io channel per-user; PrimeVue toast + a notifications drawer.
- **Email** — daily digest (opt-in) + immediate for high-priority (assignment, mention, deal won).
- **Push (mobile)** — Phase 3.

Implementation: a single `Notification` entity + per-channel delivery worker (BullMQ).

---

## 14. Observability

- **Logs**: Pino (structured JSON) → stdout in dev, shipped to centralized log store in prod.
- **Traces**: OpenTelemetry instrumentation on NestJS, Prisma, BullMQ, HTTP clients. Export to Jaeger/Tempo in prod.
- **Metrics**: Prometheus metrics (request rate, latency, error rate, queue depth, AI calls, DB pool).
- **Health endpoints**: `/api/v1/health` (liveness) + `/api/v1/health/ready` (readiness — checks DB, Redis, MinIO).
- **Audit log**: as detailed in §4.2.8.

---

## 15. Testing Strategy

### 15.1 Test pyramid

- **Unit tests** (Jest): services, utility functions, expression evaluator, formula engine.
- **Integration tests** (Jest + Supertest + Test Postgres): controllers, repository methods, multi-tenancy isolation, RBAC.
- **End-to-end tests** (Playwright): full user flows on dashboard (signup → invite → create person → create deal → move stage → win) and website (homepage → contact form → lead created).
- **Smoke tests** (Playwright): post-deploy lightweight checks of critical paths.

### 15.2 TDD

Per the user's directive (Iron Law in CLAUDE config): every feature begins with a failing test. Coverage gates: ≥80% on services, ≥60% on controllers (lower because Supertest covers them in integration).

### 15.3 Multi-tenancy testing

A dedicated test helper creates two workspaces; every test that involves data isolation runs assertions in BOTH workspaces to confirm cross-tenant leakage is impossible.

---

## 16. Deployment

### 16.1 Environments

- **Local dev**: `make dev` runs all three apps + docker compose.
- **Staging**: GitHub Actions CI deploys on merge to `develop` → free-tier Hetzner / Railway / Fly.io.
- **Production**: deploy on merge to `main` → containerized (Docker images) on a managed cluster (decision deferred — Hetzner CCM, AWS ECS, or k3s).

### 16.2 Docker images

- `crm/api` — NestJS production build.
- `crm/dashboard` — Nginx + dist.
- `crm/website` — Nginx + dist.

### 16.3 Database migrations

Prisma `migrate deploy` runs on container startup behind a leader-election lock (only one instance applies). Long-running data migrations are queued via BullMQ and triggered manually.

---

## 17. Folder Structure (final)

```
crm/
├── apps/
│   ├── api/                       # NestJS backend
│   │   ├── src/
│   │   │   ├── core/              # auth, workspaces, users, teams, roles, profiles, audit, custom-fields, metadata, i18n
│   │   │   ├── crm/               # people, companies, deals, pipelines, stages, activities, lists, tags, forms
│   │   │   ├── automation/        # workflow, webhooks-out, validation
│   │   │   ├── integrations/      # email-smtp, stripe (our SaaS billing)
│   │   │   ├── reports/           # reports, dashboards, widgets
│   │   │   ├── ai/                # provider-adapter, email-composer, embeddings
│   │   │   ├── notifications/     # in-app socket.io, email
│   │   │   ├── shared/            # filters, guards, decorators, utils
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── test/                  # e2e tests (Supertest)
│   │   ├── nest-cli.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── dashboard/                 # Vue 3 admin
│   │   ├── src/
│   │   │   ├── views/             # one folder per module
│   │   │   ├── components/        # shared components, DynamicForm
│   │   │   ├── composables/       # useApi, useAuth, useMetadata, usePermissions
│   │   │   ├── layouts/
│   │   │   ├── pinia/
│   │   │   ├── router/
│   │   │   ├── i18n/
│   │   │   ├── styles/
│   │   │   ├── App.vue
│   │   │   └── main.ts
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── package.json
│   │   └── tailwind.config.ts
│   └── website/                   # Vue 3 public site
│       ├── src/
│       │   ├── pages/             # Home, Pricing, Features, Contact, Sign-up, Legal
│       │   ├── components/
│       │   ├── i18n/
│       │   ├── App.vue
│       │   └── main.ts
│       ├── public/
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
├── packages/
│   ├── shared-types/              # TS types from Prisma + manual
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   └── metadata/                  # entityDefs, layouts, i18n
│       ├── entityDefs/*.json
│       ├── clientDefs/*.json
│       ├── layouts/<Entity>/*.json
│       └── i18n/{ar,en}.json
├── docker/                        # docker volumes (gitignored), config snippets
├── docs/
│   ├── specs/                     # this file + module specs
│   └── plans/                     # writing-plans output (PLAN.md)
├── research/                      # ✅ MODULES.md + 5 vendor research files
├── scripts/                       # local utility scripts
├── docker-compose.yml             # postgres + redis + minio + mailhog
├── pnpm-workspace.yaml
├── package.json                   # root workspace meta + dev scripts
├── Makefile                       # install, dev, infra-up, etc. (azadoc pattern)
├── .editorconfig
├── .env.example
├── .gitignore
├── .prettierrc.json
├── .prettierignore
└── README.md
```

---

## 18. Open Questions (to address during implementation)

1. **Hierarchical role-based sharing** — is the v1 Role hierarchy enough, or do we need explicit Sharing Rules in v1? **Default: simple Role hierarchy in v1; Sharing Rules in Phase 2.**
2. **Per-org subdomain routing** — `<workspace>.crm.com` vs path-based `crm.com/w/<workspace>`? **Default: path-based in v1 (simpler infra); subdomain in Phase 2 with DNS wildcard + cert automation.**
3. **Prisma generated columns for indexed custom fields** — Postgres generated columns have limitations (must be IMMUTABLE). For `LOOKUP`/`FORMULA`/`ROLLUP` fields we'll need denormalized columns updated by triggers or background jobs. **Default: only TEXT/NUMBER/DATE custom fields can be `indexed=true` in v1.**
4. **Soft-delete vs hard-delete** — most CRMs soft-delete (recoverable). **Default: soft-delete for People/Companies/Deals/Activities (90-day retention); hard-delete for everything else.**
5. **API rate-limits per plan** — TBD as plan tiers are finalized.

---

## 19. Success Criteria for v1

- A new prospect can sign up at the website, land in dashboard onboarding, invite teammates, create custom fields, define a pipeline, import contacts, run a workflow that creates tasks on lead creation, view a forecast report, and have it all work in Arabic with RTL — **end-to-end in under 6 weeks of build**.
- All Phase 1 modules covered by tests at the levels in §15.
- Performance: p95 list endpoint < 300 ms with 100k records per workspace; dashboard initial paint < 2 s on 4G.
- Multi-tenancy isolation verified by automated tests on every PR.
- WCAG 2.1 AA on dashboard + website.
- Arabic + English UX feels native (proofread by a native Arabic speaker on the team).

---

## 20. Sign-off

Once user approves this spec, we proceed to:

1. **`writing-plans` skill** — generate `docs/plans/PLAN.md` with phased, dependency-ordered, TDD-first task breakdown for the 6-week MVP.
2. **Sprint 0 scaffold** — monorepo, Docker, CI, base apps.
3. **Sprint-by-sprint implementation** with code review at each module boundary.

— *End of design specification.*
