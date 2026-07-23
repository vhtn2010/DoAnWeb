CREATE TABLE IF NOT EXISTS service_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services (id),
  user_id UUID NULL REFERENCES users (id),
  display_name_snapshot VARCHAR(150) NOT NULL,
  content VARCHAR(1000) NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_service_comments_display_name
    CHECK (CHAR_LENGTH(BTRIM(display_name_snapshot)) BETWEEN 2 AND 150),
  CONSTRAINT chk_service_comments_content
    CHECK (CHAR_LENGTH(BTRIM(content)) BETWEEN 2 AND 1000)
);

CREATE INDEX IF NOT EXISTS idx_service_comments_service_visible
  ON service_comments (service_id, is_visible, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_comments_user_id
  ON service_comments (user_id)
  WHERE user_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_service_comments_set_updated_at ON service_comments;
CREATE TRIGGER trg_service_comments_set_updated_at
BEFORE UPDATE ON service_comments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
