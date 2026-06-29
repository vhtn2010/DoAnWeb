# Repository Guidelines

## Project Structure & Module Organization

Net Viet Travel is a JavaScript-only monorepo.

- `frontend/`: React 19 + Vite SPA. Source: `frontend/src/`; assets: `frontend/public/`; build: `frontend/build/`.
- `backend/`: Express 5 CommonJS API. Source: `backend/src/`; tests: `backend/src/tests/`; services: `backend/src/services/`.
- `backend/src/database/`: database config, migration runner, SQL migrations, and validation.
- `supabase/`: Supabase CLI config and mirrored migrations.
- `docs/`: SRS, API contract, and database design. Check before changing behavior.
- `scripts/`: repo automation such as checks and Supabase sync.

Read the nearest scoped guide before changing workspace code: `backend/AGENTS.md` for API work and `frontend/AGENTS.md` for UI work.

## Build, Test, and Development Commands

Install dependencies with `npm ci`.

- `npm run frontend:dev`: start Vite on `http://localhost:5173`.
- `npm run backend:dev`: start the API on `http://localhost:3000`.
- `npm run frontend:lint`: run Oxlint.
- `npm run frontend:build`: build to `frontend/build/`.
- `npm run backend:test`: run backend tests with `node:test`.
- `npm run check`: run frontend lint, frontend build, and backend tests.
- `npm --prefix backend run db:validate-migration`: verify schema objects and seed markers.
- `npm run db:sync`: mirror backend migrations into `supabase/migrations/`.
- `npm run db:push:dry-run`: preview Supabase changes.

## Coding Style & Architecture

Do not introduce TypeScript. Use `.js` for backend and `.js`/`.jsx` for frontend. Backend stays CommonJS; frontend stays ESM. Follow existing style: two-space indentation, backend semicolons, no semicolons in current frontend JSX.

Keep `backend/src/app.js` for app wiring and `backend/src/server.js` for startup/shutdown. As endpoints grow, place routes in `routes/`, handlers in `controllers/`, domain logic in `services/`, middleware in `middleware/`, and persistence in `database/`.

Frontend API calls should use `VITE_API_URL` or `/api` fallback and move to `services/` when reused. Keep route screens in pages, reusable UI in components, helpers in utils. UI changes should handle loading, empty, error, disabled, hover, and focus states where relevant.

## Testing Guidelines

Add or update backend tests for every new public endpoint. Name tests `*.test.js` under `backend/src/tests/`. Frontend changes should pass lint and build; backend changes should pass `npm run backend:test`; cross-workspace changes should pass `npm run check`.

## Commit & Pull Request Guidelines

Recent commits use short imperative summaries in Vietnamese or English, for example `Cau Hinh CI DB`. PRs should include a summary, tests run, linked task, screenshots for visible UI changes, and database validation notes when migrations change.

## Security & Configuration Tips

Use `.env.example` as templates. Keep Supabase service role keys, database URLs, SendGrid keys, JWT secrets, and Cloudinary secrets server-side only. Do not commit `node_modules/`, `build/`, `dist/`, or generated credentials.
