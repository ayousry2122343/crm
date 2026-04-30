# Zoho Ecosystem — Comprehensive Module & Feature Catalog (2026)

> Reference document for our self-built CRM (Node.js + Vue). Captures the full surface area of Zoho CRM, Zoho CRM Plus bundle, and the Zoho One operating-system-for-business suite (50+ apps).
> Sources: zoho.com/crm, zoho.com/one, help.zoho.com (Q1 2026 update), Zenatta consulting reviews, plus verified current naming via web search April 2026.

---

## 0. Strategic Positioning

| Tier | What it is | Why it matters to us |
|------|------------|----------------------|
| **Zoho CRM** | Standalone CRM (5 editions: Free, Standard, Professional, Enterprise, Ultimate) | Core feature parity benchmark — our MUST-have set |
| **Zoho CRM Plus** | Bundle: CRM + Desk + Campaigns + Social + Survey + SalesIQ + Projects + Analytics + Forms + Sign + PageSense (one license, one UI) | What an integrated "customer-360" CRM looks like — our v2 ambition |
| **Zoho One** | 50+ apps under one license: CRM, Books, People, Recruit, Creator, Mail, WorkDrive, etc. | Full SaaS suite — only relevant for vertical/integration ideas, NOT MVP |

**2026 directional shift**: Zoho is moving from "AI that helps" to "AI that acts" (Era of Agency / Zia Agents) — proprietary Zia LLM at 1.3B / 2.6B / 7B parameters. Our CRM should design data model and APIs **AI-agent-friendly from day one** (clear entity boundaries, action verbs, audit trails).

---

## 1. Zoho CRM — Core Modules (Standard Records)

These are the out-of-the-box record types every Zoho CRM org gets. Each is essentially a table with system + custom fields, list views, layouts, related-list relationships, automation hooks.

### 1.1 Sales Pipeline Modules

| Module | Purpose | Key Fields | Relationships |
|--------|---------|-----------|---------------|
| **Leads** | Unqualified prospects (top-of-funnel) | Name, Company, Source, Status, Owner, Industry, Rating, Annual Revenue, No. of Employees | Convertible → Contact + Account + Deal |
| **Contacts** | Qualified people | First/Last Name, Email, Phone, Title, Department, Reports-To, Account (lookup), Lead Source | Has-many Deals, Activities, Cases |
| **Accounts** | Companies / organizations | Account Name, Industry, Annual Revenue, Website, Billing/Shipping Address, Parent Account (hierarchy) | Has-many Contacts, Deals, Cases, Invoices |
| **Deals** | Sales opportunities | Deal Name, Account, Stage, Amount, Closing Date, Probability, Expected Revenue, Pipeline (Multi-Pipeline Pro+), Lost Reason | Has-many Products (line items), Activities, Stage History |
| **Forecasts** | Pipeline projection by user/role/territory + period | Quota, Committed, Best Case, Closed, Pipeline | Aggregates Deals |
| **Tasks** | To-do items | Subject, Due Date, Status, Priority, Owner, Reminder, Recurrence | Belongs-to any record (polymorphic) |
| **Meetings (Events)** | Scheduled events | Subject, From, To, Location, Participants, Repeat, Online Meeting (Zoho Meeting/Zoom/Teams) | Belongs-to record |
| **Calls** | Phone activity log | Subject, Type (inbound/outbound/missed), Duration, Outcome, Recording URL | Belongs-to record |
| **Activities** | Unified view (Tasks + Meetings + Calls + Emails) | — | Pseudo-module (UI tab over the three above) |

### 1.2 Customer-Service Modules (in CRM, expanded in Desk)

| Module | Purpose |
|--------|---------|
| **Cases** | Support tickets attached to a Contact/Account |
| **Solutions** | Knowledge-base articles linkable from Cases |

### 1.3 Inventory / CPQ Modules (Pro+ for full set)

| Module | Purpose |
|--------|---------|
| **Products** | Catalog: SKU, name, unit price, category, taxes, support start/end |
| **Price Books** | Customer-segment pricing — same product different price per book |
| **Vendors** | Suppliers |
| **Quotes** | Proposals to prospects with line items, discounts, taxes, terms |
| **Sales Orders** | Confirmed customer orders (post-quote acceptance) |
| **Purchase Orders** | Orders to vendors |
| **Invoices** | Customer invoices (basic — full AR is in Zoho Books) |

### 1.4 Marketing Modules (in CRM, expanded in Campaigns/Marketing Automation)

| Module | Purpose |
|--------|---------|
| **Campaigns** | Marketing campaign records — link to Leads/Contacts as members; track ROI |
| **Email** | Email tab — sends/receives via SalesInbox, IMAP, or relay |
| **Social** | Twitter/Facebook/Instagram/LinkedIn engagement attached to records |
| **Visits** | Real-time website-visit feed (via SalesIQ tracker) |

### 1.5 Document & Note Modules

| Module | Purpose |
|--------|---------|
| **Documents** | File library tab; can attach to records or store as folders |
| **Notes** | Rich-text / quick comments on records |
| **Attachments** | File uploads on records |

### 1.6 Custom Modules

- Any number of additional record types (e.g., Properties, Patients, Vehicles) with full layout/automation/permission support.
- **Multi-Layout**: same module can serve different teams with different fields visible.
- **Subforms**: nested grids inside a record (e.g., line items, dependents).

### 1.7 Portal Modules (Enterprise+)

| Portal | Audience |
|--------|----------|
| **Customer Portal** | Customers see their own Cases, Invoices, Solutions |
| **Partner / Reseller Portal** | Partners see deals registered, products, training |
| **Vendor Portal** | Vendors see their POs, performance |
| **Multi-Org Portals** | Multiple branded portals from one CRM |

---

## 2. Zoho CRM — Sales Force Automation (SFA)

The automation engine. Most are configured by admins; some support per-user customization.

### 2.1 Workflow Rules
- **Trigger**: Create / Edit / Field-Update / Delete / Note / Email-received / Inbound-call / Score-change / Time-based.
- **Conditions**: Standard or custom-field criteria (multi-criteria pattern groups).
- **Actions**: Email alerts, Tasks, Field updates, Webhooks, Custom-functions (Deluge), Tags, Convert/Approve.
- **Limits per edition**: 5/10/30/50 rules (Std/Pro/Ent/Ult).

### 2.2 Macros
- One-click batch action: send email + update field + create task in a single click; user-defined.

### 2.3 Approval Processes
- Multi-step approvers (sequential or parallel), criteria-based routing, delegate-on-leave, mobile approve/reject, audit trail.

### 2.4 **Blueprint** (Pro+) — Process Designer
- Visual node-and-transition editor enforcing business processes inside a module.
- States = stages; Transitions = guarded moves between states with mandatory fields, before/during/after actions, SLAs.
- Use case: deal stages with required fields (e.g., must capture Lost Reason before moving to Closed-Lost).
- **Blueprint Canvas**: drag-drop UI defining the flow.

### 2.5 **CommandCenter** (Enterprise+) — Cross-Module Customer Journey
- Orchestrates journeys spanning **multiple modules** (Lead → Deal → Project → Invoice → Renewal).
- Bird's-eye view of journey health, bottleneck detection, churn-risk hotspots.
- Wait, branching, decision, parallel-path nodes; manual & automatic transitions; deadlines with auto-escalation.
- Connectors to third-party systems (WebJobs, custom APIs).
- This is the differentiator vs. Blueprint (which is single-module).

### 2.6 **Cadences (Sales Sequences)**
- Multi-touch outreach plans: Day-1 email → Day-3 call → Day-5 LinkedIn → etc.
- Template library, performance metrics per step, A/B testing.

### 2.7 Assignment Rules
- Round-robin, criteria-based, territory-based auto-assignment of new leads/deals/cases.

### 2.8 Scoring Rules
- Demographic + behavioral scoring (page visit, email open, form submit) — drives lead grading and Zia predictions.

### 2.9 Layout Rules
- "If field A = X then show field B and require field C" — conditional UI per record.

### 2.10 Validation Rules
- Server-side rules raising errors on save (cross-field, formula-based).

### 2.11 Custom Buttons & Custom Functions
- Buttons on list/detail pages running Deluge scripts (Zoho's serverless language) or REST calls.
- Common uses: bulk price updates, third-party API calls, generate documents.

### 2.12 Schedules
- Cron-like recurring functions (e.g., daily KPI rollups).

### 2.13 Web-to-Lead / Web-to-Case Forms + Z-Forms Parser
- Embed forms; auto-create leads/cases. **Email Parser**: incoming emails parsed by template into records.

---

## 3. Zoho CRM — AI (Zia)

Zia is now both a **classical-ML feature set** and an **agentic AI** runtime (2026 Era of Agency).

### 3.1 Predictive AI

| Feature | What it does |
|---------|-------------|
| **Lead/Deal Scoring (Zia score)** | 0–100 conversion likelihood from history |
| **Win-Loss Prediction** | Probability + key factors per deal |
| **Churn Prediction** | For subscription records, surfaces at-risk customers |
| **Sales Forecasting** | ML-based revenue projection vs. quota |
| **Best Time to Contact** | Email/call recipients at most-likely-to-respond windows |
| **Email Sentiment** | Inbound emails labeled positive/neutral/negative |
| **Anomaly Detector** | Detects unusual deviations in sales trends, target accomplishment |
| **Reminder & Suggestions** | "Update record X", "Follow up on stuck deal Y" |

### 3.2 Generative AI (2025-2026)

| Feature | What it does |
|---------|-------------|
| **ZIA-GPT (now "Zia LLM")** | Proprietary Zoho LLM (1.3B/2.6B/7B params) — keeps data inside Zoho's perimeter |
| **Email Reply Suggestion** | Drafts reply from thread + record context |
| **Notes Summarization** | Long-running record gets a TL;DR |
| **Image-to-Canvas** | Upload a UI mockup screenshot → Zia generates a Canvas layout |
| **Natural-Language Setup** | "Create a custom module for properties with a parking subform" → Zia builds it |
| **Natural-Language Reports** | "Show me top 10 deals stuck >30 days in negotiation" → generates report |

### 3.3 **Zia Agents** (2026)
- Autonomous task agents: "Triage inbound leads by ICP fit and route to AE territory"; "Draft renewal pitches from CRM + invoice history".
- Action verbs: send_email, update_record, create_task, query_db, call_api.
- Includes guardrails (approval-required actions, run-budgets, audit logs).
- **Implication for our build**: design our own action-registry from day one.

### 3.4 Voice & Image
- **Ask Zia (voice)**: "What's my pipeline this quarter?" via Android/iOS.
- **Image-based prediction**: classify product/document/business-card images.
- **Card Scanner**: photograph business card → contact record (mobile).

### 3.5 Prediction Builder (Custom Predictions)
- No-code wizard: choose target field, training set, features → Zia auto-trains an ML model surfaced as a CRM field with confidence score.

---

## 4. Zoho CRM — Customization & Studio

### 4.1 Module-Level
- **Custom Modules**: unlimited (Enterprise+); standard or master-detail.
- **Layouts**: multiple per module (different teams/processes).
- **Page Layouts (Canvas)**: pixel-perfect record UI designer (drag widgets, set conditional show, themed sections, Image-to-Canvas via Zia).
- **Multi-Page Layouts**: long forms split into wizard-style pages.

### 4.2 Field-Level
- **Field types**: Text, Picklist, Multi-select, Lookup, User Lookup, Formula, Roll-up Summary, Auto-Number, Currency (multi-currency), Phone, URL, Email, Date, DateTime, Decimal, Long Text, File Upload, Image, Subform, **Conditional Picklist** (cascade), **Geolocation**.
- **Pick lists**: global picklists shared across modules; dependency picklists.
- **Roll-up Summary**: aggregates from child records (Sum/Count/Min/Max).
- **Formula fields**: Excel-like syntax over fields.
- **Tags**: ad-hoc taxonomies.

### 4.3 List & Kanban
- **List views**: filters, columns, sort, color-coded, public/private/shared with role.
- **Kanban view**: by any picklist (stage, status).
- **Calendar / Map view**: based on date/geo fields.
- **Print view, PDF export, Excel/CSV export, Mass-update, Mass-transfer-ownership**.

### 4.4 Translation & Localization
- 28+ languages; per-user locale; right-to-left for Arabic/Hebrew.
- Custom translations per picklist.

---

## 5. Zoho CRM — Security & Governance

| Feature | Notes |
|---------|-------|
| **Roles** | Hierarchy with implicit upward visibility |
| **Profiles** | Permissions: module CRUD, field-level, mass-actions |
| **Groups** | Cross-role record sharing |
| **Sharing Rules** | Open private records to roles/groups/users |
| **Territories** | Geo/segment hierarchy parallel to roles |
| **Field-Level Security** | Read/write/hidden per profile |
| **Encryption at Rest** | Field-level (PII), AES-256 |
| **Encryption in Transit** | TLS 1.3 |
| **Audit Log** | Who-changed-what, with old/new values |
| **Data Backup / Sandbox** | Production replica for testing (Enterprise+) |
| **Compliance** | GDPR, HIPAA, ISO 27001, SOC 2 II, PIPEDA |
| **2FA** | TOTP / SMS / Zoho OneAuth |
| **IP Restrictions** | Per-org IP allowlist |
| **SSO** | SAML 2.0 (Okta, Azure AD, OneLogin), OAuth |
| **GDPR Tools** | Right-to-erasure workflow, consent tracking, data subject requests |
| **Data Residency** | US/EU/IN/AU/JP/CN data centers |

---

## 6. Zoho CRM — Communication

### 6.1 Email
- **SalesInbox**: sales-priority inbox (high-priority filter trained on CRM activity).
- **Email Templates**: rich + merge fields + per-module library.
- **Mass Email**: 250-2,000/day (tier-dependent), with throttling.
- **Drip Campaigns**: in-CRM auto-sequence (lighter than Marketing Automation).
- **Email Insights**: open/click/bounce/reply per email.
- **Email Parsers**: parse incoming emails to fields (e.g., contact form replies).
- **Two-way IMAP/POP**: sync with Outlook/Gmail; emails attached to matching records.

### 6.2 Telephony — **PhoneBridge**
- 50+ tel providers (Twilio, RingCentral, Avaya, Cisco, Aircall, Knowlarity, Exotel, etc.).
- Click-to-call, screen-pop on inbound, call-log auto-capture, call recording link, IVR.
- **Built-in Calling** (Zoho Voice): native PSTN/SIP for orgs without external tel.

### 6.3 Chat
- **SalesIQ**: live chat + visitor tracking + chatbot embed; chat transcripts attach to leads.
- **Zoho Cliq**: internal team chat with CRM-context cards.

### 6.4 Social
- Connect Twitter/Facebook/Instagram/LinkedIn handles per record; respond from CRM.

### 6.5 Meetings
- **Zoho Meeting**: video; or integrate Zoom/Teams/Webex/GoTo.

### 6.6 SMS / WhatsApp
- Via providers (Twilio, RouteMobile, Karix, MessageBird) or **Zoho WhatsApp Business** integration; message threads attached to records.

---

## 7. Zoho CRM — Analytics & Reporting

### 7.1 Built-in Reports
- 40+ standard reports per module (Pipeline by Stage, Conversions, Activity Stats, Win/Loss, etc.).
- Custom reports: tabular, summary, matrix, charts (bar/line/pie/funnel/heatmap/donut/gauge).
- Schedule reports: emailed PDF/CSV on cadence.

### 7.2 Dashboards (with Zoho-specific widget types)

| Widget | What it shows |
|--------|--------------|
| **KPI** | Single number with target |
| **Comparator** | This-vs-last period |
| **Cohort** | Retention/conversion of cohorts over time |
| **Quadrant** | 2x2 matrix (e.g., revenue × win-rate) |
| **Funnel** | Stage drop-off |
| **Target Meter** | Quota vs. attainment |
| **Anomaly Detector** | Auto-flags outliers in trend |
| **Zone** | Acceptable/warning/danger bands |
| **Detector** | Same-period comparison detector |
| **Heat Map** | 2D density |
| **Top-N Table** | Top movers |

### 7.3 Zoho Analytics (Deep BI)
- Separate full-BI app, included in Ultimate / CRM Plus.
- Self-service BI: drag-drop reports across CRM + Books + Desk + custom DBs.
- AI ("Ask Zia") natural-language queries → charts.
- 500+ pre-built integrations & 150+ pre-built connectors.

---

## 8. Zoho CRM — Mobile & Field

| Feature | Notes |
|---------|-------|
| **Native iOS/Android apps** | Full record CRUD, offline mode |
| **Card Scanner** | OCR business card → contact |
| **RouteIQ** | Field-sales route planner (waypoints, daily plan, geo-checkin) |
| **Geolocation tracking** | User location pings during work hours |
| **Mobile SDK** | Build custom mobile apps on CRM data |

---

## 9. Zoho CRM — Developer Platform

| Feature | Description |
|---------|-------------|
| **REST API v2** | Full CRUD on all modules; OAuth 2.0; webhooks |
| **Bulk API** | 100K records / job; async |
| **Notification API / Webhooks** | Subscribe to entity events |
| **Deluge Scripting** | Zoho's serverless DSL — runs custom functions, schedules, button actions |
| **Functions** | Standalone serverless functions (HTTP-triggered, schedule, button, workflow) |
| **Widgets** | iframe-embedded custom UIs in record pages, related lists, sidebars |
| **Web Tabs** | Embed external URL as a tab |
| **Connections** | OAuth-managed connectors to 100+ services usable inside Deluge |
| **Sandbox** | Production replica for testing (Enterprise+) |
| **Zoho Marketplace** | 1,000+ extensions / integrations / industry templates |
| **CLI (zoho-cli)** | Local development of widgets/functions |
| **Catalyst** | Backend-as-a-Service (functions, datastore, scheduler, AI) — siblings of CRM, integrate via API |
| **Mobile SDK** | iOS/Android, React Native, Flutter wrappers |

---

## 10. Zoho CRM — Integrations (Out-of-Box)

| Category | Integrations (sample) |
|----------|----------------------|
| **Email** | Gmail, Outlook, IMAP, Exchange |
| **Telephony** | Twilio, RingCentral, Aircall, Avaya, Cisco, Knowlarity, Exotel, JustCall, +50 |
| **Calendar** | Google, Office 365, Exchange |
| **Marketing** | Mailchimp, ActiveCampaign (besides native Campaigns) |
| **Accounting** | QuickBooks, Xero, Zoho Books |
| **eCommerce** | Shopify, WooCommerce, Magento |
| **Storage** | Google Drive, Dropbox, OneDrive, Box, Zoho WorkDrive |
| **Webinar/Meeting** | Zoom, GoToMeeting, Webex, MS Teams, Zoho Meeting |
| **Document** | DocuSign, Adobe Sign, Zoho Sign |
| **Maps** | Google Maps, MapQuest |
| **Forms** | Zoho Forms, Google Forms, Typeform, JotForm |
| **Productivity** | Slack, MS Teams, Zoho Cliq, Zoho Mail |

---

## 11. Zoho CRM — Pricing Tiers (April 2026)

Verified via web search (zoho.com/crm/zohocrm-pricing.html, Zeeg Apr 2026 guide).

| Tier | Price (annual, USD/user/month) | Headline features added |
|------|-------------------------------|-------------------------|
| **Free** | $0 (3 users max) | Leads, Deals, Contacts, Tasks/Events/Calls, basic email, mobile |
| **Standard** | **$14** | Custom modules, scoring, workflows (5), mass email, multiple pipelines, social |
| **Professional** | **$23** | **Blueprint**, Inventory (Products/Quotes/SO/PO/Invoice), Webhooks, Google Ads, Email-in (SalesSignals), Cases & Solutions |
| **Enterprise** | **$40** | **Zia AI**, **CommandCenter**, Custom Functions, Territory Mgmt, Multi-User Portals, Custom Reports & Dashboards, Sandbox, Mobile SDK, Custom Buttons |
| **Ultimate** | **$52** (annual only) | **Zoho Analytics**, Augmented Analytics, 25 sandboxes, 2k emails/day/user, dedicated infrastructure, premium support |

**CRM Plus bundle**: $57/user/month — includes CRM Enterprise + Desk + SalesIQ + Campaigns + Survey + Social + Projects + Forms + Sign + PageSense + Analytics.

**Zoho One**: $37/employee/month (all-employee model) for **all 50+ apps** — drastic value if buying ≥3 apps.

---

## 12. Zoho CRM Plus — The Bundle Detail

Single login + unified UI across these apps:

| App | Role in CX |
|-----|-----------|
| **CRM** (Enterprise edition) | Sales pipeline, accounts, contacts |
| **Desk** | Help-desk: omnichannel ticketing, SLAs, KB, IVR |
| **Campaigns** | Email marketing (newsletters, automation, A/B) |
| **SalesIQ** | Live chat + chatbot + visitor tracking + co-browse |
| **Social** | Social media monitoring + scheduling + analytics |
| **Survey** | Survey design + distribution + reporting (CSAT, NPS) |
| **Projects** | Project mgmt: tasks, milestones, timesheets, Gantt |
| **Forms** | Form builder (web + offline mobile) |
| **Sign** | E-signature with templates and SignForms |
| **PageSense** | A/B testing + heatmaps + funnel + personalization for websites |
| **Analytics** | Full BI on combined data |

**Why important to us**: CRM Plus is the proven "minimum viable CX suite" — when scoping our own modules, this bundle = a great target for v2 module roadmap.

---

## 13. Zoho One — Full App Catalog (50+ apps as of Q1 2026)

> Sources: zoho.com/all-products.html, zoho.com/one/apps.html, zenatta.com/zoho-one-all-46-apps (2025).

We are **NOT** building all of these — but the catalog reveals the conceptual map of "everything an SMB needs". Use as inspiration for module backlog, not v1 scope.

### 13.1 Sales

| App | What |
|-----|------|
| **CRM** | (above) |
| **Bigin** | Pipeline-only lite-CRM for solopreneurs / micro-teams |
| **SalesIQ** | Live-chat, visitor tracking, chatbot |
| **Bookings** | Appointment scheduling |
| **Forms** | Form builder |
| **Sign** | E-signature |
| **RouteIQ** | Field-sales route planner |
| **Voice** | Cloud telephony |

### 13.2 Marketing

| App | What |
|-----|------|
| **Campaigns** | Email marketing |
| **Marketing Automation** | Multi-channel journeys |
| **Social** | Social posting + monitoring |
| **Survey** | Surveys, polls, NPS, CSAT |
| **PageSense** | A/B + heatmap |
| **LandingPage** | Landing-page builder |
| **Sites** | Website builder (CMS) |
| **Backstage** | Event management |
| **Webinar** | Webinar platform |
| **Thrive** | Customer loyalty + referral |
| **CommunitySpaces** | Community/forum hosting |
| **Publish** | Multi-channel publishing |

### 13.3 Service

| App | What |
|-----|------|
| **Desk** | Help-desk ticketing |
| **Assist** | Remote support + screen-share |
| **Lens** | AR-powered remote field assist |
| **FSM** (Field Service Mgmt) | Field-service dispatching |

### 13.4 Productivity & Collaboration

| App | What |
|-----|------|
| **Mail** | Business email + calendar |
| **Calendar** | Standalone calendar |
| **Cliq** | Slack-like team chat |
| **Meeting** | Video conferencing |
| **ShowTime** | Webinar / training platform |
| **Workplace** | Productivity bundle umbrella |
| **WorkDrive** | Cloud file storage |
| **Writer** | Online word processor |
| **Sheet** | Online spreadsheet |
| **Show** | Online presentation |
| **Notebook** | Note-taking |
| **Connect** | Intranet / employee social |
| **TeamInbox** | Shared mailbox |
| **Tables** | Airtable-like work-management base |
| **ToDo** | Personal task manager |
| **Office Suite** | Aggregation: Writer + Sheet + Show |
| **Learn** | LMS / e-learning |
| **Lens** | AR remote |

### 13.5 Finance

| App | What |
|-----|------|
| **Books** | Full accounting |
| **Invoice** | Standalone invoicing (subset of Books) |
| **Expense** | Expense reporting |
| **Subscriptions** | Recurring billing / SaaS metering |
| **Inventory** | Inventory + order mgmt |
| **Checkout** | One-time online checkout |
| **Billing** | Higher-volume subscription billing |
| **Practice** | Accounting-firm practice mgmt |
| **Payroll** | US/IN payroll |
| **Commerce** | All-in-one eCommerce store + checkout |

### 13.6 HR

| App | What |
|-----|------|
| **People** | HRIS / employee management |
| **Recruit** | ATS / hiring |
| **Workerly** | Temp staffing platform |
| **Shifts** | Hourly-employee scheduling |

### 13.7 Legal

| App | What |
|-----|------|
| **Contracts** | CLM (contract lifecycle mgmt) |

### 13.8 BI & Data

| App | What |
|-----|------|
| **Analytics** | Self-service BI |
| **DataPrep** | Data cleansing & ETL |
| **Embedded BI** | White-labeled BI |
| **Data Migration** | Migration toolkit |

### 13.9 Project / Work Management

| App | What |
|-----|------|
| **Projects** | Project mgmt (Gantt, time, milestones) |
| **Sprints** | Agile/Scrum tool |
| **BugTracker** | Issue tracker |

### 13.10 Operations / Developer

| App | What |
|-----|------|
| **Creator** | Low-code app builder (Deluge) |
| **Flow** | iPaaS / workflow automation across apps |
| **Catalyst** | Backend-as-a-Service (functions, AI, datastore) |
| **QEngine** (Zoho QEngine) | Test automation |
| **Apptics** | Mobile app analytics |
| **Lens** | AR field |
| **Vault** | Password manager |
| **OneAuth** | MFA app |

### 13.11 IT Mgmt

| App | What |
|-----|------|
| **ManageEngine** | Adjacent ITSM/ITAM/IGA suite (Zoho Corp's enterprise IT brand) |

---

## 14. Distinctive / Unique-to-Zoho Capabilities

These are the items **other CRMs do NOT have or do worse**, worth considering for product differentiation in our build:

| Feature | Why interesting |
|---------|-----------------|
| **Blueprint** | Module-scoped step-by-step process enforcement (more powerful than HubSpot's required-properties; closer to Salesforce Path but with action automation per-transition) |
| **CommandCenter** | Cross-module customer journey orchestrator with agent assignment + SLAs — almost no competitor has this |
| **Canvas** (Page Layout designer) | Drag-drop pixel-perfect record UIs replacing the default form view; can be admin-only or all-users |
| **Image-to-Canvas (Zia)** | Snap a Figma mockup → Zia builds the layout — bleeding-edge in 2026 |
| **Multi-Org Portals** | One CRM serving multiple branded portals (white-label OEM) |
| **Z-Forms / Email Parser** | Native parsing of inbound email/HTML form into typed fields |
| **Deluge Scripting** | Single DSL for workflow actions, custom buttons, schedules, functions, low-code app logic — keeps automation in one mental model |
| **Zia LLM (proprietary)** | Data stays inside Zoho's perimeter (no OpenAI/Anthropic relay) |
| **Cohort/Quadrant/Anomaly/TargetMeter dashboard widgets** | Out-of-box analytical lenses competitors require BI tools for |
| **PhoneBridge** | 50+ telephony providers natively |
| **SalesInbox + SalesSignals** | Inbox prioritized by deal value/CRM signal; real-time alerts on prospect activity |
| **Multi-Pipeline + Multi-Layout per Module** | Single module serves different teams with different schemas |
| **RouteIQ** | Field-sales route optimization in CRM (most CRMs need an addon) |
| **Bigin → CRM upsell path** | Lite product feeding into pro — good reference for our packaging |
| **Sandbox + Migration tool** | Free DB replicator + cross-vendor migration (from Salesforce/HubSpot/Pipedrive) |

---

## 15. Implications for Our CRM Build

### 15.1 Entities (MVP) — direct lift from Zoho
- User, Role, Profile, Group, Territory, Org, Audit Log
- Lead, Contact, Account, Deal (+Stage History), Pipeline, Stage
- Task, Meeting, Call, Activity (polymorphic)
- Product, PriceBook, Quote, SalesOrder, PurchaseOrder, Invoice, Vendor
- Campaign, Email Template, Email Activity
- Case, Solution (KB)
- Note, Document, Attachment, Tag
- Custom Module (metadata), Custom Field (metadata), Layout (metadata)

### 15.2 Cross-cutting subsystems
- **Automation engine**: Workflow Rule + Action Registry + Schedule + Webhook + (Deluge-equivalent? — pick: JS sandbox, or a curated DSL)
- **Process management**: Blueprint-style state machine on any module (states + transitions + guards + actions)
- **Permission engine**: Role hierarchy + Profile + Sharing rule + FLS + Territory
- **Notification & Activity feed**
- **Audit log** (every entity has change-history)
- **Reporting engine**: list query → aggregations → chart specs; saveable; schedulable
- **Dashboard builder**: composable widgets
- **Email send/receive** (IMAP/SMTP/relay) + parsing
- **API**: REST v1, Webhooks, OAuth2, Bulk
- **Search** (full-text + advanced filters)
- **File storage abstraction** (local/S3)

### 15.3 v1 hard cuts (to keep MVP shippable)
- ❌ Telephony PhoneBridge — defer; integrate Twilio later
- ❌ Marketing Automation full suite — campaigns module only
- ❌ AI Zia — slot for v2 (but design event log so AI can train on it)
- ❌ Custom Modules with no-code admin — defer; ship hard-coded modules first
- ❌ CommandCenter (cross-module) — Blueprint single-module only in v1
- ❌ Multi-Org / Portals — defer
- ❌ Sandbox env — defer
- ✅ Workflow rules — yes, simple version
- ✅ Approval processes — yes, basic
- ✅ Reports + 5 chart types — yes
- ✅ RBAC + audit log — yes (must)
- ✅ Email send + Outlook/Gmail sync — yes (sync can be deferred to v2)

---

## Sources

- [Zoho CRM Plus features](https://www.zoho.com/crm/crmplus/features.html) — verified Apr 2026
- [Zoho CRM Plus complete feature list PDF](https://www.zohowebstatic.com/sites/zweb/images/crmplus/images/zohocrmplus-feature-list.pdf)
- [Zoho One apps list (2026)](https://crmforyourbusiness.com/zoho-solutions/one/zoho-one-apps)
- [Zoho One all 46+ apps explained — Zenatta 2025](https://zenatta.com/zoho-one-all-46-apps/)
- [Zoho all products](https://www.zoho.com/all-products.html)
- [Zoho CRM Pricing 2026 — Zeeg](https://zeeg.me/en/blog/post/zoho-crm-pricing)
- [Zoho CRM official pricing](https://www.zoho.com/crm/zohocrm-pricing.html)
- [Q1 2026 Update — Zoho CRM blog](https://www.zoho.com/blog/crm/q1-2026-update.html)
- [Zia overview (help.zoho.com)](https://help.zoho.com/portal/en/kb/crm/zia-artificial-intelligence/zia/articles/zia-overview)
- [AI features in Zoho CRM](https://www.zoho.com/crm/ai-features-in-zoho-crm.html)
- [CommandCenter overview](https://www.zoho.com/crm/tutorials/commandcenter/overview.html)
- [Difference: CommandCenter vs Blueprint vs Orchestly vs Flow](https://help.zoho.com/portal/en/kb/crm/experience-center/commandcenter/journeybuilder/articles/commandcenter-comparison)
- [Blueprint handbook PDF](https://www.zoho.com/sites/default/files/Blueprint-Handbook.pdf)
- [Zoho CRM 2026 features guide — Elite Tech](https://www.elitetechcorp.com/zoho-crm-features-guide)
- [New features Zoho One 2026](https://himcos.com/new-features-of-zoho-one-2026-ai-smarter-workflows/)
