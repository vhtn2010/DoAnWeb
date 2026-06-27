# Net Viet Travel Frontend

React + Vite frontend cho Net Viet Travel.

## Yeu cau

- Node.js 22+
- npm

## Cai dat

```bash
npm install
copy .env.example .env
```

## Chay local

```bash
npm run dev
```

Frontend mac dinh chay tai `http://localhost:5173`. Cac request `/api` duoc proxy ve backend `http://localhost:3000`.

## Scripts

- `npm run dev`: chay Vite dev server
- `npm run build`: build production vao thu muc `build`
- `npm run lint`: kiem tra code voi Oxlint
- `npm run preview`: preview ban build

## Docker

```bash
docker build -t net-viet-travel-frontend .
docker run --rm -p 8080:80 net-viet-travel-frontend
```

Container se phuc vu frontend qua Nginx tai `http://localhost:8080`.
