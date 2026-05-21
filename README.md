# SpiritHub Monorepo

SpiritHub is a full-stack platform for community collaboration, creator tooling, and AI-assisted workflows.

## Highlights

- Monorepo structure for frontend, backend, and GNN services
- Type-safe frontend and backend code paths
- CI-ready deployment scripts and release flow
- Secret-safe defaults (no hardcoded production credentials)

## Repository Layout

```text
lingjing-platform/
  frontend/   # React + TypeScript + Vite app
  backend/    # Node.js/Express APIs and realtime services
  gnn/        # Recommendation and graph-training pipeline
  data/       # Local datasets and generated artifacts
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Python 3.10+ (for gnn/)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Required runtime env vars include:

- `JWT_SECRET`
- `DASHSCOPE_API_KEY`

### GNN Pipeline

```bash
cd gnn
python run_local.py --help
```

## Security

- Secrets must be provided via environment variables only
- `.env*` and key files are excluded by `.gitignore`
- Do not commit production credentials, tokens, or private endpoints

## License

MIT
