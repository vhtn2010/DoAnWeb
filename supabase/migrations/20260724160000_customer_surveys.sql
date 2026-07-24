CREATE TABLE IF NOT EXISTS customer_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  promotion_id UUID NOT NULL REFERENCES promotions (id),
  voucher_id UUID NOT NULL REFERENCES vouchers (id),
  residence_location VARCHAR(150) NOT NULL,
  nationality VARCHAR(100) NOT NULL,
  discovery_source VARCHAR(80) NOT NULL,
  discovery_source_other VARCHAR(200) NULL,
  travel_styles TEXT[] NOT NULL DEFAULT '{}',
  travel_style_other VARCHAR(200) NULL,
  favorite_destinations TEXT[] NOT NULL DEFAULT '{}',
  favorite_destination_other VARCHAR(200) NULL,
  budget_range VARCHAR(80) NOT NULL,
  travel_forms TEXT[] NOT NULL DEFAULT '{}',
  travel_form_other VARCHAR(200) NULL,
  preferred_contact_channel VARCHAR(80) NOT NULL,
  loyalty_intent VARCHAR(80) NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_customer_surveys_user UNIQUE (user_id),
  CONSTRAINT uq_customer_surveys_voucher UNIQUE (voucher_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_surveys_promotion_id
  ON customer_surveys (promotion_id);

CREATE INDEX IF NOT EXISTS idx_customer_surveys_completed_at
  ON customer_surveys (completed_at DESC);
