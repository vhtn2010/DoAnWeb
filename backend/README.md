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

Swagger UI co the xem tai `http://localhost:3000/swagger-ui/index.html`.
Alias noi bo cung ton tai tai `http://localhost:3000/api/docs/index.html`.
OpenAPI JSON co tai `http://localhost:3000/swagger-ui/openapi.json`.
Spec duoc sinh tu dong tu cac route dang mount trong Express, nen khi them API moi vao app thi Swagger se tu cap nhat sau khi backend restart.

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

## Cloudinary core

Backend da co san core upload anh Cloudinary de dung lai o service/controller ve sau:

- `src/config/cloudinary.js`
- `src/services/cloudinaryService.js`
- `src/utils/cloudinary.js`

Bien moi truong lien quan:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER`
- `CLOUDINARY_REQUEST_TIMEOUT_MS`

Vi du su dung:

```js
const {
  buildImageUrl,
  deleteImage,
  uploadImage,
} = require('./src/services/cloudinaryService');

const uploaded = await uploadImage(
  {
    path: 'D:/tmp/hero.jpg',
  },
  {
    folder: 'net-viet-travel/tours',
    publicId: 'ha-long-hero',
    tags: ['tour', 'hero'],
  },
);

const imageUrl = buildImageUrl(uploaded.publicId, {
  transformation: ['w_1200,h_800,c_fill', 'q_auto,f_auto'],
});

await deleteImage(uploaded.publicId);
```

## SendGrid core

Backend da co san core gui mail SendGrid de dung lai o service/controller ve sau:

- `src/config/sendgrid.js`
- `src/services/sendgridService.js`
- `src/utils/sendgrid.js`

Bien moi truong lien quan:

- `SENDGRID_API_KEY`
- `SENDGRID_REQUEST_TIMEOUT_MS`
- `MAIL_FROM_EMAIL`
- `MAIL_FROM_NAME`

Vi du su dung:

```js
const {
  sendEmail,
  sendTemplateEmail,
} = require('./src/services/sendgridService');

await sendEmail({
  to: 'customer@example.com',
  subject: 'Xac nhan dat tour',
  html: '<strong>Cam on ban da dat tour</strong>',
  text: 'Cam on ban da dat tour',
  categories: ['booking', 'confirmation'],
  customArgs: {
    bookingId: 'BK-1001',
  },
});

await sendTemplateEmail({
  to: {
    email: 'customer@example.com',
    name: 'Nguyen Van A',
  },
  templateId: 'd-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  dynamicTemplateData: {
    bookingCode: 'BK-1001',
  },
});
```

## Endpoints

- `GET /api/health`: kiem tra trang thai API
- `GET /api/tours`: danh sach tour mau cho frontend tich hop
- `GET /swagger-ui/index.html`: giao dien Swagger UI
- `GET /swagger-ui/openapi.json`: OpenAPI specification
