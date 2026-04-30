# Microsoft Dynamics 365 + Pipedrive + Monday.com Sales CRM — Feature & Module Catalog

> **Purpose:** Capture the design philosophies, modules, sub-features, entities, and platform layers from three CRMs at very different positions in the market — to inform our self-built CRM (Node.js + Vue).
>
> - **Microsoft Dynamics 365** — enterprise depth, Dataverse + Power Platform as the data/automation backbone.
> - **Pipedrive** — laser-focused, sales-first SMB CRM with a clean add-on model.
> - **Monday.com Sales CRM** — flexible "boards-as-CRM" / work-OS approach where the data model is user-defined.
>
> Together these three define the spectrum: rigid-but-deep (Dynamics) ⇄ opinionated-but-narrow (Pipedrive) ⇄ flexible-but-shallow (Monday).
>
> **Date:** April 2026.
> **Scope:** Feature catalog only (no implementation guidance).

---

## Table of Contents

- [A. Microsoft Dynamics 365 (Customer Engagement + Power Platform)](#a-microsoft-dynamics-365-customer-engagement--power-platform)
  - [A.1 Licensing & SKU shape](#a1-licensing--sku-shape)
  - [A.2 Dynamics 365 Sales](#a2-dynamics-365-sales)
  - [A.3 Dynamics 365 Customer Service](#a3-dynamics-365-customer-service)
  - [A.4 Dynamics 365 Field Service](#a4-dynamics-365-field-service)
  - [A.5 Dynamics 365 Customer Insights — Journeys (Marketing)](#a5-dynamics-365-customer-insights--journeys-marketing)
  - [A.6 Dynamics 365 Customer Insights — Data (CDP)](#a6-dynamics-365-customer-insights--data-cdp)
  - [A.7 Dynamics 365 Project Operations](#a7-dynamics-365-project-operations)
  - [A.8 Dynamics 365 Commerce / Finance / Supply Chain / HR (ERP siblings)](#a8-dynamics-365-commerce--finance--supply-chain--hr-erp-siblings)
  - [A.9 Power Platform (the platform layer)](#a9-power-platform-the-platform-layer)
  - [A.10 Microsoft Dataverse (the data layer)](#a10-microsoft-dataverse-the-data-layer)
  - [A.11 Security, Admin & Governance](#a11-security-admin--governance)
  - [A.12 Distinctive primitives worth borrowing](#a12-distinctive-primitives-worth-borrowing)
- [B. Pipedrive](#b-pipedrive)
  - [B.1 Plan structure (2026)](#b1-plan-structure-2026)
  - [B.2 Core CRM modules (in every plan)](#b2-core-crm-modules-in-every-plan)
  - [B.3 Sales-specific features](#b3-sales-specific-features)
  - [B.4 Insights, reports & forecasting](#b4-insights-reports--forecasting)
  - [B.5 Email & communication](#b5-email--communication)
  - [B.6 Workflow automation](#b6-workflow-automation)
  - [B.7 AI — Pipedrive AI Sales Assistant](#b7-ai--pipedrive-ai-sales-assistant)
  - [B.8 Add-ons (paid extras)](#b8-add-ons-paid-extras)
  - [B.9 Marketplace, mobile, API & integrations](#b9-marketplace-mobile-api--integrations)
  - [B.10 Distinctive primitives worth borrowing](#b10-distinctive-primitives-worth-borrowing)
- [C. Monday.com Sales CRM](#c-mondaycom-sales-crm)
  - [C.1 Plan structure](#c1-plan-structure)
  - [C.2 Boards-as-CRM core](#c2-boards-as-crm-core)
  - [C.3 Column types catalog](#c3-column-types-catalog)
  - [C.4 Views](#c4-views)
  - [C.5 Automation recipes](#c5-automation-recipes)
  - [C.6 CRM-specific features](#c6-crm-specific-features)
  - [C.7 Email integration & email tracking](#c7-email-integration--email-tracking)
  - [C.8 AI features](#c8-ai-features)
  - [C.9 Dashboards, widgets & reports](#c9-dashboards-widgets--reports)
  - [C.10 Workforms, Workdocs, Updates, Files](#c10-workforms-workdocs-updates-files)
  - [C.11 monday DB / WorkCanvas — the platform layer](#c11-monday-db--workcanvas--the-platform-layer)
  - [C.12 Integrations & Apps Marketplace](#c12-integrations--apps-marketplace)
  - [C.13 2026 roadmap signals](#c13-2026-roadmap-signals)
  - [C.14 Distinctive primitives worth borrowing](#c14-distinctive-primitives-worth-borrowing)
- [D. Cross-vendor synthesis for our self-built CRM](#d-cross-vendor-synthesis-for-our-self-built-crm)
- [Sources](#sources)

---

## A. Microsoft Dynamics 365 (Customer Engagement + Power Platform)

Dynamics 365 is not a CRM — it is a **family of business applications running on a shared low-code platform (Power Platform) backed by a single relational data layer (Dataverse)**. The "CRM" pieces are bundled under the **Customer Engagement (CE)** umbrella.

The right mental model: Dynamics 365 = Power Platform model-driven apps + first-party data schemas in Dataverse + a Microsoft 365/Teams/Outlook integration mesh.

### A.1 Licensing & SKU shape

Dynamics 365 Sales alone ships in five SKUs (April 2026):

| SKU | Target | Highlights |
|---|---|---|
| **Sales Premium** | Enterprise + AI | Everything in Enterprise + AI insights (conversation intelligence, relationship intelligence, predictive scoring, sales accelerator at full capacity, Sales Qualification Agent, Sales Opportunity Agent). |
| **Sales Enterprise** | Enterprise | Full lead-to-cash, forecasting, in-app marketing, Power Apps + Power Automate (limited), digital selling features at limited monthly capacity. |
| **Sales Professional** | SMB / mid-market | Subset of Enterprise entities — leaner data model, fewer customization knobs. |
| **Microsoft Relationship Sales** | LinkedIn-led B2B | Sales Enterprise + LinkedIn Sales Navigator Advanced Plus + LinkedIn Sales Insights. |
| **Sales agent** | Outlook/Teams-first | Lightweight CRM capture from Outlook/Teams without heavy CRM UI; full functionality unlocked with Microsoft 365 Copilot. |

Adjacent CE apps (Customer Service, Field Service, Customer Insights – Journeys, Customer Insights – Data, Project Operations) are licensed separately and share Dataverse.

### A.2 Dynamics 365 Sales

#### Core entities (Dataverse tables)

- **Lead** — unqualified prospect; converts into Account + Contact + Opportunity on qualification.
- **Account** — organization (B2B) or household (B2C).
- **Contact** — individual person, optionally tied to one parent Account.
- **Opportunity** — qualified deal with revenue, probability, sales process stage, opportunity products, competitors.
- **Quote** — formal pricing proposal; revisions/versions; convert-to-order.
- **Order** — confirmed purchase; convert-to-invoice.
- **Invoice** — billed amounts; payment status.
- **Product** — sellable item (master) + Product Family hierarchy + Product Bundle (kit).
- **Price List** — currency-bound pricing rules; Price List Items per product/unit.
- **Unit** + **Unit Group** — units of measurement (each, box, pallet…) with conversion factors.
- **Discount List** — volume discount tiers.
- **Competitor** — competitor record linked to Opportunities.
- **Sales Literature** — collateral library.
- **Marketing List** — static or dynamic segments for in-app marketing.
- **Campaign** + **Campaign Activity** + **Campaign Response** — basic in-app marketing campaigns (heavier marketing lives in Customer Insights – Journeys).
- **Goal** + **Goal Metric** + **Rollup Query** — quota tracking with hierarchical rollups.
- **Forecast** + **Forecast Configuration** — period-based revenue projection.
- **Territory** — geographic/segment assignment for sellers.
- **Activity** parent type with subtypes:
  - **Phone Call**, **Appointment**, **Email**, **Task**, **Letter**, **Fax**, **Recurring Appointment**, **Service Activity**, **Social Activity**, **Conversation Intelligence call recording**.
- **Note** + **Annotation** — free-form notes attached to any record.
- **Connection** + **Connection Role** — generic many-to-many relationships between any two records (e.g., influencer, decision maker).
- **Queue** — work-list of records assigned to teams.
- **Business Unit** + **Team** + **User** — security/ownership hierarchy.

#### Sales process & guidance

- **Business Process Flows** — visual stage-bar at the top of forms (Qualify → Develop → Propose → Close); each stage has required fields and gated transitions.
- **Sales playbooks** — reusable activity templates triggered manually or by automation.
- **Sequences** (Sales Accelerator) — ordered set of seller activities (call/email/LinkedIn/wait) with timers, branching, and bulk apply to leads/opportunities.
- **Sales Accelerator work list** — prioritized queue of next-best-actions per seller, populated by sequences + AI scoring.
- **Assistant cards** — adaptive next-best-action recommendations on the home page.

#### AI features (Sales Premium)

- **Sales Qualification Agent** — autonomous agent that researches a lead from internal+external sources, drafts a personalized outreach email, and either hands the lead off (Research-only mode) or engages directly (Research-and-engage mode).
- **Sales Opportunity Agent** — surfaces deal risks early, highlights top opportunities, consolidates insights into one view.
- **Conversation Intelligence** — call transcription + sentiment + topic detection + action items + competitive mention tracking + coaching insights.
- **Predictive Lead Scoring** — model that ranks leads on likelihood to qualify.
- **Predictive Opportunity Scoring** — model that ranks opportunities on likelihood to win.
- **Predictive Forecasting** — AI-augmented forecast that complements seller-submitted forecasts.
- **Relationship Analytics & Health Score** — single 0–100 score per account/opportunity computed from interaction signals across Dynamics + M365.
- **Who Knows Whom** — surfaces internal colleagues with the strongest relationships to a target contact (uses M365 graph signals).
- **Notes Analysis** — extracts action items and entities from free-text notes and suggests record creation.
- **Auto-capture** — automatically associates Outlook emails and meetings with Dynamics records.
- **Form Fill Assist (2026 wave 1)** — extracts structured data from PDFs, business cards, screenshots and pre-fills forms.
- **Ask-and-Refine chat** in Opportunity Workspace (Copilot, 2026 wave 1) — natural-language drilldown.
- **Signal-based forecasting** (2026 wave 1) — combines historical patterns with enriched signals.

#### Forecasting

- **Forecast configurations** — period (month/quarter), hierarchy (manager rollup), forecast categories (Pipeline, Best Case, Committed, Won), units (revenue or unit count), simple or layout-based templates.
- **Forecast snapshots** — daily snapshot for trend analysis.
- **Quotas** — per-period targets per seller.
- **Variance views** — committed vs. quota vs. closed.

#### Engagement & collaboration

- **Microsoft Teams integration** — embedded chat per record, channel-linked records, Teams dialer, basic + enhanced collaboration tabs.
- **Outlook App for Dynamics 365** — Outlook side-pane shows the Dynamics record context for the current email/meeting.
- **Enhanced email** — rich composer with templates, signatures, tracking, scheduled send.
- **Soft phone integration** + **Microsoft Teams dialer** — click-to-dial.
- **LinkedIn Sales Navigator embedded** — profile cards + InMail + lead syncing + Sales Insights.
- **Customer Voice** — survey tool included with Sales (built on the broader Dynamics 365 Customer Voice product).

#### Mobile (Dynamics 365 Sales mobile app)

- Push notifications.
- Voice-to-text notes.
- Camera-to-record (business card OCR, document capture).
- Daily priorities at-a-glance.
- Meeting prep cards with attendee enrichment + AI reminders.

#### Reporting

- Built-in dashboards (system + personal).
- Power BI embedded dashboards.
- Charts on any view.
- Hierarchical visualizations (account/team trees).
- Excel templates + Word templates (mail merge from any record).

### A.3 Dynamics 365 Customer Service

#### Core entities

- **Case** (the central entity) — incident with status, priority, severity, type, customer.
- **Queue** — shared work pool of cases/activities.
- **Knowledge Article** — versioned KB article with categories, tags, products, and full-text search.
- **Service Level Agreement (SLA)** + **SLA Item** — SLA timers per case (response, resolution) with pause conditions.
- **Entitlement** + **Entitlement Channel** + **Entitlement Product** — contractual support quotas (per case / per hour / unlimited) by channel/product.
- **Customer Service Schedule** — business calendars with holidays.
- **Routing Rule Set** — automated case assignment by attributes.
- **Skill** + **Skill Type** — agent skill matrix used by Unified Routing.
- **Topic** — Copilot/Power Virtual Agents conversation topic.
- **Conversation** + **Session** + **Message** — Omnichannel runtime entities.

#### Workspaces

- **Customer Service Workspace** — multi-session agent UX with tab management.
- **Customer Service Hub** — single-session classic UX.
- **Omnichannel for Customer Service** — multichannel routing console.

#### Channels (Omnichannel)

- Live chat (web + mobile).
- SMS (Twilio, TeleSign, Infobip).
- Voice channel (built on Azure Communication Services).
- Microsoft Teams as a customer channel.
- Facebook Messenger, Twitter (X), LINE, WeChat, WhatsApp.
- Email (queue-routed).
- Custom channels via SDK.

#### Routing

- **Unified Routing** — work classification + skill-based assignment + load balancing + capacity profiles.
- **Diagnostics** — see why a particular item routed to a particular agent.

#### AI / Copilot

- **Copilot in Customer Service** — agent-side: case summarization, draft email response, ask-a-question over knowledge.
- **Copilot Studio** (formerly Power Virtual Agents) — build no-code IVA bots; deflection at the front door.
- **Customer Service Insights** — analytics: case volumes, topics, agent performance, AI-generated topic clustering.

### A.4 Dynamics 365 Field Service

#### Core entities

- **Work Order** — service job at a customer location; type (incident/inspection/maintenance), priority, time window, system status (open–scheduled/in progress/closed).
- **Bookable Resource** + **Bookable Resource Booking** — technician/equipment/crew/account/contact/facility scheduled to a work order.
- **Resource Requirement** — what the WO needs (skill, role, time window, geo).
- **Schedule Board** — drag-drop scheduling interface with map + Gantt views.
- **Resource Scheduling Optimization (RSO)** — automated AI optimization engine.
- **Customer Asset** — installed equipment at the customer site (hierarchical).
- **Functional Location** — geographic/logical location hierarchy.
- **Inventory** entities — Warehouse, Inventory Adjustment, Purchase Order, RMA, RTV, Inventory Transfer.
- **Agreement** — recurring service contract that auto-generates work orders + invoices.
- **Inspection** — structured questionnaire executed during a work order.
- **Time Entry** — labor time tracked by technician.
- **IoT Alert** — alert from connected device that auto-creates work orders.
- **Customer Voice survey** — post-service survey.

#### Mobile

- **Field Service Mobile** (Power Apps) — offline-capable; barcode/RFID; signature capture; photo capture; nearby work orders map; Microsoft 365 Copilot for Field Service.

#### Mixed Reality

- **Dynamics 365 Guides** — author/consume step-by-step holographic instructions on HoloLens 2.
- **Dynamics 365 Remote Assist** — expert-on-call AR collaboration with technician on HoloLens 2 / mobile.

#### Industry primitives

- IoT integration via Azure IoT, Connected Field Service.
- Predictive maintenance.

### A.5 Dynamics 365 Customer Insights — Journeys (Marketing)

(Formerly "Dynamics 365 Marketing".)

- **Real-time journeys** — event-triggered customer journeys (signup, purchase, abandoned cart) with branches, decision splits, AI next-best-action.
- **Outbound marketing** (legacy) — segment-driven email campaigns with workflows.
- **Segments** — dynamic (rule-based) and static (list-based).
- **Email designer** — drag-drop email composer with brand profiles, templates, content blocks, AI-assisted copywriting.
- **SMS marketing** + **Push notifications** + **Custom channels**.
- **Forms** + **Form pages** + **Form submissions** — capture + lead generation.
- **Marketing Lists & Subscription Lists** — preferences and consent management.
- **Lead Scoring Models** — rule-based & predictive scoring.
- **Events** — event registration, sessions, speakers, sponsors, virtual events (Teams Live), check-in.
- **Customer Voice surveys** for marketing.
- **Brand profiles** — sender domains, default values per brand.
- **Customer journeys analytics** — dashboards on engagement.
- **Compliance** — consent center, double opt-in, GDPR controls, deduplication.
- **Copilot for marketers** — segment-by-prompt, journey-by-prompt, image generation for emails.

### A.6 Dynamics 365 Customer Insights — Data (CDP)

A full **Customer Data Platform** (CDP).

- **Data sources** — connect Dynamics, Synapse, Azure Data Lake, ADLS Gen2, S3, Snowflake, Databricks, SQL, Salesforce, Marketo, etc.
- **Unified profile** — identity stitching across sources via match rules + ML similarity (deduplication, merge).
- **Measures** — KPIs computed on the unified profile (LTV, churn risk, RFM).
- **Segments** — rule-based or ML-based audience definitions; export to ad platforms / Customer Insights – Journeys.
- **Predictions** — out-of-the-box ML models: customer lifetime value, churn, product recommendation, transactional churn.
- **Activations** — push segments to Facebook, LinkedIn, Google Ads, Mailchimp, etc.
- **Enrichment** — Microsoft Graph + 3rd-party data partners (Experian, etc.).
- **Activity timeline** — unified per-customer event timeline.
- **AI on top** — Copilot to ask natural-language questions of the CDP.

### A.7 Dynamics 365 Project Operations

For services-based businesses (consulting, agencies):

- **Projects** — WBS, milestones, budgets, baselines.
- **Project Tasks** — Gantt with dependencies.
- **Resources** — generic + named resources, skills, roles, cost rates, bill rates.
- **Resource Requests** + **Resource Bookings** + **Resource Capacity** — staffing.
- **Quotes & Contracts (project-based)** — fixed-price + T&M billing rules.
- **Time Entries** — week-grid timesheets with approval flow.
- **Expense Entries** — per-trip/category expense reports with attachments.
- **Project Invoicing** — milestone billing, T&M billing.
- **Subcontracts** — manage external vendors on a project.
- Integration with Dynamics 365 Finance (revenue recognition, GL).

### A.8 Dynamics 365 Commerce / Finance / Supply Chain / HR (ERP siblings)

Note these exist for completeness; they are *not* CRM apps but they share Dataverse and often co-exist with CRM in customer deployments:

- **Dynamics 365 Commerce** — omnichannel retail (POS, e-commerce, B2B portal, store ops).
- **Dynamics 365 Finance** — GL, AR, AP, fixed assets, budgeting, tax engine, multi-entity.
- **Dynamics 365 Supply Chain Management** — inventory, manufacturing (discrete + process), procurement, warehouse management (WMS), transportation management.
- **Dynamics 365 Human Resources** — employee records, benefits, leave, performance.
- **Dynamics 365 Intelligent Order Management**, **Dynamics 365 Business Central** (SMB ERP), **Dynamics 365 Fraud Protection**.

### A.9 Power Platform (the platform layer)

The CRM apps are *built on* this platform; you can build your own apps next to them.

#### Power Apps

- **Model-driven apps** — auto-generated UI from Dataverse schema (forms, views, charts, dashboards, business process flows, business rules, custom controls). The CRM apps themselves are model-driven apps.
- **Canvas apps** — pixel-perfect UI built drag-drop, low-code with formula language (Power Fx).
- **Code apps** (preview) — pro-code Power Apps using TypeScript + popular UI frameworks, deployed in the same env.
- **Custom Pages** — canvas page embedded in a model-driven app.
- **PCF (Power Apps Component Framework)** — custom React/TypeScript controls.
- **AI Builder** — pre-built ML models (form processing, prediction, sentiment, OCR, object detection).

#### Power Automate

- **Cloud flows** — event-driven and scheduled flows; 1000+ connectors; expression language.
- **Desktop flows** — RPA for legacy desktop UIs.
- **Business process flows** — multi-stage user-driven processes (the bar at top of CRM forms).
- **Approvals** — built-in human-in-the-loop step.
- **Process advisor** — task & process mining.
- **AI Builder** integrated into flows.
- **Copilot in flows** — describe a flow in natural language.

#### Power BI

- Self-service BI tightly integrated with Dataverse.
- Embedded in dashboards in CRM apps.
- Dataverse → Microsoft Fabric Direct Lake (no-copy analytics).

#### Power Pages

- Low-code external-facing portals (customer self-service, partner portal, community forum) running on Dataverse with role-based access.

#### Copilot Studio

(Formerly Power Virtual Agents.)

- Author conversational AI agents.
- Topics + entities + slot filling + variables.
- Trigger Power Automate flows from a topic.
- Generative AI fallback (RAG over websites + SharePoint + Dataverse + custom).
- Authoring canvas with no-code authoring + pro-code Bot Framework Composer extension.
- Channels: Teams, web chat, Facebook, custom (Direct Line).
- **Microsoft Dataverse MCP server** (2026) — Dataverse acts as an MCP server so any MCP client (Copilot Studio agents, VS Code GitHub Copilot, Claude desktop, Claude Code) can query/mutate records.

#### Microsoft Fabric integration

- Dataverse data linked to Microsoft Fabric for unified analytics + AI.

### A.10 Microsoft Dataverse (the data layer)

The single data platform under all of this.

- **Tables** (entities) — system tables (Account, Contact…) + custom tables.
- **Columns** (fields) — 30+ types: Text, Number, Currency (with multi-currency), Date, Lookup, Choice (option set), Multi-select Choice, Customer (polymorphic Account/Contact), Owner (polymorphic User/Team), File, Image, Calculated, Rollup, Formula (Power Fx).
- **Relationships** — 1:N, N:1, N:N (intersect tables auto-managed), self-referential, hierarchical.
- **Keys** — primary key + alternate keys.
- **Choices** (global option sets) — reusable across tables.
- **Business rules** — declarative client-side validation + visibility + default logic (no code).
- **Plug-ins** — server-side .NET steps wired to event pipeline (synchronous/async, pre/post stage).
- **Workflows** (legacy) — pre-flow background workflows.
- **Power Fx formulas** in calculated/formula columns.
- **Calculated** + **Rollup** columns — server-side computed.
- **File & Image columns** — blob storage.
- **Auditing** — per-table audit log.
- **Change tracking** — for downstream sync.
- **Data export service** + **Synapse Link** + **Fabric Link** — replicate to data lake / warehouse.
- **Solutions** — packaged units (managed/unmanaged) for ALM. Solutions contain tables/forms/views/automations/security roles/etc.
- **Environments** — isolated tenants (Default, Sandbox, Production, Developer); separate Dataverse DB per env.
- **Security**:
  - Role-based access control (security roles).
  - **Business Units** — hierarchical org structure.
  - **Teams** — owner teams + access teams.
  - **Field-level security** (per column).
  - **Hierarchical security** (manager hierarchy or position-based).
  - **Record sharing** (share with user/team).
- **Dataverse for Teams** — built-in lightweight Dataverse inside Microsoft Teams.
- **Web API** — OData v4 + custom actions/functions; SDK for .NET, JavaScript.
- **Virtual tables** — proxy tables backed by external data sources.
- **Dataverse search** — Lucene-based full-text search across tables.

### A.11 Security, Admin & Governance

- **Security roles** — privilege-level (Create/Read/Write/Delete/Append/AppendTo/Assign/Share) × scope-level (User/Business Unit/Parent BU/Org).
- **Business Units** — hierarchical scoping.
- **Teams** — owner team (own records) + access team (per-record share lists).
- **Field-level security profiles**.
- **Hierarchical security** (manager / position).
- **Record-level sharing**.
- **Auditing** — granular per-table per-column.
- **Data Loss Prevention (DLP) policies** — restrict which connectors can mix in a flow.
- **Customer-managed keys** — bring-your-own-key encryption.
- **Lockbox** — Microsoft engineer access requires customer approval.
- **Compliance** — GDPR / HIPAA / FedRAMP / SOC / ISO frameworks.
- **Solutions ALM**:
  - Managed vs. unmanaged.
  - Solution layering.
  - **Pipelines** for Power Platform — built-in CI/CD between environments.
  - **Power Platform CLI (`pac`)** for export/import + plugin registration.

### A.12 Distinctive primitives worth borrowing

| Primitive | Why it's interesting for our CRM |
|---|---|
| **Business Process Flows** (stage bar with required fields per stage) | Forces consistent process; gates progression; visible to seller. |
| **Connection / Connection Roles** (generic many-to-many with role) | Generic graph-style relationships ("Influencer", "Decision Maker", "Procurement Lead") without bespoke tables. |
| **Polymorphic lookups** (Customer = Account ∪ Contact, Owner = User ∪ Team) | One field that can point to multiple entity types. |
| **Solutions** (deployable packaged units) | Move customizations between environments cleanly. |
| **Business Units + hierarchical security** | Natural multi-team / multi-region scoping without app-level ACL gymnastics. |
| **Rollup columns** | Server-computed aggregates over related records — e.g., "Account Pipeline Value" across Opportunities. |
| **Dataverse search** | Tenant-wide full-text search baked into the platform. |
| **Audit out of the box** | Compliance-grade tracking with no app-level work. |
| **Forecast snapshots** | Store daily forecast snapshots for trend reporting. |
| **Sales Accelerator** (work list + sequences + assistant cards) | Industry-leading "what should I do next" for sellers. |
| **Conversation Intelligence** | Call transcript + sentiment + insights are now table stakes. |
| **Predictive scoring per entity** | Lead score, opportunity score, forecast — these should be pluggable models. |
| **Copilot Studio** (no-code agent authoring) | Future-proofing for chatbot/agent-driven workflows. |

---

## B. Pipedrive

Pipedrive is a sales-first CRM. Its core philosophy: **the deal pipeline is the central UI; everything else (contacts, activities, products, reports) hangs off the deal**. It is opinionated and narrow — you cannot use Pipedrive as a general work management tool, but it nails the sales workflow.

### B.1 Plan structure (2026)

| Plan | Price (annual) | Positioning |
|---|---|---|
| **Lite** | **$14 / seat / mo** | Starter — pipeline + activities + contacts + deals; **no email sync, no automation, no advanced forecasting**. |
| **Growth** | **$34 / seat / mo** | Adds full two-way email sync with open/click tracking, workflow automation, sequences, revenue forecasting, subscription reports, built-in meeting scheduler. |
| **Premium** | (between Growth and Ultimate) | Adds advanced reporting, more workflow recipes, deeper analytics. |
| **Ultimate** | **$69 / seat / mo** | Top-tier — security controls (SSO, IP allow-listing, custom permissions), data enrichment, raised usage limits, dedicated CSM. |

- **14-day free trial** on every plan; no credit card required.
- **Annual billing saves up to 32%** vs monthly.
- **No free plan**.
- (Pipedrive previously published Essential/Advanced/Professional/Power/Enterprise; that 5-tier scheme was consolidated into Lite/Growth/Premium/Ultimate in 2026.)

### B.2 Core CRM modules (in every plan)

- **Pipeline** — visual kanban (drag-drop deals between stages); drag-and-drop pipeline editor; **multi-pipeline** (separate pipelines per business line / product / region).
- **Deals** — value, currency, expected close date, stage, status (Open/Won/Lost/Deleted), products, custom fields, owner, organization, contact, notes, files, activities, emails.
- **Contacts**:
  - **People** — individuals.
  - **Organizations** — companies.
  - Hierarchical org structure (parent/child organizations).
- **Activities** — call, meeting, lunch, task, deadline, email, custom; types are configurable.
- **Activity Calendar** — built-in calendar view of all activities; sync to Google/Outlook calendars (two-way).
- **Products** — product catalog with prices/currencies/tax rules; line items on deals.
- **Notes & Files** — attached to people/orgs/deals/activities.
- **Custom fields** — per entity; types: text, number, monetary, date, time, range, address, phone, email, list, multi-list, relationship, person, organization.
- **Required fields per pipeline stage** — gate stage progression.
- **Won/Lost/Lost reasons** — closing taxonomy.
- **Rotting deals** — deals stuck in a stage past N days flagged red.
- **Multi-currency**.

### B.3 Sales-specific features

- **Sales Inbox** (Professional and up) — bulk-personalize emails to large lists with mail-merge fields; track opens/clicks/replies.
- **Sales Assistant** — adaptive in-app coaching panel with daily nudges (deals to follow up, activities overdue, suggestions to add a contact).
- **Activity Reminders** — email + in-app + mobile push.
- **Deal aging visualization** — color-coded "rot" timer per deal.
- **Goals** — per-rep / per-team revenue & activity targets with progress bar.
- **Quotas / Subscriptions** — recurring revenue tracking on deals (paired with Subscription reports in Insights).

### B.4 Insights, reports & forecasting

- **Insights dashboards** — interactive dashboards built on live pipeline data.
- **Pre-built reports**:
  - Conversion rates per pipeline stage / per rep / per source.
  - Deal velocity / time-in-stage.
  - Revenue forecast (probability-weighted pipeline).
  - Won/Lost analysis by reason.
  - Activity volume per rep.
  - Subscription revenue (MRR/ARR projection).
  - Pipeline health scorecard.
- **Custom reports** with drill-down.
- **Goals tracker** — performance vs target.
- **AI-generated reports** — describe a report in plain English and get the visualization.
- **Export to CSV / Excel / API**.

### B.5 Email & communication

- **Two-way email sync** (Growth+) — Gmail / Outlook / Office 365 / Exchange / IMAP/SMTP.
- **Email open / click tracking** — pixel + redirect.
- **Email templates** — variable substitution from contact/deal fields.
- **Group email** — send to a list (separate threads, not BCC blast).
- **Email scheduling** — send-later.
- **Smart Email BCC** — auto-link emails to a deal via a BCC trick.
- **Built-in meeting scheduler** — Calendly-style booking link.
- **Caller** (paid add-on, included in higher plans) — VoIP click-to-call inside Pipedrive with call recording + auto-logging.
- **SMS** via integration partners.

### B.6 Workflow automation

- **Workflow Automation** (Growth+).
- **Triggers**: deal created/updated/won/lost, person/org created/updated, activity created/marked done, email received/opened/clicked, stage change, time-based.
- **Conditions**: any-field comparison, related-record check.
- **Actions**:
  - Update field.
  - Create activity / note / deal / person / organization.
  - Send email (template).
  - Assign to user.
  - Move pipeline stage.
  - Webhook / API call.
  - Trigger another flow.
- **Sequences** — multi-step automated email + activity cadences (similar to Salesforce sequences).
- **Templates marketplace** — pre-built automation recipes.

### B.7 AI — Pipedrive AI Sales Assistant

- Sentiment analysis on emails.
- Email summarization.
- Recommended next steps per deal.
- AI Email Generator — draft from a prompt + deal context.
- AI Q&A over your data — "What's my biggest deal at risk this week?" returns a real-time answer pulled from Pipedrive records.
- AI report generator — describe a report, get a chart.
- AI lead scoring (in higher plans).

### B.8 Add-ons (paid extras)

Sold separately on top of any plan:

- **LeadBooster** — bundled lead-capture suite:
  - **Chatbot** — embed on website, qualifies visitors via decision tree.
  - **Live Chat** — human handoff from chatbot to a rep on web/mobile.
  - **Web Forms** — embeddable lead capture forms.
  - **Prospector** — outbound B2B database of **400M+ profiles + 10M companies**; credit-based reveal of verified emails / direct phones / social profiles; ICP-based search.
- **Web Visitors** — identify which organizations visit your website (reverse-IP); pages viewed, time on site, source.
- **Smart Docs** — generate documents (proposals, quotes, contracts) pre-filled with CRM data; track recipient opens; e-sign integration.
- **Campaigns** — full email-marketing module:
  - Drag-drop email builder, templates.
  - Segmentation from CRM filters.
  - A/B subject lines.
  - Automation flows (welcome / nurture).
  - Send analytics (open/click/bounce/unsub).
- **Projects** — post-deal project management:
  - Kanban boards for project tasks.
  - Templates for repeatable delivery flows.
  - Timeline / Gantt view.
  - Subtasks, dependencies, milestones.
  - Convert won deal → project automatically.
- **Workflow Automation extra capacity** — buy higher automation run limits.

### B.9 Marketplace, mobile, API & integrations

- **500+ integrations** in the Marketplace: Mailchimp, QuickBooks, Slack, Zoom, Google Workspace, Asana, Trello, DocuSign, Stripe, Xero, Zapier, Make, etc.
- **REST API** + **Webhooks**.
- **iOS + Android** mobile apps with offline mode, voice-to-text notes, business card scanner, in-app calling.
- **Browser extensions** for Gmail/Outlook web — sidebar with deal context inside the inbox.
- **Public API** with generous rate limits.

### B.10 Distinctive primitives worth borrowing

| Primitive | Why it's interesting |
|---|---|
| **Pipeline-first UI** | Visual kanban with totals per stage is the cleanest sales UX out there. Hard to beat for adoption. |
| **Multi-pipeline** | A company often has multiple sales motions (new logo / renewal / partner). One pipeline doesn't fit all. |
| **Required fields per stage** | Forces data quality without an admin process. Best-in-class implementation. |
| **Rotting deals** | A simple, visual signal that a deal is stale — deceptively powerful. |
| **Smart Email BCC** | Lowest-friction way to associate emails with deals — works with any email client. |
| **Sales Assistant nudges** | An always-on coach that works across deals, contacts, activities. |
| **Activity-first model** | Every interaction (call, meeting, email, task) is a first-class entity. Great for activity-based sales coaching. |
| **Smart Docs** as a first-class module | Quote/proposal generation should NOT be a Word template afterthought. |
| **LeadBooster bundle** | Inbound lead capture (forms + chatbot + chat) belongs in CRM, not in a separate marketing app. |
| **Prospector / B2B database** | Outbound prospecting inside the CRM is a massive value-add. (Though we won't replicate the data; we'll integrate with Apollo / ZoomInfo / etc.) |

---

## C. Monday.com Sales CRM

Monday's CRM is an *application* of its broader Work OS. The data model is **boards (tables)** + **items (rows)** + **columns (typed cells)** + **relations between boards**. Where Salesforce/Dynamics ships a fixed schema, Monday ships a *kit of building blocks* and templates that the customer rearranges.

### C.1 Plan structure

monday CRM (separate from monday Work Management) ships in plans:

- **Basic** — basic CRM features.
- **Standard** — adds email & activities tracking.
- **Pro** — adds email sequences (added 2026), AI, advanced reporting.
- **Enterprise** — security, governance, scale (now up to 1M items per board on the 2026 roadmap).

### C.2 Boards-as-CRM core

The CRM template ships with these boards:

- **Leads** — pre-qualified prospects.
- **Contacts** — people.
- **Accounts** — organizations.
- **Deals** — opportunities.
- **Activities** — calls / meetings / tasks / emails.
- **Sales pipeline** — deal stages as Status column with kanban view.
- **Quotes & Invoices** (templates).
- **Custom boards** — anything else (orders, contracts, partners, churn watchlist…).

Items can be **linked across boards** via the **Connect Boards** column, and data from connected boards can be reflected via **Mirror** columns. This is the platform's relational primitive.

### C.3 Column types catalog

monday's column types are the design vocabulary. The full list (April 2026):

- **Status** — color-coded enum (e.g., Working on it / Stuck / Done).
- **Text** — short text.
- **Long Text** — multi-line text with formatting.
- **Number** — numeric with optional units / formatting.
- **Date** — single date with optional time.
- **Timeline** — start–end date range.
- **People** — assign one or more users (board members).
- **Email** — email address with mailto link.
- **Phone** — phone with click-to-call.
- **Location** — address with map embed.
- **Country** — country picker.
- **Hour** — time of day.
- **World Clock** — timezone display.
- **Files** — file uploads (attached to row).
- **Tags** — global tags (cross-board).
- **Dropdown** — single or multi-select from a value list.
- **Checkbox** — boolean.
- **Rating** — 1–5 stars.
- **Vote** — board members upvote a row.
- **Color picker** — pick a color value.
- **Link** — URL with display text.
- **Auto Number** — auto-incrementing integer.
- **Item ID** — system-managed unique ID.
- **Last Updated** — system column showing the latest edit timestamp.
- **Creation Log** — system column showing creator + creation timestamp.
- **Time Tracking** — start/stop a timer on an item; logs billable durations.
- **Dependency** — depends-on / blocked-by relationships between items in the same board.
- **Connect Boards** — link an item to one or more items in *another* board (the relational primitive).
- **Mirror** — read-only column that reflects the value of a column on a connected item (one-hop or multi-hop).
- **Formula** — Excel-like formula computed across columns of the same item; supports **Mirror columns and most other types** (Status, Text, Number, Date, Dropdown, Email, Phone, Rating, Timeline, Time Tracking, Vote, Person, World Clock, Country, Last Updated, Creation Log, Item ID, Hour, Long Text, Connect Boards, Numbers, Color picker, Check). [Note: subitem-mirror in formulas has long been a community-requested feature.]
- **Progress** — % bar derived from other Status columns.
- **Subitems** — hierarchical child items under a parent item.
- **Updates** — comment thread per item (not technically a column but adjacent UX).

The combination of **Connect Boards + Mirror + Formula** gives a low-code data model that approximates a relational schema with computed columns.

### C.4 Views

Each board can have multiple views simultaneously:

- **Main / Table view** — spreadsheet.
- **Kanban** — group by Status column; drag between columns; **per-stage value totals** at the bottom of each column.
- **Timeline / Gantt** — date range columns visualized.
- **Calendar** — date columns laid out as a calendar.
- **Chart** — bars / pies / lines / scatter from board data.
- **Map** — Location column plotted geographically.
- **Form** — auto-generated lead capture form that creates items in the board.
- **File Gallery** — visual gallery of file column attachments.
- **Workload** — capacity heatmap per Person column.
- **Cards** — pinterest-style.
- **Embed** — embed an external URL inside the board.
- **Custom view** — built via a marketplace app.

### C.5 Automation recipes

monday's automations are template-based ("when X happens, do Y") **recipes**:

- Triggers: status changes, date arrives, item created, person assigned, column changes, item moved, time interval, integration event.
- Conditions: any column comparison.
- Actions:
  - Change status / column / assignee.
  - Move item to group / board.
  - Create item / subitem.
  - Notify person / channel.
  - Send email (via Gmail/Outlook integration).
  - Create event (Google Calendar / Outlook).
  - Run integration recipe.
  - Trigger another automation.

CRM-specific shipped recipes include:

- Lead assignment by round-robin / by territory / by lead score.
- Task creation when a deal moves to a stage.
- Email alerts on deal milestones.
- Stage updates on activity completion.
- Mass email merge (Pro+).

### C.6 CRM-specific features

- **Lead capture forms** — auto-generated per-board form (no-code) embeddable on a website.
- **Lead scoring column** — formula + conditional coloring computes a score from title + company size + license interest etc.
- **Duplicate detection** — automated + manual de-dup tools on contact/account boards.
- **15 dedicated columns on the Leads board** — Status, Name, Company, Email, Phone, Title, Source, Owner, Score, Estimated value, Created date, Last contact, Notes, Files, Tags (template default).
- **7 dedicated columns on the Deals board** — Deal value, Expected close date, Close probability, Forecast value (= value × probability, formula), Stage, Owner, Account.
- **Quote builder** — generate quotes from deal + product line items.
- **Sales pipeline templates** — pre-built CRM templates for common motions.
- **Account 360** (2026 roadmap) — unified customer view across all related boards.
- **Zero Update CRM** (2026 roadmap) — automated data entry from connected systems (ditches manual updates).

### C.7 Email integration & email tracking

- **Native Gmail + Outlook integration** — bi-directional sync of email threads onto contact/deal items.
- **Email & activities item view** — a side panel on each item that shows all emails + meetings + calls.
- **Mass email** — send the same email to a filtered list of items.
- **Mail merge** — variable substitution from columns.
- **AI Email Composer** — generate emails from prompts + item context.
- **Email sequences** (Pro plan, added 2026) — multi-step nurture/cadence sequences.
- **Open / click / reply tracking** on tracked emails.

### C.8 AI features

- **monday AI** — write / translate / summarize / suggest in updates (the comment threads on items).
- **AI Email Composer** — generate sales emails from item context.
- **AI Formula Generator** — describe a formula in natural language; monday writes the Power-Fx-like expression.
- **AI Automations Builder** — describe an automation in natural language; monday assembles the recipe.
- Roadmap (2026): AI agents that watch a board and act on it autonomously (Zero Update CRM is a precursor).

### C.9 Dashboards, widgets & reports

- **Dashboards** are separate artifacts from boards, aggregating across multiple boards.
- **15+ widget types**:
  - Numbers (KPI tile).
  - Battery (progress).
  - Chart (bar / line / pie / area / scatter / funnel).
  - Pivot.
  - Timeline.
  - Calendar.
  - Workload.
  - Map.
  - Goals.
  - Quote of the day.
  - Embed (external URL).
  - Time Tracking.
  - Live Stream (web-cam).
  - Q&A.
  - Country (heatmap).
- **Filters** at the dashboard level apply across widgets.
- **Public links / share** + embed dashboards in external sites.

### C.10 Workforms, Workdocs, Updates, Files

- **Workforms** — standalone form builder (separate from board form views) with branching, file uploads, conditional logic.
- **Workdocs** — collaborative documents (Notion-style) with embedded boards, charts, items.
- **Updates** — comment thread per item (mention, react, reply, file attach).
- **Files** — file column + file gallery view + version history.

### C.11 monday DB / WorkCanvas — the platform layer

- **monday DB** — the underlying database engine that backs boards (revamped 2023+ for higher item counts).
- **monday Apps Framework** — build & publish apps to the marketplace using JavaScript / React.
- **monday Code** — host Node.js custom backends inside monday's infra.
- **monday GraphQL API** — query/mutate boards, items, columns, automations.
- **WorkCanvas** — companion whiteboarding product (related to FigJam).

### C.12 Integrations & Apps Marketplace

- **200+ native integrations** out of the box (Outlook, Gmail, Slack, Zoom, Quickbooks, Google Workspace, Docusign, HubSpot, Salesforce, Mailchimp, Twilio, Stripe, GitHub, Jira, Microsoft Teams…).
- **Apps Marketplace** — extension apps published by 3rd parties, installable into a board (custom views, custom widgets, custom automations).
- **Webhooks** + **Integration recipes** ("When email arrives, create item").
- **Public API** (GraphQL).

### C.13 2026 roadmap signals

- **1 Million items per board capacity** (up from ~50k historic limit) — moves Monday into enterprise data scale.
- **Zero Update CRM** — autonomous data entry from connected source systems.
- **Account 360** — unified customer view widget that pulls across boards.
- **Email sequences in Pro plan**.
- **More AI agents** — autonomous board-watchers.

### C.14 Distinctive primitives worth borrowing

| Primitive | Why it's interesting |
|---|---|
| **Boards as a generic data primitive + typed columns** | This is what makes monday flexible — every "module" is the same primitive with a different schema. For our CRM, custom-modules-as-boards would let users build their own pipelines (e.g., a Recruiting pipeline) without us shipping a Recruiting module. |
| **Connect Boards + Mirror columns** | Cleanest UX for cross-table relations and computed reflected values I've seen. Better than Salesforce lookup fields + roll-ups in many ways. |
| **Formula column** with a wide type system | Lets users create computed business logic (forecast value = deal value × probability) without code. |
| **Recipe-based automations** ("When X, do Y") | Far easier for non-developers than visual flowchart automation. |
| **Per-stage value total at the bottom of each kanban column** | Tiny but high-value UX — sellers see deal values rolling up live. |
| **Multi-view per board** (Table, Kanban, Calendar, Gantt, Map, Form, Chart) simultaneously | Same data, many lenses. Scales beautifully. |
| **Form view auto-generated from board schema** | Lead capture form for free without a separate form builder. |
| **Updates** (comment thread per item) | Cleaner than Salesforce Chatter or Dynamics Notes — every record has a forum. |
| **AI Formula / AI Automation natural-language authoring** | Removes the biggest friction in low-code (figuring out the syntax). |

---

## D. Cross-vendor synthesis for our self-built CRM

Lessons that this trio teaches us:

### Architecture-shaping decisions

1. **Decide where you sit on the rigid ⇄ flexible axis.**
   - Dynamics is rigid + deep (fixed schema, deep features).
   - Pipedrive is rigid + narrow (fixed schema, sales only).
   - Monday is flexible + shallow (user-defined schema, generic features).
   - The rare winning move is **rigid + deep for the core motion, with flexible "custom modules"** for everything outside it (Salesforce learned this with Custom Objects, Dynamics with Dataverse custom tables, HubSpot with Custom Objects). We should plan for **fixed first-class entities (Lead/Contact/Account/Deal/Quote/Order/Invoice/Activity) plus a "Custom Modules" feature backed by a typed-column system**.

2. **Pick a relational primitive early.**
   - Dynamics has polymorphic lookups (Customer = Account∪Contact) + Connection Roles.
   - Monday has Connect Boards + Mirror columns.
   - Pipedrive has rigid 1:N foreign keys.
   - **Recommendation:** support all three — typed FKs, polymorphic FKs, and a generic "Relationship" entity for free-form connections (the "decision maker" / "influencer" pattern from Dynamics' Connection Roles).

3. **Activities are first-class citizens.**
   - All three model activities (calls / meetings / emails / tasks) as their own entity, polymorphically attachable to any other record. Don't build calls and meetings as separate modules — build a single Activity entity with subtype.

4. **Multi-pipeline must be first-class.**
   - One company → many sales motions. Pipedrive nailed this. Salesforce/Dynamics force record-type gymnastics. **Our Deal entity should support multiple Pipelines, each with its own Stages.**

5. **Required fields per stage.**
   - Pipedrive's "required-fields-to-progress" pattern is best-in-class for data quality without an admin process. **Should be a first-class feature of the Pipeline configuration.**

6. **Rolling/aggregated columns.**
   - Both Dynamics (Rollup) and Monday (Mirror + Formula) compute server-side aggregates. We need: **per-record formula columns + per-record rollup columns over related records**.

7. **Workflow automation as a recipe builder.**
   - Monday's recipe model ("When X, do Y") is the easiest. **Build the automation engine recipe-first; add visual flowchart later if needed.**

8. **Audit + change tracking out of the box.**
   - Dataverse audits per-record per-column with no app-level work. Bake this in from day one.

### Module-shaping decisions

| Module | Must-have | Nice-to-have | Skip in v1 |
|---|---|---|---|
| **Sales pipeline** | Multi-pipeline, drag-drop kanban, required fields per stage, rotting deals, won/lost reasons, multi-currency | AI deal scoring, forecast snapshots, sales accelerator-style work list | Dynamics-level Sales Hub workspace with deep Outlook embedding |
| **Contacts/Accounts** | People + Orgs with parent-child orgs, custom fields, polymorphic activity attachment, dedupe | Connection Roles (generic decision-maker graph), org-chart visualization, social profile enrichment | LinkedIn Sales Navigator embed |
| **Activities** | Single Activity entity with subtypes (call/meeting/email/task), calendar sync | Auto-capture from Outlook/Gmail, voice-to-text on mobile, business card OCR | Dynamics-level conversation intelligence (call recording + transcription + sentiment) |
| **Quotes / Orders / Invoices** | Quote lifecycle (draft → sent → accepted), product line items, PDF generation, e-sign integration | Quote versions, approval workflows, recurring/subscription invoices | Tax engine; integrate with Stripe/Xero/QuickBooks instead |
| **Products & Pricing** | Product master, price lists by currency, line-item discount, tax | Product bundles, volume discount tiers, unit conversion | Manufacturer/SKU/multi-location inventory |
| **Forecasting & Reports** | Pipeline value, conversion rate, deal velocity, win-rate, revenue forecast (probability-weighted), goals & quotas | Forecast snapshots, AI predictive forecast, AI report generator | Power-BI-grade BI canvas |
| **Email & calendar** | Two-way Gmail/Outlook sync, open/click tracking, templates, group send (mail merge), meeting scheduler, BCC trick | Sequences (multi-step cadences), AI email composer, signature/availability detection | Built-in inbox client |
| **Lead capture** | Embeddable form, custom-field mapping, dedupe rules, source tracking | Chatbot, live chat, web-visitors (reverse-IP), B2B database (integrate with Apollo/ZoomInfo) | Native B2B database |
| **Workflow automation** | Recipe builder, time-based triggers, webhook actions, conditions on any field | Branching flows, approval steps, AI flow generator, RPA | Process advisor/mining |
| **Customer service / cases** | Case entity, queues, SLAs (basic), knowledge base, email-to-case | Omnichannel chat/voice/SMS, AI deflection (chatbot), CSAT surveys | Field service / IoT |
| **Dashboards & reports** | Dashboard composer with widgets (number, chart, list, gauge), filters, scheduled email digest | Pivot, map, workload, public-link share, embed | Full BI tool |
| **Mobile** | Read+write iOS+Android with offline mode, push notifications, voice-to-text notes, business-card OCR | AR / mixed reality | Field Service mobile depth |
| **Marketing (basic)** | Segment + email blast + drip nurture sequence, double opt-in, unsubscribe management | Real-time event-triggered journeys, SMS/push channels, AI segment generator | CDP-grade unified profile |
| **CDP / unified profile** | — | Identity stitching across channels, event timeline | Full CDP (Customer Insights – Data depth) |
| **Custom modules** | User-defined entities with typed columns + custom relationships + custom views | Formula + rollup columns, AI-assisted schema design | Full Power Apps clone |
| **Integrations** | REST + GraphQL APIs, webhooks, Zapier/Make, Gmail/Outlook calendar sync, Stripe, Slack | Marketplace for 3rd-party apps | Power Platform connector library |
| **Security** | RBAC, per-record ownership, team scoping, audit log, SSO, API keys | Field-level security, hierarchical security, customer-managed encryption keys | Lockbox / FedRAMP compliance |
| **AI** | AI assistant (chat over your CRM data), email composer, lead scoring | Conversation intelligence, predictive opportunity scoring, autonomous agents (Sales Qualification) | Full Copilot Studio agent authoring |

### Pricing model lesson

All three vendors price per-seat per-month with annual discount; Pipedrive is the simplest at 4 plans. **Recommendation: 3-tier (Free Starter / Growth / Enterprise) per-seat with paid add-on model for Marketing, Field Service, Project Operations** so the core CRM stays affordable while heavy modules are opt-in.

---

## Sources

### Microsoft Dynamics 365

- [Dynamics 365 Sales overview — Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/sales/overview) (2026-04-24)
- [Dynamics 365 Sales 2026 Release Wave 1 plan — Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/release-plan/2026wave1/sales/dynamics365-sales/planned-features)
- [Dynamics 365 Sales 2025 Release Wave 2 plan — Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/release-plan/2025wave2/sales/dynamics365-sales/planned-features)
- [Dynamics 365 2026 release wave 1 plan — Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/release-plan/2026wave1/)
- [D365 Sales: Top 2026 Wave 1 Features — Hubsite365](https://www.hubsite365.com/en-ww/crm-pages/2026-release-wave-1-d365-sales.htm)
- [Dynamics 365 Customer Insights overview — Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/customer-insights/overview)
- [Customer Insights and Journeys product page — Microsoft](https://www.microsoft.com/en-us/dynamics-365/products/customer-insights)
- [Microsoft Dataverse — Power Platform](https://www.microsoft.com/en-us/power-platform/dataverse)
- [Connect to Dataverse with Model Context Protocol (MCP) — Microsoft Learn](https://learn.microsoft.com/en-us/power-apps/maker/data-platform/data-platform-mcp)
- [Sales Accelerator with Sales Enterprise license — Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/sales/digital-selling-sales-accelerator)
- [Sell Smarter: What's New in Dynamics 365 Sales Accelerator with AI and Copilot — JourneyTEAM](https://www.journeyteam.com/resources/blog/whats-new-in-dynamics-365-sales-accelerator-with-ai-and-copilot/)
- [Dynamics 365 Sales product page — Microsoft](https://www.microsoft.com/en-us/dynamics-365/products/sales)
- [Dynamics 365 Sales Features — G2](https://www.g2.com/products/dynamics-365-sales/features)
- [Microsoft Dynamics 365: The Ultimate Guide in 2026 — Microtek Learning](https://www.microteklearning.com/blog/microsoft-dynamics-365/)
- [Exploring Microsoft Dynamics 365 Modules (2026 Guide) — OMI](https://www.omi.co/microsoft-dynamics/microsoft-dynamics-365-modules-2026/)
- [Dynamics 365 Features, Modules & Capabilities (2026) — TEC](https://www3.technologyevaluation.com/selection-tools/features-list/48661/microsoft-dynamics-365)

### Pipedrive

- [Pipedrive Pricing](https://www.pipedrive.com/en/pricing)
- [Pipedrive Insights and Reports](https://www.pipedrive.com/en/features/insights-and-reports)
- [Pipedrive Sales Assistant — Knowledge Base](https://support.pipedrive.com/en/article/sales-assistant)
- [Pipedrive Sales Automation](https://www.pipedrive.com/en/blog/sales-automation)
- [Pipedrive LeadBooster Add-on — Knowledge Base](https://support.pipedrive.com/en/article/leadbooster-add-on)
- [Pipedrive LeadBooster Lead Generation](https://www.pipedrive.com/en/features/lead-generation-software)
- [Pipedrive LeadBooster blog post](https://www.pipedrive.com/en/blog/leadbooster)
- [Pipedrive Sales and Marketing Automation Guide 2026](https://www.pipedrive.com/en/blog/sales-and-marketing-automation)
- [How Much Does Pipedrive Cost in 2026? — Axis Consulting](https://axisconsulting.io/pipedrive-pricing-plans/)
- [Pipedrive Pricing 2026 — CheckThat.ai](https://checkthat.ai/brands/pipedrive/pricing)
- [Pipedrive Pricing 2026 Plans, Costs & AI Features — EngageBay](https://www.engagebay.com/blog/pipedrive-pricing)
- [Pipedrive Reviews, Pricing & Features (2026) — SalesHive](https://saleshive.com/vendors/pipedrive/)
- [Pipedrive add-ons — Solvaa](https://solvaa.co.uk/exploring-pipedrives-add-on-features-with-expert-insights-from-a-pipedrive-consultant/)

### Monday.com Sales CRM

- [monday CRM product page](https://monday.com/crm)
- [monday CRM Ultimate — Support](https://support.monday.com/hc/en-us/articles/360013494979-monday-CRM-Ultimate)
- [Lead management with monday CRM — Support](https://support.monday.com/hc/en-us/articles/360008648359-Lead-management-with-monday-CRM)
- [Sales pipeline management with monday CRM — Support](https://support.monday.com/hc/en-us/articles/360013348719-Sales-pipeline-management-with-monday-CRM)
- [What's new — monday CRM](https://monday.com/crm/whats-new)
- [Available column types on monday.com — Support](https://support.monday.com/hc/en-us/articles/115005310285-Available-column-types-on-monday-com)
- [The Mirror Column — Support](https://support.monday.com/hc/en-us/articles/360001733859-The-Mirror-Column)
- [Multi-board mirroring — Support](https://support.monday.com/hc/en-us/articles/4403442212498-Multi-board-mirroring)
- [The Formula Column — Support](https://support.monday.com/hc/en-us/articles/360001235445-The-Formula-Column)
- [How (and why) to Use Monday's Connect Boards Column — MondayWiki](https://mondaywiki.com/how-and-why-to-use-monday-coms-connect-boards-column/)
- [What is CRM Automation? — monday Blog](https://monday.com/blog/crm-and-sales/crm-automation/)
- [Monday CRM Review 2026 — CRM.org](https://crm.org/news/monday-crm-review)
- [Monday CRM Review 2026 — Lightfield](https://lightfield.app/blog/monday-crm-review)
- [Monday Sales CRM Reviews, Pricing & Features 2026 — SalesHive](https://saleshive.com/vendors/monday-sales-crm/)
- [Monday Sales CRM review 2026 — TechRadar](https://www.techradar.com/reviews/monday-sales-crm-review)
- [monday.com 2026 CRM and Service Roadmap — Fruition Services](https://www.fruitionservices.io/post/monday-crm-service-2026-roadmap)
