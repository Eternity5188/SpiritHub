<div align="center">
  <br />
  <img src="./frontend/public/logo.png" alt="SpiritHub" width="220" />
  <br /><br />

  <p><strong>AI-native community platform for collaboration, creator tooling, and graph-based personalization.</strong></p>

  [![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
  [![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
  [![Python](https://img.shields.io/badge/Python-3.10+-3776ab?style=flat-square&logo=python&logoColor=white)](https://python.org)
  [![License](https://img.shields.io/badge/License-Apache%202.0-fa7343?style=flat-square)](./LICENSE)
  [![Live Demo](https://img.shields.io/badge/Live%20Demo-lcplatform.cn-6366f1?style=flat-square&logo=googlechrome&logoColor=white)](https://lcplatform.cn)

  <br />

  [Overview](#-overview) · [Quick Start](#-quick-start) · [Architecture](#-architecture) · [Contributing](#-contributing) · [**🌐 Live Demo**](https://lcplatform.cn)

  <br />
</div>

---

## 📦 Overview

SpiritHub is a reproducible full-stack monorepo combining a social community platform, AI-powered creator tooling, and a GNN recommendation pipeline. It is **local-first** — clone and run with minimal setup.

> 🌐 **Live deployment:** [lcplatform.cn](https://lcplatform.cn) · Fallback: [43.162.101.88](http://43.162.101.88)

| Layer | What it does |
|---|---|
| 🏘 **Community** | Feed, posts, comments, friends, leaderboard, profiles, notifications |
| 🔬 **Collaboration** | CoLab projects, science groups, rooms, shared events |
| 🤖 **AI Toolkit** | Chat assistant, copywriting, content risk detection, domain workflows |
| 🧠 **Recommendations** | GNN training, dataset export, synthetic data generation |
| ⚙️ **Build** | Frontend + backend workspace scripts for local and production builds |

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| ![Node](https://img.shields.io/badge/-Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white) | 18+ |
| ![npm](https://img.shields.io/badge/-npm-CB3837?style=flat-square&logo=npm&logoColor=white) | 9+ |
| ![Python](https://img.shields.io/badge/-Python-3776ab?style=flat-square&logo=python&logoColor=white) | 3.10+ |

### ⚡ One-Click (recommended)

```bash
npm run setup
```

Installs all dependencies, generates `backend/.env`, and optionally starts the app. For non-interactive defaults: `npm run setup:quick`.

### 🛠 Manual

```bash
npm run install:all          # install all workspace dependencies

cp backend/.env.example backend/.env   # Linux/macOS
# Copy-Item backend/.env.example backend/.env  # Windows

npm run dev                  # start frontend + backend concurrently
```

Services run at `http://localhost:5173` (frontend) and `http://localhost:3001` (backend).

### Scripts

| Command | Description |
|---|---|
| `npm run setup` | Interactive one-click setup |
| `npm run setup:quick` | Non-interactive setup with defaults |
| `npm run install:all` | Install all workspace dependencies |
| `npm run dev` | Start frontend + backend in watch mode |
| `npm run build` | Build frontend assets and compile backend |
| `npm run start` | Launch compiled backend (serves frontend dist) |

---

## 📁 Repository Structure

```
spirithub/
├── frontend/               # React 18 + TypeScript + Vite
│   ├── src/                # Pages, components, hooks, lib, styles
│   └── public/             # Static assets
├── backend/                # Express + Socket.IO API
│   └── src/                # Routes, DB, auth, realtime, services
├── gnn/                    # Offline recommendation tooling
│   ├── train.py            # GNN training entry point
│   ├── run_local.py        # Download / train / upload helper
│   ├── generate_data.py    # Synthetic data generator
│   ├── export_dataset.py   # Production DB export
│   ├── cleanup.py          # Dataset maintenance
│   ├── requirements.txt    # Python dependencies
│   ├── train_temp.db       # Temporary training database
│   └── weights/            # Saved model weights
├── data/                   # Shared runtime data
├── package.json            # Root workspace scripts
└── LICENSE
```

---

## 🏗 Architecture

<div align="center">
  <img src="./assets/flowchart.png" alt="SpiritHub architecture flowchart" width="100%" />
</div>

<br />

The frontend communicates with the backend over HTTP REST and Socket.IO. In production, the backend serves built frontend assets directly. The GNN pipeline runs as a separate Python workflow, reading and writing shared data files independently.

---

## 🔒 Security

- `.env` files and secrets are excluded from version control via `.gitignore`
- All credentials load exclusively from environment variables at runtime
- Public templates use sanitized placeholder values

---

## 🤝 Contributing

Open an issue before submitting a pull request for significant changes. Contributions, bug reports, and feature requests are welcome.

---

## 📄 License

Apache 2.0 — see [LICENSE](./LICENSE) for details.
