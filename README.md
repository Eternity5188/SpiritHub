<div align="center">
  <br />
  <img src="./frontend/public/logo.png" alt="SpiritHub" width="260" />
  <br /><br />

  <p>
    <strong>AI-native community platform for collaboration, creator tooling, and graph-based personalization.</strong>
  </p>

  <p>
    <a href="#-overview">Overview</a> ·
    <a href="#-repository-structure">Structure</a> ·
    <a href="#-architecture">Architecture</a> ·
    <a href="#-quick-start">Quick Start</a> ·
    <a href="#%EF%B8%8F-configuration">Configuration</a> ·
    <a href="#-gnn-tools">GNN Tools</a> ·
    <a href="#-license">License</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
    <img src="https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=black" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white" />
    <img src="https://img.shields.io/badge/Python-3.10+-3776ab?style=flat-square&logo=python&logoColor=white" />
    <img src="https://img.shields.io/badge/License-Apache%202.0-fa7343?style=flat-square" />
  </p>
</div>

---

## Overview

SpiritHub is a reproducible full-stack monorepo that combines a social community platform, AI-powered creator tooling, and a graph neural network recommendation pipeline in one codebase.

| Layer | What it does |
|---|---|
| **Community** | Feed, posts, comments, friends, leaderboard, profiles, notifications |
| **Collaboration** | CoLab projects, science groups, rooms, shared events |
| **AI Toolkit** | Chat assistant, copywriting, content risk detection, domain workflows |
| **Recommendations** | GNN training, dataset export, and synthetic data generation |
| **Build** | Frontend + backend workspace scripts for local development and production builds |

---

## Repository Structure

```
spirithub/
├── frontend/               # React 18 + TypeScript + Vite app
│   ├── src/                # Pages, components, hooks, lib, styles
│   └── public/             # Static assets, including logo.png
├── backend/                # Express + Socket.IO API service
│   └── src/                # Routes, DB access, auth, realtime, services
├── gnn/                    # Recommendation and dataset tooling
│   ├── train.py            # GNN training entry point
│   ├── run_local.py        # Download/train/upload helper for local use
│   ├── generate_data.py    # Synthetic data generator for training
│   ├── export_dataset.py   # Production DB export for research datasets
│   ├── cleanup.py          # GNN data cleanup utility
│   ├── requirements.txt    # Python dependencies for GNN tooling
│   ├── train_temp.db       # Temporary training database
│   └── weights/            # Saved model weights
├── data/                   # Shared runtime data directory
├── LICENSE                 # Apache-2.0 license
├── package.json            # Root workspace scripts
└── README.md               # This document
```

---

## Architecture

```
                          ┌─────────────────┐
                          │  React + Vite   │  Frontend
                          │  TypeScript     │  (port 5173)
                          └────────┬────────┘
                                   │ HTTP / WebSocket
                          ┌────────▼────────┐
                          │  Express API    │  Backend
                          │  Socket.IO      │  (port 3000)
                          └──┬──────┬───┬──┘
                             │      │   │
              ┌──────────────▼┐  ┌──▼─┐ └──────────┐
              │  SQLite /     │  │ AI │            │ Mailer
              │  libSQL       │  │ APIs│            │ (SMTP)
              └──────────┬───┘  └────┘            └────────
                         │
              ┌──────────▼───────┐
              │  GNN Pipeline    │  Python (offline)
              │  Training jobs   │
              └──────────────────┘
```

The frontend communicates with the backend over HTTP REST and Socket.IO. In production, the backend serves the built frontend assets directly, while the GNN pipeline runs as a separate Python workflow that reads and writes shared data files.

---

## Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18+ |
| npm | 9+ |
| Python | 3.10+ |

### Install

```bash
# Install all workspace dependencies in one step
npm run install:all
```

### Development

```bash
# Start frontend + backend concurrently
npm run dev
```

Or run each service independently:

```bash
# Frontend — http://localhost:5173
cd frontend && npm run dev

# Backend — http://localhost:3000
cd backend && npm run dev

# GNN utilities
cd gnn && python export_dataset.py --help
```

---

## Configuration

No `.env` files are tracked. All runtime values must be provided as environment variables.

**Required (backend):**

```env
JWT_SECRET=           # Secret key for signing JWT tokens
DASHSCOPE_API_KEY=    # API key for AI provider integration
```

Additional variables may be needed depending on your runtime target, such as SMTP credentials or external AI endpoints.

---

## Scripts

| Command | Description |
|---|---|
| `npm run install:all` | Install dependencies for all workspaces |
| `npm run dev` | Start frontend and backend in watch mode |
| `npm run build` | Build frontend assets, then compile backend |
| `npm run start` | Launch the compiled production server |

---

## GNN Tools

The `gnn/` directory is intentionally separate from the frontend and backend source trees because it contains offline recommendation tooling rather than request-serving code.

Common entry points:

- `python train.py` trains the recommendation model
- `python generate_data.py` produces synthetic training data in `train_temp.db`
- `python export_dataset.py` exports research datasets from the shared database
- `python run_local.py` runs the download/train/upload helper flow for local experiments
- `python cleanup.py` performs GNN dataset maintenance tasks

The root [package.json](package.json) keeps the main application workflow minimal:

```bash
npm run install:all
npm run build
NODE_ENV=production JWT_SECRET=your-secret DASHSCOPE_API_KEY=your-key npm run start
```

This sequence installs dependencies, builds the frontend and backend, and starts the backend server that serves the compiled frontend in production mode.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, TypeScript 5, Vite, Tailwind CSS, Axios, Sentry |
| Backend | Node.js 18+, Express, TypeScript, Socket.IO, JWT, Nodemailer |
| Database | SQLite / libSQL |
| AI / ML | OpenAI-compatible APIs, Python GNN pipeline |
| Build System | npm workspaces, TypeScript, Vite, concurrently |

---

## Security

- `.env` files and secrets are excluded from version control via `.gitignore`
- All credentials are loaded exclusively from environment variables at runtime
- Public-facing templates use sanitized placeholder values
- The repository keeps deployment logic out of version control and relies on reproducible build steps instead

---

## Contributing

Contributions, issues, and feature requests are welcome. Please open an issue before submitting a pull request for significant changes.

---

## License

Apache 2.0 — see [LICENSE](./LICENSE) for details.
