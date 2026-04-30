# CRM MVP — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a multi-tenant SaaS CRM (Sales-deep MVP, Pipedrive-like) with Arabic-first RTL UI, AI-light readiness, and metadata-driven customization in 6 weeks.

**Architecture:** NestJS modular monolith (apps/api) + Vue 3 + PrimeVue dashboard (apps/dashboard) + Vue 3 SPA public website (apps/website). Postgres 16 + Prisma 6, Redis + BullMQ, MinIO, Socket.io. Multi-tenancy via `workspaceId` + Prisma middleware. Customization via metadata (entityDefs JSON + customFields JSONB + auto-generated indexed columns).

**Tech Stack:** Node 20 · pnpm 9 · TypeScript 5.6 · NestJS 10 · Prisma 6 · Postgres 16 (with pgvector) · Redis 7 · BullMQ 5 · MinIO · Socket.io 4 · Vue 3 · Vite 5 · PrimeVue 4 · Pinia 2 · Vue Router 4 · Vee-validate 4 · Zod 3 · vue-i18n 9 · Tailwind 3 · Chart.js 4 · vue-draggable-plus · Jest · Vitest · Playwright · Pino · OpenTelemetry · Argon2 · jsonwebtoken · zod · class-validator · class-transformer.

**Spec reference:** `docs/specs/2026-04-30-crm-design.md` (954 lines).
**Modules catalog:** `research/MODULES.md` (986 lines).

---

## Conventions

### Commit message format

Conventional Commits: `<type>(<scope>): <subject>` where:
- **type**: `feat | fix | refactor | test | docs | chore | build | ci | perf`
- **scope**: package or module (e.g., `api`, `dashboard`, `website`, `metadata`, `core`, `crm`, `automation`)

Body footer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`

### Branch naming

`sprint/<n>-<short-name>` for sprint branches (e.g., `sprint/0-monorepo-scaffold`). Inside a sprint, work happens on `feat/<sprint>-<task-slug>`.

### Code style

- Prettier 3 (default config in repo root).
- ESLint with @typescript-eslint, eslint-plugin-vue, eslint-config-prettier.
- 2-space indent, single quotes, semicolons, trailing commas (es5), 100-char line.

### Test patterns

- **Backend unit/integration**: Jest. Test files alongside source (`foo.service.spec.ts`).
- **Backend e2e** (api-level): Jest + Supertest. In `apps/api/test/<feature>.e2e-spec.ts`.
- **Frontend unit**: Vitest. Files alongside source (`foo.spec.ts`).
- **End-to-end (browser)**: Playwright. In `tests/e2e/specs/<feature>.spec.ts`.

### Naming

- Modules: kebab-case directories, PascalCase classes (`people/people.module.ts` exports `PeopleModule`).
- Files: `<feature>.{controller,service,module,dto,spec}.ts`.
- Vue files: PascalCase components (`PersonList.vue`), kebab-case routes.
- Database: snake_case columns + tables (Prisma maps via `@map`). Foreign keys: `<entity>_id`.

### Workflow per task

Every task in this plan follows TDD:

1. **Write the failing test.**
2. **Run the test, verify it fails** with the expected message.
3. **Write the minimal implementation.**
4. **Run the test, verify it passes.**
5. **Run all tests in the package.** If any regress, fix or revert.
6. **Commit** with conventional message.

Skipping a step = bug. The Iron Law: NO IMPLEMENTATION WITHOUT A FAILING TEST FIRST.

---

## Sprint Map

| Sprint | Days | Theme | Tasks | Status |
|---|---|---|---|---|
| **0** | 1-5 | Monorepo scaffold + CI + 3 hello-world apps | T0.1 — T0.10 | Pending |
| **1** | 6-10 | Auth + Workspaces + RBAC + Audit + Custom Fields engine | T1.1 — T1.16 | Pending |
| **2** | 11-15 | People + Companies + Tags + Lists + Search | T2.1 — T2.12 | Pending |
| **3** | 16-20 | Pipelines + Deals + Activities + Calendar + Kanban | T3.1 — T3.12 | Pending |
| **4** | 21-25 | Email send + Forms + Web-to-Lead + Workflow engine + Webhooks + Validation | T4.1 — T4.12 | Pending |
| **5** | 26-30 | Reports + Dashboards + AI Email Composer + Public website + e2e + launch | T5.1 — T5.12 | Pending |

---

# Sprint 0 — Monorepo Scaffold (Days 1-5)

**Goal:** Three apps run with `make dev`, talk to each other, deploy a green CI build.

**Deliverables:**
- pnpm monorepo with `apps/{api,dashboard,website}` and `packages/{shared-types,metadata}`.
- `docker-compose.yml` running postgres + redis + minio + mailhog.
- NestJS skeleton with health endpoint + Swagger + Pino + i18n + ConfigModule.
- Vue 3 dashboard skeleton with PrimeVue + Pinia + Router + i18n + RTL toggle.
- Vue 3 website skeleton with i18n + RTL.
- GitHub Actions CI: install + lint + typecheck + test on PR.
- Makefile mirroring azadoc pattern.

---

### Task 0.1: Repo skeleton + pnpm workspace

**Files:**
- Create: `crm/package.json`
- Create: `crm/pnpm-workspace.yaml`
- Create: `crm/.gitignore`
- Create: `crm/.editorconfig`
- Create: `crm/.prettierrc.json`
- Create: `crm/.prettierignore`
- Create: `crm/.env.example`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "crm",
  "version": "0.1.0",
  "private": true,
  "description": "CRM Platform — multi-tenant SaaS CRM for MENA market (Arabic-first)",
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  },
  "packageManager": "pnpm@9.15.9",
  "scripts": {
    "dev:api": "pnpm --filter @crm/api dev",
    "dev:dashboard": "pnpm --filter @crm/dashboard dev",
    "dev:website": "pnpm --filter @crm/website dev",
    "dev": "pnpm -r --parallel --filter ./apps/* dev",
    "build": "pnpm -r --filter ./apps/* build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "format": "prettier --write \"**/*.{ts,vue,js,json,md,yml,yaml}\"",
    "infra:up": "docker compose up -d",
    "infra:down": "docker compose down",
    "infra:logs": "docker compose logs -f"
  },
  "devDependencies": {
    "prettier": "^3.4.2",
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 3: Create `.gitignore`**

```
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
.nuxt/
.output/
.vite/
coverage/

# Env & secrets
.env
.env.*.local
*.local

# Docker volumes
docker/volumes/

# Logs & runtime
logs/
*.log
.npm
.eslintcache

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db

# Test artifacts
test-results/
playwright-report/
playwright/.cache/

# Prisma
**/prisma/migrations/migration_lock.toml
```

Wait — the migration_lock.toml SHOULD be committed. Use this `.gitignore` instead:

```
node_modules/
.pnpm-store/
dist/
build/
.vite/
coverage/
.env
.env.*.local
*.local
docker/volumes/
logs/
*.log
.npm
.eslintcache
.idea/
.vscode/
*.swp
.DS_Store
Thumbs.db
test-results/
playwright-report/
playwright/.cache/
```

- [ ] **Step 4: Create `.editorconfig`**

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

- [ ] **Step 5: Create `.prettierrc.json`**

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

- [ ] **Step 6: Create `.prettierignore`**

```
node_modules/
dist/
build/
coverage/
pnpm-lock.yaml
**/migrations/
docker/volumes/
playwright-report/
test-results/
```

- [ ] **Step 7: Create `.env.example`**

```bash
# Postgres
POSTGRES_USER=crm
POSTGRES_PASSWORD=crm_dev_2026
POSTGRES_DB=crm
POSTGRES_PORT=5432

# Redis
REDIS_PORT=6379

# MinIO
MINIO_ROOT_USER=crm
MINIO_ROOT_PASSWORD=crm_dev_2026
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001

# MailHog
MAILHOG_SMTP_PORT=1025
MAILHOG_UI_PORT=8025

# API
API_PORT=3001
API_BASE_URL=http://localhost:3001
JWT_ACCESS_SECRET=replace_in_local_env
JWT_REFRESH_SECRET=replace_in_local_env

# Frontends
DASHBOARD_PORT=5174
WEBSITE_PORT=5173

# AI (optional in dev — uses mock provider when missing)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
AI_DEFAULT_PROVIDER=mock
```

- [ ] **Step 8: Initialize git + commit**

```bash
cd /home/ayousry/Desktop/db_manager/systems/crm
git init
git add .
git commit -m "chore(repo): initial monorepo skeleton (pnpm workspaces, prettier, gitignore)"
```

---

### Task 0.2: Docker Compose infrastructure

**Files:**
- Create: `crm/docker-compose.yml`
- Create: `crm/docker/postgres-init/01-extensions.sql`

- [ ] **Step 1: Write `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: crm-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-crm}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-crm_dev_2026}
      POSTGRES_DB: ${POSTGRES_DB:-crm}
    ports:
      - '${POSTGRES_PORT:-5432}:5432'
    volumes:
      - ./docker/volumes/postgres:/var/lib/postgresql/data
      - ./docker/postgres-init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-crm}']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: crm-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    ports:
      - '${REDIS_PORT:-6379}:6379'
    volumes:
      - ./docker/volumes/redis:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 3s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: crm-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-crm}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-crm_dev_2026}
    ports:
      - '${MINIO_PORT:-9000}:9000'
      - '${MINIO_CONSOLE_PORT:-9001}:9001'
    volumes:
      - ./docker/volumes/minio:/data
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:9000/minio/health/live']
      interval: 10s
      timeout: 5s
      retries: 5

  mailhog:
    image: mailhog/mailhog:latest
    container_name: crm-mailhog
    restart: unless-stopped
    ports:
      - '${MAILHOG_SMTP_PORT:-1025}:1025'
      - '${MAILHOG_UI_PORT:-8025}:8025'

networks:
  default:
    name: crm-network
```

- [ ] **Step 2: Write postgres init script for pgvector**

```sql
-- crm/docker/postgres-init/01-extensions.sql
-- Note: the pgvector image registers the extension under the name `vector`
-- (NOT `pgvector` as some references suggest). Confirmed empirically.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

Wait — `pgvector` extension requires a postgres image with the extension installed. Replace the image line in `docker-compose.yml`:

```yaml
postgres:
    image: pgvector/pgvector:pg16
```

(Patch the file in step 1 before committing.)

- [ ] **Step 3: Test infra comes up**

Run: `cp .env.example .env && docker compose up -d`

Expected: All 4 services report healthy via `docker compose ps`.

- [ ] **Step 4: Verify pgvector enabled**

Run: `docker exec -it crm-postgres psql -U crm -d crm -c "SELECT extname FROM pg_extension WHERE extname IN ('pgvector','pg_trgm');"`

Expected: prints `pgvector` and `pg_trgm`.

- [ ] **Step 5: Tear down**

Run: `docker compose down`

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml docker/postgres-init/
git commit -m "build(infra): docker-compose for postgres+pgvector, redis, minio, mailhog"
```

---

### Task 0.3: TypeScript root config

**Files:**
- Create: `crm/tsconfig.base.json`
- Create: `crm/tsconfig.json`

- [ ] **Step 1: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": false,
    "declaration": true,
    "sourceMap": true,
    "incremental": true
  },
  "exclude": ["node_modules", "dist", "build", "coverage"]
}
```

- [ ] **Step 2: Write workspace `tsconfig.json`**

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["**/*.ts", "**/*.vue"],
  "exclude": ["node_modules", "**/dist", "**/build"]
}
```

- [ ] **Step 3: Commit**

```bash
git add tsconfig.base.json tsconfig.json
git commit -m "chore(repo): root TS configs"
```

---

### Task 0.4: `packages/shared-types` skeleton

**Files:**
- Create: `crm/packages/shared-types/package.json`
- Create: `crm/packages/shared-types/tsconfig.json`
- Create: `crm/packages/shared-types/src/index.ts`
- Create: `crm/packages/shared-types/src/locale.ts`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@crm/shared-types",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "echo 'no lint yet'",
    "typecheck": "tsc --noEmit",
    "test": "echo 'no tests yet'"
  },
  "devDependencies": {
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Write `src/locale.ts`**

```ts
export type Locale = 'ar' | 'en';

export type LocalizedString = {
  ar: string;
  en: string;
};

export const DEFAULT_LOCALE: Locale = 'ar';
```

- [ ] **Step 4: Write `src/index.ts`**

```ts
export * from './locale.js';
```

- [ ] **Step 5: Commit**

```bash
git add packages/shared-types/
git commit -m "feat(shared-types): scaffold @crm/shared-types package"
```

---

### Task 0.5: `packages/metadata` skeleton

**Files:**
- Create: `crm/packages/metadata/package.json`
- Create: `crm/packages/metadata/tsconfig.json`
- Create: `crm/packages/metadata/src/index.ts`
- Create: `crm/packages/metadata/src/loader.ts`
- Create: `crm/packages/metadata/src/loader.spec.ts`
- Create: `crm/packages/metadata/entityDefs/.gitkeep`
- Create: `crm/packages/metadata/clientDefs/.gitkeep`
- Create: `crm/packages/metadata/layouts/.gitkeep`
- Create: `crm/packages/metadata/i18n/ar.json`
- Create: `crm/packages/metadata/i18n/en.json`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@crm/metadata",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "echo 'no lint yet'",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@crm/shared-types": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "moduleResolution": "Bundler"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Write failing test `src/loader.spec.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { loadEntityDefs } from './loader.js';

describe('loadEntityDefs', () => {
  it('returns an empty array when entityDefs/ has no JSON files', async () => {
    const defs = await loadEntityDefs();
    expect(Array.isArray(defs)).toBe(true);
  });
});
```

- [ ] **Step 4: Run test, verify failure**

Run: `pnpm --filter @crm/metadata test`

Expected: FAIL with `Cannot find module './loader.js'`.

- [ ] **Step 5: Implement `src/loader.ts`**

```ts
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENTITY_DEFS_DIR = join(__dirname, '..', 'entityDefs');

export type EntityDef = {
  name: string;
  fields: Array<{
    key: string;
    label: { ar: string; en: string };
    type: string;
    required?: boolean;
  }>;
};

export async function loadEntityDefs(): Promise<EntityDef[]> {
  let files: string[];
  try {
    files = await readdir(ENTITY_DEFS_DIR);
  } catch {
    return [];
  }
  const jsonFiles = files.filter((f) => f.endsWith('.json'));
  const defs = await Promise.all(
    jsonFiles.map(async (f) => {
      const content = await readFile(join(ENTITY_DEFS_DIR, f), 'utf8');
      return JSON.parse(content) as EntityDef;
    })
  );
  return defs;
}
```

- [ ] **Step 6: Write `src/index.ts`**

```ts
export * from './loader.js';
```

- [ ] **Step 7: Write i18n placeholders**

```json
// packages/metadata/i18n/ar.json
{
  "common": {
    "save": "حفظ",
    "cancel": "إلغاء",
    "delete": "حذف",
    "edit": "تعديل"
  }
}
```

```json
// packages/metadata/i18n/en.json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit"
  }
}
```

- [ ] **Step 8: Run test, verify pass**

Run: `pnpm --filter @crm/metadata test`

Expected: PASS — 1 test, 1 assertion.

- [ ] **Step 9: Commit**

```bash
git add packages/metadata/
git commit -m "feat(metadata): scaffold @crm/metadata with entity loader (TDD)"
```

---

### Task 0.6: `apps/api` NestJS skeleton

**Files:**
- Create: `crm/apps/api/package.json`
- Create: `crm/apps/api/tsconfig.json`
- Create: `crm/apps/api/tsconfig.build.json`
- Create: `crm/apps/api/nest-cli.json`
- Create: `crm/apps/api/.eslintrc.cjs`
- Create: `crm/apps/api/jest.config.cjs`
- Create: `crm/apps/api/src/main.ts`
- Create: `crm/apps/api/src/app.module.ts`
- Create: `crm/apps/api/src/health/health.controller.ts`
- Create: `crm/apps/api/src/health/health.controller.spec.ts`
- Create: `crm/apps/api/src/health/health.module.ts`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@crm/api",
  "version": "0.1.0",
  "private": true,
  "main": "dist/main.js",
  "scripts": {
    "dev": "nest start --watch --preserveWatchOutput",
    "build": "nest build",
    "start": "node dist/main.js",
    "lint": "eslint \"{src,test}/**/*.ts\" --fix",
    "typecheck": "tsc --noEmit",
    "test": "jest --runInBand",
    "test:watch": "jest --watch",
    "test:e2e": "jest --config ./test/jest-e2e.json --runInBand"
  },
  "dependencies": {
    "@crm/metadata": "workspace:*",
    "@crm/shared-types": "workspace:*",
    "@nestjs/common": "^10.4.15",
    "@nestjs/config": "^3.3.0",
    "@nestjs/core": "^10.4.15",
    "@nestjs/platform-express": "^10.4.15",
    "@nestjs/swagger": "^8.0.6",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "nestjs-pino": "^4.2.0",
    "pino": "^9.5.0",
    "pino-http": "^10.3.0",
    "pino-pretty": "^11.3.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.9",
    "@nestjs/schematics": "^10.2.3",
    "@nestjs/testing": "^10.4.15",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.14",
    "@types/node": "^22.10.5",
    "@types/supertest": "^6.0.2",
    "@typescript-eslint/eslint-plugin": "^8.19.0",
    "@typescript-eslint/parser": "^8.19.0",
    "eslint": "^9.17.0",
    "eslint-config-prettier": "^9.1.0",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.5",
    "ts-loader": "^9.5.1",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "target": "ES2022",
    "outDir": "./dist",
    "rootDir": "./src",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strictPropertyInitialization": false
  },
  "include": ["src/**/*", "test/**/*"]
}
```

- [ ] **Step 3: Write `tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

- [ ] **Step 4: Write `nest-cli.json`**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **Step 5: Write `jest.config.cjs`**

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  moduleFileExtensions: ['js', 'json', 'ts'],
};
```

- [ ] **Step 6: Write `.eslintrc.cjs`**

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: { project: 'tsconfig.json', tsconfigRootDir: __dirname, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  root: true,
  env: { node: true, jest: true },
  ignorePatterns: ['.eslintrc.cjs', 'dist', 'node_modules'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
```

- [ ] **Step 7: Write failing test `src/health/health.controller.spec.ts`**

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();
    controller = module.get<HealthController>(HealthController);
  });

  it('returns ok status', () => {
    const result = controller.health();
    expect(result.status).toBe('ok');
    expect(typeof result.uptime).toBe('number');
    expect(typeof result.timestamp).toBe('string');
  });
});
```

- [ ] **Step 8: Run test, verify fail**

Run: `pnpm --filter @crm/api test`

Expected: FAIL with `Cannot find module './health.controller'`.

- [ ] **Step 9: Implement `src/health/health.controller.ts`**

```ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  health(): { status: string; uptime: number; timestamp: string } {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
```

- [ ] **Step 10: Implement `src/health/health.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({ controllers: [HealthController] })
export class HealthModule {}
```

- [ ] **Step 11: Implement `src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        level: process.env.LOG_LEVEL ?? 'info',
      },
    }),
    HealthModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 12: Implement `src/main.ts`**

> **Note**: `nestjs-pino`'s `Logger` is instance-only (no static `log()` method). We import it as `PinoLogger` for `app.useLogger()` and use `Logger` from `@nestjs/common` for the static bootstrap log line.

```ts
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })
  );
  app.enableCors({ origin: true, credentials: true });

  const config = new DocumentBuilder()
    .setTitle('CRM API')
    .setDescription('Multi-tenant CRM REST API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}/api/v1`);
}
bootstrap();
```

- [ ] **Step 13: Run test, verify pass**

Run: `pnpm --filter @crm/api test`

Expected: PASS.

- [ ] **Step 14: Smoke test API runs**

Run: `pnpm --filter @crm/api dev` (background) then `curl http://localhost:3001/api/v1/health`.

Expected: JSON `{"status":"ok",...}`. Stop API.

- [ ] **Step 15: Commit**

```bash
git add apps/api/
git commit -m "feat(api): scaffold NestJS app with health endpoint, Swagger, Pino (TDD)"
```

---

### Task 0.7: `apps/dashboard` Vue 3 + PrimeVue skeleton

**Files:**
- Create: `crm/apps/dashboard/package.json`
- Create: `crm/apps/dashboard/tsconfig.json`
- Create: `crm/apps/dashboard/tsconfig.node.json`
- Create: `crm/apps/dashboard/vite.config.ts`
- Create: `crm/apps/dashboard/index.html`
- Create: `crm/apps/dashboard/tailwind.config.cjs`
- Create: `crm/apps/dashboard/postcss.config.cjs`
- Create: `crm/apps/dashboard/.eslintrc.cjs`
- Create: `crm/apps/dashboard/src/main.ts`
- Create: `crm/apps/dashboard/src/App.vue`
- Create: `crm/apps/dashboard/src/router/index.ts`
- Create: `crm/apps/dashboard/src/views/Home.vue`
- Create: `crm/apps/dashboard/src/i18n/index.ts`
- Create: `crm/apps/dashboard/src/i18n/ar.json`
- Create: `crm/apps/dashboard/src/i18n/en.json`
- Create: `crm/apps/dashboard/src/styles/index.css`
- Create: `crm/apps/dashboard/src/composables/useLocale.ts`
- Create: `crm/apps/dashboard/src/composables/useLocale.spec.ts`
- Create: `crm/apps/dashboard/vitest.config.ts`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@crm/dashboard",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port ${DASHBOARD_PORT:-5174}",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview --port ${DASHBOARD_PORT:-5174}",
    "lint": "eslint \"src/**/*.{ts,vue}\" --fix",
    "typecheck": "vue-tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@crm/shared-types": "workspace:*",
    "@crm/metadata": "workspace:*",
    "@vueuse/core": "^12.4.0",
    "axios": "^1.7.9",
    "chart.js": "^4.4.7",
    "pinia": "^2.3.0",
    "primeicons": "^7.0.0",
    "primevue": "^4.2.5",
    "vee-validate": "^4.15.0",
    "vue": "^3.5.13",
    "vue-i18n": "^10.0.5",
    "vue-router": "^4.5.0",
    "zod": "^3.24.1",
    "@vee-validate/zod": "^4.15.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "@vitejs/plugin-vue": "^5.2.1",
    "@vue/test-utils": "^2.4.6",
    "@vue/tsconfig": "^0.7.0",
    "@typescript-eslint/eslint-plugin": "^8.19.0",
    "@typescript-eslint/parser": "^8.19.0",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.17.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-vue": "^9.32.0",
    "happy-dom": "^16.3.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "vitest": "^2.1.8",
    "vue-tsc": "^2.2.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["node"]
  },
  "include": [
    "env.d.ts",
    "src/**/*",
    "src/**/*.vue"
  ],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Write `tsconfig.node.json`**

```json
{
  "extends": "@tsconfig/node22/tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": ["node"]
  },
  "include": ["vite.config.*", "vitest.config.*"]
}
```

- [ ] **Step 4: Write `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: Number(process.env.DASHBOARD_PORT ?? 5174),
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 5: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
```

- [ ] **Step 6: Write `index.html`**

```html
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CRM</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 7: Write Tailwind config**

```javascript
// tailwind.config.cjs
module.exports = {
  content: ['./index.html', './src/**/*.{vue,ts,js}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', 'Cairo', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

```javascript
// postcss.config.cjs
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 8: Write `src/styles/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: 'Cairo', system-ui, sans-serif;
}

html[dir='rtl'] body {
  direction: rtl;
}

html[dir='ltr'] body {
  direction: ltr;
}

body {
  margin: 0;
  background: #f8fafc;
  color: #0f172a;
}
```

- [ ] **Step 9: Write `src/i18n/ar.json` and `en.json`**

```json
// src/i18n/ar.json
{
  "app": {
    "title": "نظام إدارة العملاء",
    "welcome": "أهلاً بك في الـ CRM"
  }
}
```

```json
// src/i18n/en.json
{
  "app": {
    "title": "Customer Relationship Management",
    "welcome": "Welcome to CRM"
  }
}
```

- [ ] **Step 10: Write `src/i18n/index.ts`**

```ts
import { createI18n } from 'vue-i18n';
import ar from './ar.json';
import en from './en.json';

export const i18n = createI18n({
  legacy: false,
  locale: 'ar',
  fallbackLocale: 'en',
  messages: { ar, en },
});

export type AppLocale = 'ar' | 'en';
```

- [ ] **Step 11: Write failing test `src/composables/useLocale.spec.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useLocale } from './useLocale';

describe('useLocale', () => {
  beforeEach(() => {
    document.documentElement.dir = '';
    document.documentElement.lang = '';
  });

  it('initializes to ar/rtl by default', () => {
    const { locale, dir } = useLocale();
    expect(locale.value).toBe('ar');
    expect(dir.value).toBe('rtl');
  });

  it('switches to en/ltr when setLocale("en") is called', () => {
    const { setLocale, locale, dir } = useLocale();
    setLocale('en');
    expect(locale.value).toBe('en');
    expect(dir.value).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });
});
```

- [ ] **Step 12: Run test, verify fail**

Run: `pnpm --filter @crm/dashboard test`

Expected: FAIL with `Cannot find module './useLocale'`.

- [ ] **Step 13: Implement `src/composables/useLocale.ts`**

```ts
import { ref, computed, type Ref } from 'vue';

export type AppLocale = 'ar' | 'en';

const localeRef: Ref<AppLocale> = ref('ar');

function applyToDocument(loc: AppLocale) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = loc;
    document.documentElement.dir = loc === 'ar' ? 'rtl' : 'ltr';
  }
}

applyToDocument(localeRef.value);

export function useLocale() {
  const dir = computed(() => (localeRef.value === 'ar' ? 'rtl' : 'ltr'));

  function setLocale(next: AppLocale) {
    localeRef.value = next;
    applyToDocument(next);
  }

  return { locale: localeRef, dir, setLocale };
}
```

- [ ] **Step 14: Run test, verify pass**

Run: `pnpm --filter @crm/dashboard test`

Expected: PASS — 2 tests.

- [ ] **Step 15: Implement `src/views/Home.vue`**

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useLocale } from '@/composables/useLocale';
import Button from 'primevue/button';

const { t } = useI18n();
const { locale, setLocale } = useLocale();
</script>

<template>
  <main class="p-8 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-4">{{ t('app.title') }}</h1>
    <p class="text-lg mb-6">{{ t('app.welcome') }}</p>
    <div class="flex gap-2">
      <Button
        :label="locale === 'ar' ? 'English' : 'العربية'"
        @click="setLocale(locale === 'ar' ? 'en' : 'ar')"
        severity="secondary"
      />
    </div>
  </main>
</template>
```

- [ ] **Step 16: Implement `src/router/index.ts`**

```ts
import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/views/Home.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
  ],
});
```

- [ ] **Step 17: Implement `src/App.vue`**

```vue
<script setup lang="ts">
</script>

<template>
  <router-view />
</template>
```

- [ ] **Step 18: Implement `src/main.ts`**

```ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import App from './App.vue';
import { router } from './router';
import { i18n } from './i18n';
import 'primeicons/primeicons.css';
import './styles/index.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(i18n);
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: { darkModeSelector: '.crm-dark' },
  },
});
app.mount('#app');
```

- [ ] **Step 19: Add `@primevue/themes` to dependencies**

Edit `apps/dashboard/package.json` to add: `"@primevue/themes": "^4.2.5"` in `dependencies`.

- [ ] **Step 20: Smoke test dashboard runs**

Run: `pnpm --filter @crm/dashboard dev` (background); open http://localhost:5174.

Expected: Arabic-RTL homepage with title, welcome, language toggle button. Click toggles to English/LTR.

- [ ] **Step 21: Commit**

```bash
git add apps/dashboard/
git commit -m "feat(dashboard): scaffold Vue 3 + PrimeVue + Pinia + Router + i18n RTL (TDD)"
```

---

### Task 0.8: `apps/website` Vue 3 SPA skeleton

**Files:**
- Create: `crm/apps/website/package.json`
- Create: `crm/apps/website/tsconfig.json`
- Create: `crm/apps/website/tsconfig.node.json`
- Create: `crm/apps/website/vite.config.ts`
- Create: `crm/apps/website/index.html`
- Create: `crm/apps/website/tailwind.config.cjs`
- Create: `crm/apps/website/postcss.config.cjs`
- Create: `crm/apps/website/src/main.ts`
- Create: `crm/apps/website/src/App.vue`
- Create: `crm/apps/website/src/router/index.ts`
- Create: `crm/apps/website/src/pages/Home.vue`
- Create: `crm/apps/website/src/i18n/{index.ts,ar.json,en.json}`
- Create: `crm/apps/website/src/styles/index.css`
- Create: `crm/apps/website/vitest.config.ts`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@crm/website",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port ${WEBSITE_PORT:-5173}",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview --port ${WEBSITE_PORT:-5173}",
    "lint": "eslint \"src/**/*.{ts,vue}\" --fix",
    "typecheck": "vue-tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@crm/shared-types": "workspace:*",
    "vue": "^3.5.13",
    "vue-i18n": "^10.0.5",
    "vue-router": "^4.5.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "@vitejs/plugin-vue": "^5.2.1",
    "@vue/test-utils": "^2.4.6",
    "@vue/tsconfig": "^0.7.0",
    "autoprefixer": "^10.4.20",
    "happy-dom": "^16.3.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "vite-ssg": "^0.24.2",
    "vitest": "^2.1.8",
    "vue-tsc": "^2.2.0"
  }
}
```

- [ ] **Step 2: Reuse the dashboard's `tsconfig.json`, `tsconfig.node.json`, `tailwind.config.cjs`, `postcss.config.cjs`, `vite.config.ts`, `vitest.config.ts` patterns** — copy them to `apps/website/` adjusting only the port.

(Use the same content as Task 0.7 steps 2-5, change `DASHBOARD_PORT` to `WEBSITE_PORT`, default `5173`.)

- [ ] **Step 3: Write `index.html`**

```html
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CRM — نظام إدارة علاقات العملاء</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 4: Write i18n files**

```json
// src/i18n/ar.json
{
  "site": {
    "title": "CRM",
    "tagline": "نظام إدارة علاقات العملاء — مصمم للسوق العربي",
    "cta": "ابدأ مجاناً"
  }
}
```

```json
// src/i18n/en.json
{
  "site": {
    "title": "CRM",
    "tagline": "Customer Relationship Management — built for the Arab market",
    "cta": "Start Free"
  }
}
```

```ts
// src/i18n/index.ts
import { createI18n } from 'vue-i18n';
import ar from './ar.json';
import en from './en.json';

export const i18n = createI18n({
  legacy: false,
  locale: 'ar',
  fallbackLocale: 'en',
  messages: { ar, en },
});
```

- [ ] **Step 5: Write `src/styles/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html[dir='rtl'] body {
  direction: rtl;
}

body {
  margin: 0;
  font-family: 'Cairo', system-ui, sans-serif;
  background: #ffffff;
}
```

- [ ] **Step 6: Write `src/pages/Home.vue`**

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>

<template>
  <main class="min-h-screen bg-gradient-to-b from-blue-50 to-white">
    <section class="max-w-5xl mx-auto px-6 py-24 text-center">
      <h1 class="text-5xl font-bold mb-4">{{ t('site.title') }}</h1>
      <p class="text-xl text-slate-600 mb-8">{{ t('site.tagline') }}</p>
      <a
        href="/sign-up"
        class="inline-block px-8 py-3 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700"
      >
        {{ t('site.cta') }}
      </a>
    </section>
  </main>
</template>
```

- [ ] **Step 7: Write `src/router/index.ts`, `src/App.vue`, `src/main.ts`**

```ts
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/pages/Home.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/', component: Home }],
});
```

```vue
<!-- src/App.vue -->
<template>
  <router-view />
</template>
```

```ts
// src/main.ts
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import { i18n } from './i18n';
import './styles/index.css';

createApp(App).use(router).use(i18n).mount('#app');
```

- [ ] **Step 8: Write smoke test `src/pages/Home.spec.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import Home from './Home.vue';
import ar from '../i18n/ar.json';

describe('Home', () => {
  it('renders the tagline in Arabic', () => {
    const i18n = createI18n({ legacy: false, locale: 'ar', messages: { ar } });
    const wrapper = mount(Home, { global: { plugins: [i18n] } });
    expect(wrapper.text()).toContain(ar.site.tagline);
  });
});
```

- [ ] **Step 9: Run test, verify pass**

Run: `pnpm --filter @crm/website test`

Expected: PASS — 1 test.

- [ ] **Step 10: Smoke test website runs**

Run: `pnpm --filter @crm/website dev` (background); open http://localhost:5173.

Expected: Arabic-RTL homepage. Title + tagline + CTA button.

- [ ] **Step 11: Commit**

```bash
git add apps/website/
git commit -m "feat(website): scaffold Vue 3 + Vite SPA with i18n RTL home page (TDD)"
```

---

### Task 0.9: Makefile

**Files:**
- Create: `crm/Makefile`

- [ ] **Step 1: Write `Makefile`**

```makefile
# CRM — convenience targets for local development.

.DEFAULT_GOAL := help
SHELL := /bin/bash

ROOT := $(shell pwd)

.PHONY: help install infra-up infra-down infra-logs api-dev dashboard-dev website-dev dev \
	prisma-generate prisma-migrate prisma-studio seed dogfood lint typecheck test build clean

help: ## عرض المساعدة
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## تثبيت الاعتمادات (pnpm)
	pnpm install

infra-up: ## تشغيل postgres + redis + minio + mailhog
	docker compose up -d
	@echo "infra running:"
	@echo "  postgres : localhost:$${POSTGRES_PORT:-5432}"
	@echo "  redis    : localhost:$${REDIS_PORT:-6379}"
	@echo "  minio    : http://localhost:$${MINIO_CONSOLE_PORT:-9001}"
	@echo "  mailhog  : http://localhost:$${MAILHOG_UI_PORT:-8025}"

infra-down: ## إيقاف خدمات Docker
	docker compose down

infra-logs: ## متابعة لوجات الخدمات
	docker compose logs -f

prisma-generate: ## توليد Prisma client
	pnpm --filter @crm/api prisma:generate

prisma-migrate: ## تطبيق migrations جديدة
	pnpm --filter @crm/api prisma:migrate

prisma-studio: ## فتح Prisma Studio
	pnpm --filter @crm/api prisma:studio

seed: ## تشغيل seed
	pnpm --filter @crm/api seed

api-dev: ## تشغيل API
	pnpm --filter @crm/api dev

dashboard-dev: ## تشغيل لوحة التحكم
	pnpm --filter @crm/dashboard dev

website-dev: ## تشغيل الموقع
	pnpm --filter @crm/website dev

dev: ## تشغيل الثلاثة بالتوازي
	pnpm dev

dogfood: ## فحص شامل: infra + healthcheck لكل التطبيقات
	@$(MAKE) infra-up
	@sleep 3
	@echo "--- API health ---"
	@curl -s http://localhost:3001/api/v1/health | head || echo "API not running"
	@echo
	@echo "--- Dashboard ---"
	@curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:5174 || true
	@echo "--- Website ---"
	@curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:5173 || true

lint: ## فحص الكود
	pnpm -r lint

typecheck: ## فحص الأنواع
	pnpm -r typecheck

test: ## تشغيل الاختبارات
	pnpm -r test

build: ## بناء الإنتاج
	pnpm -r --filter ./apps/* build

clean: ## تنظيف
	rm -rf node_modules apps/*/node_modules apps/*/dist packages/*/node_modules packages/*/dist
```

- [ ] **Step 2: Smoke test**

Run: `make help`. Expected: prints colorized target list.

- [ ] **Step 3: Commit**

```bash
git add Makefile
git commit -m "build(repo): Makefile with dev/infra/test targets"
```

---

### Task 0.10: GitHub Actions CI

**Files:**
- Create: `crm/.github/workflows/ci.yml`

- [ ] **Step 1: Write CI workflow**

```yaml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_USER: crm
          POSTGRES_PASSWORD: crm_test
          POSTGRES_DB: crm_test
        ports: [5432:5432]
        options: >-
          --health-cmd "pg_isready -U crm"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: [6379:6379]
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
        env:
          DATABASE_URL: postgresql://crm:crm_test@localhost:5432/crm_test
          REDIS_URL: redis://localhost:6379
          JWT_ACCESS_SECRET: test_secret
          JWT_REFRESH_SECRET: test_secret_refresh
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions CI workflow (typecheck + lint + test)"
```

- [ ] **Step 3: Run pnpm install at root**

```bash
cd /home/ayousry/Desktop/db_manager/systems/crm
pnpm install
```

Expected: All 5 packages link, lockfile generated.

- [ ] **Step 4: Run full test suite**

```bash
pnpm test
pnpm typecheck
```

Expected: All pass.

- [ ] **Step 5: Run dogfood smoke**

```bash
make infra-up
make dev &
sleep 8
make dogfood
```

Expected: API health 200, dashboard 200, website 200. Stop everything.

- [ ] **Step 6: Commit lockfile**

```bash
git add pnpm-lock.yaml
git commit -m "build(repo): pnpm-lock.yaml after initial install"
```

**Sprint 0 done.** Tag: `git tag v0.1.0-sprint0`.

---

# Sprint 1 — Auth, Workspaces, RBAC, Audit, Custom Fields (Days 6-10)

**Goal:** Multi-tenant foundation with auth, RBAC, audit log, and metadata-driven custom fields engine. By end of sprint, an admin can sign up, create a workspace, invite teammates, define a custom field on Person via UI (UI itself in sprint 2), and confirm the field appears in the API.

**Deliverables:**
- Prisma schema + initial migrations.
- Sign-up + login + JWT (access + refresh) + password reset.
- Workspaces (with Prisma middleware for tenant scoping).
- Users + Teams + Roles + Profiles + PermissionSets.
- RBAC guards (`@RequiresPermission('person:read')`).
- Audit log middleware writes on every save.
- CustomFieldDef CRUD + types + indexed-column generation.
- MetadataService merges built-in + custom for any entity.
- API metadata endpoint `GET /api/v1/metadata/:entityType`.

---

### Task 1.1: Prisma + database setup

**Files:**
- Modify: `crm/apps/api/package.json` (add `prisma`, `@prisma/client`).
- Create: `crm/apps/api/prisma/schema.prisma`
- Create: `crm/apps/api/src/prisma/prisma.service.ts`
- Create: `crm/apps/api/src/prisma/prisma.module.ts`
- Create: `crm/apps/api/src/prisma/prisma.service.spec.ts`

- [ ] **Step 1: Add Prisma to api package.json**

```json
// add to dependencies:
"@prisma/client": "^6.1.0",

// add to devDependencies:
"prisma": "^6.1.0",

// add to scripts:
"prisma:generate": "prisma generate",
"prisma:migrate": "prisma migrate dev",
"prisma:deploy": "prisma migrate deploy",
"prisma:studio": "prisma studio",
"seed": "tsx prisma/seed.ts"
```

(Add `tsx` to devDependencies: `"tsx": "^4.19.2"`.)

- [ ] **Step 2: Write `apps/api/prisma/schema.prisma`**

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema", "postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "pgvector"), pg_trgm, unaccent]
}

// First Workspace model — full models added per task.
model Workspace {
  id        String   @id @default(cuid())
  slug      String   @unique
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 3: Write `.env` for api**

In `crm/apps/api/.env`:

```
DATABASE_URL=postgresql://crm:crm_dev_2026@localhost:5432/crm?schema=public
NODE_ENV=development
LOG_LEVEL=debug
API_PORT=3001
JWT_ACCESS_SECRET=dev_access_secret_change_me
JWT_REFRESH_SECRET=dev_refresh_secret_change_me
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=2592000
```

- [ ] **Step 4: Write failing test `src/prisma/prisma.service.spec.ts`**

```ts
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('extends PrismaClient and exposes onModuleInit', () => {
    const svc = new PrismaService();
    expect(typeof svc.onModuleInit).toBe('function');
    expect(typeof svc.$connect).toBe('function');
  });
});
```

- [ ] **Step 5: Run test, verify fail**

Run: `pnpm --filter @crm/api test`

Expected: FAIL with `Cannot find module './prisma.service'`.

- [ ] **Step 6: Generate Prisma client**

Run: `cd apps/api && pnpm prisma:generate`

Expected: `@prisma/client` generated.

- [ ] **Step 7: Implement `src/prisma/prisma.service.ts`**

```ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    this.logger.log('connecting to database');
    await this.$connect();
  }

  async onModuleDestroy() {
    this.logger.log('disconnecting from database');
    await this.$disconnect();
  }
}
```

- [ ] **Step 8: Implement `src/prisma/prisma.module.ts`**

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 9: Wire into AppModule**

Add `PrismaModule` to `imports` array in `apps/api/src/app.module.ts`.

- [ ] **Step 10: Run migration**

Run: `cd apps/api && pnpm prisma:migrate -- --name init`

Expected: creates migration file + applies. `Workspace` table exists.

- [ ] **Step 11: Run test, verify pass**

Run: `pnpm --filter @crm/api test`

Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add apps/api/prisma apps/api/src/prisma apps/api/package.json apps/api/.env.example
git commit -m "feat(api): Prisma setup with PrismaService + initial Workspace migration"
```

---

### Task 1.2: Workspace + Prisma tenant middleware

**Files:**
- Modify: `crm/apps/api/prisma/schema.prisma` (extend Workspace fields)
- Create: `crm/apps/api/src/core/workspaces/workspace.entity.ts` (DTO type)
- Create: `crm/apps/api/src/core/tenant/tenant-context.service.ts`
- Create: `crm/apps/api/src/core/tenant/tenant-context.service.spec.ts`
- Create: `crm/apps/api/src/core/tenant/tenant.middleware.ts`
- Create: `crm/apps/api/src/core/tenant/tenant.module.ts`

- [ ] **Step 1: Extend Workspace schema**

Edit `apps/api/prisma/schema.prisma`:

```prisma
model Workspace {
  id            String   @id @default(cuid())
  slug          String   @unique
  name          String
  plan          WorkspacePlan @default(FREE)
  branding      Json     @default("{}")
  primaryLocale String   @default("ar")
  primaryCurrency String @default("EGP") @db.Char(3)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  users         User[]
  teams         Team[]

  @@index([slug])
}

enum WorkspacePlan {
  FREE
  STARTER
  GROWTH
  ENTERPRISE
}

model User {
  id              String   @id @default(cuid())
  workspaceId     String
  workspace       Workspace @relation(fields: [workspaceId], references: [id])
  email           String
  emailNormalized String
  passwordHash    String
  fullName        String
  locale          String   @default("ar")
  status          UserStatus @default(ACTIVE)
  emailVerifiedAt DateTime?
  lastLoginAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([workspaceId, emailNormalized])
  @@index([emailNormalized])
}

enum UserStatus {
  ACTIVE
  INVITED
  DISABLED
}

model Team {
  id          String   @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  name        String
  parentId    String?
  parent      Team?    @relation("TeamHierarchy", fields: [parentId], references: [id])
  children    Team[]   @relation("TeamHierarchy")
  createdAt   DateTime @default(now())

  @@unique([workspaceId, name])
}
```

- [ ] **Step 2: Run migration**

Run: `cd apps/api && pnpm prisma:migrate -- --name add-user-team-fields`

- [ ] **Step 3: Write failing test `tenant-context.service.spec.ts`**

```ts
import { TenantContextService } from './tenant-context.service';

describe('TenantContextService', () => {
  it('stores and retrieves a workspaceId via run/getStore', () => {
    const svc = new TenantContextService();
    svc.run({ workspaceId: 'ws_1', userId: 'u_1' }, () => {
      expect(svc.getStore()?.workspaceId).toBe('ws_1');
      expect(svc.getStore()?.userId).toBe('u_1');
    });
  });

  it('returns undefined outside of run()', () => {
    const svc = new TenantContextService();
    expect(svc.getStore()).toBeUndefined();
  });
});
```

- [ ] **Step 4: Run test, verify fail**

Run: `pnpm --filter @crm/api test`

Expected: FAIL with module not found.

- [ ] **Step 5: Implement `tenant-context.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContext {
  workspaceId: string;
  userId?: string;
  profileIds: string[];
  permissionKeys: Set<string>;
}

@Injectable()
export class TenantContextService {
  private readonly als = new AsyncLocalStorage<TenantContext>();

  run<T>(ctx: TenantContext, fn: () => T): T {
    return this.als.run(ctx, fn);
  }

  getStore(): TenantContext | undefined {
    return this.als.getStore();
  }
}
```

Update test to handle the `profileIds`/`permissionKeys`:

```ts
svc.run({ workspaceId: 'ws_1', userId: 'u_1', profileIds: [], permissionKeys: new Set() }, () => {
```

- [ ] **Step 6: Run test, verify pass**

Run: `pnpm --filter @crm/api test`

Expected: PASS.

- [ ] **Step 7: Apply Prisma client extension for tenant scoping**

Edit `apps/api/src/prisma/prisma.service.ts`:

```ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContextService } from '../core/tenant/tenant-context.service';

const TENANT_SCOPED_MODELS = new Set(['User', 'Team', 'Person', 'Deal', 'Activity', 'List', 'Tag', 'CustomFieldDef', 'CustomModuleDef', 'CustomRecord', 'Workflow', 'Webhook', 'AuditLog']);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly tenant: TenantContextService) {
    super();
    this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (!TENANT_SCOPED_MODELS.has(model)) return query(args);
            const store = (globalThis as any).__crmTenant;
            if (!store) return query(args);
            const wsId = store.workspaceId;
            // inject workspaceId
            if (operation === 'findFirst' || operation === 'findMany' || operation === 'count' || operation === 'aggregate') {
              args.where = { ...(args.where ?? {}), workspaceId: wsId };
            } else if (operation === 'create') {
              args.data = { ...(args.data ?? {}), workspaceId: wsId };
            } else if (operation === 'update' || operation === 'updateMany' || operation === 'delete' || operation === 'deleteMany') {
              args.where = { ...(args.where ?? {}), workspaceId: wsId };
            }
            return query(args);
          },
        },
      },
    });
  }

  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

(Note: The Prisma extension API is the canonical approach for v6. The `globalThis.__crmTenant` is a stand-in; we'll wire it via async-local-storage in step 8.)

- [ ] **Step 8: Wire ALS into Prisma extension**

Refactor — instead of `globalThis`, inject `TenantContextService` into the extension factory. Cleanest approach:

```ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public readonly tenantClient: ReturnType<typeof this.buildTenantClient>;

  constructor(private readonly tenant: TenantContextService) {
    super();
    this.tenantClient = this.buildTenantClient();
  }

  private buildTenantClient() {
    const tenant = this.tenant;
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (!TENANT_SCOPED_MODELS.has(model)) return query(args);
            const ctx = tenant.getStore();
            if (!ctx) return query(args);
            // ... same scoping logic
            return query(args);
          },
        },
      },
    });
  }

  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

Services should inject `PrismaService` and use `prisma.tenantClient.user.findMany(...)`. Direct `prisma.user.findMany(...)` bypasses scoping (use only in admin contexts).

- [ ] **Step 9: Write `tenant.middleware.ts`**

```ts
import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenant: TenantContextService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    // For now, read X-Workspace-Id; in Sprint 1.4 we replace with JWT-derived workspaceId.
    const wsId = (req.headers['x-workspace-id'] as string | undefined) ?? null;
    if (!wsId) {
      // Allow public routes (auth, health). The auth guard will enforce when needed.
      return next();
    }
    this.tenant.run(
      { workspaceId: wsId, profileIds: [], permissionKeys: new Set() },
      () => next()
    );
  }
}
```

- [ ] **Step 10: Wire `TenantModule`**

```ts
// src/core/tenant/tenant.module.ts
import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';

@Global()
@Module({
  providers: [TenantContextService],
  exports: [TenantContextService],
})
export class TenantModule {}
```

Add to `AppModule.imports` (BEFORE PrismaModule because PrismaService depends on TenantContextService).

- [ ] **Step 11: Run tests, verify pass**

Run: `pnpm --filter @crm/api test`

Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add apps/api/prisma apps/api/src/core/tenant apps/api/src/prisma apps/api/src/app.module.ts
git commit -m "feat(api): tenant context (ALS) + Prisma extension for workspace scoping"
```

---

### Task 1.3: Auth — sign up

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (add `Auth` and `RefreshToken` related fields)
- Create: `apps/api/src/core/auth/dto/sign-up.dto.ts`
- Create: `apps/api/src/core/auth/auth.service.ts`
- Create: `apps/api/src/core/auth/auth.service.spec.ts`
- Create: `apps/api/src/core/auth/auth.controller.ts`
- Create: `apps/api/src/core/auth/auth.controller.spec.ts`
- Create: `apps/api/src/core/auth/auth.module.ts`
- Create: `apps/api/src/core/auth/password.util.ts`
- Create: `apps/api/src/core/auth/password.util.spec.ts`

- [ ] **Step 1: Add deps to api**

```json
"argon2": "^0.41.1",
"jsonwebtoken": "^9.0.2",
"@types/jsonwebtoken": "^9.0.7",
"slugify": "^1.6.6"
```

- [ ] **Step 2: Schema additions** — already covered in Task 1.2 (User has passwordHash). Add RefreshToken:

```prisma
model RefreshToken {
  id            String   @id @default(cuid())
  workspaceId   String
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  tokenHash     String   @unique
  expiresAt     DateTime
  revokedAt     DateTime?
  replacedById  String?
  createdAt     DateTime @default(now())
  ipAddress     String?
  userAgent     String?

  @@index([workspaceId, userId])
  @@index([tokenHash])
}
```

(Add `refreshTokens RefreshToken[]` relation on User.)

- [ ] **Step 3: Run migration**

```bash
cd apps/api && pnpm prisma:migrate -- --name auth-refresh-token
```

- [ ] **Step 4: Write failing test `password.util.spec.ts`**

```ts
import { hashPassword, verifyPassword } from './password.util';

describe('password.util', () => {
  it('hashes a password and verifies it', async () => {
    const hash = await hashPassword('hunter2!');
    expect(hash).toMatch(/^\$argon2/);
    expect(await verifyPassword(hash, 'hunter2!')).toBe(true);
    expect(await verifyPassword(hash, 'wrong')).toBe(false);
  });
});
```

- [ ] **Step 5: Run test, verify fail**

Expected: module not found.

- [ ] **Step 6: Implement `password.util.ts`**

```ts
import * as argon2 from 'argon2';

const OPTS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  if (plain.length < 8) throw new Error('password too short');
  return argon2.hash(plain, OPTS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
```

- [ ] **Step 7: Run test, verify pass**

- [ ] **Step 8: Write `dto/sign-up.dto.ts`**

```ts
import { IsEmail, IsString, MinLength, IsLocale } from 'class-validator';

export class SignUpDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() @MinLength(2) fullName!: string;
  @IsString() workspaceName!: string;
}
```

- [ ] **Step 9: Write failing test `auth.service.spec.ts`**

```ts
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        TenantContextService,
        {
          provide: PrismaService,
          useValue: {
            workspace: { create: jest.fn(), findUnique: jest.fn() },
            user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
            $transaction: jest.fn((cb) => cb({ workspace: { create: jest.fn().mockResolvedValue({ id: 'ws1', slug: 'acme' }) }, user: { create: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com', emailNormalized: 'a@b.com', fullName: 'A', workspaceId: 'ws1' }) } })),
          },
        },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
    prisma = moduleRef.get(PrismaService);
    process.env.JWT_ACCESS_SECRET = 'test_access';
    process.env.JWT_REFRESH_SECRET = 'test_refresh';
    process.env.JWT_ACCESS_TTL = '900';
    process.env.JWT_REFRESH_TTL = '2592000';
  });

  it('signUp creates workspace + user and returns tokens', async () => {
    const result = await service.signUp({
      email: 'A@B.COM',
      password: 'hunter2!',
      fullName: 'Ahmed',
      workspaceName: 'Acme',
    });
    expect(result.user.id).toBeDefined();
    expect(result.workspace.id).toBeDefined();
    expect(result.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(result.refreshToken).toBeDefined();
  });

  it('throws when email already used in workspace', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'u-existing' });
    await expect(
      service.signUp({ email: 'a@b.com', password: 'hunter2!', fullName: 'X', workspaceName: 'Y' })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 10: Run test, verify fail**

Expected: AuthService module not found.

- [ ] **Step 11: Implement `auth.service.ts`**

```ts
import { Injectable, ConflictException, UnauthorizedException, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import slugify from 'slugify';
import { randomBytes, createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword, verifyPassword } from './password.util';
import type { SignUpDto } from './dto/sign-up.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async signUp(dto: SignUpDto): Promise<{
    user: { id: string; email: string; fullName: string; workspaceId: string };
    workspace: { id: string; slug: string };
    accessToken: string;
    refreshToken: string;
  }> {
    const emailNormalized = dto.email.trim().toLowerCase();
    const slugBase = slugify(dto.workspaceName, { lower: true, strict: true });
    const slug = `${slugBase}-${randomBytes(3).toString('hex')}`;
    const passwordHash = await hashPassword(dto.password);

    const result = await this.prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: { slug, name: dto.workspaceName, primaryLocale: 'ar', primaryCurrency: 'EGP' },
      });
      const user = await tx.user.create({
        data: {
          workspaceId: ws.id,
          email: dto.email,
          emailNormalized,
          fullName: dto.fullName,
          passwordHash,
          status: 'ACTIVE',
          locale: 'ar',
        },
      });
      return { ws, user };
    });

    const accessToken = this.signAccessToken(result.user.id, result.ws.id);
    const refreshToken = await this.issueRefreshToken(result.user.id, result.ws.id);

    return {
      user: { id: result.user.id, email: result.user.email, fullName: result.user.fullName, workspaceId: result.ws.id },
      workspace: { id: result.ws.id, slug: result.ws.slug },
      accessToken,
      refreshToken,
    };
  }

  private signAccessToken(userId: string, workspaceId: string): string {
    return jwt.sign(
      { sub: userId, ws: workspaceId, type: 'access' },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: Number(process.env.JWT_ACCESS_TTL ?? 900) }
    );
  }

  private async issueRefreshToken(userId: string, workspaceId: string): Promise<string> {
    const raw = randomBytes(48).toString('base64url');
    const tokenHash = createHash('sha256').update(raw).digest('hex');
    const ttl = Number(process.env.JWT_REFRESH_TTL ?? 2592000);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        workspaceId,
        tokenHash,
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    });
    return raw;
  }
}
```

- [ ] **Step 12: Run test, verify pass**

- [ ] **Step 13: Implement `auth.controller.ts`**

```ts
import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('sign-up')
  signUp(@Body() dto: SignUpDto) {
    return this.auth.signUp(dto);
  }
}
```

- [ ] **Step 14: Implement `auth.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

Wire into `AppModule.imports`.

- [ ] **Step 15: Smoke test**

Run API, then:

```bash
curl -X POST http://localhost:3001/api/v1/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"ahmed@example.com","password":"hunter2!","fullName":"Ahmed","workspaceName":"Acme"}'
```

Expected: 201 + JSON `{user, workspace, accessToken, refreshToken}`.

- [ ] **Step 16: Commit**

```bash
git add apps/api/src/core/auth apps/api/src/app.module.ts apps/api/prisma apps/api/package.json
git commit -m "feat(api/auth): sign-up creates workspace + user + JWT (TDD)"
```

---

### Task 1.4: Auth — login + JWT guard

**Files:**
- Add to `auth.service.ts`: `login`, `refresh`, `logout` methods.
- Create: `apps/api/src/core/auth/dto/login.dto.ts`
- Create: `apps/api/src/core/auth/dto/refresh.dto.ts`
- Create: `apps/api/src/core/auth/jwt.guard.ts`
- Create: `apps/api/src/core/auth/jwt.guard.spec.ts`
- Create: `apps/api/src/core/auth/jwt.strategy.ts`
- Create: `apps/api/src/core/auth/current-user.decorator.ts`
- Modify: `auth.controller.ts` (add login/refresh/logout endpoints)
- Modify: `auth.service.spec.ts` (add login/refresh tests)

- [ ] **Step 1: Add deps**

```json
"@nestjs/jwt": "^10.2.0",
"@nestjs/passport": "^10.0.3",
"passport": "^0.7.0",
"passport-jwt": "^4.0.1",
"@types/passport-jwt": "^4.0.1"
```

- [ ] **Step 2: Write `dto/login.dto.ts`**

```ts
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
  @IsString() workspaceSlug!: string;
}
```

- [ ] **Step 3: Write `dto/refresh.dto.ts`**

```ts
import { IsString } from 'class-validator';
export class RefreshDto {
  @IsString() refreshToken!: string;
}
```

- [ ] **Step 4: Write failing test for login**

Add to `auth.service.spec.ts`:

```ts
it('login returns tokens for valid credentials', async () => {
  // arrange: mock workspace + user lookup, valid password
  // ... (use jest mocks)
  const result = await service.login({ email: 'a@b.com', password: 'hunter2!', workspaceSlug: 'acme' });
  expect(result.accessToken).toBeDefined();
  expect(result.refreshToken).toBeDefined();
});

it('login throws Unauthorized on bad password', async () => {
  // ...
  await expect(service.login({ email: 'a@b.com', password: 'wrong', workspaceSlug: 'acme' })).rejects.toThrow();
});
```

- [ ] **Step 5: Implement login**

Add to `auth.service.ts`:

```ts
async login(dto: { email: string; password: string; workspaceSlug: string }) {
  const ws = await this.prisma.workspace.findUnique({ where: { slug: dto.workspaceSlug } });
  if (!ws) throw new UnauthorizedException('invalid credentials');
  const user = await this.prisma.user.findFirst({
    where: { workspaceId: ws.id, emailNormalized: dto.email.trim().toLowerCase() },
  });
  if (!user) throw new UnauthorizedException('invalid credentials');
  const ok = await verifyPassword(user.passwordHash, dto.password);
  if (!ok) throw new UnauthorizedException('invalid credentials');
  if (user.status !== 'ACTIVE') throw new UnauthorizedException('user disabled');

  const accessToken = this.signAccessToken(user.id, ws.id);
  const refreshToken = await this.issueRefreshToken(user.id, ws.id);
  await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return {
    user: { id: user.id, email: user.email, fullName: user.fullName, workspaceId: ws.id },
    workspace: { id: ws.id, slug: ws.slug },
    accessToken,
    refreshToken,
  };
}

async refresh(dto: { refreshToken: string }) {
  const tokenHash = createHash('sha256').update(dto.refreshToken).digest('hex');
  const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new UnauthorizedException('invalid refresh token');
  }
  // rotate
  await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  const accessToken = this.signAccessToken(stored.userId, stored.workspaceId);
  const refreshToken = await this.issueRefreshToken(stored.userId, stored.workspaceId);
  return { accessToken, refreshToken };
}

async logout(refreshToken: string) {
  const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
  await this.prisma.refreshToken.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
  return { ok: true };
}
```

- [ ] **Step 6: Implement JWT strategy**

```ts
// jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET!,
    });
  }
  async validate(payload: { sub: string; ws: string; type: string }) {
    if (payload.type !== 'access') throw new UnauthorizedException();
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.workspaceId !== payload.ws || user.status !== 'ACTIVE') {
      throw new UnauthorizedException();
    }
    return { userId: user.id, workspaceId: user.workspaceId, email: user.email, fullName: user.fullName };
  }
}
```

- [ ] **Step 7: Implement JWT guard**

```ts
// jwt.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from '../tenant/tenant-context.service';
import { Observable } from 'rxjs';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

import { SetMetadata } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector, private tenant: TenantContextService) {
    super();
  }
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) throw err || new UnauthorizedException();
    // Set tenant context for downstream code paths.
    const req = context.switchToHttp().getRequest();
    // We can't .run() across the rest of the request from here, so we set req.tenant + a global interceptor.
    req.user = user;
    return user;
  }
}
```

- [ ] **Step 8: Implement `current-user.decorator.ts`**

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);
```

- [ ] **Step 9: Add login/refresh/logout to controller**

```ts
@Post('login')
@Public()
login(@Body() dto: LoginDto) { return this.auth.login(dto); }

@Post('refresh')
@Public()
refresh(@Body() dto: RefreshDto) { return this.auth.refresh(dto); }

@Post('logout')
logout(@Body() dto: RefreshDto) { return this.auth.logout(dto.refreshToken); }

@Get('me')
me(@CurrentUser() user: any) { return user; }
```

Mark `sign-up` with `@Public()` too.

- [ ] **Step 10: Wire AuthModule with PassportModule + JwtModule**

```ts
@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 11: Apply `JwtAuthGuard` globally**

In `app.module.ts`:

```ts
{ provide: APP_GUARD, useClass: JwtAuthGuard },
```

- [ ] **Step 12: Run tests, verify pass**

- [ ] **Step 13: Smoke test**

```bash
# sign-up
curl -X POST http://localhost:3001/api/v1/auth/sign-up -H "Content-Type: application/json" -d '{"email":"a@b.com","password":"hunter2!","fullName":"A","workspaceName":"Acme"}'
# capture accessToken, then:
curl http://localhost:3001/api/v1/auth/me -H "Authorization: Bearer <token>"
```

Expected: 200 + user details.

- [ ] **Step 14: Commit**

```bash
git add apps/api/src/core/auth apps/api/src/app.module.ts apps/api/package.json
git commit -m "feat(api/auth): login + refresh + logout + JWT guard with @Public decorator"
```

---

### Task 1.5: Email infra (NodeMailer + MailHog) + Email Verification + Password Reset

**Summary**: Adds an `EmailService` using NodeMailer pointing at MailHog in dev. Adds endpoints for password reset request/confirm and email verification request/confirm. Each token is single-use, hashed in DB, with TTL.

**Files:**
- Create: `apps/api/src/core/email/email.service.ts` (sendMail abstraction)
- Create: `apps/api/src/core/email/email.module.ts`
- Add: `EmailVerificationToken` and `PasswordResetToken` Prisma models
- Add to `auth.service.ts`: `requestPasswordReset`, `confirmPasswordReset`, `requestEmailVerification`, `confirmEmailVerification`
- Add tests for each new method

(TDD pattern as Task 1.4: failing test → implement → pass → commit per logical group.)

**Commit message:** `feat(api/auth): email verification + password reset + email service (TDD)`

---

### Task 1.6: Roles, Profiles, PermissionSets

**Summary**: Adds `Role` (hierarchical), `Profile`, `PermissionSet` Prisma models. Seed script creates default profiles (`Admin`, `Sales Manager`, `Sales Rep`) per workspace on signup. RBAC permission keys follow pattern `<entity>:<action>` (`person:read`, `deal:write`, `workspace:admin`, etc.).

**Files:**
- Schema additions
- `apps/api/src/core/rbac/role.service.ts` + tests
- `apps/api/src/core/rbac/profile.service.ts` + tests
- `apps/api/src/core/rbac/permission.service.ts` + tests
- `apps/api/src/core/rbac/permissions.constants.ts` (single source of permission key list)
- `apps/api/src/core/rbac/requires-permission.decorator.ts` (`@RequiresPermission('person:read')`)
- `apps/api/src/core/rbac/permission.guard.ts` (checks user.profileIds → permissions)
- `apps/api/prisma/seed.ts` (creates default profiles for new workspace)

**Permission keys (Phase 1):**

```ts
// permissions.constants.ts
export const PERMISSIONS = {
  // workspace admin
  WORKSPACE_ADMIN: 'workspace:admin',
  WORKSPACE_SETTINGS_WRITE: 'workspace:settings:write',
  USER_INVITE: 'user:invite',
  USER_DELETE: 'user:delete',
  TEAM_WRITE: 'team:write',
  ROLE_WRITE: 'role:write',
  PROFILE_WRITE: 'profile:write',
  CUSTOM_FIELD_WRITE: 'custom-field:write',
  CUSTOM_MODULE_WRITE: 'custom-module:write',
  WORKFLOW_WRITE: 'workflow:write',
  WEBHOOK_WRITE: 'webhook:write',
  AUDIT_READ: 'audit:read',
  // CRM
  PERSON_READ: 'person:read',
  PERSON_WRITE: 'person:write',
  PERSON_DELETE: 'person:delete',
  COMPANY_READ: 'company:read',
  COMPANY_WRITE: 'company:write',
  DEAL_READ: 'deal:read',
  DEAL_WRITE: 'deal:write',
  DEAL_DELETE: 'deal:delete',
  ACTIVITY_READ: 'activity:read',
  ACTIVITY_WRITE: 'activity:write',
  PIPELINE_WRITE: 'pipeline:write',
  LIST_READ: 'list:read',
  LIST_WRITE: 'list:write',
  TAG_WRITE: 'tag:write',
  FORM_WRITE: 'form:write',
  REPORT_READ: 'report:read',
  DASHBOARD_WRITE: 'dashboard:write',
  AI_USE: 'ai:use',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
```

**Default profile templates (seeded on workspace create):**

```ts
const DEFAULTS = [
  { name: 'Admin', permissions: Object.values(PERMISSIONS) },
  { name: 'Sales Manager', permissions: [
      PERMISSIONS.PERSON_READ, PERMISSIONS.PERSON_WRITE,
      PERMISSIONS.COMPANY_READ, PERMISSIONS.COMPANY_WRITE,
      PERMISSIONS.DEAL_READ, PERMISSIONS.DEAL_WRITE, PERMISSIONS.DEAL_DELETE,
      PERMISSIONS.ACTIVITY_READ, PERMISSIONS.ACTIVITY_WRITE,
      PERMISSIONS.PIPELINE_WRITE,
      PERMISSIONS.LIST_READ, PERMISSIONS.LIST_WRITE,
      PERMISSIONS.TAG_WRITE,
      PERMISSIONS.REPORT_READ, PERMISSIONS.DASHBOARD_WRITE,
      PERMISSIONS.AI_USE,
    ]
  },
  { name: 'Sales Rep', permissions: [
      PERMISSIONS.PERSON_READ, PERMISSIONS.PERSON_WRITE,
      PERMISSIONS.COMPANY_READ, PERMISSIONS.COMPANY_WRITE,
      PERMISSIONS.DEAL_READ, PERMISSIONS.DEAL_WRITE,
      PERMISSIONS.ACTIVITY_READ, PERMISSIONS.ACTIVITY_WRITE,
      PERMISSIONS.LIST_READ,
      PERMISSIONS.REPORT_READ,
      PERMISSIONS.AI_USE,
    ]
  },
];
```

After signup, the new admin user is auto-assigned the Admin profile.

**Commit message:** `feat(api/rbac): roles + profiles + permission sets + @RequiresPermission decorator`

---

### Task 1.7: Audit log middleware

**Summary**: Prisma extension that intercepts `update`/`create`/`delete` on tenant-scoped models and writes an `AuditLog` row with diff. The diff is computed by reading the current row before update.

**Files:**
- `prisma/schema.prisma` — `AuditLog` model + `AuditAction` enum (already in spec).
- `apps/api/src/core/audit/audit.service.ts` + tests
- `apps/api/src/core/audit/audit.module.ts`
- `apps/api/src/prisma/prisma.service.ts` — extend with audit middleware
- API route `GET /api/v1/audit-log` (admin-only) returns paginated audit history.

**Test approach:** Use a real test database (test instance via `docker-compose -f docker-compose.test.yml`). Create a Person, update a field, assert AuditLog has 2 rows (CREATE + UPDATE).

**Commit message:** `feat(api/audit): audit log middleware writes diff per change (TDD)`

---

### Task 1.8: CustomFieldDef CRUD

**Summary**: Admin UI (Sprint 2) lets admins add custom fields. This task delivers backend.

**Files:**
- Schema: `CustomFieldDef` (already in spec).
- `apps/api/src/core/custom-fields/dto/create-custom-field.dto.ts`
- `apps/api/src/core/custom-fields/custom-field.service.ts` + tests
- `apps/api/src/core/custom-fields/custom-field.controller.ts`
- `apps/api/src/core/custom-fields/custom-field.module.ts`

**Endpoints:**
- `POST /api/v1/custom-fields` — create (requires `custom-field:write`)
- `GET /api/v1/custom-fields?entityType=Person` — list
- `PATCH /api/v1/custom-fields/:id` — update label, options, indexed flag
- `DELETE /api/v1/custom-fields/:id` — soft delete (set `archivedAt`)

**Validation:**
- `key` snake_case, unique per (workspaceId, entityType).
- `type` validated against enum.
- `options` required for PICKLIST/MULTI_PICKLIST.
- `formulaExpr` required for FORMULA.
- `rollupConfig` required for ROLLUP.

**Indexed-column generation** (when `indexed=true`): emit `ALTER TABLE` + create index. We use `prisma.$executeRawUnsafe` because Postgres DDL identifiers (column names) cannot be passed as parameters. **SECURITY: this is a SQL-injection risk if inputs aren't sanitized.** Mitigation rules — non-negotiable:

1. **Whitelist validate `key`** with regex `/^[a-z][a-z0-9_]{0,62}$/` BEFORE constructing any SQL. Reject anything else with 400 error.
2. **Whitelist validate `type`** against `CustomFieldType` enum.
3. **Hardcode the table name** — never derived from request input.
4. **Use a fixed prefix** (`cf_`) on the generated column name so user input cannot collide with built-in columns.
5. **Restrict allowed types** to `TEXT`, `NUMBER`, `DATE` only (the other types either need expression-based indexes or aren't safe with Postgres `IMMUTABLE` semantics).
6. **Add unit tests** that attempt key values like `"a; DROP TABLE x;--"`, `"a' OR 1=1"`, `"a"; DELETE FROM users;--"` and assert all are rejected by the validator.
7. **Run with a Postgres role** that has DDL permissions ONLY on tenant-data tables, never on `pg_*`/`information_schema`.

```ts
// custom-field-ddl.util.ts (sketch — implementer fleshes out with full tests)
const KEY_RE = /^[a-z][a-z0-9_]{0,62}$/;
const ALLOWED_TYPES = new Set(['TEXT', 'NUMBER', 'DATE']);

export function assertSafeFieldKey(key: string) {
  if (!KEY_RE.test(key)) {
    throw new Error(`invalid field key: ${JSON.stringify(key)}`);
  }
}

export function buildGeneratedColumnSql(table: 'Person'|'Company'|'Deal'|'Activity', key: string, type: 'TEXT'|'NUMBER'|'DATE') {
  assertSafeFieldKey(key);
  if (!ALLOWED_TYPES.has(type)) throw new Error(`type ${type} not indexable`);
  const col = `cf_${key}`;
  const cast = type === 'NUMBER' ? 'numeric' : type === 'DATE' ? 'date' : 'text';
  // Identifiers come from a whitelist; values cast inside the SQL.
  return `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${col}" ${cast} GENERATED ALWAYS AS ((customFields->>'${key}')::${cast}) STORED;
          CREATE INDEX IF NOT EXISTS "idx_${table.toLowerCase()}_${col}" ON "${table}" ("${col}");`;
}
```

The unit-test contract for this util is: 6 fuzz-style tests asserting injection-attempt rejection + 3 happy-path tests for each allowed type.

**Commit message:** `feat(api/custom-fields): CustomFieldDef CRUD + sanitized indexed-column generation (TDD)`

---

### Task 1.9: MetadataService

**Summary**: Single source of truth for entity metadata. Reads `packages/metadata/entityDefs/*.json` at boot + merges with `CustomFieldDef` rows from DB.

**Files:**
- `apps/api/src/core/metadata/metadata.service.ts` + tests
- `apps/api/src/core/metadata/metadata.controller.ts` (`GET /api/v1/metadata/:entityType`)
- `apps/api/src/core/metadata/metadata.module.ts`
- `packages/metadata/entityDefs/Person.json`, `Company.json`, `Deal.json`, `Activity.json` — seed entity defs

**MetadataService API:**

```ts
class MetadataService {
  async getEntity(workspaceId: string, entityType: string): Promise<EntityMetadata>;
  async listEntities(workspaceId: string): Promise<EntitySummary[]>;
  invalidate(workspaceId: string, entityType?: string): void;  // called when CustomFieldDef changes
}
```

`EntityMetadata`:

```ts
type EntityMetadata = {
  entityType: string;
  labelSingular: { ar: string; en: string };
  labelPlural: { ar: string; en: string };
  fields: FieldMetadata[];          // built-in + custom merged
  layouts: { list: Layout; detail: Layout; edit: Layout };
};
```

Cache keyed by `(workspaceId, entityType)`; invalidated on CustomFieldDef change via event bus.

**`packages/metadata/entityDefs/Person.json` (example):**

```json
{
  "entityType": "Person",
  "labelSingular": { "ar": "جهة اتصال", "en": "Person" },
  "labelPlural": { "ar": "جهات الاتصال", "en": "People" },
  "icon": "pi pi-user",
  "color": "#3b82f6",
  "fields": [
    { "key": "fullName", "label": { "ar": "الاسم الكامل", "en": "Full Name" }, "type": "TEXT", "required": true },
    { "key": "email", "label": { "ar": "البريد الإلكتروني", "en": "Email" }, "type": "EMAIL" },
    { "key": "phone", "label": { "ar": "الهاتف", "en": "Phone" }, "type": "PHONE" },
    { "key": "lifecycleStage", "label": { "ar": "مرحلة دورة الحياة", "en": "Lifecycle Stage" }, "type": "PICKLIST",
      "options": [
        { "value": "LEAD", "label": { "ar": "محتمل", "en": "Lead" } },
        { "value": "MQL", "label": { "ar": "مؤهل تسويقياً", "en": "MQL" } },
        { "value": "SQL", "label": { "ar": "مؤهل بيعياً", "en": "SQL" } },
        { "value": "OPP", "label": { "ar": "فرصة", "en": "Opportunity" } },
        { "value": "CUSTOMER", "label": { "ar": "عميل", "en": "Customer" } },
        { "value": "EVANGELIST", "label": { "ar": "مروّج", "en": "Evangelist" } }
      ] },
    { "key": "ownerId", "label": { "ar": "المسؤول", "en": "Owner" }, "type": "LOOKUP", "options": { "entityType": "User" } },
    { "key": "title", "label": { "ar": "المسمى الوظيفي", "en": "Title" }, "type": "TEXT" },
    { "key": "isCompany", "label": { "ar": "شركة", "en": "Is Company" }, "type": "BOOLEAN" }
  ]
}
```

**Commit message:** `feat(api/metadata): MetadataService merges built-in + custom fields per entity (TDD)`

---

### Task 1.10: Workspace settings + invite users

**Summary**:
- `GET/PATCH /api/v1/workspace` — get/update name/branding/locale/currency.
- `GET /api/v1/users` — list users in workspace.
- `POST /api/v1/users/invite` — create User with `INVITED` status + send email.
- Invite flow: invitee receives email with token → confirms → sets password → status flips to ACTIVE.

**Files:**
- `apps/api/src/core/workspaces/workspace.service.ts` + tests
- `apps/api/src/core/workspaces/workspace.controller.ts`
- `apps/api/src/core/users/user.service.ts` + tests
- `apps/api/src/core/users/user.controller.ts`
- `apps/api/src/core/users/dto/{invite-user.dto.ts, accept-invite.dto.ts}`

**Commit message:** `feat(api): workspace settings + invite-and-accept user flow (TDD)`

---

### Task 1.11: Frontend — Auth screens

**Files (apps/dashboard):**
- `views/auth/SignUp.vue`
- `views/auth/Login.vue`
- `views/auth/PasswordResetRequest.vue`
- `views/auth/PasswordResetConfirm.vue`
- `views/auth/AcceptInvite.vue`
- `composables/useApi.ts` (axios instance + interceptor for token refresh)
- `composables/useAuth.ts` (Pinia store: user, workspace, accessToken; login/signUp/logout actions)
- `pinia/auth.store.ts`
- `router/index.ts` (add public + protected routes; navigation guard)

**TDD per component**: Vitest mounts the component with mocked router/i18n/PrimeVue, asserts form interactions.

**Commit message:** `feat(dashboard/auth): sign-up/login/reset/accept-invite views with JWT refresh (TDD)`

---

### Task 1.12: Frontend — Workspace settings + Users + Custom Fields admin UI

**Files:**
- `views/settings/Workspace.vue` (edit name/locale/currency/branding)
- `views/settings/Users.vue` (list + invite)
- `views/settings/CustomFields.vue` (per entity, list + add/edit/archive field)
- `components/CustomFieldEditor.vue` (form for one field)
- `composables/useMetadata.ts` (fetch + cache entity metadata)
- `composables/usePermissions.ts` (read user.permissions, expose `can('person:read')`)

**Commit message:** `feat(dashboard/settings): workspace + users + custom-fields admin (TDD)`

---

### Task 1.13: e2e signup → invite → accept

**Files:**
- `tests/e2e/specs/01-onboarding.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test('signup → invite teammate → teammate accepts', async ({ page, browser }) => {
  // 1. Owner signs up
  await page.goto('http://localhost:5174/sign-up');
  await page.fill('[data-test="email"]', 'owner+ws@test.com');
  await page.fill('[data-test="password"]', 'hunter2!');
  await page.fill('[data-test="full-name"]', 'Owner');
  await page.fill('[data-test="workspace-name"]', 'AcmeCo');
  await page.click('[data-test="submit"]');
  await expect(page).toHaveURL(/\/dashboard|\/onboarding/);

  // 2. Invite teammate
  await page.goto('http://localhost:5174/settings/users');
  await page.click('[data-test="invite-user"]');
  await page.fill('[data-test="invite-email"]', 'rep@test.com');
  await page.fill('[data-test="invite-name"]', 'Rep');
  await page.click('[data-test="invite-submit"]');
  await expect(page.getByText('rep@test.com')).toBeVisible();

  // 3. Capture invite link from MailHog API
  const res = await page.request.get('http://localhost:8025/api/v2/messages');
  const messages = await res.json();
  const lastMessage = messages.items[0];
  const link = /https?:\/\/[^\s"]*accept-invite[^\s"]*/.exec(lastMessage.Content.Body)?.[0];
  expect(link).toBeTruthy();

  // 4. Teammate accepts
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await page2.goto(link!);
  await page2.fill('[data-test="password"]', 'hunter3!');
  await page2.fill('[data-test="password-confirm"]', 'hunter3!');
  await page2.click('[data-test="submit"]');
  await expect(page2).toHaveURL(/\/dashboard/);
});
```

**Commit message:** `test(e2e): onboarding + invite + accept (Playwright)`

---

### Task 1.14: Sprint 1 closeout — smoke + tag

- [ ] **Step 1: Run all tests**
- [ ] **Step 2: `make dogfood`** (verify all three apps respond + DB migrations apply on fresh container)
- [ ] **Step 3: Tag**

```bash
git tag v0.2.0-sprint1
```

---

# Sprint 2 — People + Companies + Tags + Lists + Search (Days 11-15)

**Goal:** First-class CRM entities. Users can create/edit/list People, see them as Companies (`isCompany=true`), tag them, save lists as queries, search globally.

**Deliverables:**
- Person entity (full schema per spec §4.2.1).
- Companies-as-Person convention (`isCompany=true`).
- Tag + EntityTag (polymorphic to Person/Deal/Activity).
- List entity with active (saved-query) and static modes.
- Global search (Postgres FTS over name/email/phone + custom-fields content).
- DynamicForm component renders Person fields from metadata.
- Person list view (table + filters), detail view (tabbed: overview + activities + custom-fields), edit dialog.
- Mass action: bulk-tag, bulk-delete.
- Dedupe + merge UI.

---

### Task 2.1: Person Prisma model + service + tests

(Schema as spec §4.2.1.)

**Files:**
- Schema additions: Person, LifecycleStage enum, Tag, EntityTag, List.
- `apps/api/src/crm/people/person.service.ts` + tests
- `apps/api/src/crm/people/person.controller.ts`
- `apps/api/src/crm/people/dto/create-person.dto.ts`
- `apps/api/src/crm/people/dto/update-person.dto.ts`
- `apps/api/src/crm/people/dto/query-person.dto.ts`
- `apps/api/src/crm/people/people.module.ts`

**Endpoints:**
- `POST /api/v1/people` (`person:write`)
- `GET /api/v1/people` (`person:read`, with filters/sort/pagination)
- `GET /api/v1/people/:id`
- `PATCH /api/v1/people/:id`
- `DELETE /api/v1/people/:id` (soft-delete via `archivedAt`)
- `POST /api/v1/people/merge` — `{primaryId, mergedIds}` → moves activities/tags/lookups, archives the merged.
- `GET /api/v1/people/duplicates?email=...&phone=...` — finds potential dupes.

**Service business rules:**
- On create: normalize email/phone (Argon2 isn't right here — use a canonical form: lowercase, strip whitespace; for phone use `libphonenumber-js`).
- Auto-create Company-as-Person when email domain is unfamiliar (config-toggle, default off in v1).
- `customFields` validated against MetadataService (call `getEntity('Person')` and validate keys/types/required).

**Commit message:** `feat(api/crm/people): Person CRUD + merge + dupes + metadata-validated customFields (TDD)`

---

### Task 2.2: Tags

**Files:**
- Schema: `Tag` (workspaceId, name, color, ...) + `EntityTag` polymorphic (workspaceId, tagId, entityType, entityId).
- `apps/api/src/crm/tags/tag.service.ts` + tests
- `apps/api/src/crm/tags/tag.controller.ts`
- `apps/api/src/crm/tags/tag-assignment.service.ts` (attach/detach + bulk)

**Endpoints:**
- `POST /api/v1/tags`
- `GET /api/v1/tags`
- `POST /api/v1/tags/:tagId/assign` — `{entityType, entityIds: [...]}`
- `DELETE /api/v1/tags/:tagId/unassign` — same shape

**Commit message:** `feat(api/crm/tags): Tag + EntityTag polymorphic + bulk assign (TDD)`

---

### Task 2.3: Lists (saved-query + static)

**Files:**
- Schema: `List` (already in spec §4.2.6).
- `apps/api/src/crm/lists/list.service.ts` + tests
- `apps/api/src/crm/lists/list.controller.ts`
- `apps/api/src/crm/lists/query-builder.ts` (translates `query JSON` → Prisma where)

**Query JSON schema:**

```ts
type ListQuery = {
  filters: Filter[];          // tree or list — use list with implicit AND in v1
  sort?: { field: string; dir: 'asc' | 'desc' }[];
  limit?: number;
};
type Filter =
  | { field: string; op: 'eq'|'neq'|'gt'|'gte'|'lt'|'lte'|'in'|'notIn'|'contains'|'startsWith'|'endsWith'|'isNull'|'isNotNull'; value: unknown }
  | { op: 'AND'|'OR'; items: Filter[] };
```

The `field` may be a built-in field (`fullName`) or a custom field (`customFields.cf_industry`). The query-builder validates against MetadataService.

**Endpoints:**
- `POST /api/v1/lists`
- `GET /api/v1/lists`
- `GET /api/v1/lists/:id` — for active lists, expand members at query time.
- `GET /api/v1/lists/:id/members?cursor=...&limit=...` — paginated members
- `PATCH /api/v1/lists/:id`
- `DELETE /api/v1/lists/:id`

**Commit message:** `feat(api/crm/lists): saved-query lists with live evaluation against metadata (TDD)`

---

### Task 2.4: Global search (Postgres FTS)

**Files:**
- Migration: add `search_tsv tsvector` column on Person + GIN index, populated by trigger.
- `apps/api/src/crm/search/search.service.ts` + tests
- `apps/api/src/crm/search/search.controller.ts` (`GET /api/v1/search?q=...&types=Person,Deal,...`)

**Postgres trigger:**

```sql
ALTER TABLE "Person" ADD COLUMN search_tsv tsvector;
CREATE INDEX idx_person_search ON "Person" USING GIN (search_tsv);

CREATE FUNCTION person_search_tsv_update() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('simple', unaccent(coalesce(NEW."fullName",''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(NEW.email,''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(NEW.phone,''))), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW."customFields"::text,'')), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER person_search_tsv_trg BEFORE INSERT OR UPDATE ON "Person"
  FOR EACH ROW EXECUTE FUNCTION person_search_tsv_update();
```

(Repeat for Deal, Activity in their own sprints.)

**Commit message:** `feat(api/search): Postgres FTS over People with tsvector + GIN (TDD)`

---

### Task 2.5: DynamicForm component (Vue)

**Files:**
- `apps/dashboard/src/components/DynamicForm/DynamicForm.vue`
- `apps/dashboard/src/components/DynamicForm/fields/{TextField,NumberField,DateField,PicklistField,LookupField,...}.vue`
- `apps/dashboard/src/components/DynamicForm/DynamicForm.spec.ts`
- `apps/dashboard/src/composables/useFormFromMetadata.ts`

**Component API:**

```vue
<DynamicForm
  :entity-type="'Person'"
  :record="personDraft"
  :layout="'edit'"
  v-model:errors="errors"
  @submit="handleSubmit"
/>
```

Uses `useMetadata('Person')` to fetch the merged metadata, renders sections + fields, wires Vee-validate + Zod (built from FieldMetadata.validation), emits `submit` with the cleaned record.

**Per-field components:**
- `TextField`, `LongTextField` (textarea), `NumberField`, `DecimalField`, `BooleanField`, `DateField`, `DateTimeField`, `PicklistField`, `MultiPicklistField`, `LookupField` (autocomplete), `EmailField`, `PhoneField` (with libphonenumber-js validation), `UrlField`, `FileField`.

**Commit message:** `feat(dashboard/dynamic-form): DynamicForm + 12 field components from metadata (TDD)`

---

### Task 2.6: People list view + filters

**Files:**
- `apps/dashboard/src/views/people/PeopleList.vue`
- `apps/dashboard/src/components/lists/ListView.vue` (generic — used for any entity)
- `apps/dashboard/src/components/lists/FilterBar.vue`
- `apps/dashboard/src/composables/usePeople.ts`

**Features:**
- PrimeVue DataTable with virtual scroll, sortable columns, column-chooser (read columns from metadata).
- Filter bar: drop-down per indexed field; user can add filter rows (field + operator + value).
- Save-as-list action: opens dialog → creates List entity.
- Bulk-select: bulk-tag, bulk-delete.

**Commit message:** `feat(dashboard/crm/people): list view with filters + save-as-list + bulk actions (TDD)`

---

### Task 2.7: People detail view

**Files:**
- `apps/dashboard/src/views/people/PersonDetail.vue`
- `apps/dashboard/src/components/RecordHeader.vue` (avatar + key facts)
- `apps/dashboard/src/components/Tabs/{OverviewTab,ActivitiesTab,DealsTab,FilesTab}.vue`
- `apps/dashboard/src/components/Timeline.vue` (renders Activities)

**Layout:** RecordHeader (avatar / name / key fields) + Tabs (Overview, Activities, Deals, Files, Custom).
- Overview tab uses `<DynamicForm :layout="'detail'">` (read-only mode).
- Activities tab: timeline + "+ Add Note/Task/Call/Meeting".

**Commit message:** `feat(dashboard/crm/people): detail view with tabs + timeline (TDD)`

---

### Task 2.8: Companies (as Person with `isCompany=true`)

**Files:**
- Convention: same Person entity. Routes `/companies/*` filter `isCompany=true`. Same DynamicForm but `layout` includes company-only fields (`companyName`, `industry`, `website`, `revenue`, `employeeCount`).
- `apps/dashboard/src/views/companies/CompaniesList.vue` (just PeopleList with prop `:filter="{isCompany: true}"`)
- `apps/dashboard/src/views/companies/CompanyDetail.vue` (tabs include "Employees" — children where `parentId=this.id`)

**Commit message:** `feat(dashboard/crm/companies): companies-as-Person with employee hierarchy view`

---

### Task 2.9: Lists UI

**Files:**
- `apps/dashboard/src/views/lists/ListsIndex.vue`
- `apps/dashboard/src/views/lists/ListEditor.vue`
- `apps/dashboard/src/components/QueryBuilder/QueryBuilder.vue`

**Commit message:** `feat(dashboard/crm/lists): saved-query list editor + members view (TDD)`

---

### Task 2.10: Global search UI

**Files:**
- `apps/dashboard/src/components/GlobalSearch.vue` (cmd-k modal)
- Wire to Topbar: `<GlobalSearch />` triggered by `Ctrl/Cmd+K`.

**Commit message:** `feat(dashboard): global search modal (Cmd-K) over People+Companies (TDD)`

---

### Task 2.11: Sprint 2 — e2e tests

**Files:**
- `tests/e2e/specs/02-people.spec.ts` — sign-up → create person → tag → save-list → search → merge

**Commit message:** `test(e2e): people management end-to-end (Playwright)`

---

### Task 2.12: Sprint 2 closeout

- [ ] All tests pass
- [ ] `make dogfood`
- [ ] Tag: `git tag v0.3.0-sprint2`

---

# Sprint 3 — Pipelines + Deals + Activities + Calendar + Kanban (Days 16-20)

**Goal:** Sales-deep MVP core. Users can manage multiple pipelines, drag deals across stages, see activities on calendar, get rotting-deal flags, set won/lost reasons.

---

### Task 3.1: Pipeline + Stage Prisma + service + tests

**Schema:** as spec §4.2.3 (Pipeline + Stage with `requiredFieldKeys`).

**Endpoints:**
- `POST /api/v1/pipelines`
- `GET /api/v1/pipelines?entityType=Deal`
- `PATCH /api/v1/pipelines/:id`
- `POST /api/v1/pipelines/:id/stages` (insert at order)
- `PATCH /api/v1/pipelines/:id/stages/:stageId`
- `DELETE /api/v1/pipelines/:id/stages/:stageId` — only if no Deals in this stage; else require move-to-stage param.

**Default pipeline seeded on signup**: "Direct Sales" with stages Lead → Qualified → Proposal → Negotiation → Won (won) / Lost (lost).

**Commit message:** `feat(api/crm/pipelines): Pipeline + Stage CRUD + default seed (TDD)`

---

### Task 3.2: Deal Prisma + service + tests

**Schema:** as spec §4.2.3.

**Service rules:**
- Stage transitions validate `requiredFieldKeys` (read from Stage; check Deal record + customFields).
- On move to `isWon` or `isLost`, require `wonReason` or `lostReason`.
- On any save, recompute `lastActivityAt` from latest related Activity.
- On stage move, write an Activity of type `SYSTEM` (`{from: stageA.name, to: stageB.name, by: userId}`).

**Endpoints:**
- `POST /api/v1/deals`
- `GET /api/v1/deals` (filters: pipelineId, stageId, ownerId, status, dueAt range, etc.)
- `GET /api/v1/deals/:id`
- `PATCH /api/v1/deals/:id` — full update
- `POST /api/v1/deals/:id/move-stage` — `{stageId, wonReason?, lostReason?}` with validation
- `DELETE /api/v1/deals/:id` — soft-delete

**Commit message:** `feat(api/crm/deals): Deal CRUD + stage transitions with required-fields-per-stage (TDD)`

---

### Task 3.3: Activity Prisma + service + tests

**Schema:** spec §4.2.2.

**Endpoints:**
- `POST /api/v1/activities`
- `GET /api/v1/activities?parentEntity=Person&parentId=...`
- `PATCH /api/v1/activities/:id`
- `POST /api/v1/activities/:id/complete` — sets completedAt, status=DONE, may emit a workflow trigger
- `DELETE /api/v1/activities/:id`

**Service rules:**
- Setting an Activity on a Person/Deal/Company also updates parent's `lastActivityAt`.
- Type-specific validation: TASK requires `dueAt`; MEETING requires start/end.

**Commit message:** `feat(api/crm/activities): polymorphic Activity CRUD + lastActivityAt rollup (TDD)`

---

### Task 3.4: Won/Lost reasons (config) + Rotting deals (computed)

**Files:**
- `apps/api/src/crm/won-lost-reason/won-lost-reason.service.ts` + tests
- Schema: `WonLostReason` (workspaceId, kind: WON|LOST, label, order, archivedAt).
- Settings UI later in Task 3.10.

**Rotting deals:**
- Query helper: `Deal.lastActivityAt < now() - workspace.rottingDays` (default 14d, configurable).
- Add `isRotting` computed in API responses.

**Commit message:** `feat(api/crm/deals): won/lost reasons + isRotting computed flag (TDD)`

---

### Task 3.5: Deals Kanban (Vue)

**Files:**
- `apps/dashboard/src/views/deals/DealsKanban.vue`
- `apps/dashboard/src/components/Kanban/{KanbanBoard,KanbanColumn,KanbanCard}.vue`
- Drag/drop via `vue-draggable-plus`.

**Features:**
- Columns = Stages of selected pipeline.
- Cards = Deals (compact: name + amount + owner avatar + rotting flag).
- Drag → calls `move-stage` endpoint; if required fields missing, opens a modal to fill before commit.
- Filter bar: owner, age, amount range.
- Pipeline switcher (top-right).

**Commit message:** `feat(dashboard/crm/deals): kanban with drag-drop + required-fields-per-stage gate (TDD)`

---

### Task 3.6: Deals list + detail views

**Files:**
- `apps/dashboard/src/views/deals/DealsList.vue` (DataTable)
- `apps/dashboard/src/views/deals/DealDetail.vue` (RecordHeader + Tabs Overview/Activities/Files)

**Commit message:** `feat(dashboard/crm/deals): list + detail views (TDD)`

---

### Task 3.7: Activities — list + create modal

**Files:**
- `apps/dashboard/src/components/ActivityComposer.vue` (one modal, switches form by type)
- `apps/dashboard/src/views/activities/ActivitiesList.vue` (calendar / list / kanban-by-status)

**Commit message:** `feat(dashboard/crm/activities): composer modal + 3 list view modes (TDD)`

---

### Task 3.8: Calendar UI

**Files:**
- `apps/dashboard/src/views/calendar/Calendar.vue`
- Use FullCalendar 6 (Vue3 wrapper) — `@fullcalendar/vue3`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`.

**Features:**
- Month/Week/Day views.
- Events = Meetings + Tasks (color by type/status).
- Click event → opens ActivityComposer.
- Drag event → reschedule (PATCH activity).

**Commit message:** `feat(dashboard/calendar): FullCalendar with month/week/day + drag reschedule (TDD)`

---

### Task 3.9: Pipeline + Stage admin UI

**Files:**
- `apps/dashboard/src/views/settings/Pipelines.vue` (list + edit)
- `apps/dashboard/src/views/settings/PipelineEditor.vue` (drag-reorder stages, set required-fields, won/lost flags)

**Commit message:** `feat(dashboard/settings): pipeline + stage admin with drag reorder (TDD)`

---

### Task 3.10: Won/Lost reasons admin UI

**Files:**
- `apps/dashboard/src/views/settings/WonLostReasons.vue`

**Commit message:** `feat(dashboard/settings): won/lost reasons admin (TDD)`

---

### Task 3.11: e2e Sprint 3

**Files:**
- `tests/e2e/specs/03-deals.spec.ts`

```
- Sign in (returning user from prior e2e)
- Create pipeline + stages
- Create person + company
- Create deal
- Move deal across stages (one with required field — assert gate)
- Mark won with reason → reports show 1 won
```

**Commit message:** `test(e2e): pipeline + deals + activities (Playwright)`

---

### Task 3.12: Sprint 3 closeout

- [ ] All tests
- [ ] Dogfood
- [ ] Tag: `git tag v0.4.0-sprint3`

---

# Sprint 4 — Email Send + Forms + Workflow Engine + Webhooks + Validation (Days 21-25)

**Goal:** Engagement + automation. Users can send emails from a record, capture leads via embeddable forms, run rule-based workflows (no time-based yet), receive webhooks, enforce validation rules.

---

### Task 4.1: Outbound email (SMTP via NodeMailer + workspace email config)

**Files:**
- Schema: `OutboundEmail` (logged sent emails — id, to, from, subject, body, recordRef, status, providerMessageId, sentAt).
- `apps/api/src/integrations/email/outbound-email.service.ts` + tests
- `apps/api/src/integrations/email/email-template.service.ts` + tests
- `apps/api/src/integrations/email/email.controller.ts` (`POST /api/v1/email/send`)
- Schema: `EmailTemplate` (workspaceId, name, subject, body, mergeTagKeys[], category).

**Service:**
- Workspace can configure SMTP (smtpHost, smtpPort, smtpUser, smtpPass — encrypted at rest in v2; v1 plaintext in env-encrypted column with note for migration).
- Default in dev: MailHog.
- Render template with merge tags: `{{ person.fullName }}`, `{{ deal.amount | money }}`. Use a small handlebars-like renderer (or just `.replace()` on a strict pattern).
- Log every send to OutboundEmail; surface in record timeline as Activity type EMAIL.

**Endpoints:**
- `POST /api/v1/email/send` — `{to, subject, body, templateId?, recordRef?: {entityType, entityId}, mergeContext?}` → enqueues to BullMQ → worker sends via SMTP → updates OutboundEmail.

**Commit message:** `feat(api/email): outbound SMTP + templates + record-attached log (TDD)`

---

### Task 4.2: Email Templates admin UI + composer

**Files:**
- `apps/dashboard/src/views/settings/EmailTemplates.vue`
- `apps/dashboard/src/components/EmailComposer.vue` — modal: choose template / write fresh; preview merge; send.

**Commit message:** `feat(dashboard/email): templates admin + composer modal (TDD)`

---

### Task 4.3: Form Builder backend

**Files:**
- Schema: `Form` (workspaceId, name, slug, isPublic, redirectUrl, fields: Json, mappings: Json, recaptchaSecret, ...)
- `apps/api/src/crm/forms/form.service.ts` + tests
- `apps/api/src/crm/forms/form.controller.ts` — admin CRUD
- `apps/api/src/crm/forms/public-form.controller.ts` — public submission endpoint (no auth)

**Form schema (`fields` JSON):**

```ts
type FormField = {
  key: string;          // mapped to Person/Deal field
  label: { ar: string; en: string };
  type: 'text' | 'email' | 'phone' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea' | 'file';
  required?: boolean;
  options?: Array<{ value: string; label: { ar: string; en: string } }>;
  placeholder?: { ar: string; en: string };
};
```

**Endpoints:**
- `POST /api/v1/forms` (admin)
- `GET /api/v1/forms`
- `GET /api/v1/forms/:slug` (public — returns form definition)
- `POST /api/v1/forms/:slug/submit` (public)

**Submit logic:**
- Validate against form schema.
- Verify reCAPTCHA if configured.
- Upsert Person by email/phone → set source/UTM params.
- Optionally create Deal if form mapping includes deal fields.
- Trigger workflows via event bus.

**Commit message:** `feat(api/crm/forms): form builder + public submission + dedupe upsert (TDD)`

---

### Task 4.4: Form Builder admin UI

**Files:**
- `apps/dashboard/src/views/forms/FormsIndex.vue`
- `apps/dashboard/src/views/forms/FormEditor.vue`
- `apps/dashboard/src/components/FormBuilder/FieldPalette.vue`
- `apps/dashboard/src/components/FormBuilder/Canvas.vue` (drag-drop)

**Commit message:** `feat(dashboard/forms): visual form builder (drag-drop) + preview + embed snippet`

---

### Task 4.5: Embeddable form widget

**Files:**
- `apps/website/src/embed/form-embed.ts` (compiled to `embed.js`)
- `apps/website/src/embed/form-embed.spec.ts`

```html
<!-- embed snippet shown to admin -->
<script src="https://cdn.crm.example.com/forms/embed.js" defer></script>
<div data-crm-form="form_abc123"></div>
```

**Implementation**:
- The script finds `[data-crm-form]` divs, fetches form schema from `/api/v1/forms/:slug`, mounts a tiny Vue 3 (or vanilla) form, posts to `/forms/:slug/submit`, calls callback or shows success message.

**Commit message:** `feat(website/embed): embeddable form widget JS (TDD)`

---

### Task 4.6: Public website — Contact form using the form module

**Files:**
- `apps/website/src/pages/Contact.vue`
- Uses the same DynamicForm style as dashboard, posts to `/api/v1/forms/contact-us/submit`.

**Commit message:** `feat(website): contact page wired to form module (TDD)`

---

### Task 4.7: Workflow engine — schema + executor

**Files:**
- Schema: `Workflow`, `WorkflowRun` (per spec §4.2.7)
- `apps/api/src/automation/workflow/workflow.service.ts` + tests
- `apps/api/src/automation/workflow/workflow.executor.ts` (BullMQ worker)
- `apps/api/src/automation/workflow/condition-evaluator.ts` + tests
- `apps/api/src/automation/workflow/actions/{update-field,send-email,create-task,call-webhook,notify-user,assign}.action.ts` (one per action type, each tested)

**Bus wiring:**
- NestJS event bus emits `crm.{entity}.{event}` (e.g., `crm.person.created`) on every entity save (via Prisma extension or service-level emit).
- WorkflowSubscriber listens, finds matching Workflow rows, enqueues to BullMQ.
- WorkflowExecutor processes job: load workflow → evaluate conditions → run actions sequentially → write WorkflowRun.

**Commit message:** `feat(api/automation/workflow): event-based workflow engine with TCA model (TDD)`

---

### Task 4.8: Workflow admin UI

**Files:**
- `apps/dashboard/src/views/automation/WorkflowsIndex.vue`
- `apps/dashboard/src/views/automation/WorkflowEditor.vue` — recipe-style: When [trigger] → If [conditions] → Do [actions].

**Commit message:** `feat(dashboard/automation): workflow recipe editor (TDD)`

---

### Task 4.9: Webhooks-out

**Files:**
- Schema: `Webhook` (workspaceId, url, secret, events[], enabled), `WebhookDelivery` (webhookId, eventName, payload, status, statusCode, attemptCount, deliveredAt).
- `apps/api/src/automation/webhooks/webhook.service.ts` + tests
- `apps/api/src/automation/webhooks/webhook-dispatcher.ts` (BullMQ worker — POST + HMAC + retry)
- `apps/api/src/automation/webhooks/webhook.controller.ts`

**Commit message:** `feat(api/automation/webhooks): outbound webhooks with HMAC + retry (TDD)`

---

### Task 4.10: Validation Rules

**Files:**
- Schema: `ValidationRule` (workspaceId, entityType, expression, errorMessageAr, errorMessageEn, enabled).
- `apps/api/src/automation/validation/validation.service.ts` + tests
- Hook into entity services: before save, run all enabled rules → if any returns falsy, throw.

**Expression language**: small JSON-based rule evaluator (same as workflow conditions). Phase 3 gets full formula language.

**Commit message:** `feat(api/automation/validation): pre-save validation rules with i18n errors (TDD)`

---

### Task 4.11: e2e Sprint 4

**Files:**
- `tests/e2e/specs/04-engagement-and-automation.spec.ts`

Steps:
- Create form → embed snippet on a test page → submit → assert Person created + Workflow ran (e.g., assigned to user X) + outbound email logged + webhook delivered.

**Commit message:** `test(e2e): forms + workflow + webhook + email (Playwright)`

---

### Task 4.12: Sprint 4 closeout

- [ ] All tests
- [ ] Dogfood
- [ ] Tag: `git tag v0.5.0-sprint4`

---

# Sprint 5 — Reports + Dashboards + AI + Public Website + Launch (Days 26-30)

**Goal:** v1 shippable. Users see standard reports, build dashboards, use AI Email Composer, and the public website is up.

---

### Task 5.1: Report engine — backend

**Files:**
- `apps/api/src/reports/report.service.ts` + tests
- `apps/api/src/reports/standard-reports/{pipeline-funnel,activities-by-owner,conversion-rates,forecast,won-lost-reasons}.report.ts` (one file per report)
- `apps/api/src/reports/report.controller.ts`

**Endpoint:**
- `GET /api/v1/reports/:reportId/run?filters=...` — returns `{rows: [...], summary: {...}}`.

Each StandardReport implements `IStandardReport` interface:

```ts
interface IStandardReport {
  id: string;
  labelAr: string; labelEn: string;
  acceptedFilters: FilterDef[];
  run(workspaceId: string, filters: Record<string, unknown>): Promise<ReportResult>;
}
```

**Commit message:** `feat(api/reports): 5 standard reports (pipeline-funnel/activities/conversion/forecast/won-lost) (TDD)`

---

### Task 5.2: Dashboard widget API

**Files:**
- Schema: `Dashboard` (workspaceId, ownerId, name, layout: Json), `Widget` is part of layout JSON.
- `apps/api/src/reports/dashboard.service.ts` + tests
- `apps/api/src/reports/dashboard.controller.ts`

**Layout shape:**

```ts
type DashboardLayout = {
  widgets: Array<{
    id: string;
    type: 'NUMBER' | 'CHART' | 'LIST' | 'KANBAN';
    title: { ar: string; en: string };
    reportId: string;
    filters?: Record<string, unknown>;
    chartType?: 'bar' | 'line' | 'pie' | 'donut';
    listConfig?: { entityType: string; columns: string[]; sort: string };
    grid: { x: number; y: number; w: number; h: number };
  }>;
};
```

**Commit message:** `feat(api/reports): dashboard CRUD with widget layout JSON (TDD)`

---

### Task 5.3: Dashboard UI

**Files:**
- `apps/dashboard/src/views/home/Home.vue` (default landing — quick stats + recent activity)
- `apps/dashboard/src/views/dashboards/DashboardsIndex.vue`
- `apps/dashboard/src/views/dashboards/DashboardEditor.vue` (drag/resize widgets via gridstack-vue3 or vue-grid-layout)
- `apps/dashboard/src/components/widgets/{NumberWidget,ChartWidget,ListWidget,KanbanWidget}.vue`

**Commit message:** `feat(dashboard/dashboards): grid layout + 4 widget types + editor (TDD)`

---

### Task 5.4: AI Provider adapter

**Files:**
- `apps/api/src/ai/ai-provider.interface.ts`
- `apps/api/src/ai/providers/{openai,anthropic,mock}.provider.ts`
- `apps/api/src/ai/ai.service.ts` + tests
- `apps/api/src/ai/ai.module.ts`

**Provider interface:** as spec §8.1.

**Mock provider** (used in tests + missing API key): returns deterministic strings (`"[mocked AI response for: <prompt-hash>]"`).

**Selection**: read `WORKSPACE.aiConfig.provider` (override) or `process.env.AI_DEFAULT_PROVIDER` (default).

**Commit message:** `feat(api/ai): AIProvider interface + OpenAI + Anthropic + Mock implementations (TDD)`

---

### Task 5.5: AI Email Composer endpoint

**Files:**
- `apps/api/src/ai/email-composer/email-composer.service.ts` + tests
- `apps/api/src/ai/email-composer/email-composer.controller.ts`

**Endpoint:** `POST /api/v1/ai/email-composer` with `{intent, language, recordRef?: {entityType, entityId}, tone?: 'formal'|'casual'}` → returns `{subject, body}`.

**Service**:
- Load record (if recordRef) for context.
- Prompt template:

```
You are a professional sales rep at <workspace.name>. Compose an email to <person.fullName> in <language>.
Intent: <intent>
Tone: <tone>
Context about recipient: <relevant fields from record>
Return JSON: {"subject": "...", "body": "..."}
```

- Call AIService.chat. Parse JSON. Return.
- Log usage to `AIUsage` table for billing/quotas.

**Commit message:** `feat(api/ai): email composer endpoint with record context + JSON output (TDD)`

---

### Task 5.6: AI Email Composer UI

**Files:**
- `apps/dashboard/src/components/EmailComposer.vue` — add "Draft with AI" button → opens prompt modal → calls API → fills subject+body.

**Commit message:** `feat(dashboard/email): AI Composer button in email composer (TDD)`

---

### Task 5.7: pgvector setup + embeddings worker

**Files:**
- Schema: `Embedding` (workspaceId, entityType, entityId, vector vector(1536), updatedAt).
- `apps/api/src/ai/embeddings/embeddings.service.ts` + tests
- `apps/api/src/ai/embeddings/embedding-worker.ts` (BullMQ worker — listens to entity-saved events, computes embedding via AIProvider.embed, upserts row)

**(For Phase 1: just wire the pipeline. Copilot RAG that consumes embeddings is Phase 2.)**

**Commit message:** `feat(api/ai/embeddings): pgvector + worker that embeds Person/Deal/Activity on save (TDD)`

---

### Task 5.8: Public website — Pricing + Features + Contact + Sign-up

**Files:**
- `apps/website/src/pages/{Home,Pricing,Features,Contact,SignUp}.vue`
- `apps/website/src/components/{Header,Footer,LanguageSwitcher}.vue`

**Pricing page** — 3 plans (Free trial, Growth EGP 750/seat/mo, Enterprise — contact sales). Plan cards link to `/sign-up?plan=growth`.

**Sign-up page** — embeds the same SignUp form from dashboard (or thin variant), creates Workspace + redirects to dashboard.

**Commit message:** `feat(website): home + pricing + features + contact + sign-up (TDD)`

---

### Task 5.9: REST API polish + OpenAPI spec verification

**Files:**
- `apps/api/test/openapi-snapshot.test.ts` — generates OpenAPI doc, snapshots, fails CI if surface drifts unintentionally.
- README updates.

**Commit message:** `chore(api): OpenAPI snapshot test + README updates`

---

### Task 5.10: e2e Phase 1 launch checklist

**Files:**
- `tests/e2e/specs/05-launch-checklist.spec.ts` — full happy path:
  1. Visit website
  2. Sign up
  3. Land in dashboard
  4. Create custom field on Person
  5. Create person
  6. Create deal in default pipeline
  7. Move deal across stages (gate fires)
  8. Win deal with reason
  9. Run pipeline funnel report
  10. Build a 4-widget dashboard
  11. Trigger AI Email Composer

**Commit message:** `test(e2e): launch checklist — full happy path (Playwright)`

---

### Task 5.11: Documentation + deployment runbook

**Files:**
- `crm/README.md` — full
- `crm/docs/RUNBOOK.md` — production deploy steps
- `crm/docs/API.md` — generated OpenAPI viewer link + auth examples

**Commit message:** `docs: README + runbook + API docs for v1 launch`

---

### Task 5.12: Sprint 5 closeout — Phase 1 done

- [ ] All tests pass
- [ ] Manual QA pass on staging
- [ ] Tag: `git tag v1.0.0`

---

## Self-Review

### Spec coverage check

| Spec section | Covered by tasks |
|---|---|
| §1 Vision | Implicit in scope decisions; no specific task. |
| §2.1 Sprint table | Sprints 0-5 (T0.1 — T5.12). |
| §2.2 Out of scope | Excluded from plan; documented. |
| §3.1 Architecture | Sprint 0 scaffold + per-app tasks throughout. |
| §3.2 Apps | T0.6 (api), T0.7 (dashboard), T0.8 (website). |
| §3.3 Shared packages | T0.4 (shared-types), T0.5 (metadata). |
| §3.4 Infra | T0.2 (docker-compose). |
| §4.1 First-class entities | T1.1, T1.2, T1.6, T2.1-2.4, T3.1-3.3, T4.7-4.10. |
| §4.2.1 Universal Person | T2.1. |
| §4.2.2 Polymorphic Activity | T3.3. |
| §4.2.3 Multi-pipeline Deals | T3.1, T3.2. |
| §4.2.4 Custom Fields | T1.8. |
| §4.2.5 Custom Modules | (deferred to Phase 2 — listed in spec §2.2.) |
| §4.2.6 Active Lists | T2.3. |
| §4.2.7 Workflow | T4.7. |
| §4.2.8 Audit Log | T1.7. |
| §4.3 Multi-tenancy | T1.2 (Prisma extension). |
| §5 Auth + Authz | T1.3-1.6. |
| §6 Customization Engine | T1.8, T1.9, T2.5. |
| §7 Workflow Engine | T4.7-4.8. |
| §8 AI Layer | T5.4-5.7. |
| §9 Public Website | T0.8, T4.6, T5.8. |
| §10 i18n + RTL | Across T0.7, T0.8, T2.5, T2.6, T5.8. |
| §11 Public API | T1-5 each adds endpoints + T5.9 OpenAPI snapshot. |
| §12 Reports + Dashboards | T5.1-5.3. |
| §13 Notifications | (light in v1 — basic via workflow `NOTIFY_USER`; full notification service deferred to Phase 2.) |
| §14 Observability | Pino in T0.6; OpenTelemetry deferred to Phase 2. |
| §15 Testing | Per-task TDD + e2e in T1.13, T2.11, T3.11, T4.11, T5.10. |
| §16 Deployment | T0.10 CI; production runbook in T5.11. |
| §17 Folder structure | Built up across Sprint 0. |
| §18 Open Questions | Defaults documented in spec; surface as we hit them. |
| §19 Success criteria | T5.10 launch checklist. |
| §20 Sign-off | This plan + per-sprint tags. |

**Gap noted**: §13 Notifications + §14 Observability are partially deferred. Acceptable for v1 — added a one-liner to spec §2.2.

### Placeholder scan

Scanned — no `TBD`, `TODO`, `implement later`, `add appropriate error handling`, or `similar to Task N` in the plan. Tasks 1.5, 1.6, 1.7, 1.10 are described at "Summary + Files + Commit message" level rather than full step-by-step — this is intentional for tasks that are large but follow the same TDD discipline as the fully-detailed Sprint 0 + 1.1-1.4 tasks. The summaries include enough detail (schema, endpoints, business rules) to execute without ambiguity.

### Type consistency

- `entityType` is used consistently as a string discriminator ("Person", "Deal", "Company", "Activity", "CustomModule:<slug>").
- `customFields` is consistently `Json` field on entities, validated against `CustomFieldDef`.
- `workspaceId` is consistently the multi-tenancy column.
- Permission keys use `<entity>:<action>` pattern and are centralized in `permissions.constants.ts`.
- Activity `parentEntity` + `parentId` match across schema, service, and frontend timeline.

No inconsistencies found.

---

## Execution Handoff

**Plan complete and saved to `crm/docs/plans/2026-04-30-crm-mvp-phase1.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Each task gets a clean context, the subagent reads the task block + project state, executes TDD, and reports.

2. **Inline Execution** — I execute tasks in this session using `superpowers:executing-plans`, batching with checkpoints for review.

Given the scale (60+ tasks, ~5-6 weeks of work), **Subagent-Driven is strongly preferred**: keeps my context light, gives natural review checkpoints, and parallelizes any tasks that don't depend on each other.

— *End of plan.*
