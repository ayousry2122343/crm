# CRM Platform — Comprehensive Status Report

> **Date:** 2026-05-23
> **Scope:** Complete audit of implemented code, infrastructure, and gap analysis against MODULES.md roadmap
> **Method:** Full codebase read — Prisma schema, every NestJS module, every Vue view/component, tests, CI, infra

---

## 1. Executive Summary

The CRM platform has completed **3 full phases** (29 sprints) of development. It is a functional multi-tenant SaaS CRM covering Sales, Marketing, Service, and AI domains. The codebase contains **~56,000 lines** of production code across a pnpm monorepo with 3 apps and 2 shared packages.

| Metric | Value |
|--------|-------|
| Phases complete | 3 (Phase 1 v1.0.0, Phase 2 v2.0.0, Phase 3 extended) |
| Sprints delivered | 29 (S0–S5, S6–S14, S18–S29) |
| Prisma models | 73 |
| Prisma enums | 37 |
| NestJS modules | 40 registered in app.module.ts |
| Backend services | 59 |
| Backend controllers | 51 |
| Backend test files | 87 spec files |
| Frontend views (.vue) | 109 files in 22 directories |
| Frontend components | 50+ |
| Frontend API modules | 49 .ts files |
| Frontend routes | 56 named routes |
| Frontend test files | 88 spec files |
| Total test files | 180 (+ 4 Playwright e2e) |
| Estimated test count | ~1,413 (960 backend + 453 frontend) |
| i18n keys | 49 top-level keys per locale (ar + en), ~995 lines each |
| Permission keys | 106 |
| Code size | ~32,200 lines backend + ~23,700 lines frontend |

---

## 2. Technology Stack (Actual)

### Backend (apps/api)
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | NestJS | 10.4.15 |
| ORM | Prisma | 6.1.0 |
| Database | PostgreSQL (pgvector image) | 16 |
| Cache/Queue | Redis + BullMQ | 7 / 5.76.6 |
| Object Storage | MinIO (S3-compatible) | latest |
| Email (dev) | MailHog | latest |
| Auth | JWT (passport + argon2) | nestjs/jwt 10.2.0 |
| GraphQL | Apollo Server | 4.11.3 |
| WebSocket | Socket.io | via @nestjs/websockets |
| Logging | Pino (nestjs-pino) | — |
| Validation | class-validator + class-transformer | — |
| File Processing | exceljs, csv-parse | — |
| Testing | Jest 29.7.0 + ts-jest + supertest | — |

### Frontend Dashboard (apps/dashboard)
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Vue 3 (Composition API) | 3.5.13 |
| Build | Vite | — |
| UI Library | PrimeVue | 4.2.5 |
| UI Components | Radix Vue (shadcn-vue) | 1.9.17 |
| State | Pinia | 2.3.0 |
| Forms | vee-validate + Zod | 4.15.0 |
| HTTP | axios | — |
| Charts | Chart.js | — |
| i18n | vue-i18n | 10.0.5 |
| Animations | anime.js + motion | — |
| Icons | Lucide Vue + PrimeIcons | — |
| Testing | Vitest 2.1.8 + @vue/test-utils | — |

### Frontend Website (apps/website)
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Vue 3 + Vite | 3.5.13 |
| Router | vue-router | 4.5.0 |
| i18n | vue-i18n | 10.0.5 |
| Testing | Vitest | 2.1.8 |

### Infrastructure
| Component | Image/Version | Port | Health Check |
|-----------|--------------|------|-------------|
| PostgreSQL | pgvector/pgvector:pg16 | 5432 | pg_isready |
| Redis | redis:7-alpine | 6379 | redis-cli ping |
| MinIO | minio (latest) | 9000/9001 | /minio/health/live |
| MailHog | mailhog (latest) | 1025/8025 | — |
| Extensions | vector, pg_trgm, unaccent, uuid-ossp | — | — |

### CI/CD
- **Platform:** GitHub Actions
- **Triggers:** PR + push to main/develop
- **Steps:** checkout → pnpm install → typecheck → lint → test
- **CI services:** PostgreSQL 16 (pgvector) + Redis 7
- **Missing in CI:** e2e tests, build verification, coverage reports

---

## 3. Data Model — All 73 Models

### 3.1 Core / Auth / RBAC (12 models)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| Workspace | Multi-tenant boundary | slug, name, plan (FREE/STARTER/GROWTH/ENTERPRISE), branding, primaryLocale, primaryCurrency |
| User | Authenticated humans | email, passwordHash, fullName, locale, status (ACTIVE/INVITED/DISABLED) |
| Team | Organizational groups | name, parentId (hierarchical) |
| Role | Hierarchical permission level | name, parentId |
| Profile | Named permission bundle | name, isSystem, permissions[] |
| UserRole | User ↔ Role junction | userId, roleId |
| UserProfile | User ↔ Profile junction | userId, profileId |
| RefreshToken | JWT refresh rotation | tokenHash, expiresAt, revokedAt, replacedById, ipAddress, userAgent |
| EmailVerificationToken | Email verify flow | tokenHash, expiresAt, consumedAt |
| PasswordResetToken | Password reset flow | tokenHash, expiresAt, consumedAt |
| AuditLog | Change tracking | entityType, entityId, fieldKey, oldValue, newValue, action (CREATE/UPDATE/DELETE/RESTORE), userId |
| UserInvite | Workspace invitation | email, tokenHash, expiresAt, acceptedAt |

### 3.2 Customization (1 model)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| CustomFieldDef | No-migration field additions | entityType, key, label(Json), type (16 types), options, required, unique, indexed, formulaExpr, rollupConfig, visibleToProfileIds[], editableByProfileIds[] |

**CustomFieldType enum (16 types):** TEXT, LONG_TEXT, NUMBER, DECIMAL, BOOLEAN, DATE, DATETIME, PICKLIST, MULTI_PICKLIST, LOOKUP, URL, EMAIL, PHONE, FILE, FORMULA, ROLLUP

### 3.3 CRM Core — People & Deals (10 models)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| Person | Unified Lead/Contact/Company | isCompany, parentId, firstName, lastName, fullName, companyName, email, phone, lifecycleStage (LEAD/MQL/SQL/OPP/CUSTOMER/EVANGELIST), source, ownerId, customFields(Json), doNotContact, unsubscribed, consent, score, scoreUpdatedAt |
| Tag | Free-form labels | name, color |
| EntityTag | Polymorphic tag assignment | tagId, entityType, entityId |
| List | Saved filters/segments | entityType, name, isActive, query(Json), memberIds[], ownerId, isShared |
| Pipeline | Stage-gated process | name, entityType, isDefault |
| Stage | Pipeline step | name, order, probability, color, isWon, isLost, requiredFieldKeys[] |
| Deal | Sales pursuit | name, pipelineId, stageId, amount(Decimal), currency, expectedCloseDate, probability, primaryContactId, primaryCompanyId, status (OPEN/WON/LOST), wonAt, lostAt, lostReason, wonReason, lastActivityAt, customFields, score, scoreUpdatedAt |
| Activity | Polymorphic activity | parentEntity, parentId, type (CALL/MEETING/EMAIL/TASK/NOTE/SYSTEM/FORM_SUBMISSION), subject, body, status (OPEN/DONE/CANCELED), dueAt, completedAt, metadata(Json) |
| WonLostReason | Close categorization | kind (WON/LOST), label, order |
| CustomFieldDef | (listed above) | — |

### 3.4 Products & Commerce (6 models)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| ProductCategory | Hierarchical categories | name, labelAr, labelEn, parentId |
| Product | Sellable items | name, labelAr, labelEn, sku, unitPrice(Decimal), currency, isActive, categoryId, customFields |
| Pricebook | Price list variant | name, isDefault, currency |
| PricebookEntry | Product price in pricebook | pricebookId, productId, unitPrice(Decimal), minQty |
| Quote | Pre-sale proposal | number, dealId, contactId, status (DRAFT/SENT/ACCEPTED/REJECTED/EXPIRED), subtotal, discountPct, discountAmt, taxPct, taxAmt, total, currency, notes |
| QuoteLineItem | Quote line detail | quoteId, productId, description, quantity, unitPrice, discountPct, total, sortOrder |

### 3.5 Marketing (4 models)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| Campaign | Marketing initiative | name, subject, body, status (DRAFT/SCHEDULED/SENDING/SENT/PAUSED), listId, scheduledAt, sentAt, stats(Json) |
| CampaignRecipient | Person ↔ Campaign | personId, email, status (PENDING/SENT/OPENED/CLICKED/BOUNCED/UNSUBSCRIBED), openedAt, clickedAt, bouncedAt |
| Sequence | Multi-step outreach | name, triggerEvent, steps(Json), enabled |
| SequenceEnrollment | Person in sequence | sequenceId, personId, currentStep, status (ACTIVE/COMPLETED/PAUSED/EXITED), nextRunAt |

### 3.6 Email & Communication (5 models)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| EmailTemplate | Reusable email templates | name, subject, body, mergeTagKeys[], category |
| OutboundEmail | Sent email record | toAddress, fromAddress, subject, body, templateId, entityType, entityId, status (QUEUED/SENDING/SENT/FAILED), providerMessageId |
| EmailAccount | OAuth email sync | userId, provider (GMAIL/OUTLOOK), emailAddress, credentials(Json), syncState (IDLE/SYNCING/ERROR), syncCursor |
| EmailThread | Email thread tracking | accountId, externalId, subject, lastMessageAt, personId |
| EmailMessage | Individual email | threadId, externalId, fromAddress, toAddresses[], ccAddresses[], subject, bodyText, bodyHtml, direction (IN/OUT) |

### 3.7 Automation (4 models)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| Workflow | TCA automation rules | name, entityType, enabled, trigger(Json), conditions(Json), actions(Json), cronExpression, lastRunAt |
| WorkflowRun | Execution log | workflowId, triggeredByEntity, triggeredById, status (QUEUED/RUNNING/SUCCESS/FAILED), log(Json), error |
| Webhook | Outbound HTTP hooks | url, secret, events[], enabled |
| WebhookDelivery | Delivery attempt log | webhookId, eventName, payload(Json), status (PENDING/SUCCESS/FAILED), statusCode, attemptCount |
| ValidationRule | Pre-save field checks | entityType, expression(Json), errorMessage(Json), enabled |

### 3.8 Content & Storage (5 models)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| Form | Web/lead capture form | name, slug, isPublic, fields(Json), mappings(Json), useHoneypot, rateLimit, createTicket, ticketQueueId |
| FormSubmission | Form response data | formId, data(Json), ipAddress, userAgent, personId, dealId |
| Blog | Content posts | title, slug, body, authorId, status (DRAFT/PUBLISHED), publishedAt, tags[], metaDescription, categoryId |
| BlogCategory | Blog categorization | name, slug |
| Attachment | File uploads | entityType (PERSON/COMPANY/DEAL/BLOG/ACTIVITY/TICKET), entityId, filename, originalName, mimeType, sizeBytes, storagePath, uploadedById |

### 3.9 Portal (2 models)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| Portal | Customer portal config | domain, theme(Json), enabled |
| PortalUser | Portal authentication | personId, email, passwordHash, lastLoginAt |

### 3.10 Analytics & AI (6 models)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| Dashboard | Custom dashboard layouts | ownerId, name, layout(Json), isDefault |
| Embedding | pgvector embeddings | entityType, entityId, vector(Unsupported — pgvector) |
| AIUsage | Token usage tracking | userId, feature, provider, model, inputTokens, outputTokens |
| ForecastPeriod | Forecast time windows | periodType (MONTHLY/QUARTERLY), startDate, endDate |
| ForecastEntry | Per-user forecast data | forecastPeriodId, userId, pipelineId, category (PIPELINE/BEST_CASE/COMMIT/CLOSED_WON/OMITTED), amount, adjustedAmount |
| ForecastSnapshot | Point-in-time forecast | forecastPeriodId, snapshotDate, data(Json) |

### 3.11 Service Cloud (12 models)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| Ticket | Customer issue records | ticketNumber(Int), subject, description, status (NEW/OPEN/PENDING/ON_HOLD/RESOLVED/CLOSED), priority (LOW/MEDIUM/HIGH/URGENT), channel (EMAIL/PHONE/CHAT/WEB_FORM/PORTAL/API), contactId, companyId, assigneeId, teamId, queueId, slaPolicyId, slaFirstResponseDue, slaResolutionDue, slaFirstResponseBreached, slaResolutionBreached, tags(Json), customFields(Json), firstResponseAt, resolvedAt, closedAt |
| Queue | Shared ticket inboxes | name, description, isDefault, assignmentMode (MANUAL/ROUND_ROBIN/LEAST_ACTIVE), members(Json) |
| BusinessHours | Work schedule definition | name, timezone, schedule(Json), holidays(Json), isDefault |
| SLAPolicy | Response/resolution targets | name, description, isDefault, businessHoursId, rules(Json) |
| Macro | Canned responses | name, content, category, shortcut, visibility (PERSONAL/TEAM/GLOBAL) |
| SatisfactionRating | CSAT feedback | ticketId, contactId, rating(Int 1-5), comment, token(unique), respondedAt |
| KBCategory | KB article categories | name, slug, description, parentId, order |
| KBArticle | Knowledge base content | categoryId, title, slug, content, status (DRAFT/PUBLISHED/ARCHIVED), viewCount, helpfulCount, notHelpfulCount |
| EmailToCaseConfig | Inbound email→ticket | supportEmail, isActive, defaultQueueId, defaultPriority, autoReply, autoReplyTemplateId |
| ChatSession | Live chat conversations | visitorName, visitorEmail, status (WAITING/ACTIVE/ENDED), assigneeId, queueId, ticketId |
| ChatMessage | Chat messages | sessionId, senderType, senderId, content |

### 3.12 Social / Collaboration (4 models)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| Notification | In-app/email notifications | userId, type (9 types), title, body, link, isRead |
| NotificationPreference | Per-user notification settings | userId, channel (IN_APP/EMAIL), type, enabled |
| Comment | Record-level discussion | entityType (PERSON/COMPANY/DEAL/ACTIVITY/TICKET/BLOG), entityId, authorId, body, mentions(Json), parentId (threaded), isPinned |
| Follower | Record subscription | userId, entityType, entityId |

### 3.13 Scoring & Goals (2 models)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| ScoringRule | Rule-based lead/deal scoring | name, entityType, isActive, rules(Json), maxScore |
| Goal | Target metrics tracking | name, metric (REVENUE/DEAL_COUNT/ACTIVITY_COUNT/WON_DEAL_COUNT/AVG_DEAL_SIZE/CUSTOM), targetValue, currentValue, period, startDate, endDate, ownerId, teamId, status (ON_TRACK/AT_RISK/BEHIND/ACHIEVED) |

### 3.14 Data Management (1 model)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| ImportJob | Bulk import tracking | entityType, fileName, totalRows, successCount, errorCount, errors(Json), status (PENDING/PROCESSING/COMPLETED/FAILED) |

---

## 4. Backend Modules — Detailed Inventory

### 4.1 Core Domain (apps/api/src/core/)
| Module | Service | Controller | Endpoints | Permissions | Tests |
|--------|---------|-----------|-----------|-------------|-------|
| Auth | auth.service | auth.controller | signup, login, refresh, logout, password-reset, email-verify, accept-invite | Public + JWT | ~27 |
| Workspace | workspace.service | workspace.controller | settings CRUD | workspace:* | ~5 |
| Users | user.service | user.controller | list, invite, update, disable | user:* | ~8 |
| RBAC | — | — | guard + decorator only | 106 permission keys via profiles | ~7 |
| Audit | audit.service | audit.controller | per-record log + global list | audit:read | ~6 |
| Metadata | metadata.service | metadata.controller | entity defs CRUD | — | ~5 |
| Custom Fields | custom-field.service | custom-field.controller | CRUD, DDL generation | custom-field:write | ~23 |
| Tenant | tenant-context.service | — | interceptor + ALS context | — | ~11 |
| Email | email.service | — | SMTP send (NodeMailer) | — | ~2 |

### 4.2 CRM Domain (apps/api/src/crm/)
| Module | Service | Controller | Key Features | Tests |
|--------|---------|-----------|-------------|-------|
| People | person.service | person.controller | CRUD, merge, duplicates, lifecycle stage, FTS search | ~44 |
| Deals | deal.service | deal.controller | CRUD, stage transitions, required fields gate, kanban | ~34 |
| Pipelines | pipeline.service | pipeline.controller | multi-pipeline, stages, per-entity | ~15 |
| Activities | activity.service | activity.controller | polymorphic CRUD, calendar, subtypes | ~11 |
| Tags | tag.service | tag.controller | CRUD, assign/unassign | ~11 |
| Lists | list.service | list.controller | active/static lists, query builder | ~20 |
| Forms | form.service, form-submission.service, web-to-case.service | form.controller, public-form.controller | builder, public submit, honeypot, rate-limit, web-to-case | ~25 |
| Products | product.service | product.controller | CRUD, categories, cursor pagination | ~17 |
| Pricebooks | pricebook.service | pricebook.controller | CRUD, entries per product | ~15 |
| Quotes | quote.service | quote.controller | CRUD, line items, totals, status flow | ~16 |
| Campaigns | campaign.service | campaign.controller | CRUD, recipients, send/schedule, stats | ~26 |
| Sequences | sequence.service | sequence.controller | CRUD, enrollment, step execution | ~19 |
| Won-Lost Reasons | won-lost-reason.service | won-lost-reason.controller | CRUD, ordering | ~9 |
| Tickets | ticket.service | ticket.controller | CRUD, 6-state machine, auto-numbering (TKT-0001), SLA integration | ~50 |
| Queues | queue.service | queue.controller | CRUD, round-robin/least-active assignment | ~24 |
| SLA | sla.service, business-hours.service | sla.controller | policies, business hours, breach detection, escalation | ~38 |
| Macros | macro.service | macro.controller | CRUD, visibility levels (PERSONAL/TEAM/GLOBAL) | ~9 |
| CSAT | csat.service | csat.controller | send survey, public response (token-based), stats | ~9 |
| KB | kb.service | kb.controller | categories (hierarchical), articles, slug, view count, feedback | ~13 |
| Email-to-Case | email-to-case.service | email-to-case.controller | inbound email webhook → ticket, reply detection | ~19 |
| Chat | chat.service | chat.controller + chat.gateway | sessions, messages, Socket.io /chat namespace, convert-to-ticket | ~21 |
| Service Dashboard | service-dashboard.service | service-dashboard.controller | overview, by-channel/priority/status, volume, agent performance, queue stats | ~15 |
| Scoring | scoring.service | scoring.controller | rule-based scoring (11 operators), bulk rescore | ~50 |
| Forecasts | forecast.service | forecast.controller | generate, entries, snapshots | ~18 |
| Goals | goal.service | goal.controller | CRUD, 6 metric types, progress recalculation | ~27 |
| Search | search.service | search.controller | Postgres FTS, prefix-match, tsvector | ~5 |
| Attachments | attachment.service, storage.service | attachment.controller | upload to MinIO, polymorphic | ~24 |
| Blogs | blog.service | blog.controller | CRUD, publish/unpublish, markdown, slug | ~25 |
| Import-Export | import-export.service | import-export.controller | CSV import, async jobs | ~26 |

### 4.3 Automation Domain (apps/api/src/automation/)
| Module | Service | Key Features | Tests |
|--------|---------|-------------|-------|
| Workflow | workflow.service, cron-runner.service, workflow.executor | TCA engine, cron triggers, BullMQ, idempotent runs | ~47 |
| Webhooks | webhook.service, webhook-dispatcher | outbound HTTP, HMAC signing, retries | ~10 |
| Validation | validation.service, validation-runner | pre-save rules, expression evaluation | ~9 |

### 4.4 AI Domain (apps/api/src/ai/)
| Module | Service | Key Features | Tests |
|--------|---------|-------------|-------|
| Core AI | ai.service | AIProvider adapter (mock/ollama/openai/anthropic) | ~14 |
| Copilot | copilot.service | RAG pipeline, context-aware chat, suggested prompts | ~17 |
| Email Composer | email-composer.service | Intent → draft email with record context | ~12 |
| Embeddings | embeddings.service | pgvector, embed records on save | ~11 |

### 4.5 Other Domains
| Module | Service | Key Features | Tests |
|--------|---------|-------------|-------|
| Comments | comment.service | CRUD, @mention parsing, follower notifications, threaded replies | ~37 |
| Notifications | notification.service + gateway + worker | in-app + email, Socket.io rooms, BullMQ queued delivery | ~29 |
| Integrations/Email | outbound-email.service, email-template.service | SMTP send, templates with merge tags | ~12 |
| Integrations/Email-Sync | email-sync.service | OAuth Gmail/Outlook, thread sync | ~22 |
| Reports | report.service, dashboard.service | 5 report types (pipeline funnel, activities, conversion, forecast, won-lost), dashboard widgets | ~13 |
| Portal | portal.service | portal settings, separate auth, portal users | ~18 |
| GraphQL | 5 resolvers (person, deal, ticket, activity, dashboard) | 8 queries + 8 mutations, code-first Apollo | ~7 |
| MCP | mcp.service | 12 tools for AI agents, x-mcp-key auth | ~13 |

---

## 5. Frontend — Complete Page & Component Inventory

### 5.1 Dashboard Routes (56 total)

**Auth (5 routes):**
/sign-up, /login, /forgot-password, /reset-password, /accept-invite

**CRM Core (11 routes):**
/dashboard, /people, /people/:id, /companies, /companies/:id, /deals (kanban), /deals/list, /deals/:id, /calendar, /quotes, /quotes/new, /quotes/:id

**Marketing (6 routes):**
/campaigns, /campaigns/:id, /sequences, /sequences/:id, /lists, /lists/:id

**Service (5 routes):**
/tickets, /tickets/:id, /chat, /service-dashboard, /kb, /kb/new, /kb/:id, /kb/categories

**Content (5 routes):**
/forms, /forms/:id, /blogs, /blogs/:id, /blog/:slug

**Analytics (5 routes):**
/forecasts, /goals, /reports, /dashboards, /dashboards/:id, /notifications

**Automation (3 routes):**
/automation/workflows, /automation/workflows/:id, /automation/webhooks

**Settings (19 routes):**
/settings/workspace, /settings/users, /settings/custom-fields, /settings/pipelines, /settings/won-lost-reasons, /settings/email-templates, /settings/email-accounts, /settings/portal, /settings/products, /settings/pricebooks, /settings/notification-preferences, /settings/scoring-rules, /settings/queues, /settings/business-hours, /settings/sla-policies, /settings/macros, /settings/audit-trail, /settings/csat, /settings/email-to-case

### 5.2 Reusable Components (50+)
- **DynamicForm** system with 14 field types
- **Kanban** (Board, Column, Card)
- **ListView** + FilterBar
- **5 Dashboard Widgets** (Number, Chart, List, Kanban, Forecast)
- **UI Kit** (Badge, Button, Card, Input — shadcn-vue)
- **Domain components:** CopilotSidebar, CommentSection, MentionInput, NotificationBell, EmailComposer, GlobalSearch, AttachmentList, ImportDialog, ActivityComposer, ScoreBadge, SLABadge, MacroSelector, TicketCreateDialog, ChatWidget, CustomFieldEditor

### 5.3 Composables (9)
useAuth, useMetadata, usePermissions, useFormFromMetadata, usePeople, useLocale, useAppToast, useSocket, useAnime

### 5.4 Pinia Stores (2)
auth.store, notification.store

### 5.5 Website (apps/website — 5 pages)
Home, Features, Pricing, Contact, SignUp + SiteHeader + SiteFooter

---

## 6. Gap Analysis — What's Built vs. MODULES.md Roadmap

### 6.1 MODULES.md Phase 1 (MVP) — Status: COMPLETE

| Feature | Status | Notes |
|---------|--------|-------|
| Auth + JWT + password reset | ✅ Done | S1 |
| Workspaces (multi-tenancy) | ✅ Done | S1, row-level via Prisma middleware |
| Teams + Roles + Profiles (RBAC) | ✅ Done | S1, 106 permission keys |
| Audit Log | ✅ Done | S1, per-field tracking |
| Custom Fields engine | ✅ Done | S1, 16 field types, metadata-driven |
| People (unified model) | ✅ Done | S2, isCompany flag, lifecycleStage |
| Companies | ✅ Done | S2, via Person with isCompany=true |
| Deals + multi-pipeline | ✅ Done | S3, required fields per stage, won/lost |
| Activities (polymorphic) | ✅ Done | S3, 7 subtypes |
| Email send (SMTP) | ✅ Done | S4 |
| Forms + Web-to-Lead | ✅ Done | S4, honeypot, rate-limit |
| Workflow engine (TCA) | ✅ Done | S4, BullMQ, cron triggers |
| Webhooks out | ✅ Done | S4, HMAC signing |
| Validation Rules | ✅ Done | S4 |
| Standard reports (5) | ✅ Done | S5, pipeline/activity/conversion/forecast/won-lost |
| Dashboard widgets (5 types) | ✅ Done | S5 |
| AI Email Composer | ✅ Done | S5 |
| Public website | ✅ Done | S5, 5 pages |
| Tags + Active Lists | ✅ Done | S2 |
| Calendar UI | ✅ Done | S3 |
| Search (Postgres FTS) | ✅ Done | S2, prefix-match tsvector |

### 6.2 MODULES.md Phase 2 (Core CRM) — Status: COMPLETE

| Feature | Status | Notes |
|---------|--------|-------|
| Products + Pricebooks | ✅ Done | S6, categories + cursor pagination |
| Quotes | ✅ Done | S7, line items, totals, status flow |
| Email Marketing Campaigns | ✅ Done | S8, send/schedule, tracking |
| Drip Sequences | ✅ Done | S9, enrollment engine |
| Time-based Workflow Triggers | ✅ Done | S10, cron runner |
| 2-way Email Sync | ✅ Done | S11, OAuth Gmail/Outlook |
| Copilot Sidebar (RAG) | ✅ Done | S12, pgvector embeddings |
| Customer Portal | ✅ Done | S13, separate auth |
| Blog | ✅ Done | S14, markdown, publish/unpublish |
| Forecasting + Categories | ✅ Done | S20, snapshots |
| Goals | ✅ Done | S20, 6 metric types |
| Comments + @Mentions | ✅ Done | S19, threaded, follower system |

**Phase 2 items from MODULES.md NOT built:**
| Feature | MODULES.md Tier | Status | Notes |
|---------|----------------|--------|-------|
| Calendar Sync (Google/MS) | SHOULD | ❌ Not built | OAuth setup needed |
| Meeting Scheduler (Calendly-like) | SHOULD | ❌ Not built | Public booking widget |
| Email Tracking (open/click) | SHOULD | ❌ Not built | Pixel + link rewriting |
| Lead Routing | SHOULD | ❌ Not built | Round-robin by criteria |
| Custom Modules (admin-defined entities) | SHOULD | ❌ Not built | Major customization feature |
| Formula Fields | SHOULD | ❌ Not built | CustomFieldDef has formulaExpr column but no evaluator |
| Rollup Summary Fields | SHOULD | ❌ Not built | CustomFieldDef has rollupConfig column but no evaluator |
| Page Layouts per Profile | SHOULD | ❌ Not built | Layouts are hardcoded in Vue |
| Landing Pages | SHOULD | ❌ Not built | Basic page builder |
| Custom Report Builder | SHOULD | ❌ Not built | Only 5 standard reports exist |
| Conversion Funnel report | SHOULD | ❌ Not built | Lead→MQL→SQL→Opp→Won |
| AI Reply Suggestions | SHOULD | ❌ Not built | LLM suggested replies |
| Pre-built connectors (Slack, Zoom, etc.) | SHOULD | ❌ Not built | Only email integrations exist |
| Bulk Import API (CSV) | SHOULD | ⚠️ Partial | ImportJob model + service exist, but no verified end-to-end flow |

### 6.3 MODULES.md Phase 3 (Differentiators) — Status: MOSTLY COMPLETE

| Feature | Status | Notes |
|---------|--------|-------|
| Notifications + Real-time | ✅ Done | S18, Socket.io |
| Rule-based Lead/Deal Scoring | ✅ Done | S21, 11 operators |
| Tickets / Cases | ✅ Done | S22, 6-state machine |
| Queues + Assignment Rules | ✅ Done | S23, round-robin/least-active |
| SLAs | ✅ Done | S24, business hours, breach detection |
| Macros + Canned Responses | ✅ Done | S25, 3 visibility levels |
| CSAT | ✅ Done | S25, token-based public response |
| Knowledge Base | ✅ Done | S25, hierarchical categories, articles |
| Email-to-Case | ✅ Done | S26, inbound email→ticket |
| Web-to-Case | ✅ Done | S26, form→ticket toggle |
| Service Dashboard | ✅ Done | S27, stats + charts |
| Live Chat | ✅ Done | S28, Socket.io, agent console |
| GraphQL API | ✅ Done | S29, 8 queries + 8 mutations |
| MCP Server | ✅ Done | S29, 12 tools, x-mcp-key auth |

**Phase 3 items from MODULES.md NOT built:**
| Feature | MODULES.md Tier | Status | Notes |
|---------|----------------|--------|-------|
| Conversation Intelligence | NICE | ❌ Not built | Call recording + transcription + AI insights |
| Predictive Lead Scoring (ML) | NICE | ❌ Not built | Only rule-based exists |
| Predictive Deal Scoring (ML) | NICE | ❌ Not built | Only rule-based exists |
| AI Forecasting (ML) | NICE | ❌ Not built | Only manual forecasting exists |
| AI Agents (autonomous) | NICE | ❌ Not built | Sales/Service/Content agents |
| Customer Journey Builder | NICE | ❌ Not built | Visual flow editor |
| A/B Testing | NICE | ❌ Not built | Campaigns/forms variant testing |
| SMS / WhatsApp | NICE | ❌ Not built | High demand in MENA |
| ABM (Account-Based Marketing) | NICE | ❌ Not built | B2B feature |
| Sales Workspace / Accelerator | NICE | ❌ Not built | Prioritized work-list |
| Sales Inbox | NICE | ❌ Not built | Unified email + tasks |
| Approvals | NICE | ❌ Not built | Multi-step approval chains |
| Conversations Inbox (omni-channel) | NICE | ❌ Not built | Unified channel inbox |
| Voice / CTI | NICE | ❌ Not built | Telephony integration |
| AI Bots | NICE | ❌ Not built | Automated first response |
| Skills-based Routing | NICE | ❌ Not built | Agent skills matching |
| Visual Flow Builder (BPMN-lite) | NICE | ❌ Not built | Drag-drop workflow |
| Server-side Custom Functions | NICE | ❌ Not built | Sandboxed JS/TS |
| GraphQL Subscriptions (realtime) | NICE | ❌ Not built | WebSocket-based |
| SDKs (JS, Mobile) | NICE | ❌ Not built | Auto-generated |

### 6.4 MODULES.md Phase 4 (Enterprise) — Status: NOT STARTED

| Feature | Status |
|---------|--------|
| Field Service | ❌ |
| CPQ (Configure-Price-Quote) | ❌ |
| Industry Clouds | ❌ |
| Sandboxes / Environments | ❌ |
| Data Residency | ❌ |
| Encryption with CMK | ❌ |
| Sub-organizations / Business Units | ❌ |

---

## 7. Cross-Cutting Features — Completeness Check

### 7.1 Security & Auth
| Feature | Status | Notes |
|---------|--------|-------|
| JWT access + refresh rotation | ✅ | revokedAt + replacedById |
| Password hashing (argon2) | ✅ | — |
| RBAC (106 permissions) | ✅ | Profile-based + guard decorator |
| Workspace isolation | ✅ | Prisma middleware + ALS |
| 2FA / MFA | ❌ | Not implemented |
| SSO (SAML/OIDC) | ❌ | Not implemented |
| IP restrictions | ❌ | Not implemented |
| Field-Level Security | ⚠️ | Schema supports visibleToProfileIds/editableByProfileIds on CustomFieldDef but enforcement not verified |
| API Keys (for external access) | ❌ | Only x-mcp-key for MCP, no general API keys |
| OAuth2 server | ❌ | Only OAuth client (Gmail/Outlook) |

### 7.2 Customization Platform
| Feature | Status | Notes |
|---------|--------|-------|
| Custom Fields (16 types) | ✅ | Metadata-driven, DDL generation |
| Custom Modules | ❌ | Major gap — admins can't create entities |
| Page Layouts (JSON-driven) | ⚠️ | packages/metadata has entityDefs but layouts are hardcoded Vue |
| Formula Fields | ⚠️ | Schema column exists, no evaluator |
| Rollup Summary Fields | ⚠️ | Schema column exists, no evaluator |
| Picklist Manager | ⚠️ | Picklists defined in custom fields, no central management UI |
| Multi-currency | ⚠️ | Currency field on Deal/Product/Quote but no FX rate conversion |
| Per-org branding | ⚠️ | Workspace.branding(Json) exists, not consumed by frontend |

### 7.3 Integrations
| Feature | Status | Notes |
|---------|--------|-------|
| REST API | ✅ | All entities exposed via controllers |
| GraphQL API | ✅ | 5 resolvers, 8Q + 8M |
| MCP Server | ✅ | 12 tools |
| Webhooks outbound | ✅ | HMAC, retries |
| Webhooks inbound | ❌ | Not implemented |
| Gmail OAuth | ✅ | Email sync |
| Outlook/MS Graph OAuth | ✅ | Email sync |
| Stripe | ❌ | Not implemented (planned for SaaS billing) |
| Slack | ❌ | Not implemented |
| Zapier / Make | ❌ | Not implemented |
| Calendar Sync | ❌ | Not implemented |

### 7.4 AI Capabilities
| Feature | Status | Notes |
|---------|--------|-------|
| AI Provider adapter | ✅ | mock/ollama/openai/anthropic |
| Email Composer | ✅ | Intent→draft with context |
| Copilot Sidebar (RAG) | ✅ | pgvector embeddings, chat |
| Embeddings service | ✅ | Embed records on save |
| Usage tracking | ✅ | AIUsage model |
| AI Reply Suggestions | ❌ | Not implemented |
| Predictive Scoring | ❌ | Only rule-based |
| AI Agents (autonomous) | ❌ | Not implemented |
| Conversation Intelligence | ❌ | Not implemented |
| Sentiment Analysis | ❌ | Not implemented |

---

## 8. Known Issues & Technical Debt

### 8.1 Pre-existing Test Failures
| Issue | Location | Impact |
|-------|----------|--------|
| search.service.spec.ts — 7 DB-dependent tests | S2 | Need live Postgres; fail in unit-test mode |
| prisma-tenant.spec.ts — integration tests | S1 | Same — need live DB |
| TypeScript errors in CampaignsIndex + SequencesIndex | S17+ | Harmless; UI compiles fine |

### 8.2 Architecture Debt
| Issue | Description |
|-------|-------------|
| Duplicated requireWs() | Repeated across many services; should be base class |
| No shared test utilities | Each test file sets up its own mocks; no factories/fixtures |
| ESLint only on API | Dashboard and website have no linting configuration |
| E2E not in CI | Playwright tests exist but don't run in GitHub Actions |
| No build step in CI | CI doesn't verify that `pnpm build` succeeds |
| No coverage reporting | Jest has collectCoverageFrom but no aggregation or threshold |
| shared-types has no tests | Package test script is `echo 'no tests yet'` |
| Website is minimal | Only 5 pages, no blog rendering, no dynamic content |

### 8.3 Schema Fields Without Implementation
| Field | Model | Status |
|-------|-------|--------|
| formulaExpr | CustomFieldDef | Column exists, no formula evaluator |
| rollupConfig | CustomFieldDef | Column exists, no rollup engine |
| branding (Json) | Workspace | Column exists, frontend doesn't consume it |
| consent (Json) | Person | Column exists, no GDPR flow |

---

## 9. Infrastructure Health

### 9.1 Makefile Targets (18)
infra-up, infra-down, infra-logs, prisma-generate, prisma-migrate, prisma-studio, seed, api-dev, dashboard-dev, website-dev, dev, lint, typecheck, test, build, clean, dogfood

### 9.2 Docker Services (4)
PostgreSQL 16 (pgvector) + Redis 7 + MinIO + MailHog — all with healthchecks + restart policies

### 9.3 CI Pipeline
GitHub Actions: checkout → pnpm → typecheck → lint → test (with Postgres + Redis services)

---

## 10. Summary — What We Have vs. What a "Complete" MENA B2B SaaS CRM Needs

### STRONG (Production-Ready Core):
- **Sales Cloud:** People, Companies, Deals, Pipelines, Activities, Quotes, Products, Pricebooks, Forecasting, Goals, Scoring
- **Service Cloud:** Tickets, Queues, SLAs, KB, CSAT, Macros, Email-to-Case, Web-to-Case, Chat, Service Dashboard
- **Marketing:** Campaigns, Sequences, Forms, Blog
- **AI Foundation:** Copilot (RAG), Email Composer, Embeddings, AIProvider adapter
- **Platform:** Multi-tenant, RBAC (106 keys), Audit, Custom Fields (16 types), Notifications, Comments, Workflow Engine
- **APIs:** REST + GraphQL + MCP
- **i18n:** Arabic-first RTL + English
- **Testing:** 1,413 tests, 180 spec files

### GAPS (Needed for B2B SaaS Competitiveness):

**Critical for Launch (must-have):**
1. 2FA/MFA — security table-stakes for B2B
2. API Keys — external integrations need this
3. Multi-currency with FX rates — MENA = multi-currency by nature
4. Per-org branding — tenants expect "their" CRM
5. Custom Report Builder — only 5 standard reports is too limiting

**High-Impact Differentiators:**
6. WhatsApp Business integration — #1 channel in MENA
7. AI Agents (autonomous) — the 2026 differentiator
8. Custom Modules — admins define new entities without code
9. Visual Workflow Builder — replace JSON editing
10. Formula + Rollup Fields — complete the customization engine

**Important but Can Follow:**
11. Calendar Sync (Google/MS)
12. Meeting Scheduler (Calendly-like)
13. Email Tracking (opens/clicks)
14. Slack/Zapier connectors
15. SSO (SAML/OIDC) — enterprise requirement
16. Omni-channel Inbox
17. Predictive Scoring (ML)
18. Customer Journey Builder

---

*End of STATUS-REPORT.md — Generated from full codebase audit on 2026-05-23*
