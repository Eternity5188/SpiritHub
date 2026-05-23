<div align="center">
  <br />
  <img src="./frontend/public/logo.png" alt="SpiritHub" width="260" />
  <br /><br />

  <p>
    <strong>AI-native community platform for collaboration, creator tooling, and graph-based personalization.</strong>
  </p>

  <p>
    <a href="#-overview">Overview</a> ·
    <a href="#-architecture">Architecture</a> ·
    <a href="#-quick-start">Quick Start</a> ·
    <a href="#%EF%B8%8F-configuration">Configuration</a> ·
    <a href="#-deployment">Deployment</a> ·
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

SpiritHub is a full-stack monorepo that merges a social community platform with AI-powered creator tooling and a graph neural network recommendation engine — all organized as source code for reproducible builds.

| Layer | What it does |
|---|---|
| **Community** | Feed, posts, comments, friends, leaderboard, profiles, notifications |
| **Collaboration** | CoLab projects, science groups, rooms, shared events |
| **AI Toolkit** | Chat assistant, copywriting, content risk detection, domain workflows |
| **Recommendations** | GNN training pipeline with personalized, graph-based suggestions |
| **Build** | Frontend + backend workspace scripts for local and production builds |

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

The frontend communicates with the backend over HTTP REST and Socket.IO. The GNN pipeline runs as a standalone Python process and writes recommendation data directly to the shared database, decoupling training from the request-serving path.

---

## Repository Structure

```
spirithub/
├── frontend/               # React app (Vite + TypeScript + Tailwind)
│   ├── src/
│   │   ├── pages/          # Route-level components
│   │   ├── components/     # Shared UI components
│   │   └── api/            # Typed client API layer
│   └── public/
├── backend/                # Express service (TypeScript)
│   ├── routes/             # Auth, social, collab, AI, realtime
│   ├── middleware/         # JWT, rate limiting, error handling
│   └── services/           # Business logic, external integrations
├── gnn/                    # Recommendation pipeline (Python)
│   ├── train.py            # GNN training entry point
│   ├── generate_data.py    # Synthetic dataset generation for training
│   └── export_dataset.py   # Production DB export for GNN research datasets
├── .github/
│   └── workflows/
└── package.json            # Root workspace scripts
```

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

Additional variables may be needed depending on your deployment target (SMTP credentials, domain config, or external AI endpoints).

---

## Scripts

| Command | Description |
|---|---|
| `npm run install:all` | Install dependencies for all workspaces |
| `npm run dev` | Start frontend and backend in watch mode |
| `npm run build` | Build frontend assets, then compile backend |
| `npm run start` | Launch the compiled production server |

---

## Deployment

The repository is designed so that deployment is reproducible from source code alone. The backend serves the built frontend in production, so there is no separate deployment script in the repo.

### Minimal Production Flow

```bash
npm run install:all
npm run build
NODE_ENV=production JWT_SECRET=your-secret DASHSCOPE_API_KEY=your-key npm run start
```

### What This Does

- `npm run install:all` installs backend and frontend dependencies
- `npm run build` produces `frontend/dist` and compiles the backend to `backend/dist`
- `npm run start` starts the backend server, which serves the built frontend in production mode

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
