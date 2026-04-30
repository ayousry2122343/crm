# Open-Source CRMs — Architectural Reference for Self-Build

**Purpose**: We are building a self-hosted CRM in Node.js (backend) + Vue (dashboard) + a marketing website. This document extracts module structures, data models, tech stacks, and architectural patterns from seven leading open-source CRMs. Unlike proprietary CRMs (Salesforce, HubSpot, Zoho), open-source CRMs let us study exact schemas, REST/GraphQL surfaces, and engineering decisions — making this the most actionable reference for our build.

**Targets covered**: Odoo, SuiteCRM, EspoCRM, Vtiger, Twenty, CiviCRM, Mautic.

---

## 0. Cross-Project Comparison (TL;DR)

| CRM            | Stack                                  | License | Killer Feature                                  | Most Relevant To Us                            |
|----------------|----------------------------------------|---------|--------------------------------------------------|------------------------------------------------|
| **Odoo**       | Python + PostgreSQL + Owl.js (front)   | LGPLv3 (Community) / Proprietary (Enterprise) | Universal `res.partner`, full ERP suite, mail.thread mixin | Module composition, automation engine pattern |
| **SuiteCRM**   | PHP 8 + MySQL/MariaDB/MSSQL            | AGPLv3  | Studio + Module Builder, AOW workflow, AOS sales pack | Module-driven schema, Studio/low-code patterns |
| **EspoCRM**    | PHP 8.3 + MySQL/MariaDB/PostgreSQL     | AGPLv3 (free)  | Metadata-driven Entity Manager, Formula scripting, Kanban | Universal entity definitions in JSON/metadata; minimalism|
| **Vtiger**     | PHP + MySQL                            | Vtiger Public License / Open-Source | One Pilot all-in-one (Sales/Help/Marketing/Inventory) | Pricelist + Inventory + CRM coupling |
| **Twenty**     | NestJS + PostgreSQL + Redis + BullMQ + React + GraphQL | AGPLv3 | API-first, code-as-config, GraphQL, modern UX | **DIRECT REFERENCE — same stack we're building** |
| **CiviCRM**    | PHP + MySQL (runs on Drupal/Joomla/WP/Standalone) | AGPLv3 | Constituent/contribution model, event/membership management | Multi-relationship contact records |
| **Mautic**     | PHP 8 + Symfony + MySQL                | GPLv3   | Visual campaign flow builder, lead points/scoring, dynamic content | Marketing automation engine pattern |

---

## A. Odoo (CRM + Adjacent Business Apps)

### A.0 Snapshot
- **Repo**: https://github.com/odoo/odoo
- **Stack**: Python 51.7%, JavaScript 44.1% (Owl.js framework), SCSS, PostgreSQL 12+
- **License**: LGPLv3 (Community Edition); Enterprise Edition is proprietary subscription
- **Architecture**: Modular monolith. Core ORM in `/odoo`, ~3000 business modules in `/addons`.
- **Why we care**: Odoo is the most complete reference for "CRM as part of an integrated business suite." Its module composition pattern (you install only what you need; modules declare dependencies on other modules) is a reference for how to grow our system from a CRM into a wider platform without becoming a tangle.

### A.1 CRM App (`crm` module)
- **Pipeline (Kanban view of opportunities)** — drag-and-drop between stages, expected revenue per column, total per stage, view-by-team filters
- **Leads** — disabled by default; when enabled, separates lead-qualification from opportunity work. Both stored in single object `crm.lead`, distinguished by `type` field (`lead` vs `opportunity`). Stage progression converts lead → opportunity.
- **Customers** — universal partner records (`res.partner`); same record holds B2C contacts, B2B companies, vendors, employees, addresses (parent/child structure with type)
- **Activities** — typed activities (To Do, Email, Call, Meeting, Document) with planned date, summary, owner, deadline; activities widget shown per record across the entire system via the `mail.activity.mixin`
- **Quotations** (linked to Sales) — convert opportunity to quote with single click
- **Reporting** — pipeline analysis (won/lost/in-progress), win rate, expected revenue forecast, sales cycle, source/medium/campaign attribution (UTM)
- **Lost Reasons** — configurable list (`crm.lost.reason`) with categorization
- **UTM Tracking** — Source, Medium, Campaign on every lead/opportunity
- **Lead Scoring** — rules engine (`crm.lead.scoring.rule`) evaluates leads against conditions; sums points; threshold-based assignment to teams/users
- **Lead Mining** (paid module `crm_iap_mine`) — purchase pre-enriched leads from Odoo's database by industry/country/role
- **Reveal** (paid `crm_iap_lead`) — identify anonymous website visitors and create leads from them
- **Predictive Lead Scoring** (Enterprise) — ML model trained on closed-won/lost history
- **Gamification** — leaderboards, badges, challenges per sales team

### A.2 Sales App (`sale_management` + `sale`)
- **Quotations** — multi-product line items, taxes, discounts (line + global), terms & conditions, validity date, optional delivery date, attachments
- **Sales Orders** — confirmed quotation; auto-creates delivery order (Inventory) and customer invoice (Accounting) on confirmation
- **Products** (`product.template` + `product.product`) — variants (color × size matrix), categories, tags, attributes, sales descriptions, images, internal references, barcodes, pricing (cost, sales price), tax rules
- **Pricelists** — base price list + currency-specific + customer-specific + quantity-tier discounts; formula-based or fixed
- **Variants** — multi-attribute (color × size × material) explosion into product.product rows
- **Discount** — line discount %, global discount, coupon module
- **Coupons & Loyalty** (`loyalty`) — promo codes, gift cards, loyalty points, "buy X get Y free" rules
- **eSign** (`sign`) — drag-drop e-signature placement, multi-signer, audit trail, certificate of completion

### A.3 Adjacent CRM-Suite Apps
**Marketing**
- `marketing_automation` — visual workflow builder for cross-channel journeys (email + SMS + tasks + tags + delays + branching)
- `mass_mailing` (Email Marketing) — drag-drop email designer (Snippet system), A/B testing, blacklists, bounces, unsubscribe tracking
- `mass_mailing_sms` — bulk SMS via providers (Odoo IAP, Twilio)
- `social` (Social Marketing) — schedule + publish posts to Facebook, Instagram, LinkedIn, X, YouTube; reply to comments inline
- `event` — event creation, ticketing (paid), schedule, exhibitors, sponsors, registrations, badges, attendance tracking
- `survey` — multi-question types (text, MC, scale, matrix), conditional logic, embed in mail/portal, scoring (quizzes/certifications)

**Service**
- `helpdesk` — multi-team ticket queues, SLA, escalations, satisfaction rating, knowledge base integration, after-sales (returns, refunds, repair)
- `livechat` — website chat widget, canned responses, transfer between operators, integration with helpdesk to convert chat → ticket
- `members` — membership management (validity periods, renewals, online portal)

**Project**
- `project` — projects with Kanban tasks, Gantt timelines, recurring tasks, sub-tasks, milestones, dependencies, customer portal access
- `hr_timesheet` — time tracking on tasks; integrates with project + invoicing for billable hours

**Finance**
- `account` (Accounting) — full double-entry accounting, invoicing, vendor bills, bank statements, reconciliation, financial reports, multi-currency, multi-company, tax engine
- `sale_subscription` — recurring billing, MRR/ARR dashboards, upgrades/downgrades/churn
- `account_payment` — Stripe, PayPal, Adyen, Authorize.net, etc.

**Knowledge & Documents**
- `knowledge` — wiki-style hierarchical articles with rich text, embeds, sharing
- `documents` — file management with rules-based auto-classification, OCR, full-text search, tags

**Commerce & Web**
- `website` — drag-drop site builder, themes, multi-website, multi-language, blog, forum
- `website_sale` (eCommerce) — product catalog, cart, checkout, payment, customer accounts, abandoned cart recovery, shipping connectors, product pages
- `pos` — Point of Sale (touch UI for retail/restaurant), offline mode, hardware integration (cash drawer, scale, scanner, printer)

**Inventory & Manufacturing**
- `stock` (Inventory) — multi-warehouse, locations, putaway/removal strategies, lots/serials, transfers, adjustments
- `mrp` (Manufacturing) — BoM, work orders, work centers, routings, capacity planning, MRP-II
- `purchase` — RFQ → PO → receipts; vendor catalogs

**HR**
- `hr` — employee records, contracts, leaves, expenses, attendances, appraisals
- `hr_recruitment` — job postings, applicant tracking, kanban pipeline per job
- `hr_payroll` — multi-localization payroll (Enterprise)

### A.4 Cross-Cutting Platform Features (the most copyable patterns)
- **Studio** (Enterprise) — low-code customization: add fields, modify views, automate, create reports without code
- **Discuss** (`mail` module — *the chatter*) — internal social wall on every record showing message log, activities, followers, file attachments, mentions; the user-visible feature, but the underlying mechanism is the **`mail.thread` mixin** which any model can inherit to gain logging/notifications/activities for free
- **Activities widget** — universal across all records; activities are typed (Email/Call/Meeting/To-Do/document upload), have due dates, owner, summary, are sorted by overdue/today/planned in dashboards
- **Email Gateway** — incoming email aliases (`sales@`, `support@`) automatically create or update records; IMAP/POP polling or SMTP hooks
- **Automated Actions** — admin configurable: trigger (on creation/update/time-based), conditional filter, server actions (update fields, send email, run Python code, create activity, send Slack message, etc.)
- **Server Actions** — reusable code that admin can attach to buttons or automated actions; written in safe-Python sandbox
- **Scheduled Actions (cron)** — periodic background jobs visible/configurable from admin
- **Reports** — server-side QWeb templates render PDF reports (invoices, quotes, picking slips, etc.)
- **Dashboards** — drag-drop dashboard builder with charts, filters, action buttons
- **Pivot/Graph views** — every list view has a pivot mode (Excel-like) and graph mode (bar/line/pie); user-saved configs; CSV export
- **List views** — inline-editable spreadsheet-style with grouping, filters, sorts, conditional formatting
- **Form views** — declarative XML-based form layouts; admin-customizable; Studio drag-drop
- **Search panel & filters** — saved filters per user; favorites; global search

### A.5 Data Model Worth Noting
- **`res.partner`** — the universal contact. *One entity for B2C contact, B2B company, vendor, supplier, employee, branch.* Distinguished by `is_company` (boolean), `parent_id` (parent company for contact-of-company), `type` (contact / invoice / delivery / other / private address)
- **`crm.lead`** — single object for both leads and opportunities. `type` field disambiguates. Stages, kanban_state, expected_revenue, probability, day_open, day_close
- **`crm.team`** — sales team (members, dashboard, alias for incoming email)
- **`crm.tag`** — simple tagging (M2M to leads)
- **`crm.lost.reason`** — categorized lost reasons
- **`mail.activity`** — universal activity record (M2O to res_model + res_id polymorphic)
- **`mail.message`** — universal log/chatter entry (also polymorphic)
- **`mail.followers`** — who gets notified for changes to a record
- **`mail.alias`** — incoming email alias creates/updates records

### A.6 Architectural Patterns to Adopt
1. **Universal contact (`res.partner`)** — avoid Lead/Contact/Account separation when possible (Twenty CRM also adopts this — see §E)
2. **Mixin pattern for cross-cutting concerns** — `mail.thread` adds chatter+activities+followers to any model in one line. Equivalent in our Node stack: NestJS module mixins or decorators that auto-register hooks
3. **Polymorphic activity log** — `(res_model, res_id, message_type, body, author_id, date)`. One table for all chatter, queryable per record by composite key
4. **Email alias → record creation** — automated lead/case generation from incoming email
5. **Action types: Server / Automated / Scheduled** — three flavors of automation cover almost all needs

---

## B. SuiteCRM (fork of SugarCRM CE 6.x)

### B.0 Snapshot
- **Repo**: https://github.com/salesagility/SuiteCRM
- **Stack**: PHP 8.1-8.4 (71.7%), JavaScript 15.4%, Smarty templates 5.4%, MySQL/MariaDB/MSSQL
- **License**: AGPLv3
- **Architecture**: Module-driven MVC. Each module is a folder under `/modules` with vardefs.php (schema), metadata (views), language files, controllers
- **Heritage**: forked from SugarCRM CE in 2013 when Sugar dropped CE; SugarCRM was the original "open Salesforce alternative" of the 2000s

### B.1 Standard Modules
- **Accounts** — companies; parent/child accounts
- **Contacts** — individuals; linked to accounts via account_id
- **Leads** — separate from contacts; convert lead→contact+account+opportunity via Convert Lead workflow
- **Opportunities** — sales deals; sales stage, probability, amount, expected close
- **Quotes** — line items, taxes, shipping, billing/shipping addresses, PDF generation
- **Products** — catalog (`AOS_Products`)
- **Product Categories** — hierarchical
- **Contracts** — agreements with start/end, renewal terms, attached docs
- **Cases** — customer support tickets
- **Bugs** — bug tracking (priority, severity, found in version, fixed in version)
- **Projects** — `Projects` module with `Project Tasks`, Gantt view
- **Documents** — file management with revisions
- **Emails** — inbound/outbound; integrates with email accounts via IMAP
- **Calls / Meetings** — activities with invitees, location, duration, status
- **Notes** — free-text notes attached to any record
- **Tasks** — to-dos with priority, status, due date
- **Targets** (Marketing Targets/Prospects) — separate from Leads/Contacts; entry point for marketing
- **Target Lists** — segmentation (default, suppression-by-id, suppression-by-email, suppression-by-domain, test)
- **Campaigns** — email campaigns with target lists, templates, tracker URLs
- **Surveys** — questions with rating/MC/text; responses
- **Knowledge Base** — `AOK_KnowledgeBase_Categories` + `AOK_Knowledge_Base_Articles`; categorization, ratings
- **Workflows** — `AOW_WorkFlow` (Advanced Open Workflow); rule-based automation
- **Reports** — `AOR_Reports` (Advanced Open Reports); custom reports with relationships, formula fields, charts
- **Invoices** — `AOS_Invoices` (Advanced Open Sales pack)
- **PDF Templates** — `AOS_PDF_Templates`; HTML-based with merge fields
- **Events** — event management
- **Outlook Plugin** — sync emails/contacts/calendar with Outlook

### B.2 The "AO_" Module Family (Advanced Open …)
SuiteCRM's signature differentiator from Sugar CE was the Advanced Open suite added by the SalesAgility team:
- **AOR** (Advanced Open Reports) — custom reports, formula fields, group-by, charts (bar/line/pie/radar)
- **AOW** (Advanced Open Workflow) — visual workflow rules: triggers (record save, time-based), conditions, actions (modify record, create record, send email, run a function)
- **AOS** (Advanced Open Sales) — Quotes, Invoices, Products, Product Categories, Contracts, PDF Templates
- **AOP** (Advanced Open Portal) — customer self-service portal
- **AOK** (Advanced Open Knowledge) — knowledge base
- **AOBH** (Advanced Open Business Hours) — business hours per team for SLA calculations
- **AOS Quotes/Invoices/Contracts** — full quote-to-invoice flow with PDF rendering

### B.3 Studio + Module Builder
- **Studio** — modify *existing* modules: add/remove/edit fields, change list/edit/detail layouts, configure subpanels, edit search layouts, manage relationships
- **Module Builder** — create *new* custom modules from packages; deploy as installable package; choose template (Basic / Company / Person / Issue / File / Sale)
- **Schema** — custom tables auto-generated from vardefs
- **Layouts** — drag-drop List View / Detail View / Edit View / Search Layout
- **Subpanels** — related-records panels at bottom of detail view
- **Roles** — module access (View/List/Edit/Delete/Import/Export/Mass Update) with field-level read/write
- **Security Suite** — per-record visibility based on Security Groups (group membership defines who sees what)

### B.4 Process Author (paid in old days; now in Suite)
- Visual flowchart designer (BPMN-like) — Start, Activity, Gateway, Event, End
- Triggers: form submission, schedule, message, signal
- Actions: send email, create/modify record, decision, await human action

### B.5 Patterns to Adopt
1. **vardefs metadata** — schema-as-data: each module has a PHP array describing its fields, relationships, indexes. The DB migration is generated from these. (Equivalent in our Node stack: declarative entity decorators with TypeORM/Prisma generators OR custom JSON metadata.)
2. **Studio** — module customization without code is what makes a CRM operationally usable for non-developer admins
3. **Subpanels** — related records visible inline; each subpanel has list/search/links to add records
4. **Convert Lead** flow — multi-record creation from one form (creates Contact + Account + Opportunity simultaneously)

---

## C. EspoCRM (THE most relevant for our self-build)

### C.0 Snapshot
- **Repo**: https://github.com/EspoCRM/espocrm
- **Stack**: PHP 8.3-8.5 (65.1%), JavaScript 27.9%, MySQL 8 / MariaDB 10.3+ / **PostgreSQL 15+**
- **License**: AGPLv3 (entirely free; commercial-license available for embedding)
- **Architecture**: Metadata-driven monolith. Single-page-app frontend. Backend is fully metadata-configurable: entities, fields, relationships, layouts all live as JSON metadata files.
- **Why this is THE best reference**: EspoCRM is the cleanest, most disciplined open-source CRM. Small codebase, modern UI, fully metadata-driven — *the closest in spirit to what we want to build*. Its Entity Manager is a model for how to expose schema customization to admins without code.

### C.1 Standard Entities/Modules
- **Account** — companies
- **Contact** — individuals
- **Lead** — pre-qualification stage; convert to Contact + Account + Opportunity
- **Opportunity** — deals with stages, amount, probability, close date
- **Document** — file management with categories and revisions
- **Calendar** — unified view of Meetings + Calls + Tasks across team
- **Email** — full inbound/outbound; multi-account, IMAP, SMTP; folders; signatures
- **Email Templates** — variable substitution
- **Email Filters** — server-side rules (auto-assign incoming email)
- **Mass Email** — bulk send via Email Account
- **Email Marketing** = Mass Email + Target Lists + Tracking URLs + Bounce Handling
- **Task** — To-Do with priority, status, parent (polymorphic to any entity)
- **Meeting** — calendar event with invitees, location, link
- **Call** — logged call record (incoming/outgoing/missed) with duration, recording link
- **Case** — support ticket
- **Knowledge Base Article** — wiki-style article with categories, attachments, multi-language
- **Campaign** — Email Marketing campaign with target lists, schedule
- **Target** — marketing target (separate from Lead)
- **Target List** — segmentation
- **Survey** — Q&A
- **User** — system users
- **Team** — collaborative grouping
- **Role** — permission roles (read/edit/delete/create/stream/no for each entity, with scope: all/team/own/no)

### C.2 Advanced (Paid Extension Pack) Features
- **Workflows** — rule-based automation (trigger + condition + actions); free up to a small count, paid for unlimited
- **BPM** — visual flowchart business process management with start/end events, tasks, gateways, sub-processes; paid extension
- **Reports** — pivot/list reports with subqueries; paid extension (basic reports free)
- **Project Management** — projects with milestones, tasks, time entries; paid
- **Sales Pack** — Quotes, Sales Orders, Invoices, Products, Product Categories, Receipts; paid
- **Advanced Pack** — bundle with Workflows + Reports + several enhancements
- **Real Estate Extension** — Properties, Property Types, Locations, Requirements; paid
- **Customer Portal** — branded self-service portal; paid

### C.3 Platform Features (most copyable patterns)
- **Entity Manager** — admin UI to create new entity types (custom) or modify existing ones. Entity types use templates: **Base / Base Plus / Event / Person / Company**. Templates pre-populate fields:
  - *Base*: name, assignedUser, teams, description
  - *Base Plus*: Base + activities/history/tasks panels
  - *Event*: dateStart, dateEnd, duration, parent, status, calendar enabled
  - *Person*: first/last name, salutation, phone, email, address, activities panel
  - *Company*: name, phone, email, billing+shipping addresses, activities panel
- **Field Manager** — admin UI to add/edit/delete fields per entity. Field types: Varchar, Text, Int, Float, Currency, Date, DateTime, Bool, Enum, MultiEnum, ArrayItem, CheckList, URL, Email, Phone, Address, Image, File, Attachment, AttachmentMultiple, Wysiwyg, Personal Name, Forecast, Map, Auto-increment, Number, Color
- **Layout Manager** — admin UI to drag-drop layouts: List, Detail, Edit, Side Panel, Bottom Panels, Mass-Update, Filters, Kanban, Print, Search Layout
- **Relationship Types** — One-to-Many, Many-to-One, **Many-to-Many**, One-to-One Right, One-to-One Left, Children-to-Parent (polymorphic via 2 columns: parentType + parentId)
- **Formula** — expression scripting language for: before-save calculation, conditional defaults, validation rules, action conditions. Server-side; sandboxed; ~100 built-in functions (math, string, array, date, entity, env)
- **Webhook** — outgoing webhooks on entity events (create/update/delete) with retry policy
- **Currency** — multi-currency with per-record currency + system base currency + dated rate table
- **Multilingual** — UI in 30+ languages; per-user language; per-entity translatable strings; label overrides
- **Customer Portal** (paid) — self-service portal where customers see their cases, knowledge base, etc.
- **Kanban** — built-in for any entity with an enum field (sales stage, status, etc.)
- **Reports** (free basic) — list reports + grid reports; saved per user; emailable; ribbon panel embed
- **Dashboards** — multi-tab; widgets: List, Iframe, Calendar, Activities, Tasks, Stream, Records by Status/Stage, Stats, Custom URL
- **Stream** — chatter equivalent (per-record activity feed + global personal stream of followed records)
- **Notes** — internal posts on stream (with @ mentions, attachments)
- **Activities & History** — per-record panels showing planned (Tasks/Meetings/Calls) and past (completed activities + emails)
- **Email Inbox** — fully featured mail client integrated with CRM (drag email to a record to link)
- **Print to PDF** — every entity has Print layout that renders to PDF with merge fields
- **Import / Export** — CSV import wizard with field mapping, dedup rules; CSV/XLSX export
- **Audit Log** — per-entity-type configurable; tracks field-level changes
- **REST API** — uniform `/api/v1/{entityType}` endpoints for CRUD + relationships; OAuth2 + API keys

### C.4 Metadata File Structure (THE key insight for self-build)
EspoCRM stores nearly every customizable thing as JSON metadata under `/custom/Espo/Custom/Resources/metadata/`:
- `entityDefs/{Entity}.json` — fields, relationships, indexes
- `clientDefs/{Entity}.json` — frontend behavior (controllers, views, kanban, color, icon)
- `scopes/{Entity}.json` — entity-level config (stream, kanbanStatus, importable, customizable)
- `layouts/{Entity}/{layoutType}.json` — list/detail/edit/etc. layouts as ordered JSON
- `selectDefs/{Entity}.json` — search/filter behavior
- `recordDefs/{Entity}.json` — record-level config

When an admin creates a custom entity in Entity Manager, the system writes JSON to these files and runs `Rebuild` which regenerates DB schema, ORM classes, and frontend bindings.

### C.5 Patterns to Adopt — TOP PRIORITY for our build
1. **Metadata-driven entity definition** — declarative JSON schema for entities with field-types and relationships. Frontend renders forms from same metadata. *This is the single most important architectural decision EspoCRM makes.*
2. **Entity templates (Base/BasePlus/Event/Person/Company)** — give admins a head-start when creating custom entities
3. **Universal Stream** — every entity has chatter (with `stream` flag) — implement once, reuse everywhere
4. **Polymorphic parent (parentId + parentType)** — Tasks/Notes/Activities can attach to *any* entity via 2 columns
5. **Layout Manager** — frontend layouts as data, not code, so admins can reorder fields without touching JS
6. **Formula language** — small expression language solves a huge swath of "I need a computed field" / "validate this" / "auto-fill that" without making admins write code

---

## D. Vtiger CRM

### D.0 Snapshot
- **Repo**: https://code.vtiger.com/vtiger/vtigercrm/vtigercrm (also GitHub mirrors)
- **Stack**: PHP + MySQL, jQuery + custom MVC
- **License**: Vtiger Public License 1.1 (MPL-derivative; open source) for community edition; cloud edition is SaaS
- **Heritage**: forked from SugarCRM CE in 2004 (separate fork from Suite); long history; the "One Pilot" cloud product is more polished than the open community edition

### D.1 Modules
- **Sales Force Automation** — Leads, Contacts, Organizations, Opportunities, Quotes, Sales Orders, Invoices, Products, Price Books, Vendors, Purchase Orders, Forecasts, SLA Policies
- **Inventory Management** — Products with stock levels, stock movement, multi-warehouse (in cloud), serial numbers, bulk import
- **Customer Support** — Cases, Service Contracts (SLAs), Knowledge Base (FAQs), Customer Portal
- **Marketing Automation** — Email Campaigns, Mailing Lists, Lead Scoring, Web Forms (web-to-lead), MailChimp integration
- **Project Management** — Projects, Project Tasks, Milestones, Gantt
- **Calendar** — Tasks + Events
- **Documents** — folders, version history
- **FAQs** — knowledge entries with categorization
- **Reports** — Tabular / Summary / Pivot / Charts (line/bar/pie/funnel/scatter); saved reports; scheduled email of reports
- **Dashboard** — multiple dashboards with widgets
- **Mobile App** — iOS + Android with offline cache
- **Web Forms** — generate embeddable HTML forms that create records
- **Workflows** — trigger (on save / scheduled) → conditions → actions (send email, send SMS, create record, update record, create event, create task, invoke webhook)
- **Approvals** — multi-level approval flows (e.g., Quote requires Manager approval if amount > X)
- **Custom Modules** — admin can create new entity types (similar to SuiteCRM Module Builder)

### D.2 Patterns Worth Noting
- **Pricelists per Currency** — multi-currency catalog support
- **Inventory + CRM coupled** — Products are first-class with stock levels visible in opportunities/quotes
- **Multi-channel inbox (One Pilot)** — Email + WhatsApp + Facebook + Instagram + SMS in one inbox; in cloud only

---

## E. Twenty (NEXT-GEN — DIRECT REFERENCE)

### E.0 Snapshot — Most relevant CRM for our build
- **Repo**: https://github.com/twentyhq/twenty
- **Stack**: **NestJS + PostgreSQL + Redis + BullMQ + React + Jotai + Linaria + Lingui + GraphQL** — 78.7% TypeScript, 17.6% MDX. Nx monorepo.
- **License**: AGPLv3
- **Heritage**: Founded 2023 by ex-Stripe engineers as "the open alternative to Salesforce, designed for AI"
- **Why we MUST study this**: It's the closest match to our planned stack (Node.js backend + modern reactive frontend). Almost every architectural decision they made is one we will face. We are essentially building a Twenty competitor with Vue instead of React.

### E.1 Core Entities (intentionally minimal vs traditional CRMs)
- **Companies** — B2B accounts
- **People** — *unified Contact+Lead model* (no Lead vs Contact split, like Odoo's res.partner). A Person becomes a "lead" if they're tied to an Opportunity in `New` stage
- **Opportunities** — deals with stage (NEW/SCREENING/MEETING/PROPOSAL/CUSTOMER), amount, close date, point of contact (Person), company
- **Notes** — rich-text notes attachable to any object
- **Tasks** — to-dos with assignee, due, status
- **Activities** — log of meetings/emails/calls (the activity model)
- **Files** — uploaded files with thumbnails
- **Custom Objects** — admin can create new object types (similar to EspoCRM Entity Manager) with custom fields, relations, and views

### E.2 Field Types
Text, Number, Boolean, Date, DateTime, Email, Phone, Currency, Address, Link, MultiSelect, Select, Rating, UUID, Position (for ordering), FullName, Relation (one-to-many / many-to-one / many-to-many)

### E.3 Views
- **Table View** (the default; spreadsheet-feel)
- **Kanban View** (per status field)
- **Custom Views** with saved filters, sorts, hidden columns; per-user
- **Sidebar Filters** with rich operators (contains, doesn't contain, starts with, in last X days, etc.)

### E.4 Workflows (early but growing)
- Trigger (record created / updated / scheduled / webhook received)
- Condition (filter expression)
- Actions (send email, create/update record, run code, call webhook, run AI agent)

### E.5 Platform / Architectural Notes
- **GraphQL API** — fully introspectable; Apollo client on frontend; codegen for TS types
- **Workspace tenancy** — Twenty is multi-tenant by design; one DB schema per workspace OR shared schema with workspace_id discriminator (configurable)
- **Authentication** — email+password, magic link, Google OAuth, Microsoft OAuth, SSO/SAML (Enterprise)
- **Permissions** — workspace members + roles + per-object permissions
- **Custom Code** — server-side functions can be written in TypeScript and run in a sandbox (newer feature)
- **AI agents** — built-in chat with the CRM data; tool-calling AI agents that read/write records (newer feature)
- **Self-hosting** — Docker Compose recipe with Postgres + Redis + Twenty
- **Code-as-config** — workspace schema, fields, views can be defined in code and version-controlled (this is rare in CRMs and a real differentiator)

### E.6 Patterns to Adopt — TOP PRIORITY
1. **Same stack** — NestJS + Postgres + Redis + BullMQ is *literally* a viable backend choice for us (we'd swap React for Vue)
2. **Unified Person model** — drop Lead/Contact split; use stage-on-opportunity instead (less duplication, simpler model)
3. **GraphQL** — strongly consider for our backend; even if we don't choose GraphQL, study Twenty's resolver layout and codegen pipeline
4. **Workspace multi-tenancy** — design the data model to be SaaS-ready from day 1 (workspace_id on every row, RLS or app-layer scoping)
5. **Code-as-config workspace** — let advanced admins define the schema/views in version-controlled YAML/JSON; the UI's Entity Manager is just a writer for the same files

---

## F. CiviCRM (Constituent / Nonprofit)

### F.0 Snapshot
- **Repo**: https://github.com/civicrm/civicrm-core
- **Stack**: PHP + MySQL/MariaDB; runs as plugin under Drupal, WordPress, Joomla, or Standalone (newer)
- **License**: AGPLv3
- **Heritage**: Born 2005 as nonprofit alternative to commercial CRMs; the most successful open-source CRM in the nonprofit space; heavy use of "constituent" terminology

### F.1 Modules
- **Contacts** — universal "constituent" record. *Sub-types*: Individual, Organization, Household. (Households are unique to CiviCRM — represent family units; useful in donor management.)
- **Relationships** — typed relationships between contacts (Spouse Of, Employer/Employee, Donor/Beneficiary, etc.); relationships can have permissions (so an Employer relationship lets the Employee see Employer's data)
- **Groups** — static or smart (criteria-based dynamic) groups; used as audiences for mailings
- **Tags** — flat or hierarchical tags
- **Activities** — calls, meetings, emails, phone calls (with extensible activity types)
- **Contributions** — donations (online + offline); recurring contributions; contribution pages (online donate forms with custom fields, premiums); soft credits (giving in honor/memory of someone)
- **Memberships** — membership types, periods, statuses (New / Current / Grace / Expired / Cancelled), auto-renew
- **Events** — event creation with registration, ticketing, multi-day, sessions, speakers, badges, online registration form
- **Cases** — case management for social work / nonprofit casework — multi-activity timelines
- **Mailings** — bulk email with mail builder, A/B testing, bounce processing, tracker URLs, unsubscribe handling
- **Campaigns** — group of activities + mailings under one heading; ROI tracking
- **Reports** — extensive report templates (donations by source, donor lapse analysis, membership retention, event attendance)
- **Custom Fields** — admin-configurable custom fields per contact subtype, per activity, per event, etc.
- **Profiles** — user-facing forms (contribution, registration, contact update); admin defines fields shown
- **Workflow / SearchKit / FormBuilder / Afform** — newer extensions: SearchKit for power-user querying, FormBuilder/Afform (Angular-based) for drag-drop forms

### F.2 Patterns to Adopt
1. **Subtype-driven contacts** — a single Contact table with `contact_type` (Individual/Organization/Household) is one approach; another (Odoo) is single table with `is_company` flag. We should pick one and stay consistent
2. **Relationship records as first-class** — relationships are not just FKs but full records with type, dates, permissions, notes (very useful for B2B with multiple decision-makers)
3. **Smart Groups** — saved-query-based dynamic membership; users get added/removed automatically as they meet/leave criteria. This is essentially HubSpot's Active Lists.

---

## G. Mautic (Marketing Automation)

### G.0 Snapshot
- **Repo**: https://github.com/mautic/mautic
- **Stack**: PHP 8 (78.6%), Twig 9.7%, Symfony, MySQL/MariaDB
- **License**: GPLv3
- **Heritage**: Founded 2014 by DB Hurley; donated to Acquia; later spun out as independent Mautic Inc. + nonprofit Foundation. Considered the open-source alternative to HubSpot Marketing Hub / Marketo / Pardot.

### G.1 Modules
- **Contacts** — leads with profile (name, email, phone, etc.), points, stages, segments, lifecycle
- **Companies** — B2B accounts; auto-link contacts via email domain
- **Segments** — dynamic lists with filter rules (email contains, country is, points >= X, etc.)
- **Lists** — older name; same concept as Segments
- **Forms** — embeddable forms with field types (text/email/select/checkbox/radio/captcha/file); standalone or campaign forms
- **Landing Pages** — drag-drop landing page builder with templates, A/B testing, embedded forms
- **Emails** — Email types: List Email (broadcast to segment), Campaign Email (sent by campaign step), Template Email; drag-drop builder; A/B testing; tokens/personalization
- **Channels** — Email, SMS, Push, Social, Web Notifications
- **Campaigns** — visual flow builder (BPMN-like): trigger → decision → action; actions include "send email", "add to segment", "modify points", "send webhook", "tag", "create task", "notify user"; decisions include "did contact open?", "did contact click?", "is contact in segment?", "has tag?", "form submitted?"
- **Triggers** — event-based starts for campaigns
- **Points** — lead scoring; rules add/subtract points based on actions; thresholds can fire campaign actions or escalate to sales
- **Stages** — lifecycle stages (Subscriber / Lead / MQL / SAL / SQL / Customer); each stage progression is a tracked event
- **Dynamic Content** — content variants shown to different segments (personalization on landing pages and emails)
- **Focus Items** — pop-ups, sliders, banners, modals, "notification bars" displayed on website pages with rules (URL match, time on site, scroll %, exit intent)
- **Reports** — built-in reports (campaign performance, email stats, form stats, page stats); custom report builder
- **Channel Frequency** — global rules to limit how often a contact can be emailed/SMSed
- **DNC (Do Not Contact)** — channel-specific opt-outs with audit
- **Webhooks** — outgoing webhooks on events (contact identified, segment join, page hit, etc.)
- **Plugins** — built-in: Salesforce, Dynamics, HubSpot, MailChimp, SendGrid, Twilio, FullContact, WebMecanik, Outlook
- **Custom Objects** (newer) — admin-defined entities related to contacts

### G.2 Patterns to Adopt
1. **Visual campaign flow builder** — the gold standard is Mautic's flowchart canvas with start nodes (trigger), decisions, actions, time delays. We should consider this for our automation/workflow module.
2. **Channel abstractions** — email/SMS/push share the same campaign-step pattern with pluggable transports
3. **Frequency caps + DNC** — global rules across all messaging are essential to avoid spam
4. **Points + Stages + Segments together** — three orthogonal axes (numeric score, ordinal lifecycle, set-membership). Each is useful; combining them is powerful

---

## H. Cross-Cutting Patterns Distilled

After studying all seven, here are the patterns that recur across the best ones — these are likely candidates for our architecture:

### H.1 Universal-Object Patterns
| Pattern | Used by | Description |
|---------|---------|-------------|
| **Universal Contact** (no Lead/Contact split) | Odoo, Twenty | Single `Person` table; lead-status is a stage, not a separate type |
| **Universal Activity Log** | Odoo (`mail.message`), EspoCRM (Stream), Twitter (Notes/Activities) | Polymorphic log table with (entityType, entityId, ...) |
| **Universal Tag** | All | Flat or hierarchical tags as M2M to many entities |
| **Universal Comment/Stream** | Odoo, EspoCRM, Twenty | Per-record comment thread + @mentions + attachments |
| **Activity types** (Call/Meeting/Email/Task) | All | Typed sub-records with shared base fields |

### H.2 Customization Patterns
| Pattern | Used by | Description |
|---------|---------|-------------|
| **Metadata-driven schema** | EspoCRM, Twenty | Entities declared in JSON/code, not migrations |
| **Entity templates** | EspoCRM (Base/Person/Company/Event), SuiteCRM Module Builder | Pre-baked field sets for common entity shapes |
| **Layout Manager** | EspoCRM, SuiteCRM Studio, Salesforce | Drag-drop form/list layouts as data |
| **Custom Fields per entity** | All | Field types: text, number, date, enum, multi-enum, money, file, etc. |
| **Polymorphic parent (parentId + parentType)** | EspoCRM, Salesforce | Tasks/Notes/etc. can attach to any record type |
| **Formula/Expression language** | EspoCRM (Formula), Salesforce (Apex Formula), Odoo (Python sandbox) | Small expression language for validation, defaults, computed fields |

### H.3 Automation Patterns
| Pattern | Used by | Description |
|---------|---------|-------------|
| **Trigger → Condition → Action** | All | Universal automation primitive |
| **Visual flow builder (BPMN-like)** | Mautic, EspoCRM BPM, SuiteCRM Process Author, Odoo Marketing Auto | Drag-drop flowchart for multi-step automations |
| **Time-based / scheduled triggers** | All | Cron-style or relative-date triggers |
| **Email gateway (alias → record)** | Odoo, SuiteCRM | Incoming email creates/updates records |
| **Webhooks (in + out)** | All | Receive: external systems push events; Send: outgoing on entity events |

### H.4 Communication Patterns
| Pattern | Used by | Description |
|---------|---------|-------------|
| **Multi-account email integration** | All | IMAP/SMTP per user with two-way sync |
| **Calendar sync** | Most | iCal feed + Google/Outlook two-way |
| **Bulk email + tracking** | All | Open + click + bounce + unsubscribe per recipient |
| **DNC / suppression** | Mautic, all serious ones | Channel-specific opt-out registry |
| **Frequency caps** | Mautic | Global rules to limit messaging volume |
| **Lead scoring** | All | Points-based; rules add/subtract; thresholds trigger actions |

### H.5 Reporting / Analytics
| Pattern | Used by | Description |
|---------|---------|-------------|
| **Pivot view** | Odoo, Salesforce, EspoCRM | Excel-like cross-tab on any entity |
| **Charts** (bar/line/pie/funnel) | All | Saved per-user reports with embeds in dashboards |
| **Dashboards with widgets** | All | Multi-tab dashboards with configurable widgets |
| **Scheduled email of reports** | All | Recurring email send of report results |
| **Saved filters** | All | Per-user saved searches |

### H.6 Multi-Tenancy / Security
| Pattern | Used by | Description |
|---------|---------|-------------|
| **Workspace / Org partitioning** | Twenty, Salesforce | Top-level tenant boundary; every row scoped |
| **Teams + Roles + Permissions** | All | Hierarchical access; per-entity, per-action, per-field |
| **Field-level security** | Salesforce, EspoCRM (advanced), SuiteCRM Security Suite | Hide certain fields from certain roles |
| **Record-level visibility (assignment + team + sharing)** | All | Who can see this record? Owner-only, team-only, all, custom |

---

## I. Recommended Architectural Decisions (for our self-build)

Based on all the above, here are my preliminary recommendations — these should be validated in the upcoming brainstorming session:

### I.1 Data Model
1. **Adopt Twenty/Odoo's unified Person model** (no separate Lead and Contact tables). A Person becomes a "lead" implicitly when first opportunity is created in `NEW` stage. Saves a giant Convert-Lead workflow.
2. **Universal Activity Log** — single `activity` table with polymorphic (entityType, entityId, kind, payload). One pattern for chatter, calls, meetings, emails, system events.
3. **Polymorphic parent for Notes/Tasks** — same approach as EspoCRM
4. **Workspace/tenant column on every row** — multi-tenant from day 1

### I.2 Engine
- **Backend**: NestJS + PostgreSQL + Redis (cache, BullMQ queue) — same as Twenty. Proven combination.
- **API**: REST first (simpler to consume from Vue + 3rd-party tools); consider GraphQL as a v2 add-on
- **ORM**: Prisma OR TypeORM. Prisma's schema-as-source-of-truth aligns well with metadata-driven goal.
- **Frontend (dashboard)**: Vue 3 + Vite + Pinia + TypeScript + a UI lib (PrimeVue or Vuetify or build custom on TailwindCSS)
- **Frontend (website)**: Nuxt 3 (SSR for SEO + landing pages + marketing content)

### I.3 Customization Layer
- **Metadata-driven entities** (EspoCRM pattern): entities defined as JSON/TS files; admin Entity Manager UI just edits these files; system reads metadata to generate Prisma schema (or use TypeORM dynamic schema), API routes, Vue forms.
- **Field types**: start with the EspoCRM list (~25 types); add as needed.
- **Layout Manager**: layouts as JSON; Vue dynamic form renderer reads them.
- **Formula language**: small expression evaluator; either embed jsonata, mathjs, or roll our own.

### I.4 Automation
- **Trigger-Condition-Action** primitive (rule engine — Workflows)
- **Visual flow builder** (BPMN-lite — Campaigns / Journeys); use a library like Vue-Flow or Drawflow
- **Webhooks in/out**, **scheduled jobs**, **email alias gateway** all built-in

### I.5 Module Roadmap (priority order)
1. **Foundation**: Auth, Workspaces, Users, Teams, Roles, Permissions
2. **Core Entities**: Companies, People, Opportunities, Activities, Notes, Tasks, Tags, Custom Fields
3. **Pipeline + Kanban + List views**
4. **Email integration** (IMAP/SMTP per user)
5. **Activities** (Call, Meeting, Task) + Calendar
6. **Reports + Dashboards**
7. **Workflows / Automations** (rule-based)
8. **Marketing**: Campaigns + Email Marketing + Forms + Landing Pages (= Mautic-light)
9. **Sales**: Quotes + Products + Pricelists + Invoices (= Sales Pack)
10. **Service**: Cases + Knowledge Base + SLA + Helpdesk
11. **Customer Portal**
12. **Telephony / Live Chat** (later)
13. **Inventory + Project Mgmt** (much later)

---

## J. Sources

- https://github.com/twentyhq/twenty
- https://github.com/EspoCRM/espocrm
- https://github.com/salesagility/SuiteCRM
- https://github.com/odoo/odoo
- https://github.com/mautic/mautic
- https://github.com/civicrm/civicrm-core
- https://docs.espocrm.com/administration/entity-manager/
- https://www.odoo.com/documentation/18.0/applications/sales/crm.html
- https://docs.suitecrm.com/admin/
- https://docs.civicrm.org/
- https://docs.mautic.org/
- Twenty docs: https://twenty.com/developers
- Odoo docs: https://www.odoo.com/documentation/18.0/

---

**Bottom line for our project**: Of all seven CRMs, **EspoCRM and Twenty are the two most actionable references** for our self-build. EspoCRM teaches us how to do metadata-driven schema with PHP (we'll port the *concepts* to Node/TS); Twenty shows us a working blueprint of the same kind of system in our exact stack (NestJS + Postgres + Redis + BullMQ + modern reactive frontend). Our build should consciously crib EspoCRM's metadata layer and Twenty's stack/multitenancy decisions, then layer Mautic's automation engine, Odoo's chatter pattern, and SuiteCRM's Studio/Module Builder UX on top.

---

## K. Concrete Schema References

These are illustrative schemas distilled from each CRM, presented as Prisma-style models so we can directly evaluate them as starting points for our build. They are simplified — not complete — to highlight the key design decisions.

### K.1 Odoo-style: Universal Partner

```prisma
// Single table for B2C contact, B2B company, vendor, employee, address.
// Distinguished by `isCompany` flag and parent-child relationship.
model Partner {
  id          String   @id @default(cuid())
  workspaceId String
  name        String
  isCompany   Boolean  @default(false)
  parentId    String?  // company a contact works for
  parent      Partner? @relation("PartnerChildren", fields: [parentId], references: [id])
  children    Partner[] @relation("PartnerChildren")
  type        PartnerType @default(CONTACT)  // CONTACT | INVOICE | DELIVERY | OTHER | PRIVATE
  email       String?
  phone       String?
  mobile      String?
  website     String?
  vatNumber   String?
  street1     String?
  street2     String?
  city        String?
  state       String?
  zip         String?
  country     String?
  language    String?  // ar / en / etc.
  timezone    String?
  isCustomer  Boolean  @default(false)
  isVendor    Boolean  @default(false)
  isEmployee  Boolean  @default(false)
  // chatter fields auto-injected via mixin
  @@index([workspaceId])
  @@index([parentId])
}
```

**Tradeoff**: One mega-table. Pros: simple model, contact-of-company is just `parent_id`, address records are just child Partners with `type=DELIVERY`. Cons: very wide table, polymorphic semantics encoded in flags.

### K.2 Twenty-style: Unified Person + Company

```prisma
model Company {
  id          String  @id @default(cuid())
  workspaceId String
  name        String
  domain      String?  // primary website domain — used to auto-link people from email
  industry    String?
  employeeCount Int?
  annualRevenue BigInt?
  address     Json?   // structured: {street, city, country, postalCode, ...}
  linkedinUrl String?
  twitterUrl  String?
  people      Person[]
  opportunities Opportunity[]
  @@index([workspaceId])
  @@index([domain])
}

model Person {
  id           String  @id @default(cuid())
  workspaceId  String
  firstName    String?
  lastName     String?
  email        String?
  phone        String?
  jobTitle     String?
  city         String?
  linkedinUrl  String?
  companyId    String?  // primary company; can be M2M via PersonCompany table for advanced cases
  company      Company? @relation(fields: [companyId], references: [id])
  opportunities Opportunity[]  @relation("OpportunityPointOfContact")
  @@index([workspaceId])
  @@index([email])
  @@index([companyId])
}

model Opportunity {
  id              String  @id @default(cuid())
  workspaceId     String
  name            String
  stage           OpportunityStage  // NEW | SCREENING | MEETING | PROPOSAL | CUSTOMER
  amount          Decimal?
  closeDate       DateTime?
  probability     Int?  // 0-100
  pointOfContactId String?
  pointOfContact  Person? @relation("OpportunityPointOfContact", fields: [pointOfContactId], references: [id])
  companyId       String?
  company         Company? @relation(fields: [companyId], references: [id])
  ownerId         String?
  @@index([workspaceId])
  @@index([stage])
}
```

**Tradeoff**: Cleaner than Odoo — typed Person and Company. No Lead vs Contact split. Cons: B2C-only or vendors don't fit naturally; needs a separate model for them.

### K.3 EspoCRM-style: Metadata + Polymorphic Activity

```prisma
// Core Activity table is polymorphic: any record can have activities
model Activity {
  id           String  @id @default(cuid())
  workspaceId  String
  type         ActivityType   // CALL | MEETING | TASK | EMAIL | NOTE | SYSTEM
  parentType   String         // 'Person' | 'Company' | 'Opportunity' | etc.
  parentId     String
  subject      String?
  description  String?  @db.Text
  status       String?  // 'Planned' | 'Held' | 'Not Held' | 'Completed' | etc.
  dateStart    DateTime?
  dateEnd      DateTime?
  durationMinutes Int?
  ownerId      String?
  attendees    Json?  // [{type, id, name}]
  attachments  Json?  // [{type, id, name}]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  @@index([workspaceId, parentType, parentId])
  @@index([workspaceId, dateStart])
  @@index([ownerId])
}
```

The genius is `(parentType, parentId)`: a Task can attach to a Person, a Company, an Opportunity, a Quote, *anything* — without a separate join table per parent type.

### K.4 EspoCRM Metadata File Example

```jsonc
// custom/Espo/Custom/Resources/metadata/entityDefs/Property.json
{
  "fields": {
    "name":      { "type": "varchar", "required": true, "trim": true },
    "type":      { "type": "enum", "options": ["Apartment", "Villa", "Office", "Land"] },
    "price":     { "type": "currency" },
    "area":      { "type": "float", "min": 0 },
    "address":   { "type": "address" },
    "owner":     { "type": "link", "entity": "Contact" },
    "agent":     { "type": "link", "entity": "User" },
    "photos":    { "type": "attachmentMultiple" },
    "status":    { "type": "enum", "options": ["Available", "Reserved", "Sold"], "default": "Available" }
  },
  "links": {
    "owner":      { "type": "belongsTo", "entity": "Contact", "foreign": "ownedProperties" },
    "agent":      { "type": "belongsTo", "entity": "User",    "foreign": "managedProperties" }
  },
  "indexes": {
    "name":   { "columns": ["name"] },
    "status": { "columns": ["status"] }
  },
  "collection": { "orderBy": "createdAt", "order": "desc" }
}
```

**Insight**: The EspoCRM admin UI's "Entity Manager" is a writer for these JSON files. Once written, the system runs `php rebuild.php` which:
1. Generates the DB migration to create/alter the `property` table
2. Generates ORM mapping classes for the entity
3. Generates frontend bindings so the SPA can fetch/render Property records

We can replicate this in our Node/TS stack: an EntityRegistry that reads JSON metadata at boot, generates a Prisma schema fragment, runs migrations, and wires up REST + Vue dynamic-form renderers. *This is the most important architectural pattern in this entire research document.*

### K.5 Mautic-style: Campaign Step

```prisma
model Campaign {
  id          String  @id @default(cuid())
  workspaceId String
  name        String
  description String?
  isPublished Boolean @default(false)
  startDate   DateTime?
  endDate     DateTime?
  events      CampaignEvent[]  // the flow nodes
  contacts    CampaignContact[] // junction with state
}

model CampaignEvent {
  id         String  @id @default(cuid())
  campaignId String
  campaign   Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  type       String   // 'trigger' | 'decision' | 'action' | 'condition'
  eventType  String   // 'email.send' | 'segment.add' | 'webhook.send' | 'wait' | 'has_tag' | etc.
  parentId   String?  // parent step in the flow; null = root trigger
  decision   String?  // 'yes' | 'no' — branch label from parent
  delayValue Int?
  delayUnit  String?  // 'minutes' | 'hours' | 'days'
  properties Json     // step-specific config
  position   Json?    // {x, y} for visual canvas
}

model CampaignContact {
  id          String  @id @default(cuid())
  campaignId  String
  contactId   String  // FK to Person
  enrolledAt  DateTime @default(now())
  currentStep String?  // FK to current CampaignEvent
  state       String   // 'active' | 'completed' | 'dropped'
}
```

**Insight**: A campaign is a directed graph of `CampaignEvent` nodes. Each contact moves through the graph as conditions are evaluated and actions fire. The visual canvas is just a renderer of the `parentId` + `decision` + `position` data.

---

## L. API Surface References

Each project reveals what a CRM API surface should look like. Below is a comparison of the API styles.

### L.1 Twenty (GraphQL-first)

```graphql
# Query (read multiple Persons)
query FindPeople($filter: PersonFilterInput, $orderBy: [PersonOrderByInput!], $first: Int) {
  people(filter: $filter, orderBy: $orderBy, first: $first) {
    edges {
      node {
        id
        firstName
        lastName
        email
        company { id name domain }
        opportunities { id name stage amount }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}

# Mutation
mutation CreateOpportunity($data: OpportunityCreateInput!) {
  createOpportunity(data: $data) {
    id
    name
    stage
  }
}
```

Strong types, introspection, single endpoint, pagination via Relay-style edges/cursors.

### L.2 EspoCRM (REST)

```
GET  /api/v1/{Entity}                  # list (?select=, ?where[], ?orderBy=, ?offset=, ?maxSize=)
GET  /api/v1/{Entity}/{id}             # read
POST /api/v1/{Entity}                  # create
PUT  /api/v1/{Entity}/{id}             # update
DELETE /api/v1/{Entity}/{id}           # delete
GET  /api/v1/{Entity}/{id}/{relation}  # related records
POST /api/v1/{Entity}/{id}/{relation}  # link
DELETE /api/v1/{Entity}/{id}/{relation}/{foreignId}  # unlink
GET  /api/v1/{Entity}/action/{actionName}            # custom actions
```

Uniform CRUD per entity; relationship endpoints follow the same shape; custom actions for non-CRUD operations.

### L.3 Odoo (XML-RPC + REST + JSON-RPC)

Odoo exposes its ORM directly via JSON-RPC: any model method (search, read, write, create, unlink, plus custom methods) callable from any client. Domain language (lisp-like list filter): `[('stage', '=', 'won'), ('amount', '>', 1000)]`. Modern Odoo also exposes REST.

### L.4 What we should adopt

A **REST-first API with EspoCRM's uniform CRUD shape** is the sweet spot for our build:
- Easy to consume from Vue (use generated TS clients)
- Easy to consume from third parties / iPaaS / webhooks
- Predictable (every entity has the same endpoints)
- Optionally add a GraphQL gateway later if we need advanced query patterns

```
GET    /api/v1/{entity}                # list with filtering, sorting, pagination
GET    /api/v1/{entity}/{id}           # single record (with optional ?expand=)
POST   /api/v1/{entity}                # create
PATCH  /api/v1/{entity}/{id}           # partial update
DELETE /api/v1/{entity}/{id}           # delete
POST   /api/v1/{entity}/{id}/{action}  # custom actions (convert-lead, send-email, etc.)
GET    /api/v1/{entity}/{id}/related/{rel}  # relationships
```

Plus dedicated endpoints for cross-cutting features:
- `/api/v1/auth/*` — login, refresh, logout, MFA
- `/api/v1/me` — current user
- `/api/v1/workspaces/*` — workspace management
- `/api/v1/metadata/*` — entity definitions, layouts, formulas (for the dynamic frontend renderer)
- `/api/v1/search` — global search across entities
- `/api/v1/automation/*` — workflows, runs, logs
- `/api/v1/reports/*` — saved reports, ad-hoc query
- `/api/v1/notifications/*` — in-app notifications
- `/api/v1/files/*` — uploads, downloads
- `/api/v1/webhooks/*` — incoming webhook receivers

---

## M. Weaknesses / Anti-Patterns to Avoid

It's also critical to learn from what each project does *poorly*. Avoiding these saves us pain.

| CRM | Notable Weaknesses |
|-----|---------------------|
| **Odoo** | Heavyweight (Python ORM is slow on cold queries), Owl.js has steep learning curve, Enterprise/Community feature split is confusing, customization done in code requires Odoo-developer hires |
| **SuiteCRM** | Aging codebase (originally Sugar 6.x), legacy Smarty templates, performance issues at >100k records, modules use bespoke inflection rules, security advisories happen often (AGPLv3 PHP code) |
| **EspoCRM** | Small team (sustainability risk), some advanced features behind paywall (BPM, Workflows past free tier, Customer Portal), PHP only (limits hireability), no built-in eCommerce or accounting |
| **Vtiger** | Open-source community edition lags behind cloud One Pilot significantly; UI dated; mobile app weak |
| **Twenty** | Young (founded 2023) — incomplete features, breaking changes between versions, ecosystem still emerging, AGPLv3 limits commercial embedding without buying license |
| **CiviCRM** | Steep learning curve for non-nonprofits, requires CMS host (Drupal/WP) which adds operational complexity, UI dated, very nonprofit-flavored vocabulary that confuses commercial teams |
| **Mautic** | Email deliverability is hard (you're responsible for SMTP reputation), UI feels dated, performance issues with large segments, Symfony upgrades require careful migration, codebase complexity high |

### What we should explicitly avoid:
1. **Don't bake separate Lead and Contact tables** unless we have a strong reason. Twenty/Odoo's unified model is simpler and avoids the dreaded "Convert Lead" workflow that loses data.
2. **Don't tie schema to migrations only.** Use metadata-driven entity definitions so admins can customize without engineers.
3. **Don't make customization require code.** EspoCRM/Salesforce-style admin tools (Entity Manager, Layout Manager, Field Manager, Formula) are table-stakes for a usable CRM.
4. **Don't gate critical features behind a "Pro" tier from day 1.** Get the core right first; monetize hosting/support/integrations later.
5. **Don't pick GraphQL just because it's modern.** REST is sufficient for 80% of CRM use cases and easier to consume from automation tools.
6. **Don't ignore i18n/RTL from day 1.** Arabic-first UI requires RTL across the entire dashboard. Adding it later is painful (we've seen Mautic/SuiteCRM struggle).
7. **Don't store activity logs in a per-entity table.** A polymorphic activity log table is overwhelmingly simpler.

---

## N. Pricing & Commercialization Insights

For context (informs our positioning if we ever go SaaS):

| CRM | Pricing model |
|-----|---------------|
| **Odoo** | Community: free self-host. Enterprise: $25–38/user/mo + per-app pricing. Online: same + hosting. |
| **SuiteCRM** | OSS: free self-host. SuiteCRM:OnDemand $40+/user/mo. |
| **EspoCRM** | OSS Community: free self-host. Cloud: $15/user/mo. Advanced Pack: $750/year flat. Sales Pack: $250/year. Real Estate: $300. |
| **Vtiger** | Open Source: free self-host. Cloud One Growth: $12/user/mo, One Professional: $30, One Enterprise: $42. |
| **Twenty** | OSS: free self-host. Cloud: launching paid tier (currently free in beta). |
| **CiviCRM** | Always free OSS; ecosystem of paid hosting partners (~$50–200/mo). |
| **Mautic** | OSS: free self-host. Acquia Marketing Cloud (built on Mautic Inc.): enterprise pricing. |

The pattern: open-core + cloud-hosted + premium addon packs. If we ever monetize, this is the playbook.

---

## O. Final Recommendations Summary

**Adopt from each:**
- From **Twenty**: stack (NestJS + PG + Redis + BullMQ), unified Person model, workspace multi-tenancy, code-as-config, GraphQL (later)
- From **EspoCRM**: metadata-driven entity definition, Layout Manager, Formula language, polymorphic activity log, REST API uniform shape, Stream
- From **Odoo**: universal partner concept, mixin pattern (mail.thread → Activity / Followers / Chatter), email gateway, server actions
- From **Mautic**: visual flow builder for campaigns/automations, lead points + stages + segments triad, channel abstractions, frequency/DNC
- From **SuiteCRM**: Studio + Module Builder UX (admin-facing), security suite (per-record visibility)
- From **Vtiger**: tight Inventory + CRM coupling for sales-focused workflows
- From **CiviCRM**: typed relationship records (not just FKs)

**Avoid from each:**
- Odoo's heavyweight Python stack (we're going Node)
- SuiteCRM's dated codebase
- Vtiger's two-track community/cloud divergence
- CiviCRM's CMS-dependency
- Mautic's deliverability burden (use a transactional ESP, don't ship our own SMTP)

This research is the foundation for the upcoming brainstorming session and design doc. The user will use these findings to scope our build, pick which modules to ship in v1 vs later, and lock in the architectural decisions before we write a line of code.
