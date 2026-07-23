CREATE TABLE IF NOT EXISTS user_saved_vouchers (
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  voucher_id UUID NOT NULL REFERENCES vouchers (id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, voucher_id)
);

CREATE INDEX IF NOT EXISTS idx_user_saved_vouchers_voucher_id
  ON user_saved_vouchers (voucher_id);
