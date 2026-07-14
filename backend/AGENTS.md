# Backend Contributor Guide

## Scope

This file applies to all work under `backend/`. Follow the root `AGENTS.md` first, then these backend-specific rules.

## Backend Capabilities

Use the backend to build JSON APIs, service integrations, database workflows, and domain rules for the travel booking system. Current implemented areas include health checks, Supabase connectivity checks, Cloudinary helpers, SendGrid helpers, shared error handling, and database migration tooling.

## Structure Rules

- Keep `src/app.js` focused on Express wiring: middleware, route registration, 404, and error handling.
- Keep `src/server.js` focused on startup, shutdown, and database initialization.
- Put request handlers in `src/controllers/` when endpoints grow beyond simple smoke routes.
- Put business logic in `src/services/`; do not pass Express `req` and `res` deep into services.
- Put reusable request middleware in `src/middleware/`.
- Put database access, migration helpers, and persistence concerns in `src/database/`.
- Put shared values in `src/constants/`, custom errors in `src/exceptions/`, and small helpers in `src/utils/`.

## API Rules

Return consistent JSON envelopes through the existing response middleware. Use explicit HTTP status codes and stable error codes from `src/constants/domainConstraints.js`. Validate request input before service calls. For new write flows such as checkout, payment confirmation, or refund processing, design for idempotency and transaction safety.

## Database Rules

Treat `backend/src/database/migrations/001_initial_schema.up.sql` as the canonical schema source and mirror it with `npm run db:sync`. Keep migrations aligned with `docs/Database.md` and `docs/API_Contract.md`. Run:

```bash
npm --prefix backend run db:validate-migration
```

## Testing Rules

Use `node:test` and `node:assert/strict`. Add or update tests for every new public endpoint, service integration, error path, or database helper. Tests should import `src/app.js` and listen on port `0` when exercising HTTP behavior.

## Done Checklist

- Logic is in the right layer.
- Response shape and error code are consistent.
- New behavior has tests or a clear reason why not.
- Database changes pass migration validation and sync.
- `npm --prefix backend test` passes when dependencies are installed.
