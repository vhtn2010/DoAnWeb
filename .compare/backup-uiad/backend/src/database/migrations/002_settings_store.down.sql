BEGIN;

DROP TRIGGER IF EXISTS trg_settings_store_set_updated_at ON settings_store;
DROP TABLE IF EXISTS settings_store;

COMMIT;
