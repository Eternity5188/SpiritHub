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

SpiritHub is a full-stack monorepo that merges a social community platform with AI-powered creator tooling and a graph neural network recommendation engine — all operated from a single codebase.

| Layer | What it does |
|---|---|
| **Community** | Feed, posts, comments, friends, leaderboard, profiles, notifications |
| **Collaboration** | CoLab projects, science groups, rooms, shared events |
| **AI Toolkit** | Chat assistant, copywriting, content risk detection, domain workflows |
| **Recommendations** | GNN training pipeline with personalized, graph-based suggestions |
| **Operations** | CI/CD, deploy scripts, Nginx config, PM2 process management |

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
│   ├── generate.py         # Synthetic dataset generation
│   └── upload.py           # Recommendation upload + refresh
├── .github/
│   └── workflows/
│       └── ci-cd.yml       # Build, test, and deploy pipeline
├── deploy.sh               # Production bootstrap script
├── backup.sh               # Database backup + recovery
├── nginx-lingjing.conf     # Reverse proxy configuration
├── ecosystem.config.js     # PM2 process management
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
cd gnn && python run_local.py --help
```

---

## Configuration

No `.env` files are tracked. All runtime values must be provided as environment variables.

**Required (backend):**

```env
JWT_SECRET=           # Secret key for signing JWT tokens
DASHSCOPE_API_KEY=    # API key for AI provider integration
```

Additional variables may be needed depending on your deployment (SMTP credentials, domain config, infrastructure paths). See `backend/.env.example` for the full reference.

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

Production operational templates are included at the repo root. These files use placeholder values and are meant to be adapted for your infrastructure.

| File | Purpose |
|---|---|
| `.github/workflows/ci-cd.yml` | Automated CI/CD pipeline |
| `deploy.sh` | End-to-end server bootstrap |
| `backup.sh` | Database backup and restore |
| `nginx-lingjing.conf` | Reverse proxy config |
| `ecosystem.config.js` | PM2 process configuration |

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, TypeScript 5, Vite, Tailwind CSS, Axios, Sentry |
| Backend | Node.js 18+, Express, TypeScript, Socket.IO, JWT, Nodemailer |
| Database | SQLite / libSQL |
| AI / ML | OpenAI-compatible APIs, Python GNN pipeline |
| DevOps | GitHub Actions, PM2, Nginx |

---

## Security

- `.env` files and secrets are excluded from version control via `.gitignore`
- All credentials are loaded exclusively from environment variables at runtime
- Public-facing templates use sanitized placeholder values
- Dependencies are scanned on each CI run

---

## Contributing

Contributions, issues, and feature requests are welcome. Please open an issue before submitting a pull request for significant changes.

---

## License

Apache 2.0 — see [LICENSE](./LICENSE) for details.
