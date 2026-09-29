# ChainScope

> **A local-first Bitcoin transaction graph explorer and forensic analysis platform.**

[![Python 3.12+](https://img.shields.io/badge/python-3.12%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/frontend-React%2019%20%2B%20Vite-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL%2016-336791.svg)](https://www.postgresql.org/)
[![Bitcoin Core](https://img.shields.io/badge/node-Bitcoin%20Core-F7931A.svg)](https://bitcoincore.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Core Principles](#core-principles)
- [Key Features](#key-features)
- [Forensic Heuristics Engine](#forensic-heuristics-engine)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Makefile Command Reference](#makefile-command-reference)
- [Diagnostic & Health Checks](#diagnostic--health-checks)
- [Testing & Code Quality](#testing--code-quality)
- [Forensic Disclaimer](#forensic-disclaimer)

---

## Overview

**ChainScope** is a specialized, local-first analytics workbench designed for blockchain researchers, forensic analysts, and compliance investigators. It enables high-fidelity multi-hop tracing, structural pattern detection, and UTXO-level flow graph exploration directly from a local **Bitcoin Core** node and indexed **PostgreSQL** database.

Unlike public blockchain explorers or SaaS-dependent tools, ChainScope operates **100% locally** without external telemetry, tracking, or cloud lock-in.

---

## Core Principles

### 1. Privacy & Local-First Sovereignty
- **Zero cloud dependencies:** All data queries, graph expansions, and heuristic calculations run locally on your machine.
- **No data leakage:** Analyzed addresses, TXIDs, search logs, investigation sessions, and IP addresses are **never** transmitted to remote servers.
- **Local RPC isolation:** Bitcoin Core RPC bindings are strictly bound to localhost (`127.0.0.1`), configurable across `mainnet`, `testnet`, and `regtest`.

### 2. Forensic & Analytical Rigor
ChainScope strictly enforces distinction between:
- **Observed On-Chain Data:** Verifiable cryptographic facts (scripts, transaction values, block confirmations).
- **Derived Data:** Quantifiable metrics (vsize, fee rates, confirmation delays).
- **Heuristic Inferences:** Probabilistic hypotheses with explainable signals (e.g. change address heuristics, clustering).
- **Analyst Annotations:** Contextual notes and tags added during an investigation session.

> **Ethical Forensic Rule:** Heuristics are always reported as probabilistic inferences with a declared confidence level—**never** as conclusive legal proof of ownership or identity.

---

## Key Features

### 🔍 Interactive Flow Graph Exploration
- **Dual Representation Modes:**
  - **Address Graph:** Macroscopic address-to-address flow model where nodes represent Bitcoin addresses / coinbase rewards and directed edges represent transactions with transfer volumes and fees.
  - **UTXO True DAG:** High-fidelity directed acyclic graph capturing Bitcoin's native execution model: *Parent TX &rarr; Input UTXO &rarr; Target TX &rarr; Output UTXO &rarr; Child TX*.
- **Multi-Hop Traversal:** Recursively trace fund flows *Upstream* (funding sources) or *Downstream* (spending outputs) across 1 to 3 hops in the UI (up to 4 hops in the backend API).
- **Dynamic Layout Engines:** Seamlessly switch between force-directed clustering (`cose`), hierarchical flow tree (`breadthfirst`), concentric, and circular layouts.
- **Hardware-Accelerated Canvas & Label Scaling:** Viewport texture caching for 60fps pan/zoom on dense graphs, accompanied by zoom-responsive label font scaling (10px to 16px with dedicated `A+` / `A-` controls).
- **Theming & Color Modes:**
  - **Monochrome Entity (`hash`):** Deterministic high-contrast hue mapping uniquely assigned per entity hash for instant visual differentiation.
  - **Entity Type (`type`):** Clean semantic color coding (Emerald for addresses, Purple for transactions, Amber for UTXOs/coinbase).
- **Graph Exports:** Export full-resolution PNG canvas snapshots directly from the graph controls overlay.

### ⚡ Real-Time In-Memory Filtering (Zero Latency)
Instant filtering applied directly in client memory to isolate transactions without round-trip network delays:
- **Address & TXID Filter:** Substring match across TXIDs, input addresses, output addresses, and connected graph nodes.
- **Volume Range:** Filter by transferred amount in **BTC** or **Satoshis** with instant unit toggle.
- **Block Height Range:** Restrict visibility to transactions confirmed between specific block heights.
- **Input / Output Count Limits:** Filter by structural size (min/max inputs & outputs).
- **Flow Patterns:** Instant preset filtering for *Peel Chain (1 in, 2 out)*, *UTXO Consolidation (≥2 in, ≤2 out)*, *Batch Payment (≤3 in, ≥3 out)*, and *CoinJoin-like (≥3 in, ≥3 out)* patterns.
- **Empty State Recovery:** Clear visual indicator and one-click filter reset when filter criteria exclude all elements.

### 📋 Structured Table View (`TextView`)
- A dedicated tabular interface togglable alongside the Cytoscape graph canvas.
- Separate dedicated tabs for **Transactions** and **Addresses** with real-time substring search filtering.
- One-click TXID and address copying, block confirmation indicators, transfer amounts in BTC/satoshis, fee stats, and instant node exploration triggers.

### 🔬 Inspector Panel
- Deep inspection sidebar for any selected transaction, address, UTXO node, or transfer edge:
  - Current balance, total received, total spent, and transaction counters.
  - Script type classification (P2PKH, P2SH, P2WPKH, P2WSH, Taproot P2TR).
  - Transaction vsize, fee, fee rate (sat/vB), timestamp, and block height.
  - Detailed Senders (Inputs) and Recipients (Outputs) breakdown with click-to-inspect navigation.
  - Multi-hop flow exploration shortcuts (*Trace Upstream*, *Trace Spends*, *Center & Expand*).
  - Direct links to **mempool.space** for independent verification.
  - Triggered heuristic findings with transparent justifications, confidence levels, and collapsible JSON evidence payloads.

### 💾 Automatic Local Session Persistence
- **Continuous Local Synchronization:** Ongoing workspace state is automatically persisted locally via browser `localStorage` (`chainscope_session_v3`).
- **Full State Restoration:** Seamlessly restores your active search query, selected target entity, graph mode (Address vs UTXO), layout engine, traversal depth, flow direction (upstream/downstream/both), font size, color mode, view mode (Graph vs Table), all active filters, and heuristic rules upon page reload.
- **Uncluttered Analyst Workflow:** Eliminates manual file saving and dossier management overhead in the UI; your investigation state is maintained securely and entirely client-side.

---

## Forensic Heuristics Engine

ChainScope includes a modular rules engine evaluating **12 distinct forensic heuristics**. Each finding provides a transparent breakdown:
- **Score:** 0 to 100
- **Confidence:** `low` | `medium` | `high`
- **Severity:** `info` | `warning` | `critical`
- **Evidence:** Concrete on-chain data triggers (addresses, script mismatches, output indices).

| Heuristic | Category | Principle & Detection Pattern |
|---|---|---|
| **Common-Input Ownership (CIOH)** | Clustering | Identifies co-signed inputs in multi-input transactions. Automatically flagged as low-confidence or deactivated on CoinJoin. |
| **Change Address Detection** | Change Output | Detects likely change outputs based on address freshness, script type matching, unrounded satoshis, and spending patterns. |
| **Address Reuse** | Privacy Loss | Identifies addresses reused across multiple transactions, compromising counterparty privacy. |
| **Peel Chain** | Sequential Flow | Detects recurring payment cascades peeling off smaller payments while forwarding remaining balances to fresh change addresses. |
| **UTXO Consolidation** | Merging | Identifies transactions merging multiple small UTXOs into 1–2 outputs during low-fee periods. |
| **Convergence (Fan-in)** | Aggregation | Detects multiple distinct source addresses converging to fund a single destination or treasury cold wallet. |
| **Dispersion (Fan-out)** | Distribution | Detects transactions dispersing funds across numerous recipient outputs. |
| **Batch Payment** | Commercial | Flags commercial payout structures with few inputs and many diverse recipient outputs. |
| **CoinJoin-like Pattern** | Mixing | Detects collaborative transactions with multiple inputs and identical output denominations (marked as pattern suspicion, never confirmed intent). |
| **Dust Output** | Micro-Amount | Detects dust outputs ($\le 546$ satoshis) potentially linked to dusting tracking probes. |
| **Round Amount Indicator** | Contextual | Identifies round decimal values (e.g. 0.1, 1.0 BTC) to distinguish commercial payments from change outputs. |
| **Rapid Chained Transactions** | Cascade | Detects immediate successive spends of newly minted outputs across consecutive blocks. |

---

## Architecture

```text
┌────────────────────────────────────────────────────────┐
│           Local Bitcoin Core Node / JSON-RPC           │
│         (mainnet, testnet, or regtest, txindex=1)      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Blockchain Indexer                   │
│         Block scanner, UTXO tracker & Live Sync        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                 PostgreSQL 16 Database                 │
│      Normalized Blocks, Transactions, Inputs, Outputs  │
└───────────────────────────┬────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌──────────────────────────┐ ┌──────────────────────────┐
│      Search Engine       │ │     Forensic Engine      │
│ Multi-parameter filters  │ │ 12 Modular Heuristics    │
└─────────────┬────────────┘ └────────────┬─────────────┘
              │                           │
              └─────────────┬─────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│                    FastAPI Backend                     │
│               REST API & Topological Graph             │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               React + Vite Frontend (UI)               │
│   Cytoscape.js Canvas, Real-time Filters, Inspector   │
└────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
- **Python 3.12+**
- **FastAPI** (REST API endpoints & OpenAPI documentation)
- **SQLAlchemy 2.0 (Async)** & **asyncpg** (Async PostgreSQL ORM)
- **Alembic** (Database schema migrations)
- **Pydantic v2** (Strict data validation and schema serialization)
- **structlog** (Structured local logging)
- **httpx** (Async HTTP client for RPC communication)
- **Pytest** & **pytest-asyncio** (Automated test suite)
- **Ruff** (Ultra-fast linting & formatting)
- **MyPy** (Static typing)

### Frontend
- **React 19** & **TypeScript**
- **Vite** (Build tool & development server)
- **Cytoscape.js** (High-performance graph visualization canvas)
- **Tailwind CSS v4** (Modern styling system)
- **Lucide Icons** (Clean UI iconography)

### Infrastructure & Storage
- **PostgreSQL 16** (Primary normalized relational storage)
- **Redis 7** (Local ephemeral caching)
- **Bitcoin Core v25+** (Local JSON-RPC node)
- **Docker Compose** (Containerized local development dependencies)

---

## Repository Structure

```text
chainscope/
├── apps/
│   ├── api/                     # FastAPI application & REST endpoints
│   │   ├── routes/              # graph, forensics, search, status, investigations, logs
│   │   └── main.py              # Application entrypoint
│   ├── indexer/                 # Bitcoin node sync & parser
│   │   ├── bitcoin_rpc.py       # JSON-RPC client
│   │   ├── live_sync.py         # Real-time multi-hop syncer
│   │   ├── external_api.py      # Fallback provider adapter
│   │   └── seeder.py            # Local dataset seeder
│   └── worker/                  # Background jobs & schedulers
│
├── frontend/                    # React + TypeScript single-page application
│   ├── src/
│   │   ├── components/          # CytoscapeGraph, Header, LeftSidebar, InspectorPanel, TextView, InfoTooltip
│   │   ├── lib/                 # Color computation, canvas utilities
│   │   ├── types/               # TypeScript data definitions
│   │   ├── App.tsx              # Main orchestrator & in-memory filter engine
│   │   └── index.css            # Tailwind CSS styling
│   ├── package.json
│   └── vite.config.ts
│
├── packages/                    # Core modular business logic
│   ├── common/                  # Unit conversions (sats/BTC) and script detectors
│   ├── domain/                  # SQLAlchemy models & Pydantic schemas
│   ├── forensic/                # 12 forensic heuristic analyzer modules
│   ├── graph/                   # Cytoscape graph topology builder
│   ├── search/                  # Multi-parameter SQL search engine
│   └── reports/                 # Standalone HTML forensic report generator
│
├── docker/                      # Docker configurations
├── migrations/                  # Alembic database migrations
├── scripts/
│   └── doctor.py                # Environment health diagnostic script
├── tests/                       # Unit & integration test suites
├── docker-compose.yml           # Local PostgreSQL, Redis, Bitcoind services
├── Makefile                     # Standard developer commands
├── pyproject.toml               # Python package configuration
└── .env.example                 # Environment variables template
```

---

## Prerequisites

Before running ChainScope, ensure your machine has:

1. **Python 3.12+**
2. **Node.js 18+** & **npm**
3. **Docker** & **Docker Compose**
4. *(Optional)* A local **Bitcoin Core** node (`bitcoind`) with `txindex=1` enabled.

---

## Getting Started

### 1. Clone & Configure Environment

```bash
git clone https://github.com/your-username/chainscope.git
cd chainscope

# Create your local environment configuration
cp .env.example .env
```

Review the `.env` file to customize database credentials or RPC ports if necessary:

```env
POSTGRES_USER=chainscope
POSTGRES_PASSWORD=chainscope
POSTGRES_DB=chainscope
DATABASE_URL=postgresql+asyncpg://chainscope:chainscope@localhost:5432/chainscope

BITCOIN_RPC_USER=btcuser
BITCOIN_RPC_PASSWORD=btcpass
BITCOIN_RPC_HOST=localhost
BITCOIN_RPC_PORT=18443
BITCOIN_NETWORK=regtest
```

### 2. Install Dependencies

```bash
make install
```

This installs Python package dependencies in editable mode (`pip install -e ".[dev]"`) and frontend packages via `npm install`.

### 3. Start Infrastructure

Launch the PostgreSQL, Redis, and local Bitcoin test node containers:

```bash
make up
```

### 4. Apply Database Migrations & Seed Data

```bash
# Run Alembic schema migrations
make migrate

# Populate sample on-chain transactions and fixture blocks
make seed
```

### 5. Launch Development Servers

```bash
make dev
```

- **Frontend UI:** [http://localhost:5173](http://localhost:5173)
- **FastAPI Backend:** [http://localhost:8000](http://localhost:8000)
- **Interactive API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Makefile Command Reference

All daily development workflows are streamlined through the `Makefile`:

| Command | Description |
|---|---|
| `make install` | Installs Python development packages and frontend `node_modules`. |
| `make up` | Starts PostgreSQL, Redis, and Bitcoind containers in background. |
| `make down` | Stops and removes running Docker containers. |
| `make migrate` | Applies pending database schema migrations with Alembic. |
| `make seed` | Seeds fixture transactions (Peel chains, CoinJoins, consolidations, SegWit, Taproot). |
| `make dev` | Launches FastAPI backend on `:8000` and Vite dev server on `:5173`. |
| `make index` | Indexes local blocks and syncs transactions into PostgreSQL. |
| `make index-status` | Runs diagnostic environment check (`scripts/doctor.py`). |
| `make test` | Executes the complete Pytest suite (`pytest tests/`). |
| `make lint` | Validates code standards using Ruff linter (`ruff check .`). |
| `make format` | Automatically formats Python codebase (`ruff format .`). |
| `make typecheck` | Validates static typing with MyPy (`mypy packages apps`). |
| `make build` | Builds optimized production bundle of the React frontend. |

---

## Diagnostic & Health Checks

ChainScope provides a built-in doctor script to verify system prerequisites, database connectivity, and node status:

```bash
python scripts/doctor.py
# or
make index-status
```

Sample diagnostic output:

```text
--- ChainScope Doctor ---
✅ Docker is installed
✅ Docker Compose is installed
✅ Python is installed
✅ Disk space: 84.2 GB free
✅ PostgreSQL connection successful (12 blocks, 48 txs, 114 addresses indexed)
Checking Bitcoin Core RPC at http://localhost:18443/...
✅ Bitcoin Core RPC connected (blocks: 120, chain: regtest)
```

---

## Testing & Code Quality

ChainScope maintains rigorous automated testing across units, parsers, and forensic algorithms:

```bash
# Run all backend tests
make test

# Run linter
make lint

# Run type checker
make typecheck

# Validate frontend production build
make build
```

---

## Forensic Disclaimer

ChainScope is an analytical tool built for investigative research. Outputs from forensic heuristics (including clustering, change address identification, and flow patterns) represent **probabilistic inferences** based on public on-chain transaction graph topologies. 

They must **never** be interpreted as definitive legal evidence of identity, ownership, or unlawful intent without independent off-chain corroboration.

---

## License

Distributed under the **MIT License**. See `LICENSE` for more information.
