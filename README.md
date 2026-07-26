# CRM — Arabic-first CRM for the MENA region

A multi-tenant Customer Relationship Management platform built for Arabic-speaking (RTL) businesses — sales pipelines, contacts, deals, and team collaboration.

## Overview

A modular **NestJS + Prisma** backend that exposes three interfaces — **REST, GraphQL, and an MCP (Model Context Protocol) server** — paired with a Vue dashboard and a marketing website. First-class Arabic / RTL support throughout.

## Tech Stack

- **Backend:** NestJS (TypeScript), Prisma ORM
- **APIs:** REST · GraphQL · MCP server
- **Frontend:** Vue dashboard + marketing website
- **Infrastructure:** Docker Compose
- **Layout:** monorepo (`apps/` + shared `packages/`)

## Project Structure

```
apps/        # api, dashboard, website
packages/    # shared libraries
docker/      # container configuration
docs/        # documentation
tests/       # test suites
```

## Getting Started

```bash
npm install
docker compose up -d       # start dependencies (database, etc.)

npm run dev                # run all apps
# …or individually:
npm run dev:api
npm run dev:dashboard
npm run dev:website
```

## Testing

```bash
npm test
```

~195 test files across the codebase.

## Status

Core CRM (contacts, deals, pipelines, multi-tenancy) is implemented over REST/GraphQL/MCP. A no-code customization layer is planned.
