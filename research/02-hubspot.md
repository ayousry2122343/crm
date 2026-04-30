# HubSpot — Comprehensive Module & Feature Catalog (2026)

**Mission of this document:** capture the full feature surface of HubSpot's customer platform so we can mine it for module decomposition, UX patterns, and entity modeling decisions in our self-built CRM (Node.js + Vue).

**Why HubSpot specifically:** HubSpot is the most product-led, UX-driven CRM on the market. Its **Hub** model — separable, well-bounded products that share a single Smart CRM data layer — is the cleanest example of CRM modularization in the industry. Its **Properties-as-first-class** approach (no schema migration to add a custom field) and **Lists-as-saved-queries** model are worth replicating verbatim.

**Last verified:** April 2026 (Spring 2026 Spotlight release).

---

## 0. Platform-Level Architecture

HubSpot is a single **customer platform** with three architectural layers:

1. **Smart CRM** — the unified data system of record (formerly "HubSpot CRM"). Free core; everything is built on top of it.
2. **Six Hubs** — premium product surfaces that compose with the CRM:
   - Marketing Hub
   - Sales Hub
   - Service Hub
   - Content Hub (formerly CMS Hub, rebranded 2024)
   - Data Hub (formerly Operations Hub, rebranded late-2025)
   - Commerce Hub
3. **Breeze AI** — a cross-cutting AI layer (Assistant + Agents + Intelligence) embedded inside every Hub.

**Tier model (per Hub):** Free → Starter → Professional → Enterprise.
**Cross-cutting billing concept:** *Marketing Contacts* — a contact only consumes a billable seat in Marketing Hub if you market to them; non-marketing contacts are free. This is a unique billing axis worth understanding.

**"Customer Platform" bundle:** the unified package combining Marketing + Sales + Service + Content + Operations Hubs at a discount. As of 2026 the Enterprise Customer Platform exceeds **$4,700/month** at the entry seat count.

---

## 1. Smart CRM — The Free Foundation Layer

The Smart CRM is what every paid Hub builds on. Conceptually it is a **graph database of customer relationships** with strong typing, native objects, custom objects, and a unified activity timeline.

### 1.1 Core Objects (CRM Records)

HubSpot ships with **standard objects** that every account gets, plus **custom objects** in higher tiers.

| Object | Description | Cardinality |
| --- | --- | --- |
| **Contact** | A person. Can be a lead, customer, partner. Auto-created from form submissions, emails, chats. | Unlimited (free); Marketing Contact billing applies separately. |
| **Company** | An organization. Auto-created from email domain via the *Insight* enrichment service. | Unlimited free. |
| **Deal** | A revenue opportunity moving through a pipeline. | Unlimited free. |
| **Ticket** | A customer service issue moving through a pipeline. | Unlimited free. |
| **Product** | A line item that can be added to a deal/quote. | Unlimited free (with library). |
| **Quote** | A proposal/quote document associated with a deal. | Unlimited (Sales Hub). |
| **Invoice** | A billable invoice (Commerce Hub). | Unlimited (Commerce Hub). |
| **Subscription** | A recurring billing relationship (Commerce Hub). | Unlimited (Commerce Hub). |
| **Payment Link** | A standalone payment URL (Commerce Hub). | Unlimited (Commerce Hub). |
| **Lead** | A *qualification stage* on top of a Contact (added 2024). Distinct from MQL/SQL fields. | Sales Hub Pro+. |
| **Custom Object** | User-defined object schema (e.g., "Course," "Vehicle," "Property"). | Enterprise tier. |

### 1.2 Object Activity & Engagements (associated to records)

Engagements are first-class objects associated to one or more CRM records.

- **Note** — free-text annotation on a record.
- **Task** — assignable to-do with due date, queue, priority.
- **Email** — sent or logged email; full thread view; tracking pixel for opens/clicks.
- **Call** — logged or recorded call (HubSpot Calling or third-party).
- **Meeting** — logged calendar event.
- **WhatsApp/SMS message** — channel messages.
- **Chat conversation** — live chat or Conversations Inbox thread.
- **Postal mail / Linkedin message** — manually logged.

### 1.3 Properties (Custom Fields)

This is HubSpot's flagship architectural choice. A **Property** is a typed field on an object schema; adding one **does not require migration** — it is a metadata insert.

**Property types:** single-line text, multi-line text, single-checkbox, multiple checkboxes, dropdown, radio, number, date picker, datetime picker, file, score, calculated, currency, phone, email, country, state, monetary.

**Property classes:**

- **HubSpot-defined** — core fields (firstname, lastname, lifecyclestage, hs_lead_status, etc.).
- **Custom properties** — user-defined.
- **Calculated properties** — derived via a formula across other properties (Pro+).
- **Score properties** — multi-criteria scoring formula (Marketing/Sales Pro+).

**Property metadata:** label, internal name, description, group, field type, default value, validation rules, options (for enum), visibility/permission tier.

### 1.4 Lists

A **List** is a saved set of records matching a definition.

- **Static list** — manual membership; adding/removing rows is explicit.
- **Active list** — saved query; membership is recomputed continuously as data changes (HubSpot's killer "smart segment" feature). Supports complex AND/OR boolean logic across properties, behavioral events, and engagement.

### 1.5 Pipelines & Stages

Pipelines are per-object (Deals, Tickets, Leads, custom objects in Enterprise).

- Multiple pipelines per object (e.g., "New Business" vs "Renewal" deal pipelines).
- Stages with required fields and stage probability for forecasting.
- Stage automation (move-to-stage triggers).
- Pipeline-specific permissions (Enterprise).

### 1.6 Associations

Many-to-many relationships between objects with **labels** (e.g., a Contact can be associated to a Company as "Decision Maker," "Influencer," or "Billing Contact").

- Bidirectional with custom labels (Pro+).
- Primary association concept (a Contact has one *primary* Company for default rollups).
- Up to 4 custom association labels per pair (Pro), unlimited (Enterprise).

### 1.7 Activity Timeline

Unified chronological feed on every record showing every engagement, property change, list membership change, workflow execution, etc. This is the **single most copied feature** across CRMs and is non-negotiable in our build.

### 1.8 Conversations Inbox

A unified team inbox aggregating chat, email, Facebook Messenger, WhatsApp, SMS, custom channels. Free with Smart CRM.

### 1.9 Forms

Embeddable form builder.

- Standard form, pop-up form, embedded form, raised banner, slide-in box, drop-down banner.
- Conditional fields, smart fields (pre-fill from CRM), GDPR consent, progressive profiling (show different fields on repeat visits).

### 1.10 Reporting (free tier)

- **Dashboards** — up to 3 dashboards, 10 reports each (free tier).
- **Standard reports** — sales pipeline, contact activity, deal forecast, etc.
- **Single-object reports** (free) — bar/line/pie charts on properties.
- **Activity feed** for sales team.

### 1.11 Mobile App

iOS + Android native apps with: contact lookup, business card scanner, call logging with auto-transcribe, deal management, push notifications, mobile inbox.

### 1.12 Free-tier limits worth knowing (so we know what to charge for)

- 1M contacts free.
- Limited workflow steps (1 simple workflow on free).
- 5 active lists, 1,000 static lists.
- 3 dashboards.
- 1,000 emails/month send (transactional).

---

## 2. Marketing Hub

Marketing Hub is HubSpot's flagship product and where the original company started. It is **billed per Marketing Contact**.

### 2.1 Email Marketing
- Drag-drop email designer with templates.
- Personalization tokens (any contact property).
- Smart Send Time (AI-optimized send window).
- A/B testing on subject lines and content.
- Automated sequences (drip campaigns) via Workflows.
- Send-time email reporting (opens, clicks, bounces, unsubscribes, click maps, time-of-day heatmap).
- Transactional email API (Pro+).
- Dedicated IP (Enterprise add-on).
- BIMI/DMARC support.
- AI subject line generator (Breeze).

### 2.2 Landing Pages
- Drag-drop builder with global modules.
- Smart Content (show different blocks per device/lifecycle stage/list membership).
- A/B testing.
- Conversion tracking.
- HubL templating language for advanced layouts.
- Theme system (typography, color, spacing tokens).

### 2.3 Forms (Marketing-side)
Same engine as the free CRM forms but with extra:
- Progressive profiling (show different questions on repeat visit).
- Dependent fields.
- Reporting integration.
- HubSpot tracking code (cookie-based) auto-attribution.

### 2.4 Marketing Workflows (Automation)
Visual workflow builder. Triggers + actions + branching.

**Triggers:**
- List membership change.
- Form submission.
- Page view.
- Property value change.
- Date-based (anniversary, custom date property).
- Webhook receipt.
- Marketing event registration.

**Actions:**
- Send email, send SMS (with provider).
- Set/copy/clear/add/subtract property value.
- Add to list, remove from list.
- Create task/note/deal/ticket.
- Enrol in another workflow.
- Branching (if/then), goal, delay.
- Custom code action (Operations Hub Pro+).
- Webhook outbound.
- Run AI Agent (private beta 2026).

### 2.5 Campaigns
A *Campaign* is a meta-tagging system grouping all assets (emails, landing pages, ads, social posts, blog posts, workflows) belonging to one initiative. Provides a unified ROI view: leads generated, contacts touched, deals influenced, revenue.

### 2.6 Lead Scoring
- **Manual rules** — points for property values + behavior.
- **Predictive scoring** (Pro+) — ML-trained scoring with two scores: *contact-likelihood-to-close* and *deal-likelihood-to-close*.
- **Multiple scores** — score by product/segment (Pro+).

### 2.7 SEO
- Topic clusters (pillar + cluster pages).
- On-page SEO recommendations as you write.
- Site auditor (broken links, slow pages, missing alt tags).
- Keyword tracking (deprecated 2023; SEMrush integration recommended).

### 2.8 Blog
- Multi-author blog with CMS-backed publishing.
- Drag-drop blog post builder.
- Auto-RSS-to-email.
- Comments via Disqus or built-in.
- Topic clusters.
- AI Blog Post Generator (Breeze, Content Hub overlap).

### 2.9 Social Media
- Schedule posts to Facebook, Instagram, LinkedIn, X (Twitter), YouTube.
- Monitoring streams (mentions, keywords, lists).
- Reply/engagement directly from HubSpot.
- Social Post Agent (Breeze) — auto-suggests post copy based on a topic or URL.
- Reporting per channel.

### 2.10 Ads
- Connect Facebook, Google, LinkedIn ad accounts.
- Pull spend + leads back into HubSpot.
- Audience sync (push HubSpot lists as custom audiences).
- Lead Ads ingestion (Facebook Lead Ads → contacts).
- Ad Sequences (multi-step retargeting).

### 2.11 Smart Content (Personalization)
Render different content for the same URL/email based on:
- Country, device, referral source.
- Contact list membership.
- Lifecycle stage.
- Any contact property.

### 2.12 A/B Testing
Native A/B for emails, landing pages, blog posts, and CTAs (Pro+). Adaptive Testing (multivariate, AI-allocated traffic) was moved into Content Hub in 2025.

### 2.13 Customer Journey Analytics (Enterprise)
- Visual journey builder showing real funnel paths.
- Drop-off analysis between touchpoints.
- Attribution modeling (linear, first-touch, last-touch, time-decay, U-shaped, W-shaped, full-path, custom).

### 2.14 Marketing Events
First-class object for events (webinars, conferences). Native integrations with Zoom, GoToWebinar, Eventbrite, Microsoft Teams. Auto-syncs registrants/attendees to contacts.

### 2.15 Account-Based Marketing (ABM) — Pro+
- Target Accounts list (company-level).
- Buyer roles per company.
- ABM dashboards.
- Buying intent signals from HubSpot Insight + Bombora.
- Account Overview page (single pane on a target account).
- LinkedIn Matched Audiences sync.

### 2.16 Brand Kit
Centralized place to upload logos, colors, fonts. Used across emails, landing pages, social posts to enforce consistency.

### 2.17 Asset Library
Central repository for images, videos, documents reused across channels.

### 2.18 Marketing Calendar
Calendar view of every scheduled email, social post, ad, blog post.

### 2.19 GDPR / Privacy Tools
- Cookie consent banner.
- Email subscription preferences center.
- Right-to-be-forgotten workflow.
- Subscription type management.
- Granular consent tracking per contact.

### 2.20 Marketing Contacts (Billing Model)
Contacts are tagged "Marketing" or "Non-Marketing." Only marketing contacts count toward your tier limit. Contacts can be flipped between states; non-marketing contacts cannot receive marketing emails or be in active lists used for emails.

---

## 3. Sales Hub

Sales Hub is the rep-facing engagement surface.

### 3.1 Deals & Pipelines
- Multiple pipelines per portal (e.g., New Business, Renewal, Upsell).
- Custom stages with required fields, stage probability.
- Kanban + table + forecast views.
- Deal automation (workflow-driven stage progression, task creation).
- Deal split (split commission across reps).

### 3.2 Quotes
- Drag-drop quote builder.
- Line items from product library.
- E-signature (built-in).
- Pay-with-quote (Stripe integration → Commerce Hub).
- Quote templates.
- Quote approval flow (Pro+).
- Custom branding (logos, colors).

### 3.3 Sales Engagement
**Sequences** — multi-step prospecting cadences (email + tasks + calls). Spring 2026: still email-only (no in-sequence calls/SMS in standard tier).
- Up-to-50-step sequences.
- Pause on reply.
- Personalization tokens.
- Send-time optimization.
- Sequence reporting (open, click, reply, meeting-booked).
- Bulk-enroll a list of contacts.

### 3.4 Snippets
Saved short text snippets (1-3 sentences) inserted via shortcuts in emails/notes/chat.

### 3.5 Templates
Saved email templates with personalization tokens. Can be shared across the team.

### 3.6 Documents (Sales Collateral)
Upload PDFs/decks; share via tracked links; see when prospect opens/views which page.

### 3.7 Meetings (Scheduler)
- Personal scheduling links.
- Round-robin team links.
- Group meetings.
- Prospect-funnel (form first → calendar second).
- Calendar 2-way sync (Google, Office 365).
- Custom forms before booking.
- Embedded scheduler on website.
- Meeting types (15/30/60 min).

### 3.8 Calling (HubSpot Calling)
- Native VoIP via Twilio.
- Inbound + outbound calls from CRM.
- Call recording + auto-transcription.
- Auto-logging to contact timeline.
- IVR (basic, Pro+).
- Routing rules (Enterprise).
- Mobile calling app.

### 3.9 Conversation Intelligence (Pro+)
AI-driven analysis of call recordings.
- Auto-transcription with speaker identification.
- Sentiment analysis.
- Talk-listen ratio.
- Key topic detection.
- Coaching highlights (mentions of competitors, pricing, objections).
- Searchable transcript library.

### 3.10 Playbooks
Interactive guided sales scripts (e.g., discovery call, demo, objection handling). Reps fill out sections during calls; data syncs to deal/contact properties.

### 3.11 Goals
Set per-rep, per-team, per-period sales goals (revenue, deals closed, calls made). Tracked on dashboards.

### 3.12 Forecasting
- Manual deal-stage probability forecast.
- Submitted forecast (rep submits a category: Commit / Best Case / Pipeline / Omitted).
- Forecast vs goal vs pipeline.
- Predictive forecast (Pro+ AI prediction).

### 3.13 Lead Routing
- Round-robin assignment.
- Territory-based.
- Property-based (e.g., industry, deal size).
- Skills-based (Enterprise).
- Capacity-based load balancing.

### 3.14 Lead Scoring (Sales)
Sales-side score complements marketing-side score. Two-score model.

### 3.15 Coaching Playlists
Curated sets of call recordings for new-hire onboarding and ongoing coaching.

### 3.16 Prospecting Workspace
Dedicated rep cockpit (launched late-2024). Single-pane:
- Today's tasks queue.
- Active sequences.
- Scheduled meetings.
- Deal-stage queue.
- Notifications.
- Buying signals.

### 3.17 Lead Object (new 2024)
A separate object representing the *qualification stage* of a contact-company-deal. Owns its own lifecycle (New, Connecting, Qualifying, Disqualified, Converting, Converted). Distinct from the **Lifecycle Stage** property on contacts (which is system-level).

### 3.18 Buying Signals (Pro+)
HubSpot detects:
- Repeated website visits.
- Email replies + sentiment.
- Pricing-page views.
- Product-page views.
- Form submissions.
- Email opens after a quiet period.
Signals trigger reps to act and feed into the Prospecting Agent.

### 3.19 Field-level Permissions (Enterprise)
Restrict which roles can read/edit each property.

### 3.20 Custom Reports & Forecast Analytics (Enterprise)
Custom-coded reports with multi-object joins. Pipeline waterfall, stage-conversion, sales velocity reports.

---

## 4. Service Hub

### 4.1 Tickets
- Custom pipelines (e.g., L1, L2, L3 support).
- Status, priority, source, owner, SLA.
- Auto-creation from email, chat, form, WhatsApp, FB Messenger.
- Internal comments vs customer replies.
- Merge tickets.
- Bulk operations.

### 4.2 Help Desk Workspace
Unified rep cockpit. Aggregates ticket queue across channels.
- Single inbox view.
- Ticket detail panel with full context.
- Customer 360 sidebar.
- Inline knowledge-base article suggestions.
- Reply via any channel.
- Internal-only side-conversation thread.
- Saved replies + macros.
- Bulk actions (close, assign, change status).

### 4.3 Knowledge Base
- Public help center hosted by HubSpot (custom domain).
- Article editor with categorization.
- Multi-language.
- Article voting (helpful / not helpful).
- Top-search-terms reporting + zero-result alerts.
- AI search (Breeze).
- Embeddable search widget.
- Article-to-ticket conversion (suggested KB articles in tickets).

### 4.4 Customer Portal
Login-protected portal where customers can:
- View their open/closed tickets.
- Reply to tickets.
- Access KB.
- Download invoices (Commerce Hub).
- Manage subscriptions (Commerce Hub).

### 4.5 Live Chat
- Bot-first or rep-first.
- Routing rules.
- Pre-chat surveys.
- Chatflow builder (decision tree).
- Visitor identification (cookie + email match).

### 4.6 Inbound Calling
Calls into the support team. Distinct from Sales Hub Calling. Routing + IVR + queue.

### 4.7 Conversations Inbox (Service)
Same engine as the CRM-level inbox but with service-specific routing rules and SLA assignment.

### 4.8 Customer Feedback Surveys
- **Net Promoter Score (NPS)** — 0-10 scale.
- **Customer Satisfaction (CSAT)** — post-resolution survey.
- **Customer Effort Score (CES)** — "easy to resolve?" survey.
- Custom surveys.
- Trigger via workflow (e.g., 1 day after ticket close).
- Reporting by source/agent/segment.

### 4.9 SLAs
- Time-to-first-response SLA.
- Time-to-resolution SLA.
- Business hours definition.
- Escalation rules.
- Conditional SLAs (per priority/source/customer tier) — Pro+.
- Pause SLA on customer awaiting reply.

### 4.10 Routing
- Round-robin.
- Property-based (e.g., language, region).
- Skill-based routing (Pro+).
- Working-hours awareness.
- Overflow rules.

### 4.11 Service Workflows
Specialized workflow templates for ticket automation: auto-assign on creation, auto-close after N days inactive, escalate after SLA breach, post-resolution NPS trigger.

### 4.12 Service Analytics
- Ticket volume by channel/category/priority.
- Resolution time histograms.
- First-response time distributions.
- Agent performance.
- CSAT/NPS dashboards.
- Backlog trend (open tickets over time).

### 4.13 Customer Health Score
Computed score per customer combining:
- Ticket volume + sentiment.
- NPS history.
- Engagement signals.
- Renewal likelihood.

### 4.14 Coaching & Playbooks (Service)
Same engine as Sales Hub playbooks; service-specific templates (de-escalation, refund flow, complaint handling).

### 4.15 Goals (Service)
Per-agent CSAT, resolution time, ticket volume goals.

### 4.16 Inbound/Outbound Voice (2026)
Voice/Calling channel reached GA late-2025; Customer Agent over Voice in Beta (April 2026).

---

## 5. Content Hub (formerly CMS Hub)

A full website CMS sharing the Smart CRM data layer, so every page can read CRM properties and personalize.

### 5.1 Drag-Drop Page Editor
WYSIWYG editor with:
- Inline editing.
- Section/column/row layout primitives.
- Module library (text, image, CTA, form, video, gallery, custom code).
- Mobile-responsive previews.

### 5.2 Themes
Bundled design system: typography tokens, color tokens, spacing tokens, header/footer templates, page templates. Marketplace of free + paid themes.

### 5.3 Modules (Custom Components)
- Built-in module library.
- Custom module SDK (HTML + CSS + JS + HubL fields config).
- Module marketplace.

### 5.4 HubL Templating
HubSpot's Jinja-style templating language for advanced page logic. Loops, conditionals, CRM data access, smart content.

### 5.5 Membership / Gated Content
- Login-protected pages.
- List-based access control (e.g., only contacts in "VIP Customers" list see VIP page).
- Custom registration + login forms.
- SSO via Google/Microsoft (Enterprise).

### 5.6 Multi-Language
- Language variants per page (English, Spanish, Arabic, ...).
- Auto language switcher.
- AI translation (Breeze).
- Hreflang management.

### 5.7 A/B Testing & Adaptive Testing
- Standard A/B for two variants.
- **Adaptive Testing** (multivariate, AI-allocated traffic, real-time winner promotion). Moved from Marketing Hub to Content Hub in 2025.

### 5.8 Content Recommendations
On-page widget showing related blog posts/pages based on:
- Topic cluster membership.
- User behavior (browsing history).
- AI similarity (Breeze).

### 5.9 AI Content Assistant (Breeze)
- AI Blog Post Generator.
- AI Image Generator.
- AI Translation.
- AI Title Generator.
- AI Meta Description Generator.

### 5.10 Brand Voice
Train an AI model on your existing content to generate new content matching your tone of voice. Editable voice profile (formal vs casual, words to avoid, words to prefer).

### 5.11 Content Remix
Take a single source asset (e.g., a blog post) and one-click generate:
- Email summary.
- LinkedIn post.
- Twitter thread.
- Short video script.
- Podcast outline.

### 5.12 Multi-Tenant Sites (Enterprise)
Up to 10 brand domains under one Content Hub Enterprise account, each with its own theme + content scope.

### 5.13 SEO Tools
- On-page recommendations.
- Topic clusters.
- Site audit.
- Schema markup helpers.

### 5.14 Site Search
Built-in search across blog + pages + KB. AI-powered semantic search (Breeze, Enterprise).

### 5.15 Forms (CMS-side)
Same engine as Marketing Hub forms; embedded directly in pages.

### 5.16 Hosting & Performance
- Global CDN.
- HTTPS (auto-issued).
- DDoS protection.
- 99.99% uptime SLA.
- WAF (Enterprise).
- File manager.

### 5.17 Developer Tools
- Local development via HubSpot CLI.
- Theme starter project.
- Module builder.
- GitHub integration (CI deploy of themes/modules).
- Serverless Functions (Pro+).

---

## 6. Data Hub (formerly Operations Hub, rebranded 2025)

The data plumbing layer — sync, automation, quality.

### 6.1 Data Sync
- Native 2-way sync to 100+ apps (Salesforce, Mailchimp, Stripe, Shopify, Pipedrive, etc.).
- Field mapping UI.
- Sync direction control (HubSpot ↔ App, HubSpot ← App, HubSpot → App).
- Conflict resolution rules (latest write wins / app-of-record wins).
- Re-sync on demand.
- Default field mappings; override at field level.

### 6.2 Custom-Coded Workflow Actions
Run Node.js (with HubSpot SDK) code as a workflow step. Receive contact/deal/object payload, return data + emit events.

### 6.3 Webhooks
- Outbound webhooks from any workflow.
- Inbound webhook actions (Pro+).
- Retry logic + payload inspection.

### 6.4 Data Quality Tools
- Format auto-correction (capitalize names, normalize phone numbers, dedupe).
- Suggested merges (find probable duplicates).
- Property usage analytics (which fields are stale or unused).
- Validation rules per property.
- Mass-edit + mass-clean operations.

### 6.5 Data Health Score
Composite metric: % of records with key fields populated, % of stale records, % of duplicates.

### 6.6 Custom Properties Mass Manager
Bulk-create / rename / archive properties.

### 6.7 Datasets (Enterprise)
Reusable dataset definitions for custom reports. SQL-like joins across HubSpot objects + property aggregations.

### 6.8 Snowflake Sync (Enterprise)
Push HubSpot data into Snowflake warehouse for BI tools.

### 6.9 BigQuery / Redshift Sync (Enterprise)
Same pattern as Snowflake; available 2025+.

### 6.10 Programmable Email
Custom code generates email content per recipient (e.g., personalized recommendations).

### 6.11 Custom Channels (Conversations API)
Build your own channel adapter (e.g., your support app) and route messages into HubSpot's inbox.

---

## 7. Commerce Hub

Quote-to-cash inside HubSpot. All built atop Stripe (HubSpot also re-sells PayPal in some regions).

### 7.1 Payments
- Stripe-backed payment links.
- One-time + recurring.
- ACH + credit card.
- Native HubSpot Payments (US) — HubSpot is the merchant of record.
- 0.5% + 2.9% + 30¢ standard rate (US).

### 7.2 Invoices
- Drag-drop invoice builder.
- Auto-numbering.
- Send via email or share link.
- Auto-mark-paid on Stripe webhook.
- Multi-currency.
- Tax calculation (built-in basic; Avalara/TaxJar for advanced).

### 7.3 Subscriptions
- Recurring billing schedules.
- Plan changes mid-cycle.
- Proration.
- Auto-renewal.
- Dunning (failed-payment recovery).

### 7.4 Quotes-with-Payment
Quote becomes a payment-collection vehicle: customer can sign and pay in one flow.

### 7.5 Estimates
Pre-quote informal pricing document (no binding).

### 7.6 CPQ (Configure-Price-Quote)
- Product library with options.
- Configurable bundles.
- Discount approval rules.
- Price book per customer segment.
- AI-assisted CPQ (Spring 2026).

### 7.7 Tax Automation
- Tax exempt customers.
- Tax inclusive vs exclusive pricing.
- Avalara integration.

### 7.8 Reporting
Quote conversion rate, revenue forecast, MRR/ARR (subscriptions), churn, LTV.

---

## 8. Breeze AI (Cross-Cutting)

Breeze is HubSpot's umbrella AI brand. Three sub-products.

### 8.1 Breeze Copilot (formerly ChatSpot, renamed Breeze Assistant)
A conversational AI sidebar inside every Hub. Capabilities:
- Summarize a contact/deal/ticket record.
- Draft emails/replies/meeting notes.
- Answer "how do I…" questions about HubSpot.
- Run CRM queries in natural language ("show me deals closing this month over $10K").
- Translate content.
- Cross-record reasoning (e.g., "what are the 3 most active accounts this week?").

### 8.2 Breeze Agents
**Specialized AI teammates** that own a multi-step workflow end-to-end.

#### 8.2.1 Prospecting Agent
- Identifies in-market accounts via buying signals (Bombora, web behavior, intent data).
- Builds contact lists per account (decision-maker discovery).
- Generates personalized outbound emails.
- Submits drafts to rep for approval (HITL).
- Tracks reply, books meetings, escalates to rep.

#### 8.2.2 Customer Agent (Service)
- Answers Tier-1 support questions across 9 channels (email, chat, WhatsApp, SMS, Voice/Calling beta, Facebook, Instagram, custom).
- Auto-resolves tickets with KB-backed answers.
- Escalates ambiguous cases to a human.
- Multi-turn conversations.
- Per-Hub permissions (read which records, write what).

#### 8.2.3 Content Agent
- Generates blog posts / landing pages / social copy.
- Brand-voice constrained.
- SEO-optimized output.
- Content remix (one source → many formats).
- Image generation.

#### 8.2.4 Social Post Agent (formerly Social Agent)
- Drafts social posts.
- Schedules across channels.
- Suggests hashtags + best posting time.
- Pulls topics from blog/news/RSS.

#### 8.2.5 Run Agent (Workflow Action — private beta 2026)
A workflow step that triggers any Breeze Agent inline. This is the **AI orchestration primitive** — every workflow can now branch into agent-driven multi-step reasoning.

### 8.3 Breeze Intelligence (Data Enrichment)
- Auto-populates company firmographics (revenue, industry, employee count, location).
- Auto-populates contact intelligence (job role, seniority, social profiles).
- Buying intent signals (Bombora overlay).
- **Free tier (2026)** — standard fields enriched at no cost.

### 8.4 Audit & Governance
Every Breeze action generates a **timestamped audit card** showing:
- Which agent executed.
- Which prompts/inputs.
- Which CRM properties were modified (before/after).
- Lead qualification reasoning (what data points drove the decision).

This is essential for regulated industries — and a pattern we should replicate.

---

## 9. Identity & Access (cross-cutting)

### 9.1 Users & Seats
- **Core seats** — full CRM access.
- **View-only seats** (Enterprise) — read-only access.
- **Partner seats** — agency users at no extra cost.
- **Sales seat / Service seat** add-ons — gate Pro/Enterprise feature access per Hub.

### 9.2 Teams
Hierarchical teams (parent → child). Permission inheritance.

### 9.3 Permissions
- **Permission Sets** — reusable bundles applied to users.
- **Object permissions** — per-object CRUD.
- **Field-level permissions** (Enterprise) — per-property read/edit.
- **Pipeline permissions** — per-pipeline access.
- **List permissions** — per-list access.

### 9.4 Single Sign-On (SSO)
SAML 2.0 (Enterprise). Native: Okta, OneLogin, Microsoft Entra, Google Workspace, Azure AD.

### 9.5 Two-Factor Authentication
- TOTP, SMS, hardware keys.
- Enforced at portal level (Enterprise).

### 9.6 Audit Logs
- Login history.
- Property change history per record.
- Workflow execution history.
- Bulk action history (Enterprise).

### 9.7 Brand Domain Restriction (Enterprise)
Restrict user accounts to specific email domains.

---

## 10. Integrations & Marketplace

- **App Marketplace**: 1,500+ certified integrations.
- **Categories**: Email/calendar, video conferencing, social, ads, ecommerce, accounting, customer success, productivity, payments.
- **Notable native integrations**: Gmail, Outlook, Office 365, Google Workspace, Slack, Stripe, Shopify, Zoom, Microsoft Teams, Salesforce (bidirectional sync), Pipedrive (data sync), QuickBooks, Xero, Mailchimp, Eventbrite, GoToWebinar.
- **Custom apps** (developer): build apps with the HubSpot Public API + OAuth + webhooks.
- **Private apps** (per-portal): for internal use; auth via private app token.
- **Workflows custom code action** — call any external API as a workflow step.

### 10.1 Public API
- REST + GraphQL.
- OAuth 2.0 + private app tokens.
- Per-account rate limits (100 req/10s + daily limits).
- Webhooks for object events.

### 10.2 Custom Behavioral Events (Enterprise)
- Define custom event schemas (event name + properties).
- Send from your app via API or tracking code.
- Use as triggers in workflows + criteria in lists.

---

## 11. Reporting & Analytics (cross-Hub deep-dive)

### 11.1 Dashboards
- Drag-drop layout.
- Up to 10 reports per dashboard (Pro), unlimited (Enterprise).
- Sharing & schedule-by-email.
- Filtered views (per-team dashboard slicers).

### 11.2 Custom Reports
- Single-object: bar, line, pie, area, summary table, KPI tile.
- Cross-object (Pro+): build joins via association labels.
- Funnel reports.
- Attribution reports.
- Datasets (Enterprise).

### 11.3 Standard Reports (Pre-built)
50+ out-of-the-box across Marketing, Sales, Service, Content.

### 11.4 Forecasting Reports (Sales)
- Pipeline by stage.
- Stage conversion.
- Sales velocity.
- Win/loss.
- Lost reason analysis.

### 11.5 Attribution
Multi-touch attribution models (per §2.13).

---

## 12. Tier Comparison Summary

| Tier | Marketing Hub | Sales Hub | Service Hub | Content Hub | Data Hub | Commerce Hub |
| --- | --- | --- | --- | --- | --- | --- |
| **Free** | Forms, basic email, ads | Pipeline, deals, tasks | Tickets, basic inbox | 1 page, 1 blog | None | Payment links (US-only) |
| **Starter** | $20/seat/mo + ↑1K contacts | $20/seat | $20/seat | $20/seat (15 pages) | N/A | Same |
| **Pro** | $890/mo (3 seats) + 2K contacts | $100/seat | $100/seat | ~$500/mo | $720/mo | Same |
| **Enterprise** | $3,600/mo (5 seats) + custom | $150/seat | $150/seat | ~$1,500/mo | $2,000/mo | Same |

**Onboarding fees:** Pro $3,000, Enterprise $7,000.

**Customer Platform bundle:** discounted bundle of all six Hubs at one tier.

---

## 13. UX / Architecture Patterns Worth Replicating

These are the design choices that make HubSpot feel like one product instead of six. We should replicate them in our build.

### 13.1 Properties as first-class metadata
Adding a custom field is a UI operation, not a migration. Achieved via EAV-style storage internally with JSON projection at read time. Critical decision: same in our build.

### 13.2 Active Lists as saved queries
A list is a query, not a static set. The query criteria can reference any property + behavioral events + engagement metrics. Membership recomputes continuously. Implementation: persisted query DSL + indexed materialized view.

### 13.3 Pipelines as first-class per object
Any object can have multiple pipelines. Stages with required fields. We should make Pipeline a generic concept attached to any record type (Deal, Ticket, Lead, custom).

### 13.4 Activity Timeline as a unified event log
Every interaction (engagement, property change, workflow, association change, etc.) is appended to a per-record timeline. Implemented via an event log + filtered reads. Replicate in full.

### 13.5 Conversations Inbox as channel-agnostic
One inbox, many channels (email, chat, WhatsApp, FB, custom). Each thread maps to a Ticket and a Contact. Reps reply via the original channel without switching apps.

### 13.6 Workflows as the universal automation primitive
One engine drives marketing automation, sales automation, service automation, internal ops automation. Trigger + branching + delay + action. Same engine, different action palettes per Hub.

### 13.7 Hubs share data, layer features
Each Hub feels like a focused product but reads and writes to the same Smart CRM. We should mirror this: a single API + DB, with feature-toggled UI surfaces per persona.

### 13.8 Marketing Contacts billing axis
A clever way to monetize without capping total CRM size. Worth studying for our own pricing model.

### 13.9 Lead object distinct from Contact
A Lead is a *qualification stage* on top of a Contact, not a separate entity. Avoids the "duplicate Lead vs Contact" pain that plagued early Salesforce users.

### 13.10 Breeze audit cards
Every AI action is fully traceable. We must do this from day one for any AI feature.

---

## 14. Module Decomposition Recommendation for Our Build

Mapping HubSpot's surface to a Node.js + Vue monorepo:

### Backend modules (NestJS-style)
- `core/` — auth, users, teams, permissions, audit log
- `crm/` — contacts, companies, deals, tickets, custom objects, pipelines, properties, lists, associations, timeline, engagements
- `marketing/` — forms, landing pages, email marketing, campaigns, lead scoring, social, ads, calendar
- `sales/` — quotes, sequences, meetings (scheduler), templates, snippets, documents, calling, playbooks, goals, forecasting, prospecting workspace, lead routing
- `service/` — tickets pipeline, help desk inbox, KB, customer portal, surveys (NPS/CSAT/CES), SLAs, routing, service workflows
- `content/` — pages, blog, themes, modules, multi-language, membership, A/B testing
- `data/` — workflows engine, data sync, webhooks, data quality, datasets, snowflake export, custom code actions, custom channels
- `commerce/` — products, quotes, invoices, subscriptions, payments, CPQ, tax
- `ai/` — breeze-style agent runtime, copilot, intelligence (enrichment), audit card store
- `integrations/` — marketplace registry, OAuth, public REST + GraphQL API, webhooks

### Frontend apps
- `apps/dashboard/` — Vue admin dashboard for sales/service/marketing/admin users
- `apps/web/` — public website + customer portal + KB (Content Hub equivalent)

### Cross-cutting
- Reporting engine (datasets, dashboards, scheduled reports)
- Workflow engine (the universal automation primitive — top priority)
- Properties engine (custom-fields-as-metadata)
- Lists engine (saved-query model)
- Timeline engine (per-record event log)

---

## 15. Sources

- [HubSpot Products page (canonical)](https://www.hubspot.com/products)
- [HubSpot Product & Services Catalog (legal)](https://legal.hubspot.com/hubspot-product-and-services-catalog)
- [Spring 2026 Spotlight](https://www.hubspot.com/spotlight)
- [HubSpot 7-Hubs Guide 2026 (sidekickstrategies.com)](https://www.sidekickstrategies.com/blog/hubspot-hubs-complete-guide)
- [What Is HubSpot in 2026? CRM, AI Features, Pricing & Best Use Cases (engagebay.com)](https://www.engagebay.com/blog/what-is-hubspot/)
- [HubSpot Spring 2026 Spotlight: 99 Updates Ranked by Business Impact (vantagepoint.io)](https://vantagepoint.io/blog/hs/spring-2026-spotlight-99-updates-business-impact-ranked)
- [HubSpot Sales Hub Pricing & Features 2026 (zeeg.me)](https://zeeg.me/en/blog/post/hubspot-sales-hub)
- [HubSpot Sales Hub Reviews 2026 (G2)](https://www.g2.com/products/hubspot-sales-hub/reviews)
- [HubSpot Service Hub Reviews 2026 (G2)](https://www.g2.com/products/hubspot-service-hub/reviews)
- [HubSpot Content Hub Reviews 2026 (G2)](https://www.g2.com/products/hubspot-content-hub/reviews)
- [HubSpot Help Desk overview (knowledge.hubspot.com)](https://knowledge.hubspot.com/help-desk/overview-of-the-help-desk-workspace)
- [HubSpot Customer Portal setup (knowledge.hubspot.com)](https://knowledge.hubspot.com/inbox/set-up-a-customer-portal)
- [HubSpot Content Hub: Everything You Need to Know for 2026 (mo.agency)](https://www.mo.agency/blog/hubspot-content-hub)
- [HubSpot Content Hub Multi-Language Variants (smartbugmedia.com)](https://www.smartbugmedia.com/blog/a-guide-to-implementing-language-variants-in-hubspot-content-hub)
- [Breeze AI Agents (hubspot.com/products)](https://www.hubspot.com/products/artificial-intelligence/breeze-ai-agents)
- [How to Use Breeze and AI Agents in HubSpot — A Complete 2026 Guide (vantagepoint.io)](https://vantagepoint.io/blog/hs/how-to-use-breeze-ai-agents-hubspot)
- [HubSpot Breeze AI Agents 2026 Guide for SMBs (onthefuze.com)](https://www.onthefuze.com/hubspot-insights-blog/hubspot-breeze-ai-agents-2026)
- [HubSpot AI Tools 2026 Guide (hublead.io)](https://www.hublead.io/blog/hubspot-ai-tools)
- [HubSpot Pricing 2026 Best Plans (elefanterevops.com)](https://elefanterevops.com/blog/hubspot-pricing)
- [HubSpot Pricing 2026 Calculator (zeeg.me)](https://zeeg.me/en/blog/post/hubspot-pricing)
- [HubSpot's Marketing Hub pricing guide (blog.hubspot.com)](https://blog.hubspot.com/marketing/hubspot-marketing-hub-pricing)
- [HubSpot's Sales Hub pricing guide (blog.hubspot.com)](https://blog.hubspot.com/sales/hubspot-sales-hub-pricing)
- [Knowledge Base Software (hubspot.com/products/service)](https://www.hubspot.com/products/service/knowledge-base)
- [Help Desk Software (hubspot.com/products/service)](https://www.hubspot.com/products/service/help-desk)
- [Customer Portal (hubspot.com/products/service)](https://www.hubspot.com/products/service/customer-portal)
- [Content Hub Marketing Software (hubspot.com/products/content)](https://www.hubspot.com/products/content)
- [Commerce Hub for Professional Services (hubspot.com)](https://www.hubspot.com/commerce-hub-for-professional-services)
- [HubSpot CMS Review 2026 — quicksprout](https://www.quicksprout.com/hubspot-cms-review/)
- [15 HubSpot updates from March 2026 (martech.org)](https://martech.org/15-hubspot-updates-from-march-2026-managers-and-admins-need-to-know/)
- [HubSpot Wikipedia](https://en.wikipedia.org/wiki/HubSpot)
