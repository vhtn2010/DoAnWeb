# Net Viet Travel Backend

Express API cho du an Net Viet Travel.

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

API mac dinh chay tai `http://localhost:3000`.

Neu `SUPABASE_DB_URL` hoac `DATABASE_URL` duoc cau hinh, backend se tu dong:

- kiem tra bang lich su migration
- so sanh cac file `src/database/migrations/*.up.sql`
- apply cac migration con thieu truoc khi server bat dau listen

Bien moi truong lien quan:

- `SUPABASE_DB_URL`: chuoi ket noi PostgreSQL/Supabase
- `SUPABASE_DB_POOLER_URL`: uu tien dung pooler URL neu direct DB host cua Supabase chi ho tro IPv6
- `DB_AUTO_MIGRATE=true`: bat tu dong migrate khi startup
- `DB_MIGRATE_STRICT=false`: neu `true`, loi migrate hoac thieu DB config se chan server khoi dong
- `DB_SSL=true`: bat SSL khi ket noi DB

Neu muon chay migrate thu cong:

```bash
npm run db:migrate
```

## Scripts

- `npm run dev`: chay server voi nodemon
- `npm start`: chay server Node
- `npm test`: chay test Node built-in
- `npm run db:migrate`: chay migrate thu cong bang backend runner

## Endpoints

- `GET /api/health`: kiem tra trang thai API
- `GET /api/tours`: danh sach tour mau cho frontend tich hop
