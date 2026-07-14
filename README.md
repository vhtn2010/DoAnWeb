# Net Viet Travel

Net Viet Travel là monorepo JavaScript cho hệ thống đặt dịch vụ du lịch, gồm frontend React + Vite và backend Express API.

## Công nghệ chính

- Frontend: React 19, Vite, React Router, CSS.
- Backend: Express 5 CommonJS, Node built-in test runner, PostgreSQL/Supabase.
- Database: SQL migrations trong `backend/src/database/migrations/`, mirror sang `supabase/migrations/`.
- Tích hợp tuỳ chọn: Supabase, Cloudinary, SendGrid, Redis rate limit.

## Cấu trúc thư mục

```text
net-viet-travel/
├─ frontend/                 React + Vite SPA
│  ├─ src/
│  ├─ public/
│  └─ build/
├─ backend/                  Express API
│  ├─ src/
│  ├─ src/database/
│  ├─ src/services/
│  └─ src/tests/
├─ supabase/                 Supabase CLI config và migrations mirror
├─ docs/                     SRS, API contract, database design
├─ scripts/                  Script kiểm tra và đồng bộ DB
└─ package.json              Workspace scripts
```

## Yêu cầu

- Node.js 22+
- npm
- Tài khoản Supabase nếu chạy API với database thật
- Tài khoản Cloudinary/SendGrid nếu dùng upload ảnh hoặc gửi email

## Cài đặt

Cài dependency từ thư mục gốc:

```bash
npm ci
```

Nếu chỉ muốn cài riêng từng workspace:

```bash
npm --prefix backend ci
npm --prefix frontend ci
```

## Cấu hình môi trường

Không commit file `.env`. Dùng `.env.example` làm mẫu và điền giá trị thật trên máy local hoặc môi trường deploy.

### Tạo file `.env`

PowerShell trên Windows:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

macOS/Linux/Git Bash:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Frontend `.env`

File: `frontend/.env`

| Biến | Ví dụ | Ghi chú |
| --- | --- | --- |
| `VITE_APP_NAME` | `Net Viet Travel` | Tên hiển thị của app. |
| `VITE_APP_ENV` | `development` | Môi trường frontend. |
| `VITE_API_URL` | `http://localhost:3000/api` | URL API backend. Giữ `/api` nếu backend dùng `API_PREFIX=/api`. |
| `VITE_FRONTEND_URL` | `http://localhost:5173` | URL frontend local. |
| `VITE_CLOUDINARY_CLOUD_NAME` | `your-cloud-name` | Chỉ là cloud name public. Không đưa API key/secret lên frontend. |

### Backend `.env`

File: `backend/.env`

#### App

| Biến | Ví dụ | Ghi chú |
| --- | --- | --- |
| `NODE_ENV` | `development` | Môi trường chạy server. |
| `PORT` | `3000` | Cổng backend. |
| `API_PREFIX` | `/api` | Prefix cho API routes. |
| `BACKEND_URL` | `http://localhost:3000` | URL backend. |
| `FRONTEND_URL` | `http://localhost:5173` | URL frontend. |
| `CORS_ORIGIN` | `http://localhost:5173` | Origin được phép gọi API. |

#### Supabase và database

| Biến | Ghi chú |
| --- | --- |
| `SUPABASE_URL` | URL project Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key, chỉ đặt ở backend/server. Không đưa lên frontend. |
| `SUPABASE_PROJECT_REF` | Project ref dùng cho workflow Supabase CLI. |
| `SUPABASE_DB_PASSWORD` | Database password của project Supabase. |
| `SUPABASE_DB_URL` | PostgreSQL connection string trực tiếp. |
| `SUPABASE_DB_POOLER_URL` | Pooler connection string, hữu ích khi direct host gặp giới hạn IPv6. |
| `DB_AUTO_MIGRATE` | `true` để tự chạy migration khi backend khởi động. |
| `DB_MIGRATE_STRICT` | `true` để chặn server khởi động nếu migrate lỗi hoặc thiếu DB config. |
| `DB_SSL` | Thường để `true` khi dùng Supabase. |
| `DB_SSL_REJECT_UNAUTHORIZED` | Production nên để `true`; local có proxy/self-signed CA có thể cần `false`. |
| `DB_SSL_CA` | CA certificate nếu môi trường yêu cầu. |

#### JWT và token bảo mật

Các biến sau nên là chuỗi bí mật dài, khác nhau giữa các môi trường:

```env
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
EMAIL_VERIFICATION_SECRET=
PASSWORD_RESET_SECRET=
CHANGE_EMAIL_SECRET=
```

Thời gian hết hạn mặc định trong `.env.example`:

```env
JWT_ACCESS_EXPIRES_IN=30m
JWT_REFRESH_EXPIRES_IN=7d
EMAIL_VERIFICATION_EXPIRES_IN_MINUTES=1440
PASSWORD_RESET_EXPIRES_IN_MINUTES=30
CHANGE_EMAIL_EXPIRES_IN_MINUTES=30
```

Có thể tạo secret local bằng Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Password hash

| Biến | Ví dụ | Ghi chú |
| --- | --- | --- |
| `BCRYPT_SALT_ROUNDS` | `10` | Số vòng salt khi hash mật khẩu. |

#### Cloudinary

Chỉ cấu hình ở backend:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=net-viet-travel
CLOUDINARY_REQUEST_TIMEOUT_MS=20000
```

#### SendGrid mail

```env
SENDGRID_API_KEY=
SENDGRID_REQUEST_TIMEOUT_MS=20000
MAIL_FROM_EMAIL=
MAIL_FROM_NAME=Net Viet Travel
```

#### Thanh toán trực tiếp

Các biến `DIRECT_PAYMENT_*` dùng để bật/tắt và cấu hình phương thức thanh toán thủ công:

- Tiền mặt tại văn phòng
- Chuyển khoản ngân hàng thủ công
- Nhân viên thu hộ

Nếu chưa dùng, có thể giữ các flag `*_ENABLED=false`.

#### Rate limit và logging

| Biến | Ghi chú |
| --- | --- |
| `RATE_LIMIT_WINDOW_MS` | Cửa sổ rate limit mặc định. |
| `RATE_LIMIT_MAX_REQUESTS` | Số request tối đa trong cửa sổ. |
| `RATE_LIMIT_STORE` | `memory` hoặc Redis nếu cấu hình `RATE_LIMIT_REDIS_URL`. |
| `LOG_LEVEL` | Ví dụ `debug`, `info`, `warn`, `error`. |
| `LOG_DIR` | Thư mục log backend. |
| `ENABLE_DEMO_ROUTES` | Bật/tắt demo routes. |
| `ENABLE_SUPABASE_TEST_ROUTE` | Bật/tắt route test Supabase. |

## Chạy phát triển

Mở 2 terminal từ thư mục gốc.

Terminal 1, chạy backend:

```bash
npm run backend:dev
```

Terminal 2, chạy frontend:

```bash
npm run frontend:dev
```

Mặc định:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000/api`
- Health check: `http://localhost:3000/api/health`
- Swagger UI: `http://localhost:3000/swagger-ui/index.html`
- Swagger alias: `http://localhost:3000/api/docs/index.html`

## Scripts thường dùng

Chạy từ thư mục gốc:

```bash
npm run frontend:dev
npm run backend:dev
npm run frontend:lint
npm run frontend:build
npm run backend:test
npm run check
```

Chạy trực tiếp trong workspace:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix backend test
```

## Database và Supabase

Kiểm tra migration backend:

```bash
npm --prefix backend run db:validate-migration
```

Chạy migration thủ công bằng backend runner:

```bash
npm --prefix backend run db:migrate
```

Đồng bộ migration từ backend sang Supabase:

```bash
npm run db:sync
```

Preview thay đổi trước khi push lên Supabase:

```bash
npm run db:push:dry-run
```

Push migration lên Supabase:

```bash
npm run db:push
```

## Kiểm tra chất lượng

Chạy toàn bộ kiểm tra chính:

```bash
npm run check
```

Lệnh này chạy frontend lint, frontend build và backend tests thông qua `scripts/check.js`.

## Docker

Backend:

```bash
cd backend
docker build -t net-viet-travel-api .
docker run --rm -p 3000:3000 --env-file .env net-viet-travel-api
```

Frontend:

```bash
cd frontend
docker build -t net-viet-travel-frontend .
docker run --rm -p 8080:80 net-viet-travel-frontend
```

Frontend container phục vụ app tại `http://localhost:8080`.

## Tài liệu liên quan

- `docs/SRS.md`: đặc tả yêu cầu phần mềm.
- `docs/API_Contract.md`: hợp đồng API.
- `docs/Database.md`: thiết kế database.
- `backend/README.md`: ghi chú backend chi tiết hơn.
- `frontend/README.md`: ghi chú frontend chi tiết hơn.

## Lưu ý bảo mật

- Không commit `.env`, credentials hoặc generated secrets.
- `SUPABASE_SERVICE_ROLE_KEY`, database URL, SendGrid key, JWT secrets và Cloudinary secret chỉ được đặt ở backend/server.
- Frontend chỉ dùng biến bắt đầu bằng `VITE_`, và mọi biến `VITE_` đều có thể bị lộ trong bundle trình duyệt.
