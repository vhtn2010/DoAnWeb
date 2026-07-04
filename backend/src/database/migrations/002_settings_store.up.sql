BEGIN;

CREATE TABLE IF NOT EXISTS settings_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID NULL REFERENCES users (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_settings_store_setting_key
  ON settings_store (LOWER(setting_key));

CREATE INDEX IF NOT EXISTS idx_settings_store_updated_at
  ON settings_store (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_settings_store_updated_by
  ON settings_store (updated_by);

DROP TRIGGER IF EXISTS trg_settings_store_set_updated_at ON settings_store;
CREATE TRIGGER trg_settings_store_set_updated_at
  BEFORE UPDATE ON settings_store
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMIT;
