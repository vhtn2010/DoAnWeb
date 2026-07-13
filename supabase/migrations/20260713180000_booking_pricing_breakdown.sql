ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS chk_bookings_amounts;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_fee_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS surcharge_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;

UPDATE bookings
SET
  vat_amount = COALESCE(vat_amount, 0),
  service_fee_amount = COALESCE(service_fee_amount, 0),
  surcharge_amount = COALESCE(surcharge_amount, 0);

ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_amounts
    CHECK (
      subtotal_amount >= 0
      AND discount_amount >= 0
      AND vat_amount >= 0
      AND service_fee_amount >= 0
      AND surcharge_amount >= 0
      AND total_amount >= 0
      AND discount_amount <= subtotal_amount
      AND total_amount = subtotal_amount - discount_amount + vat_amount + service_fee_amount + surcharge_amount
    );
