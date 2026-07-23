CREATE TABLE IF NOT EXISTS service_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings (id),
  booking_item_id UUID NOT NULL REFERENCES booking_items (id),
  service_id UUID NOT NULL REFERENCES services (id),
  user_id UUID NOT NULL REFERENCES users (id),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment VARCHAR(2000) NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_service_reviews_booking_item_user UNIQUE (booking_item_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_service_reviews_service_visible
  ON service_reviews (service_id, is_visible, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_reviews_booking_id
  ON service_reviews (booking_id);

DROP TRIGGER IF EXISTS trg_service_reviews_set_updated_at ON service_reviews;
CREATE TRIGGER trg_service_reviews_set_updated_at
BEFORE UPDATE ON service_reviews
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
