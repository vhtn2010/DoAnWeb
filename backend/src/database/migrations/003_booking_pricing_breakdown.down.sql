ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS chk_bookings_amounts;

UPDATE bookings
SET total_amount = GREATEST(subtotal_amount - discount_amount, 0);

ALTER TABLE bookings
  DROP COLUMN IF EXISTS surcharge_amount,
  DROP COLUMN IF EXISTS service_fee_amount,
  DROP COLUMN IF EXISTS vat_amount;

ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_amounts
    CHECK (
      subtotal_amount >= 0
      AND discount_amount >= 0
      AND total_amount >= 0
      AND discount_amount <= subtotal_amount
      AND total_amount = subtotal_amount - discount_amount
    );
