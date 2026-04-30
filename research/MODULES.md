# CRM — Comprehensive Modules Catalog

> Synthesized from research on **Salesforce, HubSpot, Zoho, Microsoft Dynamics 365, Pipedrive, Monday CRM, Odoo, SuiteCRM, EspoCRM, Vtiger, Twenty, CiviCRM, Mautic** — see `01-salesforce.md`, `02-hubspot.md`, `03-zoho.md`, `04-dynamics-pipedrive-monday.md`, `05-opensource-crms.md` (4,256 lines of source research).
>
> **Audience**: developer + product owner about to build a self-hosted CRM in **Node.js (NestJS) + Vue 3 (PrimeVue dashboard) + Vue 3 public website**, monorepo with `pnpm` workspaces, Postgres + Prisma, Redis, MinIO. Same stack as `azadoc/` and `gym/` projects in this directory.
>
> **Purpose**: this document is the input to the brainstorming/design session. It catalogs what a complete modern CRM has (so nothing gets forgotten), classifies modules into tiers (so we ship MVP fast), and locks in architectural patterns/anti-patterns (so we build it right the first time).

---

## 0. Executive Summary

A "complete CRM" in 2026 is a **suite of seven layers**:

1. **Foundation**: identity (users/teams/roles/permissions), multi-tenancy, audit, customization (custom fields, custom modules, layouts, formulas), workflow engine, integrations (REST + webhooks + iPaaS).
2. **Sales Force Automation (SFA)** — the historical core: Leads, Contacts, Accounts, Opportunities/Deals, Pipelines, Activities, Quotes, Forecasts.
3. **Marketing Automation** — Campaigns, Email/SMS, Forms, Landing Pages, Lists/Segments, Customer Journeys (visual flow builder), ABM, Lead Scoring.
4. **Customer Service / Help Desk** — Tickets, Knowledge Base, SLAs, Customer Portal, Conversations Inbox (omni-channel), Live Chat, Field Service.
5. **Commerce** — Products, Pricebooks, Quotes, Orders, Invoices, Subscriptions, Payments, CPQ.
6. **AI/Copilot** — Conversation Intelligence, Lead/Deal Scoring, Chat-with-your-CRM (RAG), Agents (autonomous workflows).
7. **Surfaces** — Admin Dashboard, Customer Portal, Public Website + Lead-Capture, Mobile, embedded widgets.

The market splits along two axes:
- **Rigid + deep** (Salesforce, Dynamics, Pipedrive) vs **flexible + shallow** (Monday, Zoho).
- **Sales-first** (Pipedrive, Salesforce Sales Cloud) vs **suite** (HubSpot, Zoho One, Salesforce CRM, Dynamics 365).

The winning move for a **modern self-built CRM** is:
- **Rigid + deep for first-class entities** (Person, Company, Deal, Activity, Quote, Order, Invoice, Case) — fixed schema with rich behavior.
- **Flexible "Custom Modules"** for everything outside the core — admin defines schema via UI, no migrations.
- **Metadata-driven** customization (EspoCRM pattern) — fields, layouts, formulas all stored as JSON, evaluated at runtime.
- **AI-native** — Copilot embedded everywhere; Agents for autonomous workflows; RAG over the user's own CRM data.
- **Arabic-first** with RTL baked in from day 1 (one of our differentiators in MENA market).

Two open-source CRMs are the **direct architectural references**: **Twenty** (built on the exact stack we're using — NestJS + PostgreSQL + Redis + BullMQ + reactive frontend) and **EspoCRM** (gold-standard metadata-driven engine — we'll port the *concepts* from PHP to TS).

---

## 1. Module Catalog (by Domain)

Each module table has columns:
- **Module** — common name + vendor aliases.
- **Purpose** — one-liner.
- **Sub-features** — what's inside.
- **Found in** — vendors that ship this module.
- **Tier** — MUST (Phase 1 / MVP), SHOULD (Phase 2 / Core), NICE (Phase 3 / Differentiator), SKIP-v1 (later or never).
- **Notes** — design constraints / pitfalls.

Vendor abbreviations: **SF** = Salesforce · **HS** = HubSpot · **Z** = Zoho · **D365** = Dynamics 365 · **PD** = Pipedrive · **MN** = Monday · **OD** = Odoo · **SUITE** = SuiteCRM · **ESPO** = EspoCRM · **VT** = Vtiger · **T20** = Twenty · **CIVI** = CiviCRM · **MA** = Mautic.

### 1.1 Sales Force Automation (SFA)

> The historical core of CRM. Contacts that buy from Companies via Deals that progress through Stages, with Activities along the way.

| Module | Purpose | Sub-features | Found in | Tier | Notes |
|---|---|---|---|---|---|
| **People (Contacts/Leads unified)** | Individual humans we engage with | Name, email, phone, address, social, lifecycle stage (lead/MQL/SQL/customer), source, owner, tags, custom fields, dedupe, merge, enrichment, do-not-contact flag | All | **MUST** | **Avoid Lead/Contact split** (Twenty/Odoo pattern). Use one entity with a `lifecycleStage` enum. Saves the "Convert Lead" workflow nightmare. |
| **Companies (Accounts/Organizations)** | Organizations we engage with | Domain (auto-create from email), industry, size, revenue, parent-company, address, social, owner, tags, custom fields | All | **MUST** | HubSpot auto-creates from email domain — borrow this. Support parent-child orgs (subsidiary). |
| **Deals (Opportunities)** | Sales pursuits with monetary value | Amount, stage, pipeline, close-date, probability, owner, won/lost reason, line items (products), associated people/companies, source, age, last-activity, rotting | All | **MUST** | Multi-pipeline per object is first-class (Pipedrive nailed this). Don't force "record types". |
| **Pipelines + Stages** | Stage-gated process flow | Stage name, order, probability, color, required fields per stage, automation hooks, won/lost terminal stages | All | **MUST** | Per-object pipelines (HubSpot has Deal pipelines AND Ticket pipelines AND custom-object pipelines). Required fields per stage = data-quality hammer. |
| **Activities** (Tasks, Calls, Meetings, Notes, Emails) | Things you do with/about records | Subject, type, due date, owner, related record (polymorphic FK), status, outcome, duration, recording, AI summary | All | **MUST** | **Single Activity table polymorphic to any record** (EspoCRM pattern). Subtype field = call/meeting/email/task/note. Don't make 5 separate tables. |
| **Tasks** (personal to-dos) | Work items assigned to a user | Subject, due, priority, status, owner, related record | All | **MUST** | Sometimes modeled as Activity subtype, sometimes separate. Keep as Activity subtype to start. |
| **Email Sync (1-way receive)** | Pull emails from Gmail/Outlook into the CRM | IMAP / Microsoft Graph / Gmail API; auto-attach to contact by email; thread view | All | **MUST** | 1-way receive is the smaller scope; 2-way (send via SMTP and have it appear in their Sent) is bigger. |
| **Email Sync (2-way send + thread)** | Send from CRM, sync to user's mailbox | OAuth Gmail/MS, send-as user, BCC trick (`to+bcc@dropbox.crm`), threading | All | SHOULD | Power users want this. Costs OAuth setup work. |
| **Email Templates** | Pre-built emails with merge-tags | Plain + HTML templates, merge tags, attachments, per-team libraries, variables (record fields) | All | **MUST** | |
| **Email Tracking** | Open/click events tied to record | Pixel for opens, link rewriting for clicks, per-recipient tracking, timeline events | SF, HS, Z, D365, PD, MN | SHOULD | Easy win — small implementation, high perceived value. |
| **Sales Sequences (Cadences)** | Multi-step automated outreach plays | Steps (email + task + call), wait days, branching on reply/click, auto-pause on reply, A/B steps | SF, HS (Pro), Z, D365 (Sales Premium), PD, MN | SHOULD | High-value Sales Hub feature. Implement after Sequences are stable. |
| **Lead Capture Forms** | Embeddable forms that create records | Form builder, field mapping, dedupe rules, source UTM tracking, reCAPTCHA, hidden fields | All | **MUST** | Public website needs this on day 1. |
| **Lead Routing** | Auto-assign incoming leads | Round-robin, weighted, by territory/region, by language, fallback owner | SF, HS (Pro), Z, D365, PD, MN | SHOULD | |
| **Lead Scoring** (rule-based) | Manual scoring rules | Rules ("if email-domain=fortune500 +20"), score field on Person, threshold-triggered actions | All except T20 | SHOULD | |
| **Lead Scoring** (predictive AI) | ML-trained scoring | Train on historical wins, score new leads, weights surfaced | SF (Einstein), HS (Pro), Z (Zia), D365 (Premium), PD (Premium) | NICE | Phase 3. Requires enough historical data — bootstrap with rule-based first. |
| **Opportunity Scoring** (predictive) | Win-likelihood for open deals | ML, Will-Win-By-Date prediction | SF, HS (Enterprise), D365, Z | NICE | Phase 3. |
| **Quote Builder** | Document with line items + price | Header (customer/expiry/terms), line items (product/qty/discount/tax), totals, PDF export, e-sign integration, version history | SF (CPQ), HS (Sales Pro), Z, D365, PD (Smart Docs), OD, ESPO (Sales Pack) | SHOULD | Needs Products + Pricebook first. |
| **Order Management** | Confirmed sale → fulfillment | Order header, line items, status (open → fulfilled), connection to invoice | SF, D365, Z, OD, SUITE, VT | NICE | Bridge between CRM and ERP. Keep simple in v1. |
| **Forecasting** | Pipeline → predicted revenue | Probability-weighted pipeline, forecast categories (Pipeline / Best Case / Commit / Closed), period (month/quarter), per-team rollup, snapshots | SF, D365, HS (Pro), Z, PD (Pro+) | SHOULD | Forecast Categories distinct from Stage Probability — this is a distinct primitive. |
| **Quotas** | Sales targets per person/team/period | Target value, period, owner/team, attainment % | SF, D365, Z, PD (Premium) | SHOULD | |
| **Goals** (broader than quotas) | Custom metrics/targets | Metric (revenue / # deals / # activities), target, period, owner | HS, MN, PD | SHOULD | |
| **Territories** | Geographic/segment-based ownership | Hierarchical regions, assignment by criteria, sharing rules, account-territory matching | SF (TM 2.0), D365, Z (Ent+) | NICE | Enterprise pattern. Skip in v1. |
| **Splits / Team Selling** | Multi-owner credit | % attribution per user, per-deal | SF, D365 | SKIP-v1 | Enterprise. |
| **Renewals / Subscriptions** | Recurring revenue tracking | Renewal date, MRR/ARR, churn, expansion, auto-create renewal opp | SF (Revenue Cloud), HS, Z (Subscriptions), OD | NICE | Increasingly important for SaaS customers. |
| **Approvals** (deal/discount) | Multi-step approval workflow | Submit, approver chain, approve/reject, comments | SF, D365, Z, OD, SUITE | NICE | Build once on workflow engine. |
| **Sales Inbox** | Unified inbox view of customer emails | Threads sorted by deal/contact, reply from inbox, AI suggested reply | SF, HS, Z (SalesInbox), PD (Sales Inbox), MN | NICE | Phase 3. |
| **Sales Workspace / Accelerator** | Prioritized work-list for reps | "Top 5 things to do today", AI-generated tasks, sequenced outreach worklist | SF (Sales Workspace), D365 (Sales Accelerator), HS (Prospecting Workspace) | NICE | Modern SDR-focused UX. Phase 3. |
| **Won/Lost Reasons** | Categorical close reasons | Picklist, required on stage transition to terminal stages | All | **MUST** | Trivial to add; massive analytical value. |
| **Rotting Deals Indicator** | Flag stale opportunities | "No activity for N days" → highlight in pipeline | PD, HS, MN | SHOULD | Pipedrive innovation; cheap to implement. |

**Distinctive primitives in this domain:**
- **Lead vs Contact split (avoid)** — Salesforce model. Twenty/Odoo pioneered People-only. We adopt the unified model.
- **Opportunity Line Items** — Deal + many products with qty/price/discount/tax → totals roll up.
- **Forecast Categories** distinct from Stage Probability — Pipeline / Best Case / Commit / Closed lets you forecast more conservatively than probability.
- **Required Fields per Stage** (Pipedrive innovation) — gating data quality without admin process.
- **Rotting Deals** — last-activity-on every record + highlight stale.
- **Won/Lost Reasons** — required on terminal-stage transition. Powers conversion analytics.

---

### 1.2 Marketing Automation

> Get strangers' attention, capture them as leads, nurture until sales-ready.

| Module | Purpose | Sub-features | Found in | Tier | Notes |
|---|---|---|---|---|---|
| **Campaigns** | Marketing initiative envelope | Name, type (email/event/ad/webinar), budget, expected revenue, dates, members (contacts), parent campaign, source attribution | SF, HS, Z, D365, MA, OD, SUITE, ESPO | **MUST** | Foundation for attribution. |
| **Lists / Segments** | Saved contact filters | Static (snapshot) or Active/Smart (live query); criteria (any field, any operator); used by campaigns | All | **MUST** | **Active Lists = saved query persisted as JSON, evaluated live** (HubSpot pattern). Don't snapshot. |
| **Email Marketing (Mass)** | Send to a list/segment | Campaign editor (drag-drop blocks or HTML), preview, send-time scheduling, throttling, A/B subject, send-time-optimization, bounce/complaint handling, unsub mgmt | SF, HS, Z, D365, MA, OD, MN | **MUST** | Use a transactional ESP (SES, SendGrid, Mailgun) — **don't ship our own SMTP** (Mautic's pain). |
| **Email Marketing (Drip / Nurture)** | Automated multi-email sequence | Trigger (e.g., form submit), wait N days, send template-N, branching, exit conditions | All | SHOULD | Workflow engine + email channel. |
| **Customer Journey Builder** | Visual flow builder | Drag-drop nodes (trigger / action / wait / branch / segment), real-time triggers, multi-channel (email/SMS/push/webhook) | SF, HS, Z, D365, MA, OD | NICE | Phase 3. Build on workflow engine. |
| **Forms** | Web/popup forms → CRM | Form builder, field mapping (incl. custom fields), conditional fields, multi-page, file upload, notifications, redirect after submit, embed code (iframe + JS), reCAPTCHA | All | **MUST** | Required for public website. |
| **Pop-ups / Banners** | Conversion overlays | Trigger (time/scroll/exit-intent), style, A/B, frequency cap | HS, MA, MN | SHOULD | Phase 3. |
| **Landing Pages** | Built-in page builder | Drag-drop builder, templates, custom code, A/B test, SEO meta, form embed, analytics | SF (Marketing Cloud), HS, Z (LandingPage), D365, OD, MA | SHOULD | Heavy build. Could integrate external for v1. |
| **Lead Nurturing** (drip) | Long-running multi-step plays | See Email Marketing (Drip) above + lead-scoring integration | All | SHOULD | |
| **A/B Testing** | Variant comparison | Two emails / pages / forms; auto-pick winner; statistical significance | HS, SF, Z, OD, MA | NICE | Phase 3. |
| **Marketing Calendar** | Calendar of campaigns/events | Calendar view of campaigns, drag-drop reschedule, color by type | HS, SF, MN | NICE | Phase 3. |
| **SMS / WhatsApp Marketing** | Outbound messaging | Twilio/Vonage adapter, opt-in mgmt, character limit handling, 2-way reply capture | SF, HS, Z, D365, MA | NICE | Compliance-heavy. Phase 3. |
| **Push Notifications** | Mobile push campaigns | iOS/Android push, web push | SF (Mobile Studio), HS, MA | SKIP-v1 | Niche. |
| **Events / Webinars** | Event registration tracking | Event entity, registration form, attendees, integration (Zoom/Teams), check-in | SF, HS, Z (Backstage), D365, OD | NICE | |
| **Surveys / NPS** | Feedback collection | Form-like builder, NPS/CSAT/CES scales, send via email, response storage, dashboard | SF, HS (Service), Z (Survey), D365, OD, SUITE | SHOULD | |
| **Loyalty / Points** | Points-based rewards | Member, accrual rules, tiers, rewards | SF (Loyalty), Z (Thrive) | SKIP-v1 | Industry-specific. |
| **ABM (Account-Based Marketing)** | Account-centric marketing | Target Account list, account-level scoring, account-level engagement view | SF (Pardot), HS (Pro+), D365, T6sense integration | NICE | B2B-only feature. |
| **Ads Integration** | Manage FB/Google/LinkedIn ads in CRM | Connect ad accounts, audience push (CRM list → ad audience), conversion sync back, ROI reporting | SF, HS, Z, D365 | NICE | Heavy 3rd-party API work. Phase 3. |
| **Social Publishing** | Schedule/publish to social | Connect FB/IG/LinkedIn/X, scheduler, calendar | SF (Social Studio — discontinued), HS, Z (Social), MA | SKIP-v1 | Buffer/Hootsuite do this better. |
| **Social Listening / Inbox** | Monitor + reply to mentions | Mentions stream, sentiment, reply | SF, HS, Z | SKIP-v1 | |
| **UTM Tracking + Source Attribution** | First/last/multi-touch attribution | Capture UTMs from form/landing-page submission, store on Person + Campaign, multi-touch attribution model | All | **MUST** | Cheap to build, foundational analytics. |
| **Web Visitors (Reverse-IP)** | Identify anonymous web visits | IP-to-company DB, anonymous visit timeline | HS (Pro+), PD (Web Visitors), Z (SalesIQ) | SKIP-v1 | Requires data partnership. Skip. |
| **Smart Content / Personalization** | Per-visitor content variants | Per-segment content blocks, recommendations | SF (Personalization), HS, MA (Dynamic Content) | NICE | Phase 3. |
| **Marketing Contacts Billing Model** | Charge only for contacts you market to | Distinguish "marketing contact" from "non-marketing contact" | HS-distinctive | NICE | Pricing-model lever, not module. |

**Distinctive primitives:**
- **CampaignMember** (Salesforce) — junction table Person ↔ Campaign with status (Sent/Opened/Clicked/Responded/Converted) and per-record values. Foundational for attribution.
- **Lead Scoring "Points + Stages + Segments" triad** (Mautic) — points decay, stages are achievement levels, segments are filters; rich combo for nurture logic.
- **Mautic Campaign-as-Graph** — campaigns are visual flows with branches/waits/decisions; we should build automations as graphs from day one.

---

### 1.3 Customer Service / Help Desk

> Customers have problems → we resolve them. Tickets, queues, SLAs, knowledge.

| Module | Purpose | Sub-features | Found in | Tier | Notes |
|---|---|---|---|---|---|
| **Tickets / Cases** | Customer issue records | Subject, description, status, priority, severity, customer (Person+Company), agent (User), team/queue, channel, source, related deal/order, custom fields | All | **MUST** (if Service in v1) | HubSpot calls them Tickets, Salesforce calls them Cases — same thing. |
| **Queues** | Shared inboxes of unassigned tickets | Queue name, members, assignment rules (round-robin/skill/manual) | SF, HS, Z, D365, ESPO | **MUST** (if Service) | |
| **SLAs** | Response/resolution time targets | First-response time, resolution time, business-hours calendar, breach actions, escalation | SF, HS, Z, D365, ESPO (Advanced Pack) | SHOULD | Foundational for service teams. |
| **Entitlements** | Per-customer SLA contracts | Contract → entitlement → SLA mapping; consume per ticket | SF | NICE | Enterprise. |
| **Milestones** | SLA checkpoints in a process | Per-stage time targets within ticket lifecycle | SF | NICE | |
| **Knowledge Base** | Searchable articles | Article (title/body/categories/tags), drafts/published, approval, search, public + internal articles, attach to tickets, suggested articles | All | SHOULD | |
| **Public Help Center / Customer Portal** | Customer self-service site | Login, view tickets, create ticket, KB search, profile mgmt, branded | SF (Experience Cloud), HS (Customer Portal), Z (Portal), D365 (Power Pages), OD, ESPO (paid) | SHOULD | Use the same Vue website framework with auth. |
| **Email-to-Case** | Inbound email → ticket | Email alias → parse → match contact → create ticket → reply threading | All | **MUST** (if Service) | Builds on email gateway. |
| **Web-to-Case** | Form → ticket | Embeddable form, field mapping | All | **MUST** (if Service) | Builds on Forms. |
| **Conversations Inbox (Omni-channel)** | Unified channel inbox | Email + chat + SMS + WhatsApp + social → unified UI; channel-agnostic threading | SF, HS, Z, D365 | NICE | Phase 3. |
| **Live Chat (Customer-facing)** | On-website chat widget | Widget JS, real-time chat (Socket.io), agent console, routing, transcript-to-ticket, file upload | SF, HS, Z (SalesIQ), D365, ESPO (Live Chat) | SHOULD | High-value feature. Builds on websocket infra. |
| **Voice / CTI** | Telephony integration | SIP / Twilio / PhoneBridge connector, click-to-call, recording, transcription, screen-pop | SF (Service Cloud Voice), Z (PhoneBridge — 50+ providers), D365, HS (Calling) | NICE | Phase 3. |
| **Field Service** | On-site work coordination | Work Orders, Resources (technicians), Bookings (schedule), Inspections, Inventory, Mobile app | SF (FSL), D365 (Field Service), Z (FSM), VT | SKIP-v1 | Big module. Defer or paid add-on. |
| **AI Bots / Reply Recommendations** | Automated first response | Chatbot (rules + LLM), suggested replies for agents (RAG over KB), deflection metric | SF (Einstein Bots / Agentforce), HS (Breeze Customer Agent), Z (Zia bots), D365 (Copilot Studio) | NICE | Phase 3. |
| **Customer Feedback Surveys** | Post-resolution NPS/CSAT/CES | Trigger after ticket close, scale rating, open feedback, dashboard | SF, HS, Z, D365 | SHOULD | Builds on Surveys module. |
| **Skills-based Routing** | Match ticket to agent by skill | Skills on agents, required skills on tickets/queues | SF, HS (Pro+), D365 | NICE | |
| **Escalation Rules** | Auto-escalate breached/aged tickets | Rule (time elapsed + status) → reassign / notify | SF, Z, D365, HS | SHOULD | |

**Distinctive primitives:**
- **Polymorphic Ticket-on-Account+Contact** — a ticket has both a Person (the requester) and a Company (the account it belongs to).
- **Conversation Threading** across channels — same Person can email today, chat tomorrow, call next week — all on the same Ticket.

---

### 1.4 Commerce / Quoting / Billing

> Sales-side commerce features. Distinct from full eCommerce / ERP.

| Module | Purpose | Sub-features | Found in | Tier | Notes |
|---|---|---|---|---|---|
| **Products** | Sellable items master | SKU, name, description, category, image, active/inactive, custom fields | All | **MUST** (if Quotes/Orders in v1) | |
| **Product Variants** | Product configuration matrix | Size/color/etc., per-variant SKU and price | OD, MN, SF (CPQ) | NICE | |
| **Pricebooks / Pricelists** | Multiple price lists per product | Per-currency, per-customer-segment, time-bound, discount tiers | SF, D365, Z, OD | SHOULD | |
| **Quotes** | Pre-sale proposal docs | Header (customer/expiry/terms), line items (product/qty/discount/tax), totals (subtotal/discount/tax/total), status (draft/sent/accepted/expired), PDF export, e-sign integration, version history | All | SHOULD | See SFA section. |
| **Orders** | Confirmed sale | Header, line items, status (open/fulfilled), shipping, tracking, related quote/invoice | SF, D365, Z, OD, VT | NICE | |
| **Invoices** | Billing documents | Invoice number, date, due date, line items, totals, payments, status (open/partial/paid/overdue), customer balance | OD, Z (Books), D365 (Finance), ESPO (Sales Pack) | NICE | Bridges to accounting tools. |
| **Subscriptions** | Recurring billing | Plan (monthly/yearly/usage), customer, start/end, MRR, next invoice date, prorations, dunning | SF (Revenue Cloud), HS (Commerce Hub), Z (Subscriptions), OD | NICE | Phase 3. |
| **Payments** | Process customer payments | Stripe/PayPal/Tap connector, charge/refund, payment history per invoice | HS (Commerce Hub), Z, OD, ESPO | NICE | Stripe integration is the modern default. |
| **Tax Engine** | Compute tax per line | Tax rates by region/product, exempt customers, multi-jurisdiction | OD, D365, Z, SF | NICE | Use a service (Stripe Tax / Avalara) for v1. |
| **Discounts / Coupons** | Promo codes | Coupon code, % or fixed, expiry, limit, per-customer or general | SF, HS, Z, OD | SHOULD | |
| **CPQ (Configure-Price-Quote)** | Complex product config | Configurator UI (product options), pricing rules, approval thresholds, contract gen | SF (CPQ — Revenue Cloud), D365, Z (CPQ in CRM Plus) | SKIP-v1 | Heavy. Industry-specific. |
| **eSign Integration** | Sign quotes/contracts | DocuSign / HelloSign / native, sign request, status tracking | SF, HS, Z (Sign), D365, OD (Sign), PD (Smart Docs) | SHOULD | DocuSign API. |

**Distinctive primitives:**
- **Quote Line Items** rolling up to Quote totals (replicate at Order/Invoice level).
- **Price List + Customer Segment + Currency** triple key for B2B pricing.

---

### 1.5 Customer Data Platform (CDP) / Profile

> Unifying customer data across systems. The "360 view".

| Module | Purpose | Sub-features | Found in | Tier | Notes |
|---|---|---|---|---|---|
| **Unified Customer Profile** | Single record across channels | Person + linked Companies + Activities + Deals + Tickets + Subscriptions + Custom-records — one timeline | All | **MUST** | Render in dashboard as "Customer 360" page. |
| **Identity Stitching** | Merge same person across IDs | Match by email/phone/cookie/external-id; survivorship rules; manual merge UI | SF (Data Cloud), HS, D365 (Customer Insights – Data) | NICE | Phase 3. |
| **Custom Properties (no-migration)** | Admin can add fields | Type (text/num/picklist/date/datetime/lookup/multi-select/file/formula/rollup), name, label, required, unique, default | All | **MUST** | **Metadata-driven** (EspoCRM pattern). Storing as columns in JSONB or as dedicated typed columns generated dynamically — design decision. |
| **Custom Modules** | Admin can add entities | Module name, label, fields, layout, permissions, relationships | SF (Custom Objects), HS (Custom Objects — Ent), Z, D365, ESPO, T20 | SHOULD | Same engine as custom properties + entity registration. |
| **Data Enrichment** | Auto-fill profile from external | API to Clearbit/Apollo/ZoomInfo, run on lead create / on-demand | HS (Breeze Intelligence), SF, Z, D365 | NICE | 3rd-party API integration. |
| **Duplicate Management** | Detect + merge dupes | Match rules (exact/fuzzy on email/name+company), preview, merge UI, master record | SF, HS, Z, OD, ESPO | SHOULD | Critical at scale. |
| **Tags** | Free-form labels | Multi-tag per record, tag-based filters | All | **MUST** | Trivial to add. |
| **Households (FSC)** | Family-unit grouping | Household entity, members with roles, household-level finances | SF (Financial Services Cloud) | SKIP-v1 | Industry-specific. |
| **Typed Relationships** | Person ↔ Person / Person ↔ Company with role | Relationship types (employer / spouse / referrer / decision-maker), with start/end date, bidirectional | CIVI (gold-standard), D365 (Connection Roles), SUITE | NICE | Powerful for B2B + nonprofit. Phase 3. |
| **360-degree Activity Timeline** | All record activity unified | Activities + emails + calls + tickets + custom-events + system-events on one chronological feed | All | **MUST** | Polymorphic activity table makes this trivial. |
| **Behavioral / Custom Events** | Track product/web events | Event name + props + timestamp + person; queryable in lists | HS (Custom Behavioral Events), SF, MA | NICE | Like Mixpanel. Phase 3. |

**Distinctive primitives:**
- **Properties as Metadata** (HubSpot) — no schema migration to add a field. Admin UI writes to JSON; system picks it up.
- **Active Lists** (HubSpot) — saved query persisted as JSON, evaluated live → list members are computed, not stored.
- **Universal Partner** (Odoo `res.partner`) — one table for People AND Companies with `is_company` flag and `parent_id` for orgs. Simplifies the schema dramatically.

---

### 1.6 Communications & Channels

> All the wires between humans.

| Module | Purpose | Sub-features | Found in | Tier | Notes |
|---|---|---|---|---|---|
| **Email Sync** (Gmail/Outlook) | Bidirectional email | OAuth Gmail / MS Graph; receive (IMAP-or-API) + send-as-user; auto-attach to records by email | SF, HS, Z, D365, PD | SHOULD | OAuth setup is the work. |
| **Calendar Sync** (Google/MS) | Bidirectional calendar | OAuth, sync events, push CRM meetings to calendar, read events as activities | SF, HS, Z, D365, PD | SHOULD | |
| **Telephony (CTI / PhoneBridge)** | Call from CRM | Twilio / SIP / 50+-provider abstraction, click-to-call, screen-pop, recording, voicemail drop, transcription | Z (PhoneBridge — best-in-class), SF, D365, HS, PD | NICE | |
| **Built-in Calling** | Native call without external app | WebRTC, recording, transcription | HS, MN, PD (3rd-party) | NICE | Heavy. |
| **SMS** | 1:1 SMS from CRM | Twilio adapter, send/receive, template merge | SF, HS, Z, D365 | NICE | |
| **WhatsApp** | WhatsApp Business API | Approved templates, session messages, conversations | SF, HS, Z, D365 | NICE | Hot in MENA. |
| **Live Chat** | Website chat widget | Widget JS, agent console, routing, AI-handoff, transcript | All | SHOULD | (Also in Service section.) |
| **Social Channels** | FB/IG/X/LinkedIn → CRM | OAuth, mention/DM ingestion, reply | SF (deprecated Social Studio), HS, Z, D365 | SKIP-v1 | |
| **Video Meetings** | Zoom/Teams/Meet integration | OAuth, schedule from CRM meeting, attach recording/transcript | SF, HS, D365 (Teams native), Z | NICE | |
| **Email Templates Library** | Shared templates | Plain + HTML, merge tags, per-team/private, tags | All | **MUST** | |
| **Email Sequences** | Automated multi-step | (See Sales Sequences in SFA) | | SHOULD | |
| **Conversation Intelligence** | Call recording → AI insights | Auto-record/transcribe, identify topics/objections/competitors, sentiment, next-step suggestions, sharing snippets | SF (Einstein Conversation Insights), HS (Pro+), Z (Zia voice), D365 (Sales Premium) | NICE | Phase 3. Heavy AI. |
| **Email Gateway / Aliases** | Inbound email → CRM record | `support@` → ticket; `sales@` → lead; `noreply+id@` → reply-to-conversation | OD (mail aliases — gold standard), MA, SUITE, SF | **MUST** (if Service in v1) | Powerful platform feature. Build on email infra. |

**Distinctive primitives:**
- **Email Gateway / Mail Aliases** (Odoo) — `<topic>@yourdomain.com` becomes a record-creation channel. `noreply+activity-1234@` lets recipients reply directly into a CRM thread.
- **PhoneBridge** (Zoho) — telephony abstraction with 50+ provider adapters. We can have a thin "PhoneAdapter" interface and ship 1-2 providers (Twilio / SIP) initially.

---

### 1.7 Productivity & Collaboration

> Tools to get work done inside the CRM.

| Module | Purpose | Sub-features | Found in | Tier | Notes |
|---|---|---|---|---|---|
| **Documents** | File attachments + library | Attach to any record, document library with folders, version history, preview, share link | All | **MUST** | Use MinIO for storage. |
| **Document Tracking** | View-tracked sales collateral | Send doc → recipient opens → events on timeline | HS, SF (Sales), PD (Smart Docs) | NICE | |
| **Notes** | Quick text on records | Rich-text or markdown, polymorphic to record, mention users | All | **MUST** | Activity subtype. |
| **Internal Chat / Chatter** | Per-record conversation | Comments on record, @mentions notify, file attach, polymorphic | OD (mail.thread → chatter), SF (Chatter), ESPO (Stream) | **MUST** | Adopt Odoo's mail.thread mixin pattern — every record gets a chatter. |
| **Activity Feed** | Cross-record social feed | Subscribe to records (followers), unified feed of their changes | SF (Chatter), OD (Inbox), ESPO (Stream) | NICE | Phase 3. |
| **@mentions + Notifications** | Notify users in context | Mention parser, notification entity, in-app + email + push | All | **MUST** | |
| **Tasks** (personal to-dos) | Per-user todo list | Subject, due, priority, status — same Activity entity | All | **MUST** | (See SFA.) |
| **Calendar UI** | Week/month/day calendar | Render activities/meetings, drag-resize, sync indicator | All | **MUST** | |
| **Meeting Scheduler** | Calendly-equivalent | Personal/team booking links, availability rules, round-robin, embed on website, calendar sync | SF (Inbox), HS (Meetings), Z (Bookings), D365, PD, MN | SHOULD | Public-facing widget. |
| **Quote / Proposal Templates** | Reusable quote layouts | Header/footer/sections per template, merge fields | SF (CPQ), HS (Sales Pro), Z, D365, PD (Smart Docs) | SHOULD | |
| **Snippets** | Email/chat shortcut text | Trigger `#abc` → expand to text; per-team/private | HS, Z, SF | NICE | |
| **Playbooks** | Sales/service guidance overlays | Per-stage/case-type guide, checklist, AI-assist | HS (Pro+), SF, D365 (Sales Premium) | NICE | Phase 3. |
| **Goals (personal/team)** | Track personal targets | Metric, target, period, owner | All | NICE | (See SFA.) |
| **Internal Knowledge** | Wiki/notebook for the team | Pages, hierarchy, search, per-team perms | Z (Connect, Notebook), HS (Knowledge), SF (Quip — sunsetting) | SKIP-v1 | Notion/Confluence do this better. |

**Distinctive primitives:**
- **mail.thread mixin** (Odoo) — every record gets followers + comments + email gateway → chatter.
- **Activity vs Task vs Event** distinction — sometimes valuable, sometimes overkill. We default to one Activity entity with subtype.

---

### 1.8 Reporting & Analytics

> Show users what's happening with their CRM data.

| Module | Purpose | Sub-features | Found in | Tier | Notes |
|---|---|---|---|---|---|
| **Standard Reports** | Pre-built tabular reports | Filter (any field, any operator), group-by, summary (sum/avg/count/min/max), sort, paginate, export CSV/Excel | All | **MUST** | |
| **Custom Reports (Report Builder)** | User-built reports | Type (tabular/grouped/summary/joined/matrix), drag-drop fields, filters, charts, save/share | SF, HS, Z, D365, OD, ESPO | SHOULD | |
| **Dashboards** | Composable widgets | Widget types (number / chart / list / kanban / gauge / map / pivot / trend / cohort), filters, drill-through, scheduled email digest, public link | All | **MUST** | Phase 1: 4-5 widget types is enough; expand over time. |
| **Pipeline Reports** | Deal-funnel views | Pipeline-by-stage, value-by-stage, conversion rates, velocity, win-rate | All | **MUST** | |
| **Activity Reports** | What reps are doing | Calls/meetings/emails per rep per period, leaderboard | All | **MUST** | |
| **Forecast Reports** | Predicted revenue | Probability-weighted, by category, trend over snapshots | SF, HS (Pro+), Z, D365, PD | SHOULD | |
| **Conversion Funnel** | Step-by-step drop-off | Lead → MQL → SQL → Opp → Closed-Won funnel with conversion rates | SF, HS, Z, D365 | SHOULD | |
| **Cohort Analysis** | Retention/behavior over cohorts | Cohort by signup date, metric over time | Z, HS (Custom Reports) | NICE | |
| **Revenue / MRR Reports** | SaaS revenue analytics | MRR/ARR/churn/expansion/CAC/LTV | HS (Commerce), SF (Revenue Cloud), Z (Subscriptions) | NICE | |
| **Marketing Attribution** | First/last/multi-touch attribution | Per-deal touchpoints from CampaignMember + Activities, attribution model selector | SF, HS, MA, Z | NICE | |
| **Goals / Quota Tracking** | Targets vs attainment | Goal entity, period, target, real-time attainment | All | SHOULD | |
| **KPI Cards** | Top-of-dashboard metrics | Number + trend + delta + sparkline | All | **MUST** | Trivial widget. |
| **Anomaly Detection** | Auto-flag weird metrics | Statistical outliers, AI-flagged | SF (Einstein), Z (Zia) | NICE | Phase 3. |
| **Drill-through** | Click chart → view records | From any dashboard widget → records list | All | **MUST** | |
| **Scheduled Email Reports** | Email a report periodically | Daily/weekly/monthly, recipients, format | All | NICE | |
| **Public Dashboard Links** | Share dashboard externally | Auth-less link, optionally password | HS, MN | NICE | |
| **Embedded Analytics** | Embed in other apps | iframe / SDK | SF (CRM Analytics), HS, Z (Analytics) | SKIP-v1 | |

---

### 1.9 Workflow & Automation

> The engine that makes the CRM do things automatically.

| Module | Purpose | Sub-features | Found in | Tier | Notes |
|---|---|---|---|---|---|
| **Workflow Rules (Trigger-Condition-Action)** | If-this-then-that on records | Trigger (record created / field changed / time-based), conditions, actions (update field / send email / create task / call webhook / notify user) | All | **MUST** | Foundation. Build on BullMQ. |
| **Time-based Workflows** | Delay then act | "After 3 days do X", "30 days before close-date do Y" | SF, HS, Z, D365 | **MUST** | |
| **Scheduled Jobs** | Cron-style recurring | Custom cron expression + action | All | **MUST** | BullMQ repeat. |
| **Approval Processes** | Multi-step approvals | Submit, approver chain (sequential/parallel), approve/reject, comments, notifications | SF, D365, Z, OD, SUITE, ESPO (Advanced Pack) | NICE | Build on workflow engine. |
| **Macros** | One-click multi-step | Record-set sequence of actions, run on demand | SF, Z | NICE | |
| **Process Builder / Flow / Blueprint / BPF** (visual flow) | Visual flowchart automation | Drag-drop nodes (trigger / decision / action / loop), version, debug | SF (Flow), Z (Blueprint), D365 (Power Automate, BPF), MA (Campaigns) | NICE | Phase 3. |
| **Validation Rules** | Block save if condition fails | Per-entity, per-field, with custom error message | SF, Z, D365, ESPO | **MUST** | |
| **Assignment Rules** | Auto-route incoming records | Round-robin / weighted / by-criteria | All | SHOULD | |
| **Auto-response Rules** | Auto-reply to incoming | E.g., on new ticket, send "we got your request" | SF, Z, D365 | SHOULD | |
| **Server-side Functions** | Custom code in workflows | TS/JS function snippets, scoped, sandboxed | SF (Apex), Z (Deluge), HS (Operations Hub Custom Code), D365 (Power Automate Custom Connector) | NICE | Hardest to do safely. Phase 3. |
| **Webhooks (in/out)** | HTTP integration triggers | Outbound: on event call URL; Inbound: receive HTTP → trigger workflow | All | **MUST** | |
| **Email Parsers** | Inbound email → record fields | Define parsing rules per inbox; parse subject/body for fields | HS, Z, OD | NICE | |
| **Signal Recipes (When-X-Do-Y)** | Recipe-style automation | Monday-style "When item moves to Done, notify #channel" — built on workflow engine | MN, HS (Workflows simplified) | SHOULD | UI atop workflow engine. |

**Distinctive primitives:**
- **Recipe-first UI atop a graph engine** (Monday) — most users want recipes, not flowcharts. Build the engine to support graphs, but expose recipes first.
- **Email Aliases as Triggers** — see Communications.

---

### 1.10 AI / Copilot

> The 2026 differentiator. Increasingly table-stakes.

| Module | Purpose | Sub-features | Found in | Tier | Notes |
|---|---|---|---|---|---|
| **AI Email Composer** | Draft emails from intent | "Reply professionally; thank for meeting; propose next steps" → draft | All | SHOULD | OpenAI/Claude API. Easy win. |
| **AI Email Reply Suggestions** | Suggest replies to incoming | LLM with context (record + thread) → 3 suggested replies | SF (Einstein), HS (Breeze), Z (Zia), D365 (Copilot) | SHOULD | |
| **AI Meeting Summaries** | Recap of call/meeting | Transcript + LLM → summary, action items, sentiment | SF, HS, Z, D365 | NICE | Phase 3. Needs recording. |
| **Conversation Intelligence** | Call recording → insights | (See Communications.) | | NICE | Phase 3. |
| **Chat-with-your-CRM (Copilot)** | RAG over user's CRM | Sidebar chat, queries records + docs + KB, takes actions ("create deal") | SF (Agentforce), HS (Breeze Copilot), Z (Zia GPT), D365 (Copilot) | SHOULD | Big modern feature. Phase 2. |
| **AI Lead Scoring (predictive)** | ML lead-score | Train on historical conversion, surface predicted score per lead | SF, HS, Z, D365, PD | NICE | Phase 3. |
| **AI Deal/Opportunity Scoring** | ML win-likelihood | Same as lead scoring on deals | SF, HS, Z, D365 | NICE | Phase 3. |
| **AI Forecasting** | ML revenue prediction | Quarter-end forecast vs human-submitted | SF, D365 | NICE | Phase 3. |
| **AI Sentiment Analysis** | Tone of customer comms | Per-message sentiment, alert on negative trend | SF, Z, D365 | NICE | |
| **AI Anomaly Detection** | Flag unusual metric movement | Statistical detection on dashboard widgets | SF, Z | NICE | |
| **AI Agents (autonomous workflows)** | Multi-step LLM-driven agents | "Sales Qualification Agent" / "Customer Service Agent" / "Content Agent" — runs autonomous loops with tools | SF (Agentforce), HS (Breeze Agents — 4 agents), Z (Zia Agents), D365 (Copilot Studio Agents) | NICE | Phase 3-4. Bleeding-edge. |
| **AI Schema Suggestions** | Suggest custom fields/modules | Admin describes use case → AI suggests entities/fields | SF (Schema Builder + AI), MN (AI formula generator) | NICE | |

**Strategy**: Wrap a thin **AIProvider interface** (OpenAI / Claude / Gemini) so we can swap backends. Build RAG over Postgres pgvector + record content. Expose Copilot in dashboard sidebar from day 1 even if features are limited.

---

### 1.11 Customization / No-Code Platform

> Letting admins shape the CRM without engineers.

| Module | Purpose | Sub-features | Found in | Tier | Notes |
|---|---|---|---|---|---|
| **Custom Fields** | Add fields to entities without migration | Types: text/number/picklist/multi-picklist/date/datetime/boolean/lookup/file/formula/rollup; per-field properties (label, required, unique, default, help text) | All | **MUST** | **Metadata-driven** (EspoCRM pattern). |
| **Custom Modules / Custom Objects** | Add new entities | Module name (singular/plural), icon, color, fields, layouts, permissions, relationships, search | SF, HS (Ent), Z, D365, ESPO, T20 | SHOULD | Same engine + entity registration. |
| **Page Layouts** | Per-profile layout | Sections, fields, related lists, drag-drop | SF, Z, D365, ESPO (Layout Manager), SUITE (Studio) | SHOULD | |
| **Record Types / Multi-Form** | Different layouts for record subtypes | E.g., a "B2B Lead" layout vs "B2C Lead" | SF, D365, Z (Multi-Page Layout) | NICE | |
| **Picklist Manager** | Centrally managed dropdowns | Global + per-field picklists, dependent picklists, translations | All | **MUST** | |
| **Validation Rules** | Field/record-level checks | (See Workflow.) | | **MUST** | |
| **Formula Fields** | Computed fields | Expression language; context = current record + related; evaluate-on-read or on-save | SF, Z, D365, ESPO (Formula), MN (Formula column) | SHOULD | Pick a formula engine: jsonata / mathjs / custom. |
| **Rollup Summary Fields** | Aggregate from related records | sum/avg/count/min/max over child records | SF, D365 (Calculated columns), MN (Mirror+Formula), ESPO | SHOULD | Materialized vs compute-on-read tradeoff. |
| **Schema Builder / Visual ER** | Visual schema editor | ER diagram, drag-drop entities/relationships | SF (Schema Builder), MN | NICE | |
| **Tabs / Apps** | Configure top-level navigation | Show/hide modules per profile, ordering | SF, Z, ESPO, SUITE | SHOULD | |
| **Multi-language (i18n)** | UI translation | Translation files per locale; user-selectable | All | **MUST** | **Arabic-first with RTL** is our differentiator. |
| **Multi-currency** | Per-record currency | Currency field, FX rates, base currency, conversion on rollup | SF, Z, D365, OD | SHOULD | |
| **Time-zones** | Per-user TZ | UTC stored, displayed in user TZ | All | **MUST** | |
| **Brand Kit / Theming** | Per-org branding | Logo, primary color, dashboards/portal apply | HS, Z (Canvas), MN (Workforms theming) | SHOULD | Per-org branding makes the CRM feel "ours" to each tenant. |
| **Custom Buttons / Actions** | Trigger custom action from record UI | Button on layout, on click → workflow / URL / function | SF, Z, ESPO, SUITE | NICE | |
| **Canvas / Custom Record UI** | Custom-designed record page | Drag-drop full record-page designer | Z (Canvas), MN (Item card), SF (Lightning App Builder) | NICE | Phase 3. |
| **Layouts as JSON** | Forms/layouts persisted as data | Render dynamic Vue forms from JSON layout | ESPO, MN | **MUST** | This is what makes (almost) all the above work. |

**Distinctive primitives:**
- **Metadata files** (EspoCRM) — `entityDefs/<Entity>.json`, `clientDefs/<Entity>.json`, `layouts/<Entity>/<list|detail|edit>.json`. The system reads these at boot to generate ORM, API, UI.

---

### 1.12 Integrations & Developer Platform

> Connecting CRM to the rest of the world.

| Module | Purpose | Sub-features | Found in | Tier | Notes |
|---|---|---|---|---|---|
| **REST API** | CRUD on every entity | OpenAPI spec, OAuth + PAT, rate limiting, pagination, filtering, sorting, bulk endpoints | All | **MUST** | Auto-generate from Prisma + decorators. |
| **GraphQL API** | Flexible reads | Schema generated from entities | T20 (GraphQL-first), HS (newer endpoints), MN | NICE | Phase 3. REST is enough for v1. |
| **Webhooks (out)** | HTTP push on events | Subscribe by entity + event, configurable URL, retries, signing | All | **MUST** | |
| **Webhooks (in)** | Receive HTTP → trigger workflow | Auth on inbound, mapped to workflow trigger | SF, Z, HS, ESPO | SHOULD | |
| **OAuth2 + PAT** | API auth | OAuth2 server (authorization_code, client_credentials), Personal Access Tokens | All | **MUST** | |
| **API Keys** | Static-key auth | Per-org keys, scoped, revocable | All | **MUST** | |
| **Pre-built Connectors** | Google/MS/Stripe/Slack/etc. | Per-vendor integration with OAuth + bidirectional sync | All | SHOULD | Start with Gmail + MS + Stripe. |
| **iPaaS / Zapier-like** | Native or Zapier integration | Provide Zapier app + Make app + native flow connector | All | NICE | Easiest: ship Zapier + Make integrations (we provide REST + webhooks; they build the connector). |
| **App Marketplace** | 3rd-party apps installable | App catalog UI, install flow, OAuth, scoped access | SF (AppExchange), HS, Z, D365 (AppSource), MN | SKIP-v1 | Big platform investment. |
| **SDKs (JS / Mobile)** | Client libraries | Auto-generated from OpenAPI | All | NICE | |
| **Embedded Widgets** | Drop-in CRM components | Live chat / lead form / KB / scheduler — drop a `<script>` tag | HS, MN, Z (SalesIQ) | SHOULD | |
| **Custom Functions / Code Actions** | Server-side custom code | Sandboxed JS/TS functions, runtime, secrets, scheduled or workflow-triggered | SF (Apex), Z (Deluge), HS (Operations Hub) | NICE | Hardest to do safely. |
| **MCP Server (Model Context Protocol)** | AI tool for the CRM | MCP server exposing CRM as tools to Claude/ChatGPT | D365 (Dataverse MCP — released 2026), SF (Agentforce) | NICE | 2026 modern standard. Phase 3. |
| **Bulk API** | Big imports/exports | CSV/JSON ingestion, async jobs, validation, dry-run | SF, HS, Z, D365 | SHOULD | |
| **GraphQL Subscriptions / Realtime** | Live updates | WebSocket / SSE | T20, HS, MN | NICE | Build on Socket.io. |

---

### 1.13 Identity, Security, Governance

> Who can do what to which records.

| Module | Purpose | Sub-features | Found in | Tier | Notes |
|---|---|---|---|---|---|
| **Users** | Authenticated humans | Email, password (hashed), name, role, profile pic, status, last-login, locale, TZ | All | **MUST** | |
| **Teams** | Organizational groups | Hierarchical or flat; members; team-level record visibility | All | **MUST** | |
| **Roles** | Hierarchical permission level | Role tree (CEO > VP > Mgr > Rep); records owned by reports visible to mgrs | SF (Role Hierarchy), D365, Z, ESPO | **MUST** | |
| **Profiles / Permission Sets** | Named permission bundles | Module-level + record-level + field-level perms; assigned to user | SF (Profiles + Perm Sets), Z (Profiles), D365 (Security Roles), ESPO (Roles) | **MUST** | |
| **Field-Level Security** | Hide/restrict fields by role | Per-profile per-field read/edit/hidden | SF, Z, D365, ESPO | SHOULD | |
| **Record Ownership** | Who owns each record | Owner field on every record; auto-assigned on create | All | **MUST** | |
| **Sharing Rules** | Programmatic record sharing | Rule: "share records matching X with team Y" | SF, D365, ESPO (Security Suite) | NICE | |
| **Hierarchical Sharing** | Up the role tree by default | Mgr sees subordinate records | SF, D365, Z | SHOULD | |
| **Territories** | Region-based sharing | (See SFA.) | | NICE | |
| **2FA / MFA** | Second factor | TOTP authenticator app, SMS, WebAuthn | All | **MUST** | |
| **SSO (SAML/OIDC)** | Enterprise login | SAML 2.0, OIDC providers, JIT user provisioning | All | SHOULD | |
| **API Keys** | Static API auth | (See Integrations.) | | **MUST** | |
| **Audit Log** | All record changes | Per-record per-field old → new + user + timestamp; queryable | SF (Field History), D365 (Auditing), Z, ESPO (Stream) | **MUST** | |
| **Field History Tracking** | Change log per field | Subset of audit; queryable as a field's timeline | SF, D365 | SHOULD | |
| **GDPR Tools** | Data subject rights | Consent capture, data export, right-to-erasure (anonymize), data-processing audit | SF, HS, Z, D365 | SHOULD | |
| **HIPAA / Compliance** | Healthcare/regulated data | Encryption at rest, signed BAAs, audit retention | SF (Health Cloud), Z, D365 | SKIP-v1 | Industry-specific. |
| **Data Residency** | Per-tenant region | Data stays in country/region | SF, D365, Z | SKIP-v1 | Multi-region infra. |
| **Encryption at Rest / in Transit** | Database + transport encryption | DB-level encryption, TLS, optional CMK | All | **MUST** | TLS + Postgres TDE. |
| **Backup / Restore** | Tenant-level backups | Daily backups, point-in-time restore, export | All | **MUST** | |
| **Sandboxes / Environments** | Dev/staging copies | Clone of production for testing | SF, D365, Z (Sandbox) | NICE | |
| **IP Restrictions** | Allow-list IPs | Per-org IP allowlist for login/API | SF, Z, D365 | NICE | |

**Distinctive primitives:**
- **Hierarchical Sharing** — manager sees subordinate records by default. Saves a ton of explicit sharing rules.
- **Field-Level Security** — different from record-level. Per-profile field visibility.

---

### 1.14 Multi-tenancy & Organization

> The shape of "many customers in one CRM instance".

| Module | Purpose | Sub-features | Found in | Tier | Notes |
|---|---|---|---|---|---|
| **Organizations / Workspaces** | Top-level tenant boundary | Org name, plan, users, settings, branding, subdomain | T20 (Workspace), SF (Org), HS (Account), MN | **MUST** (if SaaS) | Row-level multi-tenancy via `org_id` column on every row. |
| **Per-org branding** | Custom logo/colors per tenant | Brand kit applied to dashboards + portal + emails | HS, Z, MN | SHOULD | |
| **Per-org subdomain** | `<tenant>.crm.com` | DNS wildcard + cert + tenant routing | SF, HS, Z | SHOULD | Important for white-label. |
| **Per-org plan / limits** | Plan tier + quota enforcement | Plan field, limit checks (records / users / API / storage), graceful degradation | All | **MUST** (if SaaS) | |
| **Org switching** | User belongs to multiple orgs | Org selector in UI, switch context | T20, MN, HS (Partner accounts) | SHOULD | |
| **Sub-organizations / Business Units** | Org hierarchy | Parent-child orgs, share users, scoped data | SF (Business Units), D365 (BU), Z | NICE | Enterprise. |
| **Org Admin Console** | Tenant settings UI | Branding, plan, users, integrations, billing | All SaaS | **MUST** | |
| **Org-level Analytics** | Cross-tenant analytics (for vendor) | Usage metrics, MRR, churn (for our SaaS dashboard, not the customers') | All SaaS | NICE | |

---

### 1.15 Public Website / Portal Surfaces

> The Vue 3 public-facing app. **This is the second frontend (after the dashboard).**

| Module | Purpose | Sub-features | Found in | Tier | Notes |
|---|---|---|---|---|---|
| **Marketing Website** | Homepage / pricing / features / blog / contact | Static-ish pages, SEO meta, sitemap, robots, image opt, Arabic+English, RTL | All have pages on hubspot.com / salesforce.com / etc. | **MUST** | Use Vue 3 + Vite (or Nuxt 3 if we need SSR for SEO — recommended). |
| **Lead Capture Forms** | Embeddable forms | (See Marketing.) | All | **MUST** | Form on website + form-embed JS for 3rd-party sites. |
| **Contact Form** | Generic "talk to us" | Form → create lead/case | All | **MUST** | |
| **Live Chat Widget** | Embed chat on any site | (See Communications.) | | SHOULD | |
| **Customer Portal** | Logged-in customer self-service | View tickets, invoices, profile, KB, request | SF (Experience Cloud), HS (Customer Portal), D365 (Power Pages), Z (Portal), OD, ESPO (paid) | SHOULD | Same Vue codebase, gated routes. |
| **Partner Portal** | Channel-partner self-service | Deal registration, leads, training, comp | SF (PRM), HS, Z (Partner Portal) | SKIP-v1 | |
| **Public Knowledge Base** | KB articles for customers | (See Service.) | | SHOULD | |
| **Booking Widget (Calendly-equivalent)** | Embeddable scheduler | (See Productivity.) | | SHOULD | |
| **Survey/Form Submission Page** | Public survey link | (See Marketing.) | | SHOULD | |
| **Pricing Page (with plan upgrade)** | Self-serve sign-up + Stripe | Plan selector, Stripe checkout, account creation | HS, Z, MN | SHOULD | If we go SaaS. |

---

### 1.16 Industry-Specific (Skip in v1 unless trivially in scope)

| Module | Purpose | Found in | Tier | Notes |
|---|---|---|---|---|
| **Health Cloud** | Patient/Care Plan/Provider Network | SF, Z, D365 | SKIP-v1 | Heavy compliance. |
| **Financial Services Cloud** | Households / Financial Accounts / Goals | SF, Z, D365 | SKIP-v1 | |
| **Real Estate** | Listings / Tours / Offers | ESPO (Real Estate ext), Z (CRM for Real Estate) | SKIP-v1 | |
| **Education** | Students / Programs / Enrollment | SF (Education Cloud), Z | SKIP-v1 | |
| **Nonprofit (Constituent/Donor)** | Contributions / Memberships / Events | SF (Nonprofit Cloud), CIVI, Z | SKIP-v1 | |
| **Manufacturing** | Sales Agreements / Forecast Sets | SF (Manufacturing Cloud), D365 | SKIP-v1 | |

---

## 2. Distinctive Data Primitives (cross-vendor)

These are the data-model patterns that distinguish a real modern CRM from "just a CRUD app". Adopting these from day one prevents painful migrations later.

| Primitive | Origin | What it is | Should we adopt? |
|---|---|---|---|
| **Universal Partner** | Odoo `res.partner` | One table for both People AND Companies, with `is_company` boolean and `parent_id` for org hierarchies | **YES** — unified model, simpler |
| **Unified Person (no Lead/Contact split)** | Twenty | One Person entity; "lead" is just lifecycle stage, no Convert workflow | **YES** — adopt Twenty's model |
| **Polymorphic Activity** | EspoCRM, Odoo (mail.message), Salesforce (Task/Event) | One `activity` table polymorphic to any record (entityType+entityId) | **YES** |
| **mail.thread mixin / Chatter** | Odoo | Every record has followers + comments + email gateway | **YES** |
| **Properties as Metadata** | HubSpot | Custom fields stored as JSON metadata, schema generated at runtime | **YES** |
| **Active Lists (saved-query lists)** | HubSpot | Lists are saved queries persisted as JSON, evaluated live | **YES** |
| **Per-object Pipelines** | HubSpot | Each object can have multiple pipelines with custom stages | **YES** |
| **CampaignMember junction** | Salesforce | Person ↔ Campaign with status (Sent/Opened/Clicked/Responded/Converted) | **YES** |
| **Forecast Categories** | Salesforce | Pipeline / Best Case / Commit / Closed — distinct from probability | **YES** |
| **Required Fields per Stage** | Pipedrive | Gating field-completion per stage transition | **YES** |
| **Won/Lost Reasons** | Pipedrive, Salesforce | Picklist required on terminal-stage transition | **YES** |
| **Rotting Deals** | Pipedrive | Last-activity-on every record + threshold highlights | **YES** |
| **Connection Roles / Typed Relationships** | Dynamics 365, CiviCRM | Person ↔ Person / Person ↔ Company with role+date | **YES** (Phase 3) |
| **Polymorphic Lookup (Customer = Account ∪ Contact)** | Dynamics 365 | A field that can point to either entity type | YES (selective) |
| **Mirror Columns / Connect Boards** | Monday | Live cross-board cell sync via formula/lookup | NO (use formula+rollup) |
| **Households (FSC)** | Salesforce | Family unit with members and roles | NO (industry) |
| **Mail Aliases** | Odoo | `<topic>@yourdomain.com` → record creation | **YES** |
| **Form-as-Saved-Query (Forms = Source of Truth)** | EspoCRM | Layouts / Forms / Lists all stored as JSON | **YES** |
| **Stages with terminal-state types** | All | Open / Won / Lost are categorical, not ordinal | **YES** |
| **Ownership + Hierarchical Visibility** | Salesforce, Dynamics | Manager sees subordinate records by default | **YES** |
| **Field History (per-field change log)** | Salesforce | Per-field append-only history table | **YES** |
| **Currency on every monetary field** | Salesforce, Dynamics | Multi-currency stored as `(amount, currency)` | **YES** (Phase 2) |
| **Document Tracking** | HubSpot, Pipedrive | Send-link → recipient opens → events on timeline | YES (Phase 3) |

---

## 3. Cross-Cutting Architectural Patterns to Adopt

### 3.1 Metadata-Driven Entities (the EspoCRM pattern)

Instead of hardcoding entities in code, define them in JSON/TS files:

```
metadata/
├── entityDefs/
│   ├── Person.json        # fields, relationships, validation, indexing
│   ├── Company.json
│   ├── Deal.json
│   └── ...
├── clientDefs/            # frontend-specific (icons, colors, kanban config)
├── layouts/
│   ├── Person/
│   │   ├── list.json
│   │   ├── detail.json
│   │   └── edit.json
└── i18n/                  # per-locale labels for entities/fields
```

The system reads these at boot to:
- Generate Prisma schema (or use a typed-column generic table for custom modules).
- Generate REST endpoints (with auto-validation, filtering, sorting, pagination).
- Generate Vue dynamic forms (using `<DynamicForm :layout="layouts.Person.edit" />`).
- Wire up validation, FLS, search.

**This is the single most important pattern for the entire build.** Skipping it = engineers needed for every customer-driven schema change. Embracing it = admin UI for everything.

### 3.2 Universal Partner / Unified Person Model

```prisma
model Person {
  id            String   @id
  workspaceId   String
  isCompany     Boolean  @default(false)  // distinguishes Person vs Company
  parentId      String?                   // for sub-orgs / employee→employer
  parent        Person?  @relation("Hierarchy", fields: [parentId], references: [id])
  children      Person[] @relation("Hierarchy")

  firstName     String?
  lastName      String?
  companyName   String?  // when isCompany=true
  email         String?
  phone         String?
  lifecycleStage LifecycleStage @default(LEAD) // LEAD | MQL | SQL | OPP | CUSTOMER

  ownerId       String?
  customFields  Json     @default("{}")
  // ...
}
```

Trade-offs vs separate Person+Company tables:
- **Pro**: simpler queries; merge logic trivial; no Convert-Lead workflow.
- **Con**: nullable fields; some duplication of company-only fields.
- **Mitigation**: views / TS types narrow per `isCompany`.

We adopt this. (Twenty proved it.)

### 3.3 Polymorphic Activity Log

```prisma
model Activity {
  id             String   @id
  workspaceId    String
  parentEntity   String   // 'Person' | 'Company' | 'Deal' | 'Ticket' | 'CustomEntity:Project'
  parentId       String
  type           ActivityType  // CALL | MEETING | EMAIL | TASK | NOTE | SYSTEM_EVENT
  subject        String
  body           String?
  ownerId        String?
  dueAt          DateTime?
  completedAt    DateTime?
  metadata       Json     @default("{}")  // type-specific fields (call duration, email message-id, ...)

  @@index([workspaceId, parentEntity, parentId])
}
```

One table → entire activity timeline + chatter feed + email log + system events.

### 3.4 mail.thread Mixin (Chatter)

Every first-class record gets:
- `followers` (which users get notified on changes)
- `comments` (Activity subtype NOTE)
- `email-alias` (`{recordType}-{id}@yourdomain.com` → reply-to-thread)

We implement this as a TypeScript decorator/mixin on NestJS service classes that adds the relations + email gateway hooks.

### 3.5 Workflow Engine (Trigger-Condition-Action)

Built on **BullMQ** queues + a small rule evaluator:

```ts
type Workflow = {
  trigger: { event: 'CREATED' | 'UPDATED' | 'DELETED' | 'TIME' | 'WEBHOOK', entity?: string, fieldChanged?: string }
  conditions: Condition[]   // tree of {field, op, value} with AND/OR
  actions: Action[]         // [{type: 'UPDATE_FIELD' | 'SEND_EMAIL' | 'CREATE_TASK' | 'CALL_WEBHOOK' | 'NOTIFY_USER' | 'ASSIGN', params: ...}]
}
```

- Triggers are domain events emitted by NestJS event bus.
- Time-based triggers are scheduled jobs that scan for matching records.
- Conditions evaluated by a small expression evaluator (jsonata-like).
- Actions enqueued to BullMQ; idempotent + retried.

Recipe UI sits atop this — it just generates Workflow JSON. Visual flow builder later (Phase 3).

### 3.6 Multi-Tenancy via `workspaceId` Column

Every table has `workspaceId`; every query is scoped via Prisma middleware that auto-injects `where.workspaceId = ctx.workspaceId`. Simple, scales to millions of records, easy to migrate to schema-per-tenant later if needed.

### 3.7 Audit / History on Everything

Prisma middleware on save → write `(entity, id, field, old, new, userId, ts)` to `audit_log`. Indexed by (entity, id, ts). Powers "Field History" and full audit trail.

### 3.8 RAG-Ready AI

- **pgvector** in Postgres for embeddings.
- Embed records (Person/Deal/Ticket/Note) on save.
- Embed KB articles + Documents.
- AI Copilot: query embeddings + structured fields → context for LLM call.
- Tool-calling: Copilot can take actions ("create deal for John Doe") via OpenAI function-calling.

---

## 4. Anti-Patterns to Avoid

These are mistakes we've seen in the open-source CRMs and which we should explicitly NOT make.

| # | Anti-Pattern | Where seen | Why it hurts | Our defense |
|---|---|---|---|---|
| 1 | **Lead/Contact split** | Salesforce, SugarCRM/SuiteCRM | Forces "Convert Lead" workflow that loses history | **Unified Person with `lifecycleStage` enum** |
| 2 | **Code-only customization** | Odoo (Owl + Python), SuiteCRM (PHP) | Engineers needed for every field add | **Metadata-driven** (EspoCRM pattern) |
| 3 | **GraphQL for everything from day 1** | Twenty | Slows iteration; harder to consume from automation tools | **REST first; GraphQL as Phase 3** |
| 4 | **Late i18n / RTL** | Mautic, SuiteCRM | Painful retrofitting; broken layouts in Arabic | **Arabic-first + RTL from day 1** |
| 5 | **Per-entity activity table** | older CRMs | Schema bloat; can't unify timeline | **Polymorphic Activity** |
| 6 | **Custom auth from scratch** | Many OSS CRMs | Subtle security bugs; SSO retrofit hard | **Use Auth.js / better-auth / Keycloak patterns** |
| 7 | **Custom workflow engine from scratch** | EspoCRM, SuiteCRM | Massive scope; race conditions; brittle | **Build atop BullMQ + a small rule evaluator** |
| 8 | **Building our own SMTP / deliverability** | Mautic | Deliverability is a full-time job | **Use SES / SendGrid / Mailgun via API** |
| 9 | **Tight CMS coupling** | CiviCRM | Forces ops team to run a CMS too | **Standalone CRM** |
| 10 | **Stages defined globally not per-pipeline** | older CRMs | Forces "record types" gymnastics | **Per-pipeline stages from day 1** |
| 11 | **Static lists snapshot** | older CRMs | Stale member lists | **Active lists = live saved queries** |
| 12 | **Locking everything behind paid tier on day 1** | EspoCRM (BPM/Workflows paid) | Kills adoption | **Open core; monetize hosting/support/integrations** |
| 13 | **One profile = all permissions** | Older CRMs | Combinatorial explosion | **Profiles + Permission Sets** (Salesforce-style additive) |
| 14 | **Dropping audit log to "for big customers"** | Various | Compliance nightmare | **Audit on every record from day 1** |
| 15 | **Storing everything in EAV** | Some old CRMs | Slow queries; broken indexing | **Typed columns for built-in fields; JSONB for custom; gen typed columns when admin requests indexed custom field** |
| 16 | **Deep ERP integration in the CRM itself** | Odoo | Massive scope creep | **Integration boundary: CRM owns sales/service/marketing data; ERP owns AR/AP/inventory** |
| 17 | **One huge Vue app for both dashboard + portal** | Many | Bundle bloat; auth confusion | **Two Vue apps: dashboard (admin) + portal (customer); shared component library** |

---

## 5. Recommended Phase Map (MVP → Beyond)

### Phase 0 — Foundation (Sprint 0, ~1 week)

- Monorepo scaffold (`pnpm-workspace.yaml`, Makefile, docker-compose, prettier/eslint).
- `apps/api` — NestJS + Prisma + Postgres + Redis + BullMQ + MinIO + Socket.io skeleton.
- `apps/dashboard` — Vue 3 + Vite + PrimeVue 4 + Pinia + Vue Router + Tailwind + i18n (AR/EN with RTL toggle) skeleton.
- `apps/website` — Vue 3 + Vite (or Nuxt 3) skeleton with home/pricing/contact placeholders.
- `packages/shared-types` — TS types shared across apps.
- `packages/metadata` — entityDefs + layouts + i18n source of truth.
- CI: lint + typecheck + tests.
- Docker Compose: postgres + redis + minio + mailhog.

### Phase 1 — MVP (Real CRM, ~6-8 weeks)

**Foundation modules:**
- **Auth + Users** — register/login (email+password), JWT (access+refresh), password reset, profile, avatar.
- **Workspaces (multi-tenancy)** — create workspace, invite users, workspace settings, row-level isolation via Prisma middleware.
- **Teams + Roles + Profiles** — basic RBAC.
- **Audit Log** — middleware + history.
- **Custom Fields engine** — metadata-driven; admin UI for adding text/number/picklist/date/boolean/lookup fields without migrations.

**Core entities:**
- **People** (unified Lead/Contact, with lifecycle stage).
- **Companies** (with parent-child, auto-create from email domain).
- **Deals** (with multi-pipeline, custom stages per pipeline, required fields per stage, won/lost reasons, rotting indicator).
- **Activities** (polymorphic: Tasks, Calls, Meetings, Notes — one entity, subtypes).
- **Email** (1-way receive via per-user OAuth Gmail / MS Graph; send via SMTP for v1; thread auto-attach to records).
- **Calendar** (week/month/day views of activities).

**Lists & Filtering:**
- **Active Lists** (saved-query lists, live).
- **Tags**.
- **Filters everywhere** (any field, any operator).

**Reporting:**
- **Standard reports** (8-10 pre-built: Pipeline, Activities by Rep, Conversion, Revenue Forecast, etc.).
- **Custom dashboards** (4-5 widget types: number / chart / list / kanban / gauge).

**Forms & Lead Capture:**
- **Form Builder** (admin UI).
- **Embeddable form** (iframe + JS snippet).
- **Web-to-Lead** (form → Person creation with UTM tracking).

**Workflow:**
- **Workflow Rules** (TCA: trigger / condition / action).
- **Time-based triggers** (cron via BullMQ repeat).
- **Webhooks (out)**.
- **Validation Rules**.
- **Assignment Rules** (round-robin or by-criteria).

**Public Website:**
- Homepage + Pricing + Features + Contact + Blog (CMS-light or markdown-driven for v1).
- Embedded contact form.
- Arabic + English with RTL.

**Customization:**
- Custom Fields UI.
- Layout Manager (drag-drop sections + fields per detail/list/edit layouts).
- Picklist Manager.

**Integrations (minimal):**
- REST API (auto-generated from entity metadata).
- API Keys.
- Webhooks out.
- Gmail OAuth + MS Graph OAuth.
- Stripe (for billing our own SaaS — not customer-facing yet).

**Testing:**
- Unit tests on services.
- E2E tests on critical paths (signup → invite → create person → create deal → move stage → win).
- Smoke tests on API + dashboard + website on every commit.

### Phase 2 — Core CRM (~8-12 weeks)

**Sales:**
- **Quotes + Products + Pricebooks** (Quote → PDF → eSign).
- **Forecasting** (probability-weighted pipeline + forecast categories).
- **Quotas + Goals**.
- **Sequences/Cadences** (multi-step outreach).
- **Email Templates + Email Tracking** (open/click).
- **Lead Routing**.

**Marketing:**
- **Campaigns + CampaignMember** (with attribution).
- **Email Marketing** (mass send + drip nurture; integrate SES/SendGrid).
- **Forms (advanced)** — multi-page, conditional.
- **Landing Pages** (basic builder).

**Service:**
- **Tickets / Cases** (with queues + SLAs).
- **Knowledge Base** (admin authoring + public viewing).
- **Customer Portal** (logged-in: tickets, profile, KB).
- **Email-to-Case** + **Web-to-Case**.

**Customization:**
- **Custom Modules** (admin can define new entities).
- **Formula Fields** + **Rollup Summary Fields**.
- **Page Layouts per Profile**.

**AI (Phase 2 — start light):**
- **AI Email Composer** (LLM with context).
- **AI Reply Suggestions**.
- **Copilot Sidebar** (chat with your CRM — basic RAG over Person/Company/Deal/Activity).

**Communications:**
- **2-way Email Sync**.
- **Calendar Sync**.
- **Meeting Scheduler** (Calendly-equivalent, embeddable).
- **Live Chat** (website widget + agent console).

**Analytics:**
- **Custom Report Builder**.
- **Forecast Reports**.
- **Conversion Funnel**.
- **Goal/Quota Tracking**.

**Integrations:**
- **Pre-built connectors**: Slack, Zoom, Stripe, QuickBooks, Mailchimp, Zapier app, Make app.
- **Bulk Import API** (CSV).

### Phase 3 — Differentiators (~12+ weeks)

**AI:**
- **Conversation Intelligence** (call recording + transcription + insights).
- **Predictive Lead Scoring + Deal Scoring**.
- **AI Forecasting**.
- **AI Agents** (Sales Qualification Agent, Customer Service Agent, Content Agent — autonomous loops).
- **Chat-with-your-CRM** with full RAG + tool-calling.

**Marketing:**
- **Customer Journey Builder** (visual flow).
- **Behavioral Events / Custom Events**.
- **A/B Testing**.
- **SMS / WhatsApp**.
- **ABM (target accounts, account scoring)**.

**Sales:**
- **Sales Workspace / Accelerator** (prioritized work-list).
- **Sales Inbox** (unified email + tasks + replies).
- **Approvals**.
- **Subscriptions** (recurring revenue).
- **Renewals**.

**Service:**
- **Conversations Inbox (omni-channel)**.
- **Voice / CTI**.
- **AI Bots** for auto-responding.
- **Skills-based Routing**.

**Customization:**
- **Visual Flow Builder** (BPMN-lite).
- **Server-side Custom Functions**.
- **Canvas / Custom Record UI**.
- **Schema Builder (visual ER)**.

**Integrations:**
- **GraphQL API**.
- **MCP Server**.
- **App Marketplace UI**.
- **SDKs** (JS, mobile).

### Phase 4 — Enterprise / Industry (later)

- Field Service.
- CPQ.
- Industry Clouds (Health, FSC, Real Estate, etc.).
- Sandboxes / Environments.
- Data Residency.
- Encryption with CMK.
- Sub-organizations / Business Units.

---

## 6. Recommended Tech Architecture

### Backend — `apps/api` (NestJS modular monolith)

```
apps/api/
├── src/
│   ├── core/              # auth, workspaces, users, teams, roles, audit, custom-fields, metadata
│   ├── crm/               # people, companies, deals, pipelines, activities, lists, tags
│   ├── marketing/         # campaigns, lists, forms, email-marketing
│   ├── service/           # tickets, queues, sla, kb, portal
│   ├── commerce/          # products, pricebooks, quotes, orders, invoices
│   ├── automation/        # workflows, triggers, conditions, actions, scheduler
│   ├── ai/                # copilot, embeddings, agents
│   ├── integrations/      # gmail, ms-graph, stripe, slack, webhooks
│   ├── reports/           # report builder, dashboards, exports
│   ├── notifications/     # in-app + email + push
│   └── shared/            # common utilities, types
├── prisma/
│   └── schema.prisma      # generated from metadata + first-class entities
└── test/
```

**Stack:**
- **Framework**: NestJS 10.
- **DB**: PostgreSQL 16 + **Prisma 6** ORM.
- **Cache + Queue**: Redis + **BullMQ**.
- **Files**: MinIO (dev) → S3 (prod).
- **Email**: dev MailHog → prod SES/SendGrid/Mailgun.
- **Search**: PostgreSQL FTS (Phase 1) → Meilisearch/Typesense (Phase 3).
- **Realtime**: Socket.io (notifications, activity feed, chat, dashboard updates).
- **AI**: OpenAI / Anthropic via thin AIProvider adapter; pgvector for embeddings.
- **Monitoring**: Pino logs + OpenTelemetry traces.
- **Testing**: Jest + Supertest + Playwright (e2e).

### Frontend Dashboard — `apps/dashboard` (Vue 3 + PrimeVue)

```
apps/dashboard/
├── src/
│   ├── views/             # one folder per module (people, companies, deals, ...)
│   ├── components/        # shared (DynamicForm, ListView, KanbanView, RecordHeader, ...)
│   ├── composables/       # useApi, useAuth, usePermissions, useMetadata
│   ├── layouts/           # MainLayout (sidebar+topbar), AuthLayout
│   ├── pinia/             # stores per domain
│   ├── router/            # routes (lazy-loaded modules)
│   ├── i18n/              # ar.json, en.json
│   └── styles/            # tailwind config + global styles
└── vite.config.ts
```

**Stack:**
- **Framework**: Vue 3 (Composition API) + Vite 5.
- **UI**: PrimeVue 4 (matches azadoc/gym pattern).
- **State**: Pinia.
- **Router**: Vue Router 4.
- **Forms**: Vee-validate + Zod.
- **CSS**: Tailwind CSS + PrimeVue tokens.
- **i18n**: vue-i18n (Arabic-first; RTL via `dir="rtl"`).
- **Icons**: PrimeIcons + custom SVGs.
- **Charts**: Chart.js (PrimeVue wrapper).
- **Drag-drop**: vue-draggable-plus.
- **Realtime**: socket.io-client.
- **Testing**: Vitest + @vue/test-utils + Playwright.

### Frontend Public Website — `apps/website` (Vue 3 + Vite OR Nuxt 3)

**Recommendation: Nuxt 3** for SSR + SEO + file-based routing + auto-import + Vue ecosystem alignment. If we choose plain Vue+Vite, we add a static-generation step (vite-ssg) for SEO.

```
apps/website/
├── pages/                 # /, /pricing, /features, /contact, /blog, /docs, /portal
├── components/
├── content/               # @nuxt/content for blog/docs (markdown)
├── i18n/
└── nuxt.config.ts
```

**Stack:**
- **Framework**: Nuxt 3.
- **CMS**: @nuxt/content (markdown-driven blog/docs) — saves us building a full CMS.
- **SEO**: nuxt-seo, structured data, sitemap.
- **Forms**: same DynamicForm component as dashboard, with public-form mode.
- **Live chat widget**: thin JS bundle that loads chat into any site.

### Shared Packages

- **`packages/shared-types`** — generated from Prisma + manual union types.
- **`packages/metadata`** — entityDefs, layouts, i18n source of truth (read by both API and dashboard).
- **`packages/ui-kit`** (later) — shared Vue components between dashboard and website.

### Infrastructure

- **Docker Compose** for local dev: postgres + redis + minio + mailhog + (later) opensearch/meilisearch.
- **Makefile** wraps `pnpm` commands (matching azadoc/gym pattern).
- **CI/CD**: GitHub Actions — lint + typecheck + test on PR; build + deploy on merge.
- **Deployment**: containerized (Docker images); single-tenant on-prem deploy or multi-tenant SaaS.

---

## 7. Implementation Approach (per module)

For each module:

1. **Brainstorm + spec** (we are here).
2. **Plan** (writing-plans skill).
3. **Backend (TDD)**:
   a. Add entity to metadata + Prisma schema → migration.
   b. Failing test for service method → implement.
   c. Failing test for controller (HTTP) → implement.
   d. Failing test for permissions/RBAC → implement.
   e. Failing test for workflow triggers → implement.
4. **Frontend (TDD)**:
   a. Failing component test for DynamicForm rendering this entity → implement.
   b. List view + filters → test → implement.
   c. Detail view + tabs → test → implement.
   d. Wire to API via composable → test (mocked + integration).
5. **Wire & integrate**:
   a. End-to-end Playwright test: create → list → edit → delete.
   b. Wire on dashboard nav, permissions check.
   c. Wire on public website if relevant (forms, portal).
6. **Polish**:
   a. Empty states + loading states + error boundaries.
   b. Localized labels (AR/EN).
   c. Accessibility check (keyboard, ARIA).
7. **Document**:
   a. Module entry in docs/specs/.
   b. API doc auto-generated from OpenAPI.

---

## 8. Sources

- `01-salesforce.md` — 857 lines covering all 14 Salesforce Clouds and 30 differentiators.
- `02-hubspot.md` — 959 lines covering all 6 Hubs + Breeze AI + decomposition recommendation.
- `03-zoho.md` — 612 lines covering Zoho CRM + Zoho One + Zia + 15 differentiators.
- `04-dynamics-pipedrive-monday.md` — 894 lines covering Dynamics + Pipedrive + Monday with cross-vendor synthesis and must/nice/skip matrix.
- `05-opensource-crms.md` — 934 lines covering Odoo, SuiteCRM, EspoCRM, Vtiger, Twenty, CiviCRM, Mautic with concrete schema references and architectural patterns.

**Direct architectural references for our build:**
- **Twenty** (https://github.com/twentyhq/twenty) — same stack we're building.
- **EspoCRM** (https://github.com/EspoCRM/espocrm) — gold-standard metadata-driven engine.
- **Odoo** (https://github.com/odoo/odoo) — universal partner + chatter pattern.
- **Mautic** (https://github.com/mautic/mautic) — visual campaign flow + points/stages/segments.

---

*End of MODULES.md. The brainstorming session begins next: scope, plan tier, integration boundaries, AI strategy, MVP cut.*
