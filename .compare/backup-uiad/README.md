# Net Viet Travel

Monorepo gom:

- `frontend`: React + Vite
- `backend`: Express API

## Yeu cau

- Node.js 22+
- npm

## Cai dat

```bash
cd frontend
npm install
copy .env.example .env

cd ..\backend
npm install
copy .env.example .env
```

## Chay phat trien

Mo 2 terminal:

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- Health check: `http://localhost:3000/api/health`

## Kiem tra

Tu thu muc goc:

```bash
npm run check
```

Hoac chay rieng:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix backend test
```

## Bien moi truong

Backend:

- `PORT`: cong HTTP, mac dinh `3000`
- `NODE_ENV`: moi truong chay
- `CORS_ORIGIN`: origin frontend duoc phep goi API

Frontend:

- `VITE_API_URL`: URL API, mac dinh trong app la `/api`

## Docker backend

```bash
cd backend
docker build -t net-viet-travel-api .
docker run --rm -p 3000:3000 --env-file .env net-viet-travel-api
```

## Docker frontend

```bash
cd frontend
docker build -t net-viet-travel-frontend .
docker run --rm -p 8080:80 net-viet-travel-frontend
```

## GitHub Actions

CI workflow nam o [.github/workflows/ci.yml](D:/a2024START/net-viet-travel/.github/workflows/ci.yml).

Workflow nay se:

- lint va build frontend
- build Docker image cho frontend de xac nhan dong goi production
- chay test backend
- build Docker image cho backend de xac nhan Dockerfile deploy duoc

Workflow chay khi mo `pull_request`, khi `push` len nhanh `main` hoac `master`, va co the chay tay qua `workflow_dispatch`.
