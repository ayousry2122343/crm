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
