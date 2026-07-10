## Database migrations

`backend/src/database/migrations/001_initial_schema.up.sql` initializes the PostgreSQL/Supabase schema from `docs/Database.md`.

The repository now also mirrors this schema into the standard Supabase CLI folder:

- `supabase/migrations/20260628181000_initial_schema.sql`

That mirror is refreshed by:

- `npm run db:sync`

What is included:

- 25 tables from the design document
- 23 PostgreSQL enum and shared lookup types
- Foreign keys, unique constraints, business check constraints, and the documented indexes
- Seed data for `roles`, `permissions`, and default `role_permissions`
- Core helper functions and triggers for `updated_at`, protected system users, shared status transition validation, booking status history, voucher validation, inventory decrease, notifications, and payment email logs

Companion rollback file:

- `backend/src/database/migrations/001_initial_schema.down.sql`

Checksum behavior:

- Production keeps strict checksum validation and fails startup if an applied migration file changes.
- Non-production environments automatically re-apply the canonical schema file and refresh the stored checksum when `001_initial_schema.up.sql` evolves.

Suggested apply options:

- `npm run db:push`
- `npm run db:push:dry-run`
- Supabase SQL Editor
- Any PostgreSQL migration runner that accepts raw SQL files

The repo now includes the `supabase` CLI as a root dev dependency for standard migration workflows.

### CLI requirements

Remote push needs one of these setups:

- `SUPABASE_DB_URL`
- or `SUPABASE_PROJECT_REF` plus `SUPABASE_DB_PASSWORD`

When the project is linked in CI or a fresh machine, Supabase also expects `SUPABASE_ACCESS_TOKEN`.

The wrapper script can infer `SUPABASE_PROJECT_REF` from `backend/.env` if `SUPABASE_URL` is present.

### Common commands

```bash
npm run db:sync
npm run db:link
npm run db:push:dry-run
npm run db:push
```

### Trigger session settings

Some helper functions read optional session settings when the application sets them before writes:

- `app.current_user_id`
- `app.status_change_reason`
- `app.user_agent`

If these settings are missing, the related audit fields fall back to `NULL`.

### RLS note

`docs/Database.md` contains RLS recommendations, but the current backend auth design is Express JWT + RBAC and does not define a direct `auth.uid()` mapping for Supabase policies. For that reason, this migration focuses on schema, constraints, seeds, and server-side triggers only.
