# Salesforce — Comprehensive Module & Feature Catalog

> Reference document for the self-hosted CRM build. Captures the breadth of the Salesforce platform — Clouds, modules, objects, automation, AI, editions — so we can decide which features to clone, simplify, or skip. Current as of Spring/Summer/Winter '26 releases (April 2026).

---

## 0. Top-Level Product Map (the "Customer 360")

Salesforce groups its functionality into "Clouds" (functional product lines) plus a shared **Platform** layer (data model, security, automation, UI, AI). The major Clouds and adjacent products in 2026 are:

1. **Sales Cloud** (now branded "Agentforce Sales") — pipeline, opportunity, quote, forecast, partner.
2. **Service Cloud** ("Agentforce Service") — case, knowledge, omni-channel, field service, voice.
3. **Marketing Cloud** — Marketing Cloud Growth, Marketing Cloud Advanced, Marketing Cloud Next (the unified successor), Account Engagement (Pardot), Personalization (formerly Interaction Studio), Loyalty Management, Advertising.
4. **Commerce Cloud** — B2C Commerce, B2B Commerce, D2C, Order Management (OMS), Agentic Commerce.
5. **Experience Cloud** — Customer/Partner/Employee portals and self-service sites built on the Salesforce platform.
6. **Data Cloud** (CDP) — unified customer profiles, zero-copy data federation, identity resolution, calculated insights.
7. **Tableau / CRM Analytics** (formerly Einstein Analytics / Wave) — BI, dashboards, predictive analytics, Pulse.
8. **Industry Clouds** — Health, Financial Services, Education, Nonprofit, Manufacturing, Consumer Goods, Communications, Media, Energy & Utilities, Public Sector, Automotive, Life Sciences, Retail, Travel & Hospitality.
9. **Slack** — collaboration hub, channels, Slack AI, Agentforce-in-Slack.
10. **MuleSoft** — integration platform (Anypoint), API gateway, Composer, RPA.
11. **Heroku** — managed PaaS for custom apps.
12. **Net Zero Cloud** — sustainability/ESG accounting.
13. **Agentforce** — Salesforce's autonomous AI agent platform that spans every Cloud (the marketing umbrella for Einstein + GPT + autonomous agents in 2026).
14. **AppExchange** — marketplace of 7,000+ ISV apps and components.

The **Salesforce Platform** itself (the foundation under every Cloud) provides: the metadata-driven object/field schema, Apex (server-side language), Lightning Web Components (UI framework), Flow (no-code automation), Permissions/Sharing, Reports & Dashboards, Mobile App, Files, Chatter, AppExchange.

---

## 1. Sales Cloud (Agentforce Sales)

The core CRM: managing the journey from lead → opportunity → closed deal → renewal.

### 1.1 Leads
- **Description**: Unconverted prospects — names you have not yet qualified into a real account/contact/opportunity.
- **Sub-features**:
  - Lead capture: Web-to-Lead forms, email-to-lead, API ingestion, file imports, marketing form sync.
  - Lead assignment rules (round-robin, skill-based, geo).
  - Lead queues & ownership.
  - **Lead Conversion** — turn a Lead into Account + Contact + Opportunity in one action; map standard and custom fields.
  - **Lead Scoring** (Einstein Lead Scoring) — predictive 0–100 score based on demographic and behavioral signals.
  - **Duplicate Management** — matching rules + duplicate rules block or warn on dupes; merge UI.
  - Lead History (audit), Lead Status workflow, Lead Source taxonomy.
  - Mass conversion, bulk actions.
- **Key entities**: `Lead`, `LeadHistory`, `LeadFeed`, `LeadShare`, `LeadStatus` picklist.

### 1.2 Accounts
- **Description**: Companies, organizations, or — in B2C — households/persons. Anchors most other records.
- **Sub-features**:
  - **Account Hierarchy** (parent/child) for corporate structures.
  - **Person Accounts** for B2C (combines Account + Contact).
  - **Account Teams** — internal collaborators with role-based sharing.
  - **Partner Accounts** for channel/PRM scenarios.
  - **Account Insights** (Einstein) — news, alerts, automatic enrichment.
  - **Activity Timeline** — events, tasks, emails, calls, files all on the record.
  - Account contracts, assets, opportunities, cases, orders all related.
  - **Account Plans** (Sales Programs) — structured plans for strategic accounts.
- **Key entities**: `Account`, `AccountHistory`, `AccountTeamMember`, `AccountContactRelation`, `AccountShare`.

### 1.3 Contacts
- **Description**: People — buyers, influencers, decision makers, end users.
- **Sub-features**:
  - Many-to-many `AccountContactRelation` so a contact can belong to multiple accounts (consultants, board members).
  - Contact Roles on Opportunities (decision maker, evaluator, influencer).
  - Contact Hierarchies (org chart).
  - Email engagement tracking (opens, clicks).
  - **Activity Capture** — auto-sync emails/events from Gmail/O365.
  - **Contact Intelligence** (Einstein) — engagement score, best time to contact.
- **Key entities**: `Contact`, `ContactHistory`, `OpportunityContactRole`, `CampaignMember`.

### 1.4 Opportunities
- **Description**: A real, qualified deal in your pipeline with $ amount and close date.
- **Sub-features**:
  - **Stages** (Prospecting → Qualification → Proposal → Negotiation → Closed Won/Lost) with probability %.
  - **Forecast Categories** — Pipeline / Best Case / Commit / Closed — independent of stage so reps can sandbag/commit individually.
  - **Opportunity Splits** — credit one deal across multiple reps (revenue, overlay, custom).
  - **Opportunity Products / Line Items** — products on the deal, quantity, sales price, discount.
  - **Price Books** — versions of pricing per market/segment.
  - **Contact Roles** — who's who on the buying committee.
  - **Competitors** related list.
  - **Big Deal Alerts** — email triggers when a large opp moves stages.
  - **Stage History** + **Field History** — full auditing.
  - **Path** (Sales Path) — UI guidance per stage with key fields and coaching tips.
  - **Pipeline Inspection** — manager dashboard showing stage movement, push counts, AI-flagged risks. In Summer '26 includes an Activity heatmap column and AI summary of the deal.
  - **Einstein Opportunity Scoring** — predictive "likelihood to close" score.
  - **Deal Insights** — AI surfaces engagement, sentiment, stage changes.
- **Key entities**: `Opportunity`, `OpportunityLineItem` (a.k.a. OLI), `OpportunityStage` (picklist), `OpportunityHistory`, `OpportunityFieldHistory`, `OpportunitySplit`, `OpportunityCompetitor`, `OpportunityContactRole`.

### 1.5 Products & Price Books
- **Description**: The catalog of what you sell.
- **Sub-features**:
  - `Product2` — the product master record.
  - `Pricebook2` — a named price list (Standard Price Book is mandatory).
  - `PricebookEntry` — the price of a product in a specific pricebook (currency-aware).
  - Product Families, Product Codes, Active flag.
  - Multi-currency, advanced currency management (dated exchange rates).
- **Key entities**: `Product2`, `Pricebook2`, `PricebookEntry`.

### 1.6 Quotes & Quote Lines
- **Description**: A formal, dated proposal to a customer derived from an Opportunity.
- **Sub-features**:
  - Quote → Opportunity sync (write back winning quote).
  - **Quote Templates** — Word/PDF generation with merge fields.
  - Quote line items, discounts, taxes, totals.
  - eSignature integration (Salesforce Sign or DocuSign).
  - Quote versioning.
- **Key entities**: `Quote`, `QuoteLineItem`, `QuoteDocument`.

### 1.7 Contracts
- **Description**: The signed agreement.
- **Sub-features**:
  - Contract status (Draft → In Approval Process → Activated → Expired).
  - Term, Start Date, End Date, auto-renewal flag.
  - Related orders and contract line items (with CPQ).
  - Approval Processes for negotiated terms.
- **Key entities**: `Contract`, `ContractLineItem` (CPQ-managed).

### 1.8 Orders
- **Description**: The fulfillment representation of a deal — what was actually sold and shipped.
- **Sub-features**:
  - `Order` with `OrderItem` lines.
  - Order status workflow (Draft → Activated → Closed).
  - Multi-shipment, multi-fulfillment.
  - Reduction Orders (returns/cancellations).
- **Key entities**: `Order`, `OrderItem`.

### 1.9 Forecasts (Collaborative Forecasting)
- **Description**: Manager rollups of pipeline by hierarchy, period, and category.
- **Sub-features**:
  - Forecast types: Opportunity Revenue, Opportunity Quantity, Opportunity Splits, Product Family, Schedule (revenue scheduling).
  - Quotas per period per user.
  - **Adjustments** — manager overrides with comments.
  - Forecast hierarchy (org chart roll-up).
  - Multi-currency forecasting with corporate currency conversion.
  - Cumulative vs Period-over-Period views.
- **Key entities**: `ForecastingItem`, `ForecastingQuota`, `ForecastingAdjustment`, `ForecastingShare`, `ForecastingType`.

### 1.10 Sales Engagement (formerly High Velocity Sales)
- **Description**: Sales rep productivity layer for inside sales: cadences, work queue, outreach.
- **Sub-features**:
  - **Cadences** — sequences of email + call + LinkedIn + manual tasks scheduled over days.
  - **Work Queue** — prioritized list of next-best actions per rep.
  - Email templates with merge fields and tracking.
  - Call logging, click-to-call (Service Cloud Voice or Lightning Dialer).
  - **Einstein Conversation Insights (ECI)** — call recording transcription, keyword search, mention tracking, sentiment, talk-listen ratio, coaching.
- **Key entities**: `ActionCadence`, `ActionCadenceStep`, `ActionCadenceStepTracker`, `ActionCadenceTracker`.

### 1.11 Activities (Tasks, Events, Calls, Emails)
- **Description**: Anything a rep does on a record.
- **Sub-features**:
  - `Task` (to-dos with due date, priority, status).
  - `Event` (calendared meetings).
  - **Activity Timeline** on any record.
  - **Activity Capture** — auto-sync of Gmail/Outlook to Salesforce.
  - **Salesforce Inbox** — sidebar in Gmail/Outlook with templates, tracking, calendaring.
  - Recurring tasks/events.
  - Reminders, mass email, send list emails.
- **Key entities**: `Task`, `Event`, `ActivityHistory` (synthetic), `EmailMessage`, `CallLog`.

### 1.12 Campaigns
- **Description**: A marketing initiative — webinar, email blast, trade show — with attribution back to revenue.
- **Sub-features**:
  - `Campaign` parent, `CampaignMember` join (Lead or Contact).
  - Campaign Hierarchy (parent campaign for multi-touch).
  - Member statuses (Sent, Responded, Registered, Attended).
  - Cost tracking (Actual Cost, Budgeted Cost).
  - Campaign Influence (multi-touch attribution: Even, First Touch, Last Touch, Custom Models).
  - ROI metrics.
- **Key entities**: `Campaign`, `CampaignMember`, `CampaignInfluence`, `CampaignMemberStatus`.

### 1.13 Territory Management 2.0
- **Description**: Dividing accounts among reps by territory rules.
- **Sub-features**:
  - Territory Models (versioned).
  - Territory Hierarchy (parent/child territories).
  - Account assignment rules (criteria-based or manual).
  - Territory-aware forecasting.
  - Multi-territory (account assigned to multiple territories).
- **Key entities**: `Territory2`, `Territory2Model`, `Territory2Type`, `UserTerritory2Association`, `ObjectTerritory2Association`.

### 1.14 Quotas
- **Description**: Numeric goals per rep per period (revenue, units).
- **Sub-features**:
  - Quotas by Forecast Type, Period (monthly/quarterly), User.
  - Manager attainment dashboards.
- **Key entities**: `ForecastingQuota`.

### 1.15 Sales Programs / Sales Enablement (Trailhead embedded)
- **Description**: Structured rep learning, milestones, on-the-job certifications.
- **Sub-features**: Programs, Outcomes, Milestones; integrate with Trailhead modules.

### 1.16 Partner Relationship Management (PRM) / Channel Sales
- **Description**: Channel partners log into Experience Cloud to manage deals, leads, MDF.
- **Sub-features**:
  - **Deal Registration** — partner-submitted leads with conflict resolution.
  - **MDF (Market Development Funds)** — fund requests and claims.
  - **Channel Programs** — tiers (silver/gold/platinum), benefits.
  - Partner Account hierarchy & user provisioning.
- **Key entities**: `PartnerAccount`, `PartnerNetworkConnection` (Salesforce-to-Salesforce), `PartnerMarketingBudget`, `PartnerFundClaim`, `PartnerFundRequest`.

### 1.17 Salesforce CPQ (Configure-Price-Quote, now part of Revenue Cloud)
- **Description**: Complex product configuration and quoting — option bundles, validation rules, contracted pricing, subscriptions.
- **Sub-features**:
  - **Configure**: Product Bundles, Product Options, Option Constraints, Configuration Attributes.
  - **Price**: Price Rules, Discount Schedules, Block Pricing, Tiered Pricing, Cost-Plus, Volume Discounts, Term Discounts.
  - **Quote**: Quote, Quote Line, Quote Line Group, Quote Template, output as PDF/Word.
  - **Subscription Pricing**: Co-terming, Renewals, Amendments (mid-term changes), MRR/ARR.
  - **Contracted Pricing** — pre-negotiated prices stored on Account/Contract.
  - **Approvals** — advanced approvals with parallel/sequential chains.
  - **Order generation** from quote (with order line generation).
- **Key entities**: `SBQQ__Quote__c`, `SBQQ__QuoteLine__c`, `SBQQ__Product__c`, `SBQQ__ProductOption__c`, `SBQQ__ProductFeature__c`, `SBQQ__PriceRule__c`, `SBQQ__DiscountSchedule__c`, `SBQQ__Subscription__c`, `SBQQ__OrderItemConsumptionSchedule__c`. (Note the `SBQQ__` namespace from Steelbrick acquisition.)

### 1.18 Salesforce Billing / Revenue Cloud (Subscription Management)
- **Description**: Recurring billing, invoicing, revenue recognition.
- **Sub-features**: Invoices, Invoice Lines, Credit Notes, Payment, Refunds, Tax engine integration, Dunning, Revenue Schedule (rev rec), GL accounts.
- **Key entities**: `blng__Invoice__c`, `blng__InvoiceLine__c`, `blng__CreditNote__c`, `blng__Payment__c`, `blng__Refund__c`, `blng__RevenueSchedule__c`.

### 1.19 Sales Cloud Mobile App
- Native iOS/Android with offline access; voice dictation; mobile dashboards; relay calls/emails.

### 1.20 Salesforce Inbox / Outlook & Gmail Integration
- Email open & click tracking, calendar sync, side-panel with full Salesforce records, log to Salesforce, send via templates.

### 1.21 Sales Workspace (new in 2026)
- A unified rep "command center" — pipeline, agents (Agentforce SDR), insights, workflow prioritization in one screen.

---

## 2. Service Cloud (Agentforce Service)

Customer service, support, and field operations.

### 2.1 Cases
- **Description**: A unit of customer support work — ticket, complaint, question.
- **Sub-features**:
  - Multiple channels feeding cases: Email-to-Case, Web-to-Case, Web Chat, SMS, WhatsApp, Voice, Social.
  - Case Types, Status workflow (New → Working → Escalated → Closed), Priority.
  - **Case Hierarchy** (parent/child) for multi-issue tickets.
  - **Case Comments** & internal-only comments.
  - **Case Teams** — multiple agents on a case.
  - **Case Assignment Rules** — auto-assign by criteria.
  - **Auto-Response Rules** — auto-reply to inbound emails.
  - **Escalation Rules** — auto-escalate after SLA breach.
  - **Service Console** — multi-tab agent UI with related panels, knowledge, customer history.
  - **Case Timeline** (Spring '26) — chronological event view with milestone markers.
  - **Case Merge** for duplicates.
- **Key entities**: `Case`, `CaseComment`, `CaseHistory`, `CaseTeamMember`, `CaseSolution` (legacy), `CaseFeed`, `EmailMessage` related to Case.

### 2.2 Knowledge Management
- **Description**: A versioned knowledge base of articles for agents and customers.
- **Sub-features**:
  - Articles with multiple versions, drafts, translations, languages.
  - **Article Types** (FAQ, Solution, How-To) and **Categories** (data, product, region).
  - **Knowledge in Lightning Console** — agent-side panel with search/suggestions.
  - **Article Recommendations** — Einstein-suggested while reading a case.
  - **Article Voting** & analytics (helpfulness, views).
  - **Public Knowledge Base** for self-service via Experience Cloud.
- **Key entities**: `Knowledge__kav` (Article-Version), `KnowledgeArticleVersion`, `KnowledgeArticle`, `DataCategory`.

### 2.3 Omni-Channel Routing & Command Center for Service
- **Description**: Distribute work (cases, chats, leads) to agents based on skills, capacity, presence.
- **Sub-features**:
  - **Routing Configurations** (least active, most available, external routing).
  - **Skills-based routing** — match required skills to agent skills.
  - **Capacity model** — agents have a workload capacity; new work routes to least-loaded.
  - **Presence Statuses** (Available — Chat, Available — Phone, Away).
  - **Omni Supervisor / Command Center for Service** (Spring '26 rename) — real-time queue/agent dashboards, intervention.
- **Key entities**: `ServiceChannel`, `ServiceResource`, `RoutingConfiguration`, `PresenceUserConfig`, `Skill`, `SkillRequirement`, `AgentWork`.

### 2.4 Field Service (FSL — Field Service Lightning)
- **Description**: Schedule, dispatch, and execute on-site work (technicians).
- **Sub-features**:
  - **Service Appointments** — the unit of field work.
  - **Work Orders** & **Work Order Line Items** — what needs to be done.
  - **Service Resources** — technicians (and crews).
  - **Service Territories** — geographic regions for routing.
  - **Operating Hours** — per territory/resource.
  - **Dispatcher Console** — Gantt + map; manual & automated scheduling.
  - **Scheduling Engine** — rules-based optimization (skills, location, hours, SLA).
  - **Mobile App for Technicians** — offline, signature, parts, knowledge, photos.
  - **Crews** — group of resources scheduled together.
  - **Inventory & Parts** — Products consumed on jobs.
  - **Maintenance Plans** — recurring preventive work.
  - **Service Contracts & Entitlements** — what's covered.
- **Key entities**: `ServiceAppointment`, `WorkOrder`, `WorkOrderLineItem`, `ServiceResource`, `ServiceTerritory`, `ServiceTerritoryMember`, `OperatingHours`, `ResourceAbsence`, `ServiceCrew`, `ServiceCrewMember`, `MaintenancePlan`, `ProductConsumed`, `ServiceContract`, `Entitlement`, `ContractLineItem`.

### 2.5 Entitlements, SLAs, Milestones
- **Description**: Customer-specific support contracts and what they cover.
- **Sub-features**:
  - **Entitlements** linked to Account/Asset/Contract.
  - **Entitlement Processes** — workflows of milestones (response time, resolution time).
  - **Milestones** — time-bound steps with stop/start/complete logic.
  - SLA breach tracking, auto-escalation.
  - **Agentic Milestones** (Summer '26) — Agentforce auto-handles routine SLA communications.
- **Key entities**: `Entitlement`, `EntitlementContact`, `MilestoneType`, `CaseMilestone`, `EntitlementTemplate`.

### 2.6 Live Chat & Messaging
- **Description**: Real-time text channels.
- **Sub-features**:
  - **Embedded Chat** widget for websites.
  - **Messaging for In-App and Web** (replacing Live Agent).
  - **Channels**: SMS, WhatsApp, FB Messenger, Apple Messages for Business, LINE.
  - Message templates (HSM for WhatsApp), proactive outbound messaging.
  - Bot handoff to human, full conversation history on Case.
- **Key entities**: `MessagingSession`, `MessagingChannel`, `MessagingEndUser`, `LiveChatTranscript`, `LiveChatVisitor`.

### 2.7 Service Cloud Voice (CTI / Telephony)
- **Description**: Native phone integration with major contact-center providers.
- **Sub-features**:
  - Bring-your-own-telephony (Amazon Connect partner-managed, or Bring-Your-Own-Carrier).
  - Real-time transcription & sentiment.
  - Call recording, post-call summaries (Einstein).
  - Softphone in Service Console with screen-pop.
  - IVR + ACD integration.
- **Key entities**: `ConversationVoiceCall`, `VoiceCall`, `VoiceCallRecording`.

### 2.8 Self-Service Portal (Experience Cloud)
- Customer-facing site with case submission, knowledge search, community Q&A.

### 2.9 Communities (Customer/Partner)
- See Experience Cloud — section 5.

### 2.10 Surveys & Feedback Management
- **Description**: Native survey tool with NPS/CSAT/CES, sent post-case.
- **Sub-features**: Survey designer, multilingual, anonymous, response tracking, sentiment analysis, integration with Service to trigger close-loop tasks.
- **Key entities**: `Survey`, `SurveyVersion`, `SurveyInvitation`, `SurveyResponse`, `SurveyQuestion`, `SurveyQuestionResponse`.

### 2.11 Workforce Engagement (WEM)
- **Description**: Capacity planning, forecasting, scheduling, and shift management for contact centers.
- **Sub-features**: Demand forecasting, shift creation/swapping, intraday management, gamified coaching.
- **Key entities**: `WorkforceCapacity`, `IntradayMonitoring`, `Shift`, `ShiftPattern`.

### 2.12 Einstein Service Bots / Reply Recommendations
- **Description**: Generative + retrieval AI for service.
- **Sub-features**: Natural-language bot builder (Einstein Bot Builder), intent detection, dialogs, transfer to human; **Reply Recommendations** & **Article Recommendations** in agent console; **Case Classification** (auto-fill fields); **Case Summarization** (Agentforce).

### 2.13 Field Service Asset & Inventory
- **Description**: Track customer-installed assets and warehouse parts.
- **Sub-features**: `Asset`, `AssetRelationship` (parent/component), `AssetActionSource`, `Location` (warehouse/van), `ProductItem` (inventory at a location), `ProductRequest`, `ProductTransfer`.

---

## 3. Marketing Cloud

In 2026 Salesforce is unifying its marketing portfolio under **Marketing Cloud Next** (built on Data Cloud). Legacy products (Marketing Cloud Engagement, Account Engagement/Pardot) still exist but are being de-emphasized.

### 3.1 Marketing Cloud Engagement (legacy "ExactTarget" / B2C)
- **Email Studio** — drag-and-drop email builder, content blocks, reusable assets.
- **Mobile Studio** — SMS (MobileConnect), Push (MobilePush), Group Messaging, IVR.
- **Social Studio** — listening, publishing, engagement (deprecated/EOL'd in some editions but still listed historically).
- **Advertising Studio** — sync audiences to Facebook, Google Ads, LinkedIn, Twitter.
- **Audience Studio** (DMP, formerly Krux) — third-party data, segment building.
- **Journey Builder** — multi-channel orchestrated customer journeys with branching, decision splits, wait, send, update record.
- **Automation Studio** — recurring scheduled jobs (data extracts, file imports, queries, sends).
- **Content Builder** — central content library (images, blocks, templates).
- **Contact Builder** — Marketing Cloud-side data model (Contacts, Data Extensions).
- **Email Personalization** (formerly Personalization Builder) — AMPscript, dynamic content.
- **Einstein Engagement Scoring / Frequency / Send-Time Optimization**.
- **Datorama** — marketing data hub & cross-channel attribution.

### 3.2 Account Engagement (formerly Pardot) — B2B Marketing Automation
- **Lead Capture**: forms, form handlers, landing pages, custom redirects.
- **Lead Nurturing**: Engagement Studio (drip programs).
- **Lead Scoring & Grading** — separate scores: behavioral score (engagement) + grade (fit, A/B/C/D/F).
- **Email Marketing** — list emails, automated emails, A/B tests.
- **Email Templates** with HML (Handlebars Merge Language).
- **Marketing Asset Sync** — automatically share assets with Sales.
- **Salesforce Sync** — bi-directional sync of Lead/Contact/Account/Opportunity.
- **B2B Marketing Analytics** — Tableau-powered dashboards for marketing ROI.
- **Einstein Behavior Score, Einstein Campaign Insights, Einstein Send-Time, Einstein Attribution**.
- **Account-Based Marketing** — at the company level, with engagement aggregation.

### 3.3 Marketing Cloud Personalization (formerly Interaction Studio)
- Real-time, 1:1 web/email/mobile personalization based on visitor behavior, AI-driven.
- **Sub-features**: Sitemap configuration, Catalog ingestion, Decision Studio, Einstein Recipes (recommenders), Real-Time Visualizer.

### 3.4 Loyalty Management
- **Description**: Build loyalty/rewards programs (points, tiers, benefits).
- **Sub-features**: Programs, Currencies, Tiers (Bronze/Silver/Gold), Process (earn/burn rules), Vouchers, Promotions, Member Tier Group, Member Benefits.
- **Key entities**: `LoyaltyProgram`, `LoyaltyProgramMember`, `LoyaltyMemberCurrency`, `LoyaltyTierGroup`, `LoyaltyTier`, `LoyaltyProgramProcess`, `Voucher`, `Promotion`.

### 3.5 Marketing Cloud Next (the 2026 successor)
- Unified the previous patchwork on top of Data Cloud.
- Native segments, native journeys (called "Flows" here too), native email/SMS/push.
- AI-first ("Agentforce Marketer").

---

## 4. Commerce Cloud

### 4.1 B2C Commerce (formerly Demandware)
- **Storefront** with React/Vue-based reference apps.
- **Catalog Management** (Products, Variants, Bundles, Sets).
- **Pricing & Promotions** (price books, customer groups, campaigns, coupons, BOGO).
- **Search & Merchandising** (Einstein Search, sorting rules).
- **Order Management** integration.
- **Payments** & multi-PSP integration.
- **Storefront Reference Architecture (SFRA)**, **Page Designer** (drag-drop CMS).
- **Headless API** (SCAPI).
- **Einstein Recommendations / Sort / Personalized Search**.
- **Agentic Commerce** (Winter '26) — Agentforce-powered conversational shopping, guided product discovery.

### 4.2 B2B Commerce
- Self-service buyer portal with negotiated pricing, account-specific catalogs, requisition-style cart, re-order, large-quantity SKUs, approval flows.
- Buyer Groups, Entitlement Policies.
- Account-specific pricing (uses CPQ).

### 4.3 Order Management (OMS)
- Order capture, validation, payment authorization, order routing, fulfillment orchestration, returns/exchanges, shipment tracking.
- **Distributed Order Management** — split shipments across DCs, drop-ship vendors, store-fulfill.
- **Key entities**: `Order`, `OrderItem`, `FulfillmentOrder`, `FulfillmentOrderLineItem`, `OrderItemSummary`, `ReturnOrder`, `ReturnOrderLineItem`.

---

## 5. Experience Cloud

Build branded portals — for customers, partners, employees — on the Salesforce platform.

- **Templates**: Customer Service, Partner Central, Customer Account Portal, Build-Your-Own (LWR).
- **Experience Builder** — drag-drop site builder using Lightning Web Runtime (LWR).
- **CMS** — manage content (articles, banners, images) once, syndicate to many sites.
- **Audiences** — show different content based on user profile / record / Geo.
- **Headless mode** — front-end in any framework consuming Salesforce APIs.
- **Branding sets**, custom themes, design tokens.
- **Integrated authentication**: native, SSO, social login.
- **Mobile-responsive** built-in.
- **Page-level audiences, Personalization, Performance Insights**.
- **Key entities**: `Network`, `NetworkMember`, `NetworkActivityAudit`, `NetworkSelfRegistration`, `Site`.

---

## 6. Data Cloud (CDP)

The customer data platform. Real-time / near-real-time profile unification.

- **Data Streams** — ingest from any source (Salesforce, S3, Snowflake, BigQuery, files, APIs, MuleSoft).
- **Data Lake Objects (DLOs)** — raw/landing tables.
- **Data Model Objects (DMOs)** — canonical model (Individual, Account, Lead, Engagement, Order…).
- **Identity Resolution** — match rules (deterministic + probabilistic) + reconciliation.
- **Unified Profiles** — one record per person across systems.
- **Calculated Insights** — SQL-based aggregates (LTV, last purchase, churn risk).
- **Segmentation** — drag-drop builder, real-time and batch.
- **Activation Targets** — push segments to Marketing Cloud, Ads, Sales/Service, external systems.
- **Zero Copy** — live federation with Snowflake, BigQuery, Databricks, Redshift (no copy required).
- **Genie / Real-time CDP** — sub-second activation.
- **Vector DB / Embeddings** for unstructured data (PDFs, images, transcripts).
- **Einstein Trust Layer** integration.

---

## 7. Tableau & CRM Analytics (formerly Einstein Analytics / Wave)

- **CRM Analytics**: native Salesforce-aware analytics — Datasets, Lenses, Dashboards, Apps, Recipes (data prep), Predictions (Einstein Discovery).
- **Tableau** (the acquired BI giant): full Tableau Desktop/Server/Online + Tableau Pulse (insight summaries), Tableau Agent.
- **Reports & Dashboards** (the platform-level basic reporting): joined, summary, tabular, matrix reports; bucketed fields; row-level formulas; up to 5 chart types per dashboard component; subscriptions; conditional highlights.
- **Reports types**: includes Email Insights in Spring '26.
- **Einstein Discovery** — automated ML on a dataset producing "stories" (drivers, predictions, recommendations); deployable as predictive models.

---

## 8. Industry Clouds (selection)

Each industry cloud bundles the platform + an industry data model + accelerators.

### 8.1 Health Cloud
- **Patient/Member 360**, Care Plan, Care Team, Encounter, Episode of Care, Clinical Notes, Provider Network, Utilization Management, Authorizations, Referrals, Risk Stratification, Disease Surveillance.
- HL7/FHIR integration via MuleSoft Accelerator.

### 8.2 Financial Services Cloud (FSC)
- **Households**, Financial Accounts, Goals, Financial Holdings, Roll-ups, Life Events, Action Plans (KYC/onboarding), Compliance, Branch Management.
- Industry use cases: wealth management, retail banking, insurance (with Insurance for FSC: Policies, Claims, Producers).

### 8.3 Manufacturing Cloud
- Sales Agreements (long-term volume commitments), Account Forecasting (with run rates), Distributor relationships, Rebate Management.

### 8.4 Consumer Goods Cloud
- Retail Execution, Visit Planning, Order Management, Trade Promotion Management, Merchandising.

### 8.5 Communications Cloud (formerly Vlocity Comms)
- Industry data model: Subscription, Service, Network Asset; CPQ Industry; Order Management; Digital Commerce (B2C/B2B telco).

### 8.6 Energy & Utilities Cloud
- Premises, Service Points, Meters; Asset 360.

### 8.7 Public Sector Solutions
- License & Permit Management, Inspections, Grants, Constituent 360.

### 8.8 Education Cloud
- Recruitment & Admissions, Student Success, Academic Programs, Affiliations, Program Plans.

### 8.9 Nonprofit Cloud
- Programs, Beneficiaries (Cases), Donations, Recurring Gifts, Grants.

### 8.10 Automotive Cloud
- Vehicle Asset, Driver/Owner relationship, Service Visits, Recalls.

### 8.11 Life Sciences Cloud
- Trials Management, HCP/HCO 360, Sample Management, Inventory.

### 8.12 Media Cloud
- Audience Management, Subscription, Advertising Sales.

### 8.13 Travel/Hospitality, Retail, etc.
- Equivalent vertical accelerators.

---

## 9. Platform & Cross-Cutting Capabilities

These power every Cloud — and are mostly what we'll re-implement in our self-build.

### 9.1 Identity & Access
- **Users, Profiles, Permission Sets, Permission Set Groups** — entitlement model.
- **Roles** — hierarchical; controls record visibility via Sharing.
- **Sharing Rules**, **Manual Sharing**, **Apex Sharing** — per-record access control.
- **Org-Wide Defaults (OWD)** — per-object base sharing (Public Read/Write, Public Read, Private).
- **Login flows, MFA, SSO** (SAML, OIDC), **My Domain**.
- **Identity Verification**, **IP Restrictions**, **Login Hours**.

### 9.2 Data Model & Schema
- **Standard Objects** + **Custom Objects** (`MyObject__c`).
- **Standard Fields** + **Custom Fields** (`MyField__c`) — types: Text, Number, Currency, Percent, Date, Datetime, Time, Picklist (single/multi), Lookup, Master-Detail, Roll-Up Summary, Formula, Auto-Number, Geolocation, URL, Email, Phone, Long Text, Rich Text, External ID.
- **Validation Rules** — on save.
- **Record Types** — different layouts and picklist values per type.
- **Page Layouts** & **Lightning Record Pages** (per profile/record type/app).
- **Compact Layouts** (mobile/highlights).
- **Field-Level Security** (per profile/perm-set).
- **Schema Builder** — visual ERD designer.
- **Object Manager** — schema admin UI.

### 9.3 Automation
- **Flow** (Salesforce Flow / Lightning Flow) — declarative automation: Screen Flow, Record-Triggered Flow, Scheduled Flow, Platform Event Flow, Auto-Launched Flow.
  - **Flow Orchestrator** — multi-step, multi-actor work orchestration with stages, steps, and approval flows.
- **Workflow Rules** (legacy, being retired in favor of Flow).
- **Process Builder** (legacy).
- **Approval Processes** — multi-step, parallel, dynamic actors.
- **Apex Triggers** — server-side code on insert/update/delete/undelete.
- **Apex Scheduled Jobs** — `system.schedule()`.
- **Platform Events** — pub/sub bus.
- **Change Data Capture (CDC)** — stream of all record changes.
- **Outbound Messages** — SOAP-style notifications.

### 9.4 UI & App Building
- **Lightning App Builder** — drag-drop home/record/app pages.
- **Lightning Web Components (LWC)** — modern web-component framework.
- **Aura Components** (legacy).
- **Visualforce** (legacy server-rendered pages).
- **Quick Actions, Global Actions** — record-creation shortcuts in highlights.
- **Lightning Apps** — bundle of tabs+nav+icons themed.
- **Tabs**: standard / custom-object / web tabs.
- **Utility Bar** — open-call, notes, history at the bottom.

### 9.5 Search
- **Global Search** — across all SObjects.
- **SOSL** (text search), **SOQL** (relational queries).
- **Einstein Search** — semantic/personalized search.

### 9.6 Files & Content
- **Files** — Chatter Files / `ContentDocument` & `ContentVersion` (version-controlled).
- **Libraries** — folders with shared permissions.
- **External File Sources** (Google Drive, SharePoint, Box, OneDrive, Quip, AWS S3, Dropbox).
- **Quip** — collaborative docs/spreadsheets/slides.
- **Salesforce CMS** — separate content management for marketing/Experience.

### 9.7 Collaboration
- **Chatter** — feed, posts, comments, polls, files, groups (public/private/unlisted).
- **Slack** integration — record actions in Slack, Slack Lists, Slack Canvas.

### 9.8 Email
- **Email Templates** (Lightning, classic, Visualforce).
- **Email Relay** & **Email-to-Salesforce**.
- **Email Studio** (within Marketing Cloud).
- **Salesforce Inbox** — Outlook/Gmail extensions.

### 9.9 Activities Capture
- **Einstein Activity Capture (EAC)** — auto-sync emails/events from Gmail/O365 to Salesforce.

### 9.10 Approvals
- **Approval Process** — entry criteria, approver chain, parallel/sequential, recall/reassign.

### 9.11 Reports & Dashboards
- Folder permissions, scheduled report subscriptions, conditional formatting, joined reports, cross-block reports, snapshots (Reporting Snapshots — historical).

### 9.12 Customization & Internationalization
- Multi-currency, multi-language, picklist translations, label translations, time zones, RTL support.

### 9.13 Sandbox & Release Management
- **Sandboxes** (Developer, Developer Pro, Partial Copy, Full).
- **Change Sets**, **Salesforce DX** (CLI, scratch orgs, source-driven development).
- **Unlocked Packages, Managed Packages**.
- **Scratch orgs**, **DevOps Center**.

### 9.14 Mobile
- **Salesforce Mobile App** (formerly Salesforce1).
- **Salesforce Mobile SDK** for custom apps.

### 9.15 Encryption & Compliance
- **Shield Platform Encryption** (deterministic + probabilistic).
- **Event Monitoring** (login events, API calls, report runs).
- **Field Audit Trail** — long-term field history retention.
- **Privacy Center** — GDPR/CCPA tooling.
- **Government Cloud, HIPAA-compliant orgs**.

### 9.16 AppExchange
- 7,000+ apps, components, and consultants.
- Managed packages, security review process.

### 9.17 Surveys
- Already covered under Service Cloud — applies broadly.

### 9.18 Sites & Forms
- **Site.com / Experience Sites** — old "Force.com Sites".
- **Web-to-Lead, Web-to-Case** — public form endpoints generating records.

### 9.19 Duplicate Management
- **Matching Rules** + **Duplicate Rules** + **Duplicate Jobs** + **Merge UI**.

### 9.20 Salesforce Sign / DocuSign integration
- Send for e-signature, capture status, store signed PDF.

### 9.21 Notifications
- In-app bell, push, email, custom notification types per object.

---

## 10. AI / Einstein / Agentforce

In 2026, "Einstein 1" is the platform layer; **Agentforce** is the autonomous agent layer.

### 10.1 Predictive (legacy Einstein)
- **Einstein Lead Scoring**, **Opportunity Scoring**, **Forecasting**, **Account Insights**.
- **Einstein Bots** — chat/voice bots with intent-driven dialogs.
- **Einstein Activity Capture**.
- **Einstein Discovery** — AutoML on tabular data; deployable models.
- **Einstein Vision/Language** — image classification, OCR, NER, sentiment, intent.
- **Einstein Search**, **Einstein Next Best Action**.

### 10.2 Generative (Einstein GPT / Trust Layer)
- **Einstein Trust Layer** — secure prompt invocation with masking, audit, zero-retention LLM contracts.
- **Prompt Builder** — reusable templated prompts grounded in CRM data.
- **Model Builder** — connect to OpenAI, Azure OpenAI, Anthropic, Cohere, custom.
- **Einstein Copilot for Sales/Service/Marketing/Commerce** — in-app assistants.
- **Einstein Studio** — bring-your-own-model.

### 10.3 Agentforce (autonomous agents — the 2026 marquee)
- **Agentforce SDR** — autonomous outbound prospecting (email/cadence).
- **Agentforce Sales Coach** — role-play coaching sessions.
- **Agentforce Service** — case deflection, full case resolution.
- **Agentforce Marketer** — campaign creation, segment building.
- **Agentforce Commerce** — guided shopping, post-purchase support.
- **Agentforce Builder** — no-code authoring of custom agents (topics, actions, retrievers, instructions).
- **Agentforce in Slack** — agents as Slack participants.

---

## 11. Integration & DevOps Layer

### 11.1 MuleSoft (Anypoint Platform)
- Anypoint Studio (Mule flows), API Gateway, API Manager, DataWeave, RPA, Composer (no-code).

### 11.2 Heroku
- Managed PaaS (Postgres, Redis, dynos), Heroku Connect (bidirectional sync to Salesforce).

### 11.3 Salesforce APIs
- **REST API**, **SOAP API**, **Bulk API 2.0**, **Streaming API** (CometD over Platform Events / CDC), **GraphQL API**, **Tooling API**, **Metadata API**, **Composite API**.
- **Connect REST API** (for Communities/Experience).
- **Apex REST/SOAP** custom endpoints.
- **Named Credentials**, **External Services**, **External Objects** (OData/Salesforce Connect).

### 11.4 DevOps
- **Salesforce DX (sfdx CLI)**, **VS Code extensions**, **DevOps Center**, **Scratch Orgs**, **Code Builder**, source-tracked deployment.

---

## 12. Net Zero Cloud

ESG/sustainability accounting (Scope 1/2/3 emissions, energy use, supplier disclosures).

---

## 13. Standard Object Cheat Sheet (most relevant for our build)

### Sales / CRM core
| Object | Purpose | Notable fields |
|---|---|---|
| `Account` | Company/household | Name, Type, Industry, Owner, ParentId, BillingAddress, ShippingAddress, AnnualRevenue, NumberOfEmployees |
| `Contact` | Person | FirstName, LastName, Email, Phone, AccountId, Title, ReportsToId |
| `Lead` | Unconverted prospect | Status, Source, Company, Rating, Industry, Score |
| `Opportunity` | Deal | Name, AccountId, StageName, Amount, CloseDate, Probability, ForecastCategory, OwnerId |
| `OpportunityLineItem` | Product on deal | Quantity, UnitPrice, TotalPrice, ProductId |
| `Product2` | SKU | Name, ProductCode, Family, IsActive |
| `Pricebook2` | Price list | Name, IsStandard |
| `PricebookEntry` | Price of product in book | UnitPrice, IsActive, Pricebook2Id, Product2Id |
| `Campaign` | Marketing initiative | Name, Type, Status, StartDate, EndDate, BudgetedCost, ActualCost |
| `CampaignMember` | Lead/Contact in Campaign | Status, ResponseDate |

### Service core
| Object | Purpose |
|---|---|
| `Case` | Support ticket |
| `EmailMessage` | Inbound/outbound email tied to case or record |
| `Knowledge__kav` | Knowledge article version |
| `LiveChatTranscript` | Chat session record |
| `MessagingSession` | Modern messaging session |

### Activities
| Object | Purpose |
|---|---|
| `Task` | To-do |
| `Event` | Calendar event |

### Files & content
| Object | Purpose |
|---|---|
| `ContentDocument` / `ContentVersion` / `ContentDocumentLink` | Files attached to records |
| `Note` / `Attachment` | Legacy notes/attachments |

### Identity
| Object | Purpose |
|---|---|
| `User`, `Profile`, `PermissionSet`, `PermissionSetAssignment`, `UserRole`, `Group` | Access control |

### Field Service
| Object | Purpose |
|---|---|
| `WorkOrder`, `WorkOrderLineItem`, `ServiceAppointment`, `ServiceResource`, `ServiceTerritory`, `Asset`, `Entitlement`, `Contract`, `MaintenancePlan` | FSL data model |

### CPQ (with namespace `SBQQ__`)
| Object | Purpose |
|---|---|
| `SBQQ__Quote__c`, `SBQQ__QuoteLine__c`, `SBQQ__Product__c`, `SBQQ__ProductOption__c`, `SBQQ__ProductFeature__c`, `SBQQ__PriceRule__c`, `SBQQ__DiscountSchedule__c`, `SBQQ__Subscription__c` | CPQ |

---

## 14. Editions & Pricing Tiers (Sales Cloud, Apr 2026)

| Edition | Approx. price (USD/user/mo) | Headline features |
|---|---|---|
| **Starter Suite** | ~$25 | Lite all-in-one (sales+service+marketing); Accounts, Contacts, Leads, simple Opportunities, dashboards, basic email. SMB. |
| **Pro Suite** | ~$100 | Adds: customizable sales process, quoting (basic), forecasting, sandbox, additional automation, more storage. |
| **Enterprise** | ~$175 | Full CRM: workflow & approvals, custom objects (200+), API access, advanced sharing, multiple page layouts, multi-currency. |
| **Unlimited** | ~$350 | Adds: Premier Support, unlimited custom apps, Sandboxes, 24/7 support, additional Einstein features. |
| **Agentforce 1 (Einstein 1)** | ~$550 | Includes Data Cloud, Agentforce credits, Slack, Einstein Studio, all premium AI. |

**Add-ons** (priced per user or per org): Sales Engagement, Sales Programs, CPQ, Revenue Cloud Billing, Maps, Sales Enablement, CRM Analytics, Field Service, Industry Clouds, Agentforce Add-ons (~$125+/user/mo).

**Note (Aug 2025)**: Salesforce raised Enterprise & Unlimited pricing by 6% across Sales/Service/Field Service/Industry clouds, then introduced Agentforce-tier pricing for 2026.

**Edition feature gates we should consider for our build**:
- **Custom Objects per org**: Starter ~ none, Pro ~ 50, Enterprise ~ 200, Unlimited ~ 2000.
- **API call limits**: Enterprise 1M/day, Unlimited 5M/day.
- **Sandboxes**: Pro 1 dev, Enterprise +25 dev + 1 partial copy, Unlimited + full copy + dev pro.
- **Workflow / Process Builder / Flow** active per org: differs by edition.
- **Multi-currency, advanced currency**: Enterprise+.

---

## 15. Key Differentiators (small CRMs miss these)

1. **Forecast Categories independent of Stages** — a rep can keep a deal at "Negotiation" stage but flag Forecast Category as "Commit" or "Best Case", giving managers a separate view of confidence.
2. **Quota Management** — quotas per user / period / forecast type with attainment dashboards.
3. **Territory Management 2.0** — versioned territory models, multi-territory account assignment, criteria-based assignment rules, territory-aware forecasting.
4. **Opportunity Splits** — credit one deal across multiple reps (Revenue Splits sum to 100%; Overlay Splits unlimited).
5. **Schedules on Opportunity Products** — revenue recognition over time.
6. **Renewal & Subscription model (CPQ)** — co-term, amend, renew with full lifecycle.
7. **Multi-Touch Attribution (Campaign Influence)** — Even / First Touch / Last Touch / Custom.
8. **Process / Flow Orchestrator** — multi-step, multi-actor workflow with stages and approvals.
9. **Sharing engine** — combination of OWD + Roles + Sharing Rules + Manual + Apex Sharing + Teams + Territory + Implicit (Account → Contact/Opp/Case parent-child) — extremely fine-grained record visibility.
10. **Field-Level Security** per profile/permission set — read/edit/required at field level.
11. **Validation Rules** — declarative server-side validation that runs before any code.
12. **Approval Processes** with parallel/sequential, dynamic approver, recall, comment chain.
13. **Lightning Record Pages** with audience targeting (different layout per profile/record type).
14. **Schema Builder** — visual ERD designer in-app.
15. **AppExchange ecosystem** — 7000+ apps for everything.
16. **Sandboxes & Salesforce DX** — full source-driven dev with scratch orgs.
17. **Platform Events + Change Data Capture** — built-in pub/sub event bus.
18. **External Objects (Salesforce Connect)** — virtual records federated from external sources.
19. **Big Objects** — billion-row archival.
20. **Bulk API 2.0** — efficient mass loads.
21. **Einstein Trust Layer** — masking, audit, zero-retention for LLM calls.
22. **Agentforce Builder** — declarative agent authoring with topics/actions/retrievers/guardrails.
23. **Calculated Insights & Identity Resolution (Data Cloud)** — golden record across systems.
24. **Industry data models** — pre-built Health/FSC/Manufacturing/Comms etc.
25. **Service Console multi-tab** — agent UI optimized for multi-case work, with utility bar, presence, omni-routing.
26. **Knowledge versioning + multi-language** with translation workflows.
27. **Field Service scheduling engine** — constraint-based optimization (skills/time/territory/SLA) with crews and inventory.
28. **Loyalty Management** — full points/tiers/promotions engine.
29. **Audit Trail / Field History / Setup Audit Trail** — compliance-grade auditing.
30. **Reporting Snapshots** — periodic snapshot of report results to a table for trending.

---

## 16. Implications for our self-build (planner notes)

When we decide which modules to build first for our Node.js + Vue CRM, the conventional MVP "core CRM" subset that almost every Salesforce competitor implements first is:

1. **Identity & RBAC** (Users, Roles, Permission Sets, Owner, Sharing).
2. **Account, Contact, Lead** (with conversion).
3. **Opportunity + Stages + Forecast Categories**.
4. **Activities** (Task, Event, EmailMessage, Note).
5. **Campaign + CampaignMember**.
6. **Product / PriceBook / PricebookEntry / OpportunityLineItem**.
7. **Quotes + Quote Lines (basic)**.
8. **Reports & Dashboards (lite)** — saved queries with charts.
9. **Case + Case Comments + Email-to-Case** (Service core).
10. **Knowledge Articles** (versioned).

Phase 2 typically:
- Web-to-Lead/Case forms.
- Workflow/Flow engine (declarative automation).
- Approvals.
- Custom objects/fields (the metadata engine — this is the make-or-break feature for being a "platform").
- Files & sharing.
- Notifications.
- Audit log / field history.

Phase 3 high-value differentiators:
- Quotas + Territories.
- Forecast collaboration.
- Sales Cadences (lite).
- Marketing Automation (drip campaigns).
- Service SLAs / Entitlements.
- AI assist (LLM grounding on records).

---

## 17. Sources

- [Sales Cloud: Top Salesforce Summer ‘26 Features — Salesforce Ben](https://www.salesforceben.com/sales-cloud-top-7-salesforce-summer-26-features/)
- [Salesforce Sales Cloud: Your Complete Guide for 2026 — Zeeg](https://zeeg.me/en/blog/post/salesforce-sales-cloud)
- [15 Types of Salesforce Clouds: 2026 Agentforce Update — TechForce](https://www.techforceservices.com/blog/types-of-salesforce-clouds/)
- [Sales Cloud: Top 8 Salesforce Spring '26 Features — Salesforce Ben](https://www.salesforceben.com/sales-cloud-top-salesforce-spring-26-features/)
- [Salesforce Sales Cloud Software 2026: Features, Integrations, Pros & Cons — Capterra](https://www.capterra.com/p/61368/Salesforce/)
- [Salesforce Sales Cloud Features — G2](https://www.g2.com/products/salesforce-salesforce-sales-cloud/features)
- [A List Of All Salesforce Products For 2026 — Martech Zone](https://martech.zone/salesforce-product-landscape/)
- [Salesforce Announces Spring 2026 Product Release — Salesforce](https://www.salesforce.com/news/stories/spring-2026-product-release-announcement/)
- [Service Cloud: Top Salesforce Summer '26 Features — Salesforce Ben](https://www.salesforceben.com/service-cloud-top-salesforce-summer-26-features/)
- [Service Cloud: Top 10 Salesforce Spring '26 Features — Salesforce Ben](https://www.salesforceben.com/service-cloud-top-10-salesforce-spring-26-features/)
- [All Customer Service Products & Features — Salesforce US](https://www.salesforce.com/service/all-products/)
- [11 key Salesforce Service Cloud features explained — Noltic](https://noltic.com/stories/salesforce-service-cloud-top-features)
- [Salesforce Account Engagement (Pardot) — Complete 2026 Guide — Genesys Growth](https://genesysgrowth.com/blog/salesforce-account-engagement-(pardot)-complete-guide)
- [Top 9 Summer ‘26 Updates for Salesforce Marketers — Salesforce Ben](https://www.salesforceben.com/top-9-summer-26-updates-for-salesforce-marketers/)
- [Using Account Engagement with Salesforce — Salesforce Help](https://help.salesforce.com/s/articleView?id=mktg.pardot_sf_connector_using_pardot_parent.htm)
- [Salesforce Sales Pricing — Salesforce](https://www.salesforce.com/sales/pricing/)
- [Salesforce Pricing 2026 — SaaSCRMReview](https://saascrmreview.com/salesforce-pricing/)
- [Salesforce Editions Comparison 2026 — LevelShift](https://levelshift.com/blogs/salesforce-editions-comparison)
- [Salesforce Announces Winter 2026 Product Release — Salesforce](https://www.salesforce.com/news/stories/winter-2026-product-release-announcement/)
- [Salesforce B2B Commerce Cloud: Ultimate Guide for 2026 — Rizex Labs](https://rizexlabs.com/salesforce-b2b-commerce-cloud-ultimate-guide-2026/)
- [A Complete Guide to Salesforce CPQ Objects — Atrium](https://atrium.ai/resources/a-complete-guide-to-salesforce-cpq-objects/)
- [Explore the Revenue Cloud Data Model — Salesforce Help](https://help.salesforce.com/s/articleView?id=ind.data_model_overview.htm)
- [Salesforce Field Service Lightning Data Model — Audit9](https://audit9.blog/2019/03/10/field-service-lightning-data-model/)
- [Complete Guide to Salesforce Field Service (FSL) — Salesforce Ben](https://www.salesforceben.com/salesforce-field-service/)
- [Get Started — Data Model Gallery — Salesforce Developers](https://developer.salesforce.com/docs/platform/data-models/guide/get-started.html)

---

*End of Salesforce module catalog. ~1,000 lines of structured coverage spanning every major Cloud, ~30 platform-cross-cutting capabilities, full data-model cheat sheet, edition matrix, and 30 differentiators worth knowing for our self-build.*
