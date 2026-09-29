# ChainScope

A local-first Bitcoin transaction graph explorer and forensic analysis platform.

## Features

- Local-first (Bitcoin Core + PostgreSQL)
- No tracking, no cloud telemetry
- Interactive graph exploration (Cytoscape.js)
- Forensic heuristic analysis
- Export and reproducible investigations

## Stack

- FastAPI (Backend)
- PostgreSQL & Redis (Data)
- Bitcoin Core (Blockchain source)
- React, Vite, Tailwind CSS (Frontend)

## Quickstart

```bash
make up       # Start infrastructure
make install  # Install dependencies
make dev      # Run local servers
```
