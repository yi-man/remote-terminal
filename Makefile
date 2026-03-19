SHELL := /bin/bash
.DEFAULT_GOAL := help

BACKEND_DIR := backend
FRONTEND_DIR := frontend

.PHONY: help install install-backend install-frontend dev dev-backend dev-frontend build build-backend build-frontend start test e2e clean ports

help:
	@printf "%s\n" \
		"" \
		"Remote Terminal (root) Make targets:" \
		"" \
		"  make install        Install backend + frontend deps" \
		"  make dev            Run backend + frontend dev servers" \
		"  make build          Build backend + frontend" \
		"  make start          Start backend (production)" \
		"  make test           Run backend test:run + frontend unit + e2e" \
		"  make e2e            Run frontend Playwright e2e" \
		"  make clean          Remove common build/test artifacts" \
		"  make ports          Kill processes on :8080 and :5173" \
		""

install: install-backend install-frontend

install-backend:
	pnpm -C "$(BACKEND_DIR)" install

install-frontend:
	pnpm -C "$(FRONTEND_DIR)" install

dev:
	@set -euo pipefail; \
	echo "Starting backend + frontend dev servers..."; \
	pnpm -C "$(BACKEND_DIR)" dev & backend_pid=$$!; \
	pnpm -C "$(FRONTEND_DIR)" dev & frontend_pid=$$!; \
	trap 'echo ""; echo "Stopping dev servers..."; kill $$backend_pid $$frontend_pid 2>/dev/null || true; wait $$backend_pid $$frontend_pid 2>/dev/null || true' INT TERM EXIT; \
	wait $$backend_pid $$frontend_pid

dev-backend:
	pnpm -C "$(BACKEND_DIR)" dev

dev-frontend:
	pnpm -C "$(FRONTEND_DIR)" dev

build: build-backend build-frontend

build-backend:
	pnpm -C "$(BACKEND_DIR)" build

build-frontend:
	pnpm -C "$(FRONTEND_DIR)" build

start:
	pnpm -C "$(BACKEND_DIR)" start

test:
	pnpm -C "$(BACKEND_DIR)" test:run
	pnpm -C "$(FRONTEND_DIR)" test:unit
	pnpm -C "$(FRONTEND_DIR)" test:e2e

e2e:
	pnpm -C "$(FRONTEND_DIR)" test:e2e

clean:
	rm -rf "$(BACKEND_DIR)/dist"
	rm -rf "$(FRONTEND_DIR)/dist"
	rm -rf "$(FRONTEND_DIR)/.vite"
	rm -rf "$(FRONTEND_DIR)/playwright-report"
	rm -rf "$(FRONTEND_DIR)/test-results"

ports:
	@echo "Killing processes on :8080 and :5173 (if any)..."
	@lsof -ti :8080 | xargs -r kill -9
	@lsof -ti :5173 | xargs -r kill -9
