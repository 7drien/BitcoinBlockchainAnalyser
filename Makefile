.PHONY: help install dev up down test lint format typecheck migrate seed index index-status report build

VENV_BIN ?= $(shell if [ -d ".venv/bin" ]; then echo ".venv/bin/"; fi)
PYTHON = $(VENV_BIN)python
UVICORN = $(VENV_BIN)uvicorn
ALEMBIC = $(VENV_BIN)alembic
PYTEST = $(VENV_BIN)pytest
RUFF = $(VENV_BIN)ruff
MYPY = $(VENV_BIN)mypy

help:
	@echo "Available commands:"
	@echo "  install       - Install dependencies"
	@echo "  dev           - Run the development servers"
	@echo "  up            - Start infrastructure (Docker Compose)"
	@echo "  down          - Stop infrastructure"
	@echo "  test          - Run tests"
	@echo "  lint          - Run linting (ruff)"
	@echo "  format        - Run formatter (ruff format)"
	@echo "  typecheck     - Run type checking (mypy)"
	@echo "  migrate       - Run database migrations"
	@echo "  seed          - Seed the database with fixtures"
	@echo "  index         - Run the blockchain indexer / seeder"
	@echo "  index-status  - Check indexer and infrastructure status"
	@echo "  build         - Build the frontend"

install:
	pip install -e ".[dev]"
	cd frontend && npm install

up:
	docker compose up -d

down:
	docker compose down

migrate:
	$(ALEMBIC) upgrade head

seed:
	$(PYTHON) apps/indexer/seeder.py

dev:
	$(PYTHON) -m uvicorn apps.api.main:app --host 127.0.0.1 --port 8000 --reload & cd frontend && npm run dev

test:
	$(PYTEST) tests/

lint:
	$(RUFF) check .

format:
	$(RUFF) format .

typecheck:
	$(MYPY) packages apps

index:
	$(PYTHON) apps/indexer/seeder.py

index-status:
	$(PYTHON) scripts/doctor.py

build:
	cd frontend && npm run build
