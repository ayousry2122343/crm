# CRM Platform — Phase 4 Design + Full Roadmap (Phases 5–8)

> **Date:** 2026-05-23
> **Status:** Pending user review
> **Authors:** Ahmed Yousry + Claude (Opus 4.6)
> **Prereq:** [`docs/STATUS-REPORT.md`](../../STATUS-REPORT.md) — full codebase audit (2026-05-23)
> **Prereq:** [`docs/specs/2026-04-30-crm-design.md`](../../specs/2026-04-30-crm-design.md) — original architecture spec
> **Prereq:** [`research/MODULES.md`](../../../research/MODULES.md) — 986-line module catalog

---

## 1. Context

The CRM platform completed Phases 1–3 across 29 sprints:

| Phase | Version | Sprints | What shipped |
|-------|---------|---------|-------------|
| 1 | v1.0.0 | S0–S5 | Auth, RBAC, People, Companies, Deals, Pipelines, Activities, Forms, Workflows, Reports, AI Email Composer, Website |
| 2 | v2.0.0 | S6–S14 | Products, Quotes, Campaigns, Sequences, Email Sync, Copilot (RAG), Portal, Blog |
| 3 | v2.x | S18–S29 | Notifications, Comments, Forecasting, Scoring, Tickets, Queues, SLAs, Macros, CSAT, KB, Email-to-Case, Chat, GraphQL, MCP |

**Current state:** 73 Prisma models, 37 enums, 106 permissions, 1,413 tests, ~56k lines of code.

**Gap analysis** (from STATUS-REPORT.md Section 10) identified 18 feature gaps blocking B2B SaaS competitiveness in MENA. This design addresses all of them.

---

## 2. Target Market & Differentiation Strategy

**Target:** B2B SaaS for SMBs in Egypt and Gulf (MENA). Competitors: Zoho CRM, HubSpot Free/Starter.

**Three differentiation axes (balanced):**

1. **AI-Native** — AI Service Agent, predictive scoring, Copilot. Competitors charge premium tiers for these; we include them at lower price points with Ollama (free) as default provider and Anthropic/OpenAI as upgrade.

2. **No-Code Platform** — Custom Modules, Formula Fields, Visual Workflow Builder, Page Layouts. Admins shape the CRM without developers. EspoCRM-grade customization with modern UX.

3. **MENA Channels** — WhatsApp Business as first-class channel (not an afterthought), Arabic-first RTL, MENA currencies, Omni-channel Inbox. The features MENA teams actually use daily.

---

## 3. Phase 4 Structure — "Interleaved Layers"

Phase 4 is decomposed into 3 sub-phases. Each mixes security + value features so every increment is both safe and impressive. Each sub-phase is independently deployable to real customers.

| Sub-Phase | Sprints | Theme | Outcome |
|-----------|---------|-------|---------|
| 4A | 30–35 | Launch-Ready | Deployable to first paying customer |
| 4B | 36–41 | MENA Channels + AI | Differentiated from Zoho/HubSpot |
| 4C | 42–47 | No-Code Platform | Scales without developers |

**AI Provider Strategy:** Ollama (free, self-hosted) as default during current phase. System already has AIProvider adapter supporting mock/ollama/openai/anthropic. AI features will work with all providers. Switch to Anthropic Claude when the system gains traction.

---

## 4. Phase 4A — "Launch-Ready" (Sprints 30–35)

### 4A.1 Sprint 30: 2FA / MFA

**Goal:** TOTP-based two-factor authentication — security table-stakes for B2B.

**New model:**
```
TwoFactorSecret
  id            String @id
  workspaceId   String
  userId        String @unique
  secret        String          // encrypted TOTP secret
  backupCodes   String[]        // 10 hashed one-time recovery codes
  enabledAt     DateTime?
  createdAt     DateTime
```

**Auth flow changes:**
1. Login (email+password) → if user has 2FA enabled → return `{ requiresTwoFactor: true, tempToken }`
2. Client shows TOTP input → `POST /auth/verify-2fa` with tempToken + code → validate → issue JWT pair
3. Backup code path: same endpoint, code matched against hashed backupCodes, consumed on use

**Setup flow:**
1. `POST /auth/2fa/setup` → generate secret + QR code URI (otpauth://totp/CRM:user@email?secret=...)
2. Client renders QR code (qrcode library)
3. `POST /auth/2fa/confirm` with first valid TOTP → save secret, generate 10 backup codes, return codes once
4. `DELETE /auth/2fa` → disable (requires current TOTP or backup code)

**Workspace enforcement:** add `require2FA: Boolean @default(false)` to Workspace. When enabled, users without 2FA see a forced setup screen on next login.

**Library:** `otplib` (MIT, well-maintained, supports TOTP/HOTP).

**Frontend:**
- Profile settings: 2FA setup wizard (QR → verify → backup codes)
- Login page: conditional TOTP input step
- Workspace settings: "Require 2FA for all users" toggle (admin only)

**Tests:** ~20 (setup, verify, backup codes, enforcement, disable, invalid codes)

---

### 4A.2 Sprint 31: API Keys

**Goal:** External systems can authenticate via static keys with scoped permissions.

**New model:**
```
ApiKey
  id            String @id
  workspaceId   String
  name          String          // human label: "Zapier Integration"
  keyHash       String @unique  // argon2 hash of the full key
  prefix        String          // first 8 chars for identification: "crm_live"
  scopes        String[]        // subset of permission keys
  lastUsedAt    DateTime?
  expiresAt     DateTime?
  revokedAt     DateTime?
  createdById   String
  createdAt     DateTime
```

**Key format:** `crm_live_<32 random chars>` — shown once on creation, stored as argon2 hash. Prefix (`crm_live_xxxxxxxx`) stored in plaintext for key identification in logs.

**Auth integration:**
- `ApiKeyGuard`: checks `x-api-key` header → hash → lookup → validate expiry/revocation → inject workspace context + scoped permissions
- Works alongside JWT — if both present, JWT takes precedence
- Rate limiting: `ApiKeyRateLimit` decorator, default 1000 req/min per key, configurable per key

**Endpoints:**
- `POST /api-keys` — create (returns full key once)
- `GET /api-keys` — list (prefix + name + scopes + lastUsedAt, never returns full key)
- `DELETE /api-keys/:id` — revoke
- `PATCH /api-keys/:id` — update name/scopes/expiry

**Permissions:** `api-key:read`, `api-key:write` (admin-level).

**Frontend:** API Keys settings page — create dialog (name + scope picker + optional expiry), list with last-used indicator, revoke confirmation, copy-key-once modal with warning.

**Tests:** ~18 (create, auth, scoped permissions, rate limit, expiry, revocation)

---

### 4A.3 Sprint 32: Multi-Currency + FX Rates

**Goal:** MENA = multi-currency by nature. Deals, quotes, products must handle currency conversion.

**New model:**
```
CurrencyRate
  id            String @id
  workspaceId   String
  fromCurrency  String          // ISO 4217: "USD"
  toCurrency    String          // ISO 4217: "EGP"
  rate          Decimal         // 1 USD = 49.50 EGP
  effectiveDate DateTime
  createdAt     DateTime

  @@unique([workspaceId, fromCurrency, toCurrency, effectiveDate])
```

**Workspace fields (add to existing model):**
- `baseCurrency: String @default("EGP")` — all aggregations convert to this
- `supportedCurrencies: String[]` — available currencies in pickers

**Seed data:** EGP, SAR, AED, KWD, QAR, BHD, OMR, JOD, USD, EUR, GBP with current rates.

**CurrencyService:**
- `convert(amount, fromCurrency, toCurrency, date?)` — lookup rate closest to date
- `convertToBase(amount, currency, workspaceId)` — shortcut for reporting
- `updateRates(rates[])` — admin or scheduled update

**Integration points:**
- Deal amount display: show in deal currency + base currency equivalent
- Quote totals: line items can be different currencies, total converts to quote currency
- Report aggregations: all amounts convert to baseCurrency before SUM/AVG
- Dashboard widgets: amounts in baseCurrency

**Frontend:**
- Currency Settings page: base currency selector, supported currencies checklist, exchange rates table (manual entry)
- Currency picker on Deal/Quote/Product forms
- Formatted display: locale-aware currency formatting (EGP 1,234.56 / 1.234,56 ر.س)

**Tests:** ~15 (conversion, rate lookup by date, aggregation, seed data)

---

### 4A.4 Sprint 33: Custom Report Builder

**Goal:** Users build their own reports — not limited to 5 standard types.

**New model:**
```
SavedReport
  id            String @id
  workspaceId   String
  name          String
  description   String?
  entityType    String          // "Person", "Deal", "Ticket", "custom:project"
  reportType    ReportType      // TABULAR, GROUPED, SUMMARY
  columns       Json            // [{ fieldKey, label, width? }]
  filters       Json            // same format as List.query — reuse query-builder
  groupBy       String[]        // field keys to group by
  aggregations  Json            // [{ fieldKey, function: SUM|AVG|COUNT|MIN|MAX, label }]
  sortBy        Json            // [{ fieldKey, direction: ASC|DESC }]
  chartType     ChartType?      // BAR, LINE, PIE, DOUGHNUT, null (no chart)
  chartConfig   Json?           // { xAxis, yAxis, colorField? }
  isShared      Boolean @default(false)
  createdById   String
  createdAt     DateTime
  updatedAt     DateTime
```

**New enums:**
```
ReportType: TABULAR, GROUPED, SUMMARY
ChartType: BAR, LINE, PIE, DOUGHNUT
```

**ReportQueryEngine:**
- Input: SavedReport config
- Translates to Prisma query: dynamic `select`, `where` (reuse `query-builder.ts`), `groupBy`, `orderBy`
- Aggregations: raw SQL for `SUM/AVG/COUNT/MIN/MAX` via `prisma.$queryRaw`
- Custom fields: JSONB path queries (already implemented in list query-builder)
- Cross-currency: amounts converted to baseCurrency before aggregation
- Pagination: cursor-based for tabular, full result for grouped/summary
- Performance guard: max 10,000 rows per report, timeout 30s

**Export:**
- CSV: streaming via `csv-stringify` (existing dependency)
- Excel: via `exceljs` (existing dependency) with formatting + headers

**Endpoints:**
- `CRUD /reports/saved` — save/list/get/update/delete
- `POST /reports/saved/:id/run` — execute and return data
- `POST /reports/saved/:id/export?format=csv|xlsx` — export

**Permissions:** `report:read`, `report:write`.

**Frontend:** ReportBuilder.vue —
- Step 1: choose entity type
- Step 2: select columns (drag-drop from available fields list)
- Step 3: add filters (same filter UI as Lists)
- Step 4: group-by + aggregations (optional)
- Step 5: chart type (optional)
- Preview panel: live data preview as you build
- Save/Share/Export actions

**Tests:** ~22 (query engine, aggregations, filters, export, custom fields, pagination)

---

### 4A.5 Sprint 34: Per-Org Branding + Theming

**Goal:** Each tenant sees "their" CRM — logo, colors, company name.

**Existing infrastructure:** `Workspace.branding` Json field exists but isn't consumed.

**Branding schema (typed):**
```typescript
interface WorkspaceBranding {
  logo?: string;          // MinIO path — sidebar + email header
  favicon?: string;       // MinIO path — browser tab icon
  primaryColor: string;   // hex — buttons, links, active states
  secondaryColor: string; // hex — sidebar background, accents
  companyName?: string;   // overrides workspace.name in UI
}
```

**Implementation:**
- Upload logo/favicon via existing AttachmentService → store path in branding
- `BrandingService.resolve(workspaceId)` → returns branding with defaults for missing fields
- CSS custom properties injected via `<style>` tag in AppLayout.vue:
  ```css
  :root {
    --brand-primary: {{ branding.primaryColor }};
    --brand-secondary: {{ branding.secondaryColor }};
  }
  ```
- PrimeVue theme tokens mapped to CSS custom properties
- Email templates: inject logo URL into header partial

**Apply to:**
- Dashboard: sidebar logo, theme colors (buttons, links, active nav items)
- Portal: same branding applied to customer-facing portal
- Outbound emails: logo in header, company name in footer
- Login page: workspace-specific logo + colors (resolved by workspace slug in URL)

**Frontend:** Branding Settings page — logo upload with preview, color pickers (primary + secondary), company name input, live preview panel showing dashboard sidebar + button samples.

**Tests:** ~10 (resolve with defaults, upload, CSS injection, email template)

---

### 4A.6 Sprint 35: Email Tracking (Opens + Clicks)

**Goal:** Know when recipients open emails and click links.

**New model:**
```
EmailEvent
  id            String @id
  workspaceId   String
  outboundEmailId String
  type          EmailEventType  // OPEN, CLICK
  url           String?         // clicked URL (for CLICK events)
  ipAddress     String?
  userAgent     String?
  createdAt     DateTime

  @@index([outboundEmailId, type])
```

**New enum:**
```
EmailEventType: OPEN, CLICK
```

**Add to OutboundEmail model:**
- `openedAt: DateTime?`
- `openCount: Int @default(0)`
- `clickCount: Int @default(0)`
- `lastClickedAt: DateTime?`

**Open tracking:**
- On email send: inject transparent 1x1 pixel `<img src="{API_BASE}/track/open/{emailId}" width="1" height="1" />`
- `GET /track/open/:emailId` → create EmailEvent(OPEN), update OutboundEmail.openedAt/openCount → return 1x1 transparent GIF
- Deduplicate: first open sets `openedAt`, subsequent opens increment `openCount`

**Click tracking:**
- On email send: rewrite all `<a href="...">` links to `{API_BASE}/track/click/{emailId}?url={encodedOriginalUrl}`
- `GET /track/click/:emailId` → create EmailEvent(CLICK), update clickCount/lastClickedAt → 302 redirect to original URL
- Skip rewriting unsubscribe links and tracking pixel

**Campaign integration:**
- CampaignRecipient already has `openedAt` and `clickedAt` — populate from EmailEvents
- Campaign stats recalculated: open rate = opened/sent, click rate = clicked/sent

**Activity timeline:** show open/click events on Person's activity feed as system activities.

**Privacy:** respect `doNotContact` and `unsubscribed` flags — no tracking pixel injected for those contacts.

**Frontend:**
- Person detail: email activity tab shows sent emails with open/click indicators (eye icon + click count)
- Campaign detail: recipient table shows per-recipient open/click status
- Campaign analytics: open rate / click rate charts

**Tests:** ~16 (pixel injection, click rewrite, deduplication, campaign stats, privacy flags)

---

## 5. Phase 4B — "MENA Channels + AI" (Sprints 36–41)

### 5B.1 Sprint 36: Channel Adapter Architecture + Twilio SMS

**Goal:** Build the multi-channel messaging foundation, ship SMS as first channel.

**New models:**
```
ChannelConfig
  id            String @id
  workspaceId   String
  provider      ChannelProvider // TWILIO, WHATSAPP_CLOUD, SMS_GENERIC
  name          String          // "Main Support Line"
  credentials   Json            // encrypted: { accountSid, authToken }
  phoneNumber   String          // +201234567890
  webhookSecret String
  isActive      Boolean @default(true)
  createdById   String
  createdAt     DateTime
  updatedAt     DateTime

ChannelMessage
  id              String @id
  workspaceId     String
  channelConfigId String
  direction       MessageDirection  // IN, OUT
  from            String
  to              String
  content         String
  contentType     ContentType       // TEXT, IMAGE, DOCUMENT, TEMPLATE, LOCATION
  status          MessageStatus     // QUEUED, SENT, DELIVERED, READ, FAILED
  externalId      String?           // provider message ID
  errorMessage    String?
  metadata        Json              // provider-specific data
  personId        String?           // auto-linked by phone
  conversationId  String?           // linked after Sprint 38
  createdAt       DateTime
  updatedAt       DateTime

  @@index([workspaceId, personId])
  @@index([workspaceId, channelConfigId, createdAt])
```

**New enums:**
```
ChannelProvider: TWILIO, WHATSAPP_CLOUD, SMS_GENERIC
MessageDirection: IN, OUT
ContentType: TEXT, IMAGE, DOCUMENT, TEMPLATE, LOCATION
MessageStatus: QUEUED, SENT, DELIVERED, READ, FAILED
```

**ChannelAdapter interface:**
```typescript
interface ChannelAdapter {
  send(config: ChannelConfig, to: string, content: string, options?: SendOptions): Promise<{ externalId: string }>;
  parseWebhook(payload: any, headers: any): ParsedMessage;
  validateWebhook(payload: any, headers: any, secret: string): boolean;
  getMessageStatus(config: ChannelConfig, externalId: string): Promise<MessageStatus>;
}
```

**TwilioAdapter** (first implementation):
- Send: Twilio REST API `POST /Messages`
- Receive: webhook `POST /api/v1/channels/twilio/webhook/:configId` → validate signature → parse → create ChannelMessage
- Status callback: Twilio status webhook updates MessageStatus
- Auto-link Person by phone: normalize incoming `from` number → match against Person.phoneNormalized

**ChannelService:**
- `send(workspaceId, channelConfigId, personId, content, contentType)` — resolve adapter → send → save ChannelMessage
- `handleInbound(configId, parsedMessage)` — save → match person → create notification → emit Socket.io event
- `listMessages(workspaceId, personId?, channelConfigId?)` — paginated history

**Frontend:**
- Channel Settings page (settings/channels): add Twilio account (accountSid, authToken, phone number), test send
- Person detail: Messages tab showing SMS conversation thread
- Send SMS button on Person detail

**Tests:** ~20 (adapter, send, webhook, signature validation, person matching, status updates)

---

### 5B.2 Sprint 37: WhatsApp Business via Twilio

**Goal:** WhatsApp messaging using Twilio's WhatsApp API — same adapter pattern.

**New model:**
```
WhatsAppTemplate
  id            String @id
  workspaceId   String
  channelConfigId String
  name          String          // template name as registered with WhatsApp
  language      String          // "ar", "en"
  category      String          // MARKETING, UTILITY, AUTHENTICATION
  components    Json            // header, body (with {{1}} placeholders), footer, buttons
  status        TemplateStatus  // PENDING, APPROVED, REJECTED
  externalId    String?
  createdAt     DateTime
  updatedAt     DateTime
```

**New enum:**
```
TemplateStatus: PENDING, APPROVED, REJECTED
```

**TwilioWhatsAppAdapter** (extends TwilioAdapter):
- `from` format: `whatsapp:+xxx` (Twilio convention)
- Template messages: required for initiating conversation outside 24h window
- Session messages: free-form within 24h of last customer message
- Rich media: `MediaUrl` parameter for images/documents
- Webhook: same endpoint, distinguishes WhatsApp vs SMS by `from` prefix

**WhatsApp-specific logic:**
- 24h session window tracking: `ChannelMessage` metadata stores `sessionExpiresAt`
- Outside window: only template messages allowed → UI shows template picker instead of free-text
- Template sync: `POST /channels/:configId/whatsapp/sync-templates` → fetch from Twilio API → upsert WhatsAppTemplate records
- Template variable substitution: `fillTemplate(template, variables: Record<string, string>)` → replaces `{{1}}`, `{{2}}` etc.

**Frontend:**
- WhatsApp tab in Channel Settings: same as Twilio but with WhatsApp-specific phone number format
- Template Manager: list approved templates, preview with variable slots
- Person detail Messages tab: WhatsApp icon, session indicator (green = active session, gray = template-only)
- Send dialog: if in session → free text; if outside → template picker with variable inputs

**Tests:** ~18 (template sync, session window, media, webhook parsing, template substitution)

---

### 5B.3 Sprint 38: Omni-Channel Inbox

**Goal:** Unified conversation view across email, chat, WhatsApp, SMS, web-form.

**New model:**
```
Conversation
  id            String @id
  workspaceId   String
  personId      String?
  channelType   ConversationChannel // EMAIL, CHAT, WHATSAPP, SMS, WEB_FORM, PHONE
  subject       String?
  status        ConversationStatus  // OPEN, PENDING, SNOOZED, CLOSED
  assigneeId    String?
  queueId       String?
  priority      TicketPriority?     // reuse existing enum
  snoozedUntil  DateTime?
  lastMessageAt DateTime
  unreadCount   Int @default(0)
  metadata      Json
  ticketId      String?             // optional link to Ticket
  chatSessionId String?             // optional link to ChatSession
  createdAt     DateTime
  updatedAt     DateTime

  @@index([workspaceId, assigneeId, status])
  @@index([workspaceId, status, lastMessageAt])
```

**New enums:**
```
ConversationChannel: EMAIL, CHAT, WHATSAPP, SMS, WEB_FORM, PHONE
ConversationStatus: OPEN, PENDING, SNOOZED, CLOSED
```

**Conversation aggregation — how existing data feeds in:**
- ChatSession: on chat start → create Conversation (channelType=CHAT, chatSessionId=id)
- ChannelMessage (SMS/WhatsApp): on inbound → find or create Conversation for person+channel
- EmailThread: on inbound email-to-case → create Conversation (channelType=EMAIL)
- FormSubmission with createTicket: → create Conversation (channelType=WEB_FORM)
- Existing data: migration creates Conversations for existing ChatSessions and email-to-case tickets

**ConversationService:**
- `list(workspaceId, filters: { assigneeId?, status?, channelType?, queueId? }, pagination)` — unified listing
- `assign(conversationId, userId)` — assign to agent
- `snooze(conversationId, until: DateTime)` — hide until date, auto-reopen
- `close(conversationId)` — mark closed
- `merge(targetId, sourceIds[])` — merge duplicate conversations for same person
- `getMessages(conversationId)` — returns unified message list from the underlying source (ChatMessage, ChannelMessage, EmailMessage)

**Reply routing:** when agent replies from inbox, the reply routes to the correct channel:
- WhatsApp conversation → send via TwilioWhatsAppAdapter
- SMS conversation → send via TwilioAdapter
- Email conversation → send via OutboundEmailService
- Chat conversation → send via ChatGateway (Socket.io)

**Real-time:** Socket.io `/conversations` namespace:
- `conversation:new` — new inbound conversation
- `conversation:message` — new message in existing conversation
- `conversation:assigned` — conversation assigned to agent

**Frontend:** ConversationsInbox.vue —
- Left panel: conversation list (avatar, channel icon badge, person name, snippet, timestamp, unread dot)
- Filters: tabs (Mine / Unassigned / All), channel filter dropdown, status filter
- Right panel: message thread (messages with sender info, timestamps, channel indicator)
- Reply composer: text input + attach file + channel indicator showing where reply goes
- Actions bar: assign, snooze (date picker), close, convert to ticket, merge

**Tests:** ~25 (aggregation, routing, snooze, merge, real-time events, message fetching)

---

### 5B.4 Sprint 39: AI Service Agent

**Goal:** AI agent that auto-responds to inbound service requests using KB, with human escalation.

**New models:**
```
AgentConfig
  id                        String @id
  workspaceId               String
  name                      String          // "Support Bot"
  type                      AgentType       // SERVICE, SALES
  provider                  String          // "ollama", "openai", "anthropic"
  model                     String          // "llama3.1:8b", "gpt-4o", "claude-sonnet-4-6"
  systemPrompt              String          // custom instructions
  tools                     Json            // enabled tool names
  enabled                   Boolean @default(false)
  queueIds                  String[]        // which queues this agent handles
  maxTurnsBeforeEscalation  Int @default(5)
  confidenceThreshold       Float @default(0.7) // 0-1, below this → escalate
  responseLanguage          String @default("auto") // "ar", "en", "auto"
  createdById               String
  createdAt                 DateTime
  updatedAt                 DateTime

AgentSession
  id              String @id
  workspaceId     String
  agentConfigId   String
  conversationId  String?
  ticketId        String?
  status          AgentSessionStatus // ACTIVE, ESCALATED, RESOLVED, FAILED
  turns           Json               // [{ role: "user"|"assistant"|"tool", content, toolCalls?, timestamp }]
  resolution      String?            // summary when resolved
  escalationReason String?
  tokensUsed      Int @default(0)
  resolvedAt      DateTime?
  escalatedAt     DateTime?
  createdAt       DateTime
```

**New enums:**
```
AgentType: SERVICE, SALES
AgentSessionStatus: ACTIVE, ESCALATED, RESOLVED, FAILED
```

**Agent tools (function-calling):**
```typescript
const SERVICE_AGENT_TOOLS = [
  { name: "searchKB", description: "Search knowledge base articles", params: { query: string } },
  { name: "getTicketDetails", description: "Get ticket information", params: { ticketId: string } },
  { name: "getPersonProfile", description: "Get customer profile", params: { personId: string } },
  { name: "escalateToHuman", description: "Transfer to human agent", params: { reason: string } },
  { name: "resolveTicket", description: "Mark ticket as resolved", params: { summary: string } },
  { name: "suggestArticle", description: "Send KB article link to customer", params: { articleId: string } },
];
```

**Agent runtime loop (AgentExecutor service):**
1. Trigger: inbound message on conversation linked to a queue with active AgentConfig
2. Check: is there an active AgentSession? If not, create one
3. Build context: person profile + conversation history (last 20 messages) + system prompt
4. Call LLM via existing AIProvider adapter with tools
5. Process tool calls: execute each tool → append results to turns
6. If LLM responds with text → send to customer via conversation's channel
7. If `escalateToHuman` called → set session status=ESCALATED, assign conversation to next available human agent, notify
8. If `resolveTicket` called → set session status=RESOLVED, update ticket status
9. If turns > maxTurnsBeforeEscalation → auto-escalate
10. Track token usage in AgentSession.tokensUsed + AIUsage record

**KB grounding:**
- `searchKB` tool uses existing pgvector embeddings for semantic search
- Agent response includes `[source: article-slug]` references
- Frontend renders source links as clickable KB article references

**Safety guardrails:**
- Max response length: 500 tokens
- No PII in system prompt
- Agent cannot modify person/deal data (read-only tools only, except ticket status)
- Rate limit: max 100 agent sessions per workspace per hour

**Frontend:**
- Agent Config page in settings: create/edit agent (name, model, system prompt editor, queue assignment, thresholds)
- Agent Dashboard: active sessions, resolution rate, avg turns to resolve, escalation rate, tokens used
- Conversation inbox: agent messages show bot icon badge, "Handled by AI" indicator
- Escalation: human agent sees full AI conversation history when taking over

**Tests:** ~30 (runtime loop, tool execution, escalation, confidence threshold, rate limiting, KB search)

---

### 5B.5 Sprint 40: Calendar Sync (Google + Microsoft)

**Goal:** Bidirectional sync between CRM activities and external calendars.

**New models:**
```
CalendarAccount
  id            String @id
  workspaceId   String
  userId        String
  provider      CalendarProvider  // GOOGLE, MICROSOFT
  emailAddress  String
  credentials   Json              // encrypted OAuth tokens
  calendarId    String            // selected calendar
  syncEnabled   Boolean @default(true)
  syncDirection SyncDirection     // IN, OUT, BOTH
  lastSyncAt    DateTime?
  syncState     CalendarSyncState // IDLE, SYNCING, ERROR
  errorMessage  String?
  createdAt     DateTime
  updatedAt     DateTime

CalendarEvent
  id                String @id
  workspaceId       String
  calendarAccountId String
  externalId        String           // provider event ID
  title             String
  description       String?
  startAt           DateTime
  endAt             DateTime
  location          String?
  attendees         Json             // [{ email, name?, status? }]
  activityId        String? @unique  // linked CRM Activity
  personId          String?          // linked Person (from attendee email match)
  dealId            String?          // linked Deal (manual)
  syncDirection     SyncDirection
  lastSyncedAt      DateTime
  createdAt         DateTime
  updatedAt         DateTime

  @@unique([calendarAccountId, externalId])
```

**New enums:**
```
CalendarProvider: GOOGLE, MICROSOFT
CalendarSyncState: IDLE, SYNCING, ERROR
SyncDirection: IN, OUT, BOTH
```

**Google Calendar integration:**
- OAuth2: reuse OAuth pattern from EmailAccount (authorization_code flow)
- Scopes: `calendar.readonly` (IN), `calendar.events` (BOTH)
- API: Google Calendar API v3 — list events, create, update, delete
- Webhook: Google push notifications for real-time sync (or polling fallback)

**Microsoft Graph integration:**
- OAuth2: Azure AD app registration, authorization_code flow
- Scopes: `Calendars.ReadWrite`
- API: Microsoft Graph `/me/calendar/events`
- Webhook: Microsoft Graph subscriptions (or polling fallback)

**Sync logic (CalendarSyncWorker — BullMQ):**
- Runs every 5 minutes per account
- **Outbound (CRM→Calendar):** Activity (type=MEETING, status=OPEN) with no linked CalendarEvent → create external event, save CalendarEvent
- **Inbound (Calendar→CRM):** new/changed external event → create/update Activity (type=MEETING) + CalendarEvent
- **Conflict resolution:** compare `updatedAt` — latest write wins
- **Attendee matching:** attendee emails matched against Person.email → auto-link personId
- **Deletion:** soft-delete in CRM → cancel in calendar; deleted in calendar → archive Activity

**Frontend:**
- Calendar Accounts in settings: connect Google/Microsoft (OAuth flow), select calendar, choose sync direction
- ActivityCalendar view: sync status indicator, external events shown with provider icon
- Activity detail: "Synced with Google Calendar" badge with link

**Tests:** ~22 (OAuth flow mock, sync outbound, sync inbound, conflict resolution, attendee matching)

---

### 5B.6 Sprint 41: Meeting Scheduler

**Goal:** Calendly-equivalent booking widget — embeddable, public-facing.

**New models:**
```
BookingPage
  id              String @id
  workspaceId     String
  userId          String            // owner whose calendar is checked
  slug            String @unique    // public URL: /book/:slug
  title           String            // "30-min Discovery Call"
  description     String?
  duration        Int               // minutes: 15, 30, 60
  availability    Json              // { mon: [{start:"09:00",end:"17:00"}], tue: [...], ... }
  timezone        String            // "Africa/Cairo"
  bufferBefore    Int @default(0)   // minutes gap before meeting
  bufferAfter     Int @default(0)   // minutes gap after meeting
  maxPerDay       Int?              // max bookings per day
  queueId         String?           // round-robin across queue members
  brandingOverride Json?            // override workspace branding for this page
  confirmationEmail Boolean @default(true)
  reminderMinutes Int[] @default([60, 1440]) // reminder 1h + 24h before
  isActive        Boolean @default(true)
  createdById     String
  createdAt       DateTime
  updatedAt       DateTime

Booking
  id              String @id
  workspaceId     String
  bookingPageId   String
  hostUserId      String            // who the meeting is with
  guestName       String
  guestEmail      String
  guestPhone      String?
  startAt         DateTime
  endAt           DateTime
  status          BookingStatus     // CONFIRMED, CANCELED, RESCHEDULED, COMPLETED, NO_SHOW
  calendarEventId String?           // linked CalendarEvent from Sprint 40
  activityId      String?           // linked Activity
  personId        String?           // linked/created Person
  notes           String?
  cancelToken     String @unique    // for cancel/reschedule links
  canceledAt      DateTime?
  rescheduledTo   String?           // new booking ID
  createdAt       DateTime
  updatedAt       DateTime
```

**New enum:**
```
BookingStatus: CONFIRMED, CANCELED, RESCHEDULED, COMPLETED, NO_SHOW
```

**Availability engine (BookingService):**
1. Get BookingPage.availability → base schedule (e.g., Mon–Fri 9am–5pm Cairo time)
2. Get CalendarAccount busy times for the host (via CalendarEvent or Google/MS API freebusy query)
3. Get existing Bookings for the date
4. Apply bufferBefore + bufferAfter
5. Apply maxPerDay limit
6. Return available time slots: `[{ start: DateTime, end: DateTime }]`

**Round-robin (if queueId set):**
- For each slot, check availability of all queue members
- Assign to least-booked member for the day
- Rotate fairly across members

**Public endpoints (no auth):**
- `GET /book/:slug` → booking page config (title, description, duration, branding)
- `GET /book/:slug/slots?date=YYYY-MM-DD` → available time slots
- `POST /book/:slug` → create booking (guestName, guestEmail, guestPhone?, startAt, notes?)
- `POST /book/:slug/cancel/:cancelToken` → cancel booking
- `POST /book/:slug/reschedule/:cancelToken` → reschedule (pick new slot)

**On booking creation:**
1. Create Booking record
2. Create/find Person by guestEmail → link personId
3. Create Activity (type=MEETING) → link activityId
4. Create CalendarEvent (if host has CalendarAccount) → link calendarEventId
5. Send confirmation email to guest (with cancel/reschedule links)
6. Send notification to host
7. Schedule reminders via BullMQ delayed jobs

**Frontend:**
- BookingPage admin: create/edit (title, duration, availability grid, buffer settings), copy public link, generate embed snippet
- Public booking page: clean standalone UI — date picker → time slot grid → guest info form → confirmation
- Embeddable: `<iframe src="/book/:slug" />` snippet with responsive sizing

**Tests:** ~24 (availability engine, round-robin, booking flow, cancel, reschedule, reminders, person creation)

---

## 6. Phase 4C — "No-Code Platform" (Sprints 42–47)

### 6C.1 Sprint 42: Custom Modules

**Goal:** Admins create new entities from the UI — no code, no migrations.

**New models:**
```
CustomModule
  id            String @id
  workspaceId   String
  name          String            // internal name: "project"
  singularLabel Json              // { en: "Project", ar: "مشروع" }
  pluralLabel   Json              // { en: "Projects", ar: "مشاريع" }
  slug          String            // URL-safe: "project"
  icon          String            // Lucide icon name: "folder"
  color         String            // hex: "#3B82F6"
  description   String?
  isActive      Boolean @default(true)
  navGroup      String?           // which sidebar group: "CRM", "Service", null (top-level)
  createdById   String
  createdAt     DateTime
  updatedAt     DateTime

  @@unique([workspaceId, slug])

CustomModuleRecord
  id            String @id
  workspaceId   String
  moduleId      String
  data          Json              // all field values as JSONB
  ownerId       String?
  tags          Json @default("[]")
  archivedAt    DateTime?
  createdById   String
  updatedById   String?
  createdAt     DateTime
  updatedAt     DateTime

  @@index([workspaceId, moduleId, createdAt])

CustomModuleRelation
  id              String @id
  workspaceId     String
  fromModuleSlug  String          // "project" or "Person" (built-in)
  toModuleSlug    String          // "task" or "Deal" (built-in)
  relationType    RelationType    // ONE_TO_MANY, MANY_TO_MANY
  fieldKey        String          // lookup field key on the "from" side
  reverseFieldKey String?         // reverse lookup key on the "to" side
  label           Json            // { en: "Tasks", ar: "المهام" }
  reverseLabel    Json?           // { en: "Project", ar: "المشروع" }
  createdAt       DateTime

  @@unique([workspaceId, fromModuleSlug, fieldKey])
```

**New enum:**
```
RelationType: ONE_TO_MANY, MANY_TO_MANY
```

**How it works:**

1. **Admin creates module:** POST /custom-modules → creates CustomModule + auto-generates 4 permission keys (`custom:project:read/write/delete/assign`)
2. **Admin adds fields:** existing CustomFieldDef with `entityType = "custom:project"` — all 16 field types available
3. **Records stored in CustomModuleRecord:** `data` JSONB holds all values, validated against CustomFieldDefs via existing MetadataService
4. **Relations:** CustomModuleRelation defines how modules connect — supports custom↔custom, custom↔Person, custom↔Deal, custom↔Ticket

**Generic CRUD controller (CustomModuleController):**
- `POST /api/v1/custom/:moduleSlug` — create record
- `GET /api/v1/custom/:moduleSlug` — list with pagination, filters, sorting
- `GET /api/v1/custom/:moduleSlug/:id` — get record
- `PUT /api/v1/custom/:moduleSlug/:id` — update
- `DELETE /api/v1/custom/:moduleSlug/:id` — archive
- All endpoints validate fields against metadata, check permissions, write audit log

**Automatic capabilities (zero code per module):**
- Activity timeline: `parentEntity = "custom:project"` — polymorphic Activity works as-is
- Comments + Followers: extend CommentEntityType dynamically (store as string, not enum)
- Tags: EntityTag is already polymorphic
- Audit log: existing middleware captures changes
- Search: generate `search_tsv` from text fields in `data` JSONB
- GraphQL: auto-register custom module type + resolvers
- MCP: auto-register custom module tools

**Frontend:**
- Settings → Custom Modules: create wizard (name ar/en, icon picker, color, nav group), list existing
- Per-module field editor: reuses existing Custom Fields admin UI
- Per-module relation editor: define relations to other modules
- Dynamic views: generic `CustomModuleList.vue` and `CustomModuleDetail.vue` that render from metadata
- Sidebar nav: custom modules appear in configured nav group with icon + color

**Tests:** ~28 (CRUD, validation, relations, permissions, search, audit)

---

### 6C.2 Sprint 43: Formula Fields + Rollup Summary Fields

**Goal:** Computed fields that evaluate automatically — completing the customization engine.

**Schema:** existing `CustomFieldDef.formulaExpr` and `CustomFieldDef.rollupConfig` columns — build the evaluators.

**Formula Fields:**

Expression language using `jsonata` library (MIT, well-tested, supports nested paths):

Built-in functions:
```
String:    CONCAT(), UPPER(), LOWER(), LEFT(), RIGHT(), LEN(), CONTAINS(), TRIM(), REPLACE()
Math:      ROUND(), ABS(), CEIL(), FLOOR(), MOD(), POWER()
Date:      NOW(), TODAY(), DATEDIFF(date1, date2, "days"|"hours"), DATEADD(date, n, "days"), YEAR(), MONTH(), DAY()
Logic:     IF(condition, then, else), AND(), OR(), NOT()
Aggregate: (reserved for rollup — not available in formula)
```

**FormulaEvaluator service:**
```typescript
class FormulaEvaluator {
  validate(expr: string, entityDefs: FieldDef[]): ValidationResult;  // check field references exist
  evaluate(expr: string, record: Record<string, any>): any;          // compute value
}
```

- Evaluation: **on-read** — computed at query time, not stored
- MetadataService: formula fields appear in entity defs as `{ type: "FORMULA", readOnly: true, formulaExpr: "..." }`
- API: when returning records, formula fields are computed and included in response
- Security: `jsonata` runs in restricted mode (no external calls, no require, timeout 100ms)

**Rollup Summary Fields:**

Rollup config schema:
```typescript
interface RollupConfig {
  childEntity: string;      // "Deal", "Activity", "custom:task"
  childField: string;       // "amount", "score"
  aggregation: "SUM" | "AVG" | "COUNT" | "MIN" | "MAX";
  filter?: FilterQuery;     // optional filter on child records (reuse query-builder format)
}
```

- Evaluation: **materialized** — computed on child record change, stored in parent
- `RollupWorker` (BullMQ): triggered by domain events (Deal created/updated/deleted, etc.)
  1. Find all rollup fields that reference the changed entity
  2. Find the parent record(s) via relation
  3. Run aggregation query
  4. Update parent record's rollup field value
- Circular dependency guard: max 3 levels of rollup chain, detect cycles at definition time

**Frontend:**
- Formula editor: text input with syntax highlighting, field picker dropdown (click field name → insert reference), validation button, preview with sample data
- Rollup config wizard: step 1 (child entity) → step 2 (child field) → step 3 (aggregation) → step 4 (optional filter)
- Both appear as read-only computed values in detail views

**Tests:** ~25 (formula parsing, evaluation, all functions, rollup computation, circular detection, error handling)

---

### 6C.3 Sprint 44: Visual Workflow Builder

**Goal:** Drag-drop flow editor for workflows — replaces JSON editing.

**New model:**
```
WorkflowDraft
  id            String @id
  workflowId    String @unique
  canvas        Json              // { nodes: Node[], edges: Edge[], viewport: {x,y,zoom} }
  isDirty       Boolean @default(false)
  updatedAt     DateTime
```

**Canvas schema:**
```typescript
interface CanvasNode {
  id: string;
  type: "TRIGGER" | "CONDITION" | "ACTION" | "DELAY" | "END";
  position: { x: number; y: number };
  config: TriggerConfig | ConditionConfig | ActionConfig | DelayConfig;
  label?: string;
}

interface CanvasEdge {
  id: string;
  from: string;        // node ID
  to: string;          // node ID
  label?: string;      // "yes" / "no" for condition branches
}
```

**Node types and configs:**
- **TRIGGER:** entity + event (CREATED/UPDATED/DELETED/TIME) + field filter — same as existing workflow trigger
- **CONDITION:** if/else branch — field + operator + value — same as existing conditions
- **ACTION:** 6 types — UPDATE_FIELD, SEND_EMAIL, CREATE_TASK, CALL_WEBHOOK, NOTIFY_USER, ASSIGN — same as existing actions
- **DELAY:** `{ duration: number, unit: "minutes"|"hours"|"days" }` or `{ untilField: string }` — wait before next step
- **END:** terminal node

**Converters:**
- `canvasToWorkflow(canvas)` → serializes to existing `{ trigger, conditions, actions }` JSON format — the backend engine is untouched
- `workflowToCanvas(workflow)` → reverse conversion for existing workflows — renders legacy workflows in the visual editor

**Backend: zero changes to workflow engine.** The visual builder is purely a frontend feature that generates the same JSON the engine already processes. The only backend addition is the WorkflowDraft model for saving canvas state.

**Frontend:** WorkflowCanvas.vue (using `@vue-flow/core` library — MIT, Vue 3 native, well-maintained):
- Left sidebar: node palette — drag TRIGGER/CONDITION/ACTION/DELAY/END onto canvas
- Canvas: nodes as cards connected by edges, drag to reposition, edge handles for connecting
- Right sidebar: node config panel — appears on node click, shows config form for that node type
- Top bar: workflow name, Save Draft, Test Run (dry-run with sample data), Activate/Deactivate toggle
- Validation: on save, validate graph (exactly one TRIGGER, all paths reach END, no orphan nodes)
- Backwards compatible: `workflowToCanvas()` on first load converts existing workflows

**Tests:** ~18 (canvas↔workflow conversion, graph validation, drag-drop state, legacy conversion)

---

### 6C.4 Sprint 45: SSO (SAML 2.0 + OIDC)

**Goal:** Enterprise single sign-on — mid-market and up requirement.

**New model:**
```
SSOConfig
  id              String @id
  workspaceId     String @unique  // one SSO config per workspace
  protocol        SSOProtocol     // SAML, OIDC
  providerName    String          // "Google Workspace", "Azure AD", "Okta"
  enabled         Boolean @default(false)

  // SAML fields
  entityId        String?         // IdP entity ID
  ssoUrl          String?         // IdP SSO URL
  certificate     String?         // IdP x509 certificate (PEM)
  
  // OIDC fields
  clientId        String?
  clientSecret    String?         // encrypted
  discoveryUrl    String?         // .well-known/openid-configuration
  
  // Common
  attributeMapping Json           // { email: "mail", name: "displayName", ... }
  autoProvision    Boolean @default(true)   // create user on first SSO login
  defaultProfileId String?        // profile assigned to auto-provisioned users
  enforceSSO       Boolean @default(false)  // disable password login
  createdAt        DateTime
  updatedAt        DateTime
```

**New enum:**
```
SSOProtocol: SAML, OIDC
```

**SAML 2.0 implementation:**
- Library: `@node-saml/node-saml` (maintained, good TypeScript support)
- SP-initiated flow: user clicks "Sign in with SSO" → redirect to IdP → SAML assertion → validate signature against certificate → extract attributes → map to User fields → create/find User → issue JWT
- Endpoints:
  - `GET /auth/saml/metadata` → SP metadata XML (for IdP configuration)
  - `POST /auth/saml/callback` → ACS endpoint (receives SAML assertion)
  - `GET /auth/saml/login` → initiates SSO (redirects to IdP)

**OIDC implementation:**
- Library: `openid-client` (certified OIDC RP library)
- Authorization code flow: redirect to IdP → code → exchange for tokens → userinfo → map to User → issue JWT
- Auto-discovery from `.well-known/openid-configuration`
- Endpoints:
  - `GET /auth/oidc/login` → redirect to IdP authorization endpoint
  - `GET /auth/oidc/callback` → handle authorization code

**Common logic (SSOService):**
- Attribute mapping: configurable map from IdP attributes to User fields
- JIT provisioning: if `autoProvision=true` and user doesn't exist → create User + assign defaultProfileId
- Existing user matching: by email (normalized)
- `enforceSSO`: when enabled, password login disabled for workspace — only SSO allowed
- Compatible with 2FA: if user has 2FA enabled, still required after SSO (additional security layer)

**Login flow change:**
- Workspace login page checks for SSOConfig
- If exists and enabled → show "Sign in with {providerName}" button
- If enforceSSO → hide password form entirely

**Frontend:**
- SSO Settings page: protocol selector (SAML/OIDC), provider name, config fields per protocol
- SAML: entity ID, SSO URL, certificate upload, SP metadata download button
- OIDC: client ID, client secret, discovery URL
- Attribute mapping editor: table of IdP attribute → CRM field
- Test connection button: validates configuration without committing
- Enforce SSO toggle with warning dialog

**Tests:** ~20 (SAML assertion validation, OIDC flow, JIT provisioning, attribute mapping, enforce SSO)

---

### 6C.5 Sprint 46: Page Layouts per Profile

**Goal:** Control field arrangement and visibility per entity, per user profile.

**New model:**
```
PageLayout
  id            String @id
  workspaceId   String
  entityType    String            // "Person", "Deal", "Ticket", "custom:project"
  profileId     String?           // null = default layout for entity
  layoutType    LayoutType        // DETAIL, EDIT, LIST
  sections      Json              // section definitions (see below)
  isDefault     Boolean @default(false)
  createdById   String
  createdAt     DateTime
  updatedAt     DateTime

  @@unique([workspaceId, entityType, profileId, layoutType])
```

**New enum:**
```
LayoutType: DETAIL, EDIT, LIST
```

**Section schema:**
```typescript
interface LayoutSection {
  id: string;
  title: { en: string; ar: string };
  columns: 1 | 2 | 3;
  collapsed: boolean;            // start collapsed
  fields: LayoutField[];
}

interface LayoutField {
  key: string;                   // field key (built-in or custom)
  span: 1 | 2 | 3;             // column span
  readOnly?: boolean;            // override field to read-only in this layout
  required?: boolean;            // override field to required in this layout
}

// LIST layout uses a simpler structure:
interface ListColumn {
  key: string;
  width?: number;                // pixel width
  sortable: boolean;
  visible: boolean;
}
```

**Resolution order (LayoutService.resolve):**
1. Profile-specific layout for entity+layoutType → if found, use it
2. Default layout for entity+layoutType (profileId=null) → if found, use it
3. System fallback → hardcoded layout from current Vue templates (backwards compatible)

**MetadataController extension:**
- `GET /metadata/:entity/layout?type=detail&profileId=...` → resolved layout
- `PUT /metadata/:entity/layout` → save layout (admin only)
- `POST /metadata/:entity/layout/clone` → clone from another profile

**DynamicForm upgrade:**
- Instead of rendering all fields from metadata, read resolved layout
- Render only fields in layout, in specified order, in specified section/column arrangement
- Respect per-field `readOnly` and `required` overrides
- Unknown fields (added after layout was saved) appear in an "Other Fields" section

**List view upgrade:**
- ListView.vue reads LIST layout → renders only listed columns in specified order
- Admin can customize which columns appear per entity

**Frontend:** Layout Manager (settings/layouts) —
- Entity selector → profile selector → layout type tabs (Detail / Edit / List)
- Drag-drop sections: add/remove/reorder sections, set column count
- Drag-drop fields within sections: add from available fields palette, reorder, set span
- Preview panel: live preview of how the layout looks with sample data
- Clone button: copy layout from one profile to another

**Tests:** ~18 (resolution order, section rendering, field overrides, list columns, fallback, clone)

---

### 6C.6 Sprint 47: Predictive Scoring + Phase 4 Closeout

**Goal:** LLM-based predictive scoring + close out Phase 4 with v3.0.0 tag.

**New model:**
```
ScoringModel
  id            String @id
  workspaceId   String
  entityType    String            // "Person" or "Deal"
  name          String
  status        ScoringModelStatus // DRAFT, ACTIVE, ARCHIVED
  provider      String            // "ollama", "openai", "anthropic"
  model         String            // LLM model name
  prompt        String            // scoring prompt template
  features      Json              // which fields to include in scoring context
  metrics       Json?             // { accuracy, sampleSize, lastEvaluated }
  trainedAt     DateTime?
  createdById   String
  createdAt     DateTime
  updatedAt     DateTime
```

**New enum:**
```
ScoringModelStatus: DRAFT, ACTIVE, ARCHIVED
```

**LLM-as-Scorer approach (not traditional ML):**

Instead of training a traditional ML model (which requires significant historical data that new tenants don't have), use LLM as the scoring engine:

1. Build context for each person/deal: profile fields, activity count, email engagement, deal stage, days since last activity
2. Send to LLM with scoring prompt:
   ```
   Given this lead profile, score from 0-100 how likely they are to convert.
   Consider: engagement level, company size, activity recency, deal stage.
   Return JSON: { score: number, reasoning: string, signals: string[] }
   ```
3. Parse response → update Person.score / Deal.score + store reasoning
4. Default prompt provided, admin can customize per workspace

**Why LLM over traditional ML:**
- Works from day 1 (no training data needed)
- Explains its reasoning (transparency)
- Admins can tune the prompt
- Still uses Ollama (free) by default
- Fallback: existing rule-based scoring remains, predictive is additive

**Batch scoring:** BullMQ scheduled job — nightly scores all persons/deals without recent score. Configurable: score all, or only records changed since last score.

**Frontend:**
- Scoring Model config in settings: create model, choose entity type, edit prompt, select fields to include
- "AI Score" badge on Person/Deal detail: shows score + reasoning tooltip + top signals
- Scoring analytics: distribution chart, score vs. conversion correlation

**Phase 4 Closeout:**
- Run full test suite across all Phase 4 features
- Tag `v3.0.0`
- Update `docs/PROGRESS.md` with Phase 4 summary
- Create `docs/PHASE4-PROGRESS.md` with sprint-by-sprint detail
- Update `docs/STATUS-REPORT.md` with new model count + feature inventory
- Verify all new features have i18n (ar + en)
- Update permissions.constants.ts with all new permission keys
- Verify CI passes

**Tests:** ~15 (LLM scoring, batch job, prompt customization, fallback to rule-based)

---

## 7. Phase 4 Summary

### New Models (22)
| Sprint | Models | Enums |
|--------|--------|-------|
| 30 | TwoFactorSecret | — |
| 31 | ApiKey | — |
| 32 | CurrencyRate | — |
| 33 | SavedReport | ReportType, ChartType |
| 34 | — (uses existing) | — |
| 35 | EmailEvent | EmailEventType |
| 36 | ChannelConfig, ChannelMessage | ChannelProvider, MessageDirection, ContentType, MessageStatus |
| 37 | WhatsAppTemplate | TemplateStatus |
| 38 | Conversation | ConversationChannel, ConversationStatus |
| 39 | AgentConfig, AgentSession | AgentType, AgentSessionStatus |
| 40 | CalendarAccount, CalendarEvent | CalendarProvider, CalendarSyncState, SyncDirection |
| 41 | BookingPage, Booking | BookingStatus |
| 42 | CustomModule, CustomModuleRecord, CustomModuleRelation | RelationType |
| 43 | — (uses existing columns) | — |
| 44 | WorkflowDraft | — |
| 45 | SSOConfig | SSOProtocol |
| 46 | PageLayout | LayoutType |
| 47 | ScoringModel | ScoringModelStatus |

**Total new models:** 22
**Total new enums:** 18
**Total after Phase 4:** ~95 models, ~55 enums

### Estimated Tests per Sprint
| Sprint | Feature | Est. Tests |
|--------|---------|-----------|
| 30 | 2FA | ~20 |
| 31 | API Keys | ~18 |
| 32 | Multi-Currency | ~15 |
| 33 | Report Builder | ~22 |
| 34 | Branding | ~10 |
| 35 | Email Tracking | ~16 |
| 36 | Channel Adapter + SMS | ~20 |
| 37 | WhatsApp | ~18 |
| 38 | Omni-Channel Inbox | ~25 |
| 39 | AI Service Agent | ~30 |
| 40 | Calendar Sync | ~22 |
| 41 | Meeting Scheduler | ~24 |
| 42 | Custom Modules | ~28 |
| 43 | Formula + Rollup | ~25 |
| 44 | Visual Workflow Builder | ~18 |
| 45 | SSO | ~20 |
| 46 | Page Layouts | ~18 |
| 47 | Predictive Scoring + Closeout | ~15 |
| **Total** | | **~384** |

**Projected totals after Phase 4:**
- Tests: ~1,797 (1,413 + 384)
- Models: ~95
- Enums: ~55
- Permission keys: ~130
- Code: ~80,000 lines

---

## 8. Future Roadmap — Phases 5–8

### Phase 5 — "Advanced Marketing + Commerce" (~12 sprints)

**Goal:** complete the marketing automation suite and add commerce capabilities (Orders → Invoices → Payments).

| Sprint | Feature | New Models | Category |
|--------|---------|------------|----------|
| 48 | Customer Journey Builder | Journey, JourneyNode, JourneyEnrollment | Marketing |
| 49 | A/B Testing (Campaigns + Forms) | ABTest, ABTestVariant | Marketing |
| 50 | Landing Page Builder | LandingPage, LandingPageVersion | Marketing |
| 51 | WhatsApp Cloud API (direct) | WhatsAppCloudConfig | Channels |
| 52 | Orders | Order, OrderLineItem | Commerce |
| 53 | Invoices | Invoice, InvoiceLineItem, Payment | Commerce |
| 54 | Subscriptions + Recurring Billing | Subscription, SubscriptionPlan | Commerce |
| 55 | Stripe Payment Integration | PaymentGateway, PaymentTransaction | Commerce |
| 56 | Discounts + Coupons | Discount, Coupon, CouponRedemption | Commerce |
| 57 | eSign Integration (DocuSign) | SignatureRequest, SignatureEvent | Integration |
| 58 | SMS Marketing (mass sends) | — (reuses ChannelMessage + Campaign) | Marketing |
| 59 | Marketing Calendar + Phase 5 Closeout | — (UI-only) | Marketing |

**Key architectural decisions:**
- **Journey Builder:** visual DAG (like workflow builder from Sprint 44) but marketing-specific — nodes are: TRIGGER, WAIT, SEND_EMAIL, SEND_SMS, SEND_WHATSAPP, ADD_TAG, UPDATE_FIELD, IF_CONDITION, SPLIT, EXIT
- **Orders → Invoices flow:** Quote (accepted) → Order (confirmed) → Invoice (billed) → Payment (received). Each has its own lifecycle and model.
- **Stripe integration:** thin adapter for payment processing. Stripe Checkout for self-serve SaaS billing + Stripe API for customer-facing payments. Webhook receiver for payment status updates.
- **WhatsApp Cloud API:** replace Twilio dependency for WhatsApp with direct Meta API (cheaper at scale). TwilioAdapter remains for SMS. Both implement ChannelAdapter interface.

**Projected additions:** ~18 new models, ~300 tests

---

### Phase 6 — "Advanced AI + Analytics" (~10 sprints)

**Goal:** AI becomes the platform's primary differentiator. Advanced analytics compete with BI tools.

| Sprint | Feature | New Models | Category |
|--------|---------|------------|----------|
| 60 | AI Sales Agent | — (reuses AgentConfig/Session) | AI |
| 61 | AI Content Agent (email/KB drafts) | ContentDraft | AI |
| 62 | Conversation Intelligence (recording) | CallRecording, CallTranscript | AI |
| 63 | Conversation Intelligence (analysis) | ConversationInsight | AI |
| 64 | AI Forecasting (ML-based) | ForecastModel | AI |
| 65 | Sentiment Analysis | SentimentScore | AI |
| 66 | Marketing Attribution (multi-touch) | TouchPoint, AttributionModel | Analytics |
| 67 | Cohort Analysis + Behavioral Events | BehavioralEvent | Analytics |
| 68 | Advanced Dashboards (drill-through, scheduled digests) | DashboardSchedule | Analytics |
| 69 | Anomaly Detection + Phase 6 Closeout | AnomalyAlert | AI |

**Key architectural decisions:**
- **Sales Agent:** reuses Sprint 39's AgentConfig with `type=SALES`. Tools: `getLeadProfile`, `getRecentActivities`, `suggestNextAction`, `qualifyLead`, `scheduleFollowUp`. Triggers on new lead assignment.
- **Content Agent:** generates draft emails, KB articles, blog posts. Uses RAG over existing content + brand voice guidelines. Human review before publish.
- **Conversation Intelligence:** integrates with Twilio/telephony recording. Transcription via Whisper (local) or cloud API. AI analysis: topics mentioned, objections, competitors, sentiment, action items.
- **Attribution:** track every touchpoint (form submission, email open, ad click, page visit) → attribute revenue to touchpoints using configurable model (first-touch, last-touch, linear, U-shaped, W-shaped).

**Projected additions:** ~12 new models, ~250 tests

---

### Phase 7 — "Enterprise Scale" (~12 sprints)

**Goal:** features required for mid-market/enterprise customers — organizational hierarchy, approvals, mobile, and developer platform.

| Sprint | Feature | New Models | Category |
|--------|---------|------------|----------|
| 70 | Sub-Organizations / Business Units | BusinessUnit | Organization |
| 71 | Territories + Territory Assignment | Territory, TerritoryRule | Sales |
| 72 | Multi-step Approval Workflows | ApprovalProcess, ApprovalStep, ApprovalRequest | Automation |
| 73 | Mobile App — API preparation + auth | MobileDeviceToken | Platform |
| 74 | Mobile App — React Native core | — (separate repo) | Platform |
| 75 | Mobile App — offline sync | SyncLog | Platform |
| 76 | App Marketplace (framework) | App, AppInstallation, AppPermission | Platform |
| 77 | Server-side Custom Functions | CustomFunction, FunctionExecution | Platform |
| 78 | GraphQL Subscriptions (real-time) | — (protocol upgrade) | API |
| 79 | Bulk API + Data Export | BulkJob | API |
| 80 | GDPR Tools (consent, erasure, export) | ConsentRecord, DataRequest | Compliance |
| 81 | Data Residency + Phase 7 Closeout | RegionConfig | Compliance |

**Key architectural decisions:**
- **Business Units:** sub-workspaces within a workspace. Each BU has its own users, data scope, and settings, but shares the same billing/admin.
- **Approvals:** built on workflow engine. New action type: SUBMIT_FOR_APPROVAL. ApprovalProcess defines steps (sequential/parallel), approvers (user/role/manager), conditions.
- **Mobile App:** React Native (reuses REST API). Offline-first with local SQLite + sync queue. Push notifications via FCM/APNs.
- **Custom Functions:** sandboxed V8 isolates (via `isolated-vm` library). Functions have access to a scoped API client, run with timeout (5s), memory limit (128MB).
- **Data Residency:** per-workspace region selector. Database routing middleware directs queries to regional Postgres instances.

**Projected additions:** ~15 new models, ~300 tests

---

### Phase 8 — "Industry Verticals" (Optional, per demand)

**Goal:** industry-specific CRM packages — only build what the market demands.

| Vertical | Key Entities | Target Market |
|----------|-------------|---------------|
| **Healthcare** | Patient, CareTeam, CarePlan, Appointment, MedicalRecord | Clinics, hospitals in MENA |
| **Financial Services** | FinancialAccount, Portfolio, Goal, AdvisoryRelationship, Household | Banks, insurance in Gulf |
| **Real Estate** | Property, Listing, Tour, Offer, Commission | Real estate agencies |
| **Education** | Student, Program, Enrollment, Course, Grade | Universities, schools |
| **Nonprofit** | Donor, Contribution, Membership, Grant, Campaign | NGOs, foundations |

**Architecture:** each vertical is a **plugin package** — `packages/vertical-healthcare/`, etc. — that:
- Defines its own entityDefs (which become Custom Modules in the system)
- Provides pre-built layouts, dashboards, report templates, workflow templates
- Installs via the App Marketplace (Phase 7)
- Does NOT require core code changes

**Build order:** driven by first paying customer demand. Healthcare and Real Estate are strongest candidates for MENA market.

---

## 9. Full Roadmap Timeline

| Phase | Version | Sprints | Theme | Status |
|-------|---------|---------|-------|--------|
| 1 | v1.0.0 | S0–S5 | MVP Sales CRM | ✅ Done |
| 2 | v2.0.0 | S6–S14 | Core — Products, Marketing, Portal | ✅ Done |
| 3 | v2.x | S18–S29 | Service Cloud + AI Foundation | ✅ Done |
| **4A** | **v3.0.0-alpha** | **S30–S35** | **Launch-Ready (Security + Platform)** | **Next** |
| **4B** | **v3.0.0-beta** | **S36–S41** | **MENA Channels + AI Agent** | **Planned** |
| **4C** | **v3.0.0** | **S42–S47** | **No-Code Platform** | **Planned** |
| 5 | v4.0.0 | S48–S59 | Advanced Marketing + Commerce | Future |
| 6 | v5.0.0 | S60–S69 | Advanced AI + Analytics | Future |
| 7 | v6.0.0 | S70–S81 | Enterprise Scale + Mobile | Future |
| 8 | v7.x | On demand | Industry Verticals | Optional |

**Projected final system (after Phase 7):**
- ~140 Prisma models
- ~80 enums
- ~3,500 tests
- ~150,000 lines of code
- ~200 permission keys
- Mobile app (React Native)
- App marketplace

---

## 10. Dependencies & Technical Prerequisites

### Phase 4A prerequisites (none — ready to start):
- All infrastructure exists
- All patterns established in Phases 1–3

### Phase 4B prerequisites:
- Sprint 36 (Channels): Twilio account needed for testing (free trial sufficient)
- Sprint 39 (AI Agent): Ollama installed locally for development
- Sprint 40 (Calendar): Google Cloud project + Azure AD app registration for OAuth

### Phase 4C prerequisites:
- Sprint 44 (Workflow Builder): depends on `@vue-flow/core` npm package
- Sprint 45 (SSO): requires `@node-saml/node-saml` + `openid-client` packages

### Phase 5 prerequisites:
- Stripe account for payment integration
- Meta Business account for WhatsApp Cloud API (direct)
- DocuSign developer account for eSign

---

*End of Phase 4 Design + Full Roadmap — 2026-05-23*
