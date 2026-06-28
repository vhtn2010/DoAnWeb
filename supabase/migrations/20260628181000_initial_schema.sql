BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM (
      'pending_verification',
      'active',
      'locked',
      'suspended',
      'disabled',
      'deleted'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_type') THEN
    CREATE TYPE service_type AS ENUM (
      'tour',
      'hotel',
      'room',
      'flight',
      'train',
      'combo'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_status') THEN
    CREATE TYPE service_status AS ENUM (
      'draft',
      'pending_review',
      'active',
      'hidden',
      'sold_out',
      'expired',
      'archived',
      'deleted'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cart_status') THEN
    CREATE TYPE cart_status AS ENUM (
      'active',
      'converted',
      'abandoned',
      'expired'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    CREATE TYPE booking_status AS ENUM (
      'pending_payment',
      'payment_processing',
      'paid',
      'confirmed',
      'in_progress',
      'completed',
      'cancel_requested',
      'cancelled',
      'refund_pending',
      'partially_refunded',
      'refunded',
      'failed',
      'expired'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_item_status') THEN
    CREATE TYPE booking_item_status AS ENUM (
      'pending',
      'confirmed',
      'cancelled',
      'completed',
      'refunded',
      'failed'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM (
      'initiated',
      'pending',
      'processing',
      'success',
      'failed',
      'cancelled',
      'expired',
      'partially_refunded',
      'refunded',
      'reconciled'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_status') THEN
    CREATE TYPE refund_status AS ENUM (
      'requested',
      'approved',
      'rejected',
      'processing',
      'success',
      'failed',
      'cancelled'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotion_status') THEN
    CREATE TYPE promotion_status AS ENUM (
      'draft',
      'active',
      'paused',
      'expired',
      'cancelled'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voucher_status') THEN
    CREATE TYPE voucher_status AS ENUM (
      'active',
      'disabled',
      'used_up',
      'expired'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_ticket_status') THEN
    CREATE TYPE support_ticket_status AS ENUM (
      'open',
      'assigned',
      'waiting_customer',
      'waiting_staff',
      'resolved',
      'closed',
      'spam'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
    CREATE TYPE notification_status AS ENUM (
      'queued',
      'sent',
      'delivered',
      'read',
      'failed'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_status') THEN
    CREATE TYPE email_status AS ENUM (
      'queued',
      'sent',
      'delivered',
      'opened',
      'bounced',
      'spam_reported',
      'failed'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  level SMALLINT NOT NULL CHECK (level >= 0),
  is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE,
  module VARCHAR(50) NOT NULL,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles (id),
  email CITEXT NOT NULL UNIQUE,
  phone VARCHAR(20) NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  avatar_url TEXT NULL,
  status user_status NOT NULL,
  email_verified_at TIMESTAMPTZ NULL,
  last_login_at TIMESTAMPTZ NULL,
  is_system_protected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT chk_users_system_protected_soft_delete
    CHECK (is_system_protected = FALSE OR deleted_at IS NULL)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles (id),
  permission_id UUID NOT NULL REFERENCES permissions (id),
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES users (id),
  action VARCHAR(100) NOT NULL,
  entity_name VARCHAR(100) NULL,
  entity_id UUID NULL,
  ip_address INET NULL,
  user_agent TEXT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code VARCHAR(30) NOT NULL UNIQUE,
  service_type service_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  short_description TEXT NULL,
  description TEXT NULL,
  provider_name VARCHAR(200) NULL,
  location_text VARCHAR(255) NULL,
  base_price NUMERIC(14, 2) NOT NULL CHECK (base_price >= 0),
  sale_price NUMERIC(14, 2) NULL CHECK (sale_price IS NULL OR sale_price >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'VND',
  status service_status NOT NULL,
  cancellation_policy TEXT NULL,
  metadata JSONB NULL,
  created_by UUID NULL REFERENCES users (id),
  updated_by UUID NULL REFERENCES users (id),
  approved_by UUID NULL REFERENCES users (id),
  approved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS tour_details (
  service_id UUID PRIMARY KEY REFERENCES services (id),
  departure_location VARCHAR(255) NOT NULL,
  destination_location VARCHAR(255) NOT NULL,
  duration_days SMALLINT NOT NULL CHECK (duration_days > 0),
  duration_nights SMALLINT NOT NULL CHECK (duration_nights >= 0),
  transport_type VARCHAR(50) NOT NULL,
  max_group_size INTEGER NULL CHECK (max_group_size IS NULL OR max_group_size > 0),
  departure_schedule JSONB NULL,
  itinerary JSONB NULL,
  included_services TEXT NULL,
  excluded_services TEXT NULL,
  terms TEXT NULL,
  CONSTRAINT chk_tour_details_transport_type
    CHECK (transport_type IN ('bus', 'flight', 'train', 'car', 'ship', 'mixed'))
);

CREATE TABLE IF NOT EXISTS hotel_details (
  service_id UUID PRIMARY KEY REFERENCES services (id),
  star_rating NUMERIC(2, 1) NULL CHECK (star_rating IS NULL OR (star_rating >= 0 AND star_rating <= 5)),
  address TEXT NOT NULL,
  checkin_time TIME NOT NULL,
  checkout_time TIME NOT NULL,
  amenities JSONB NULL,
  hotel_policy TEXT NULL
);

CREATE TABLE IF NOT EXISTS room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_service_id UUID NOT NULL REFERENCES services (id),
  name VARCHAR(150) NOT NULL,
  bed_type VARCHAR(100) NULL,
  max_adults SMALLINT NOT NULL CHECK (max_adults > 0),
  max_children SMALLINT NOT NULL DEFAULT 0 CHECK (max_children >= 0),
  total_rooms INTEGER NOT NULL CHECK (total_rooms >= 0),
  available_rooms INTEGER NOT NULL,
  base_price NUMERIC(14, 2) NOT NULL CHECK (base_price >= 0),
  description TEXT NULL,
  status service_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT chk_room_types_inventory
    CHECK (available_rooms >= 0 AND available_rooms <= total_rooms)
);

CREATE TABLE IF NOT EXISTS flight_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services (id),
  airline_name VARCHAR(150) NOT NULL,
  flight_number VARCHAR(30) NOT NULL,
  departure_airport VARCHAR(150) NOT NULL,
  arrival_airport VARCHAR(150) NOT NULL,
  departure_at TIMESTAMPTZ NOT NULL,
  arrival_at TIMESTAMPTZ NOT NULL,
  cabin_class VARCHAR(50) NOT NULL,
  seats_total INTEGER NOT NULL CHECK (seats_total >= 0),
  seats_available INTEGER NOT NULL,
  fare_price NUMERIC(14, 2) NOT NULL CHECK (fare_price >= 0),
  status VARCHAR(30) NOT NULL,
  CONSTRAINT chk_flight_details_inventory
    CHECK (seats_available >= 0 AND seats_available <= seats_total),
  CONSTRAINT chk_flight_details_cabin_class
    CHECK (cabin_class IN ('economy', 'premium_economy', 'business', 'first')),
  CONSTRAINT chk_flight_details_status
    CHECK (status IN ('open', 'full', 'cancelled', 'departed', 'completed'))
);

CREATE TABLE IF NOT EXISTS train_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services (id),
  train_number VARCHAR(30) NOT NULL,
  departure_station VARCHAR(150) NOT NULL,
  arrival_station VARCHAR(150) NOT NULL,
  departure_at TIMESTAMPTZ NOT NULL,
  arrival_at TIMESTAMPTZ NOT NULL,
  seat_class VARCHAR(50) NOT NULL,
  seats_total INTEGER NOT NULL CHECK (seats_total >= 0),
  seats_available INTEGER NOT NULL,
  fare_price NUMERIC(14, 2) NOT NULL CHECK (fare_price >= 0),
  status VARCHAR(30) NOT NULL,
  CONSTRAINT chk_train_details_inventory
    CHECK (seats_available >= 0 AND seats_available <= seats_total),
  CONSTRAINT chk_train_details_seat_class
    CHECK (seat_class IN ('hard_seat', 'soft_seat', 'sleeper', 'vip')),
  CONSTRAINT chk_train_details_status
    CHECK (status IN ('open', 'full', 'cancelled', 'departed', 'completed'))
);

CREATE TABLE IF NOT EXISTS service_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services (id),
  image_url TEXT NOT NULL,
  cloudinary_public_id VARCHAR(255) NULL UNIQUE,
  alt_text VARCHAR(255) NULL,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id),
  status cart_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT NULL,
  status promotion_status NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL,
  target_service_type service_type NULL,
  created_by UUID NULL REFERENCES users (id),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT chk_promotions_valid_window
    CHECK (valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions (id),
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_type VARCHAR(30) NOT NULL,
  discount_value NUMERIC(14, 2) NOT NULL CHECK (discount_value > 0),
  max_discount_amount NUMERIC(14, 2) NULL CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),
  min_order_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  usage_limit_total INTEGER NULL CHECK (usage_limit_total IS NULL OR usage_limit_total > 0),
  usage_limit_per_user INTEGER NOT NULL DEFAULT 1 CHECK (usage_limit_per_user > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  status voucher_status NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT chk_vouchers_discount_type
    CHECK (discount_type IN ('percent', 'fixed_amount')),
  CONSTRAINT chk_vouchers_valid_window
    CHECK (valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code VARCHAR(30) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users (id),
  status booking_status NOT NULL,
  contact_name VARCHAR(150) NOT NULL,
  contact_email CITEXT NOT NULL,
  contact_phone VARCHAR(20) NULL,
  subtotal_amount NUMERIC(14, 2) NOT NULL,
  discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'VND',
  voucher_id UUID NULL REFERENCES vouchers (id),
  note TEXT NULL,
  expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT chk_bookings_amounts
    CHECK (subtotal_amount >= 0 AND discount_amount >= 0 AND total_amount >= 0)
);

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts (id),
  service_id UUID NOT NULL REFERENCES services (id),
  service_type service_type NOT NULL,
  reference_id UUID NULL,
  start_at TIMESTAMPTZ NULL,
  end_at TIMESTAMPTZ NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_snapshot NUMERIC(14, 2) NOT NULL CHECK (unit_price_snapshot >= 0),
  options JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS booking_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings (id),
  service_id UUID NOT NULL REFERENCES services (id),
  service_type service_type NOT NULL,
  reference_id UUID NULL,
  title_snapshot VARCHAR(255) NOT NULL,
  start_at TIMESTAMPTZ NULL,
  end_at TIMESTAMPTZ NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price >= 0),
  total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
  status booking_item_status NOT NULL,
  traveller_info JSONB NULL,
  service_snapshot JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS booking_status_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings (id),
  from_status booking_status NULL,
  to_status booking_status NOT NULL,
  reason TEXT NULL,
  changed_by UUID NULL REFERENCES users (id),
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT chk_booking_status_histories_transition
    CHECK (from_status IS NULL OR from_status <> to_status)
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings (id),
  payment_code VARCHAR(50) NOT NULL UNIQUE,
  provider VARCHAR(30) NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  status payment_status NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'VND',
  provider_transaction_id VARCHAR(150) NULL,
  provider_order_id VARCHAR(150) NULL,
  checksum_verified BOOLEAN NOT NULL DEFAULT FALSE,
  raw_response JSONB NULL,
  paid_at TIMESTAMPTZ NULL,
  expired_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT chk_payments_provider
    CHECK (provider IN ('vnpay', 'momo', 'visa', 'mastercard', 'bank_transfer')),
  CONSTRAINT chk_payments_method
    CHECK (payment_method IN ('e_wallet', 'card', 'qr', 'bank_transfer'))
);

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_code VARCHAR(50) NOT NULL UNIQUE,
  booking_id UUID NOT NULL REFERENCES bookings (id),
  payment_id UUID NOT NULL REFERENCES payments (id),
  status refund_status NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  requested_by UUID NULL REFERENCES users (id),
  approved_by UUID NULL REFERENCES users (id),
  provider_refund_id VARCHAR(150) NULL,
  raw_response JSONB NULL,
  processed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code VARCHAR(30) NOT NULL UNIQUE,
  user_id UUID NULL REFERENCES users (id),
  booking_id UUID NULL REFERENCES bookings (id),
  service_id UUID NULL REFERENCES services (id),
  customer_name VARCHAR(150) NULL,
  customer_email CITEXT NULL,
  customer_phone VARCHAR(20) NULL,
  subject VARCHAR(255) NOT NULL,
  status support_ticket_status NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  assigned_to UUID NULL REFERENCES users (id),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ NULL,
  CONSTRAINT chk_support_tickets_priority
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

CREATE TABLE IF NOT EXISTS support_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets (id),
  sender_id UUID NULL REFERENCES users (id),
  sender_type VARCHAR(30) NOT NULL,
  message TEXT NOT NULL,
  is_internal_note BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT chk_support_replies_sender_type
    CHECK (sender_type IN ('customer', 'staff', 'admin', 'system'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES users (id),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  status notification_status NOT NULL,
  related_entity_name VARCHAR(100) NULL,
  related_entity_id UUID NULL,
  sent_at TIMESTAMPTZ NULL,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES users (id),
  booking_id UUID NULL REFERENCES bookings (id),
  to_email CITEXT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  template_code VARCHAR(100) NULL,
  status email_status NOT NULL,
  provider VARCHAR(30) NOT NULL DEFAULT 'sendgrid',
  provider_message_id VARCHAR(150) NULL,
  error_message TEXT NULL,
  sent_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users (role_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions (role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions (permission_id);
CREATE INDEX IF NOT EXISTS idx_services_type_status ON services (service_type, status);
CREATE INDEX IF NOT EXISTS idx_services_location_text ON services (location_text);
CREATE INDEX IF NOT EXISTS idx_services_price ON services (base_price);
CREATE INDEX IF NOT EXISTS idx_room_types_hotel_service_id ON room_types (hotel_service_id);
CREATE INDEX IF NOT EXISTS idx_flight_details_service_id ON flight_details (service_id);
CREATE INDEX IF NOT EXISTS idx_flight_details_departure_at ON flight_details (departure_at);
CREATE INDEX IF NOT EXISTS idx_train_details_service_id ON train_details (service_id);
CREATE INDEX IF NOT EXISTS idx_train_details_departure_at ON train_details (departure_at);
CREATE INDEX IF NOT EXISTS idx_service_images_service_id ON service_images (service_id);
CREATE INDEX IF NOT EXISTS idx_carts_user_status ON carts (user_id, status);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items (cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_service_id ON cart_items (service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON bookings (user_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking_id ON booking_items (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_service_id ON booking_items (service_id);
CREATE INDEX IF NOT EXISTS idx_booking_status_histories_booking_id ON booking_status_histories (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_status ON payments (booking_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_transaction ON payments (provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_refunds_booking_status ON refunds (booking_id, status);
CREATE INDEX IF NOT EXISTS idx_vouchers_code_status ON vouchers (code, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status ON support_tickets (user_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_status ON support_tickets (assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications (user_id, status);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_status ON email_logs (user_id, status);

CREATE OR REPLACE FUNCTION app_setting_text(p_key TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting(p_key, TRUE), '');
$$;

CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  setting_value TEXT;
BEGIN
  setting_value := app_setting_text('app.current_user_id');

  IF setting_value IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN setting_value::UUID;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION write_user_log(
  p_action TEXT,
  p_entity_name TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO user_logs (
    user_id,
    action,
    entity_name,
    entity_id,
    ip_address,
    user_agent,
    metadata,
    created_at
  )
  VALUES (
    app_current_user_id(),
    p_action,
    p_entity_name,
    p_entity_id,
    inet_client_addr(),
    app_setting_text('app.user_agent'),
    p_metadata,
    NOW()
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_delete_system_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_system_protected THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'system protected users cannot be deleted';
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      RAISE EXCEPTION 'system protected users cannot be soft deleted';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION log_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO booking_status_histories (
      booking_id,
      from_status,
      to_status,
      reason,
      changed_by,
      created_at
    )
    VALUES (
      NEW.id,
      NULL,
      NEW.status,
      app_setting_text('app.status_change_reason'),
      app_current_user_id(),
      NOW()
    );

    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO booking_status_histories (
      booking_id,
      from_status,
      to_status,
      reason,
      changed_by,
      created_at
    )
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      app_setting_text('app.status_change_reason'),
      app_current_user_id(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_voucher_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  voucher_record vouchers%ROWTYPE;
  active_user_usage_count INTEGER;
BEGIN
  IF NEW.voucher_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT *
  INTO voucher_record
  FROM vouchers
  WHERE id = NEW.voucher_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'voucher % does not exist', NEW.voucher_id;
  END IF;

  IF voucher_record.status <> 'active' THEN
    RAISE EXCEPTION 'voucher % is not active', voucher_record.code;
  END IF;

  IF NOW() < voucher_record.valid_from OR NOW() > voucher_record.valid_to THEN
    RAISE EXCEPTION 'voucher % is outside the valid time window', voucher_record.code;
  END IF;

  IF NEW.subtotal_amount < voucher_record.min_order_amount THEN
    RAISE EXCEPTION 'booking subtotal does not meet the voucher minimum order amount';
  END IF;

  IF voucher_record.max_discount_amount IS NOT NULL
     AND NEW.discount_amount > voucher_record.max_discount_amount THEN
    RAISE EXCEPTION 'booking discount exceeds the voucher maximum discount amount';
  END IF;

  IF voucher_record.usage_limit_total IS NOT NULL
     AND voucher_record.used_count >= voucher_record.usage_limit_total THEN
    RAISE EXCEPTION 'voucher % has reached the total usage limit', voucher_record.code;
  END IF;

  SELECT COUNT(*)
  INTO active_user_usage_count
  FROM bookings
  WHERE user_id = NEW.user_id
    AND voucher_id = NEW.voucher_id
    AND id <> NEW.id
    AND status NOT IN ('cancelled', 'failed', 'expired');

  IF active_user_usage_count >= voucher_record.usage_limit_per_user THEN
    RAISE EXCEPTION 'user has reached the per-user voucher usage limit for %', voucher_record.code;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION decrease_inventory_after_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  item_record RECORD;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'confirmed' THEN
    FOR item_record IN
      SELECT reference_id, service_type, quantity
      FROM booking_items
      WHERE booking_id = NEW.id
        AND reference_id IS NOT NULL
    LOOP
      IF item_record.service_type IN ('hotel', 'room') THEN
        UPDATE room_types
        SET available_rooms = available_rooms - item_record.quantity
        WHERE id = item_record.reference_id
          AND available_rooms >= item_record.quantity;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'insufficient room inventory for reference %', item_record.reference_id;
        END IF;
      ELSIF item_record.service_type = 'flight' THEN
        UPDATE flight_details
        SET seats_available = seats_available - item_record.quantity
        WHERE id = item_record.reference_id
          AND seats_available >= item_record.quantity;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'insufficient flight inventory for reference %', item_record.reference_id;
        END IF;
      ELSIF item_record.service_type = 'train' THEN
        UPDATE train_details
        SET seats_available = seats_available - item_record.quantity
        WHERE id = item_record.reference_id
          AND seats_available >= item_record.quantity;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'insufficient train inventory for reference %', item_record.reference_id;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION create_notification_on_booking_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO notifications (
      user_id,
      title,
      body,
      type,
      status,
      related_entity_name,
      related_entity_id,
      sent_at,
      read_at,
      created_at
    )
    VALUES (
      NEW.user_id,
      'Booking status updated',
      format('Booking %s is now %s', NEW.booking_code, NEW.status),
      'booking_status',
      'queued',
      'bookings',
      NEW.id,
      NULL,
      NULL,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION create_email_log_on_payment_success()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  booking_record bookings%ROWTYPE;
BEGIN
  IF NEW.status = 'success'
     AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
    SELECT *
    INTO booking_record
    FROM bookings
    WHERE id = NEW.booking_id;

    IF FOUND THEN
      INSERT INTO email_logs (
        user_id,
        booking_id,
        to_email,
        subject,
        template_code,
        status,
        provider,
        sent_at,
        created_at
      )
      VALUES (
        booking_record.user_id,
        booking_record.id,
        booking_record.contact_email,
        format('Booking %s payment received', booking_record.booking_code),
        'booking_payment_success',
        'queued',
        'sendgrid',
        NULL,
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_roles_set_updated_at ON roles;
CREATE TRIGGER trg_roles_set_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_services_set_updated_at ON services;
CREATE TRIGGER trg_services_set_updated_at
BEFORE UPDATE ON services
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_room_types_set_updated_at ON room_types;
CREATE TRIGGER trg_room_types_set_updated_at
BEFORE UPDATE ON room_types
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_carts_set_updated_at ON carts;
CREATE TRIGGER trg_carts_set_updated_at
BEFORE UPDATE ON carts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_bookings_set_updated_at ON bookings;
CREATE TRIGGER trg_bookings_set_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_payments_set_updated_at ON payments;
CREATE TRIGGER trg_payments_set_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_promotions_set_updated_at ON promotions;
CREATE TRIGGER trg_promotions_set_updated_at
BEFORE UPDATE ON promotions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_support_tickets_set_updated_at ON support_tickets;
CREATE TRIGGER trg_support_tickets_set_updated_at
BEFORE UPDATE ON support_tickets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_prevent_delete_system_admin ON users;
CREATE TRIGGER trg_users_prevent_delete_system_admin
BEFORE DELETE OR UPDATE OF deleted_at ON users
FOR EACH ROW
EXECUTE FUNCTION prevent_delete_system_admin();

DROP TRIGGER IF EXISTS trg_bookings_validate_voucher_usage ON bookings;
CREATE TRIGGER trg_bookings_validate_voucher_usage
BEFORE INSERT OR UPDATE OF voucher_id, subtotal_amount, discount_amount, total_amount, user_id ON bookings
FOR EACH ROW
EXECUTE FUNCTION validate_voucher_usage();

DROP TRIGGER IF EXISTS trg_bookings_10_log_booking_status_change ON bookings;
CREATE TRIGGER trg_bookings_10_log_booking_status_change
AFTER INSERT OR UPDATE OF status ON bookings
FOR EACH ROW
EXECUTE FUNCTION log_booking_status_change();

DROP TRIGGER IF EXISTS trg_bookings_20_decrease_inventory_after_confirm ON bookings;
CREATE TRIGGER trg_bookings_20_decrease_inventory_after_confirm
AFTER UPDATE OF status ON bookings
FOR EACH ROW
EXECUTE FUNCTION decrease_inventory_after_confirm();

DROP TRIGGER IF EXISTS trg_bookings_30_create_notification_on_booking_change ON bookings;
CREATE TRIGGER trg_bookings_30_create_notification_on_booking_change
AFTER UPDATE OF status ON bookings
FOR EACH ROW
EXECUTE FUNCTION create_notification_on_booking_change();

DROP TRIGGER IF EXISTS trg_payments_create_email_log_on_success ON payments;
CREATE TRIGGER trg_payments_create_email_log_on_success
AFTER INSERT OR UPDATE OF status ON payments
FOR EACH ROW
EXECUTE FUNCTION create_email_log_on_payment_success();

INSERT INTO roles (
  code,
  name,
  description,
  level,
  is_system_role,
  created_at,
  updated_at
)
VALUES
  ('customer', 'Customer', 'Customer role', 10, TRUE, NOW(), NOW()),
  ('staff', 'Staff', 'Operations staff role', 50, TRUE, NOW(), NOW()),
  ('admin', 'Admin', 'Business administrator role', 80, TRUE, NOW(), NOW()),
  ('system_admin', 'System Admin', 'System administrator role', 100, TRUE, NOW(), NOW())
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  is_system_role = EXCLUDED.is_system_role,
  updated_at = EXCLUDED.updated_at;

INSERT INTO permissions (
  code,
  module,
  resource,
  action,
  description,
  created_at
)
VALUES
  ('user.read_self', 'user', 'user', 'read_self', 'Read own user profile', NOW()),
  ('user.update_self', 'user', 'user', 'update_self', 'Update own user profile', NOW()),
  ('user.read_all', 'user', 'user', 'read_all', 'Read all user profiles', NOW()),
  ('user.update_status', 'user', 'user', 'update_status', 'Update user status', NOW()),
  ('role.read', 'rbac', 'role', 'read', 'Read roles', NOW()),
  ('role.create', 'rbac', 'role', 'create', 'Create roles', NOW()),
  ('role.update', 'rbac', 'role', 'update', 'Update roles', NOW()),
  ('role.delete', 'rbac', 'role', 'delete', 'Delete roles', NOW()),
  ('permission.assign', 'rbac', 'permission', 'assign', 'Assign permissions to roles', NOW()),
  ('service.read', 'service', 'service', 'read', 'Read services', NOW()),
  ('service.create', 'service', 'service', 'create', 'Create services', NOW()),
  ('service.update', 'service', 'service', 'update', 'Update services', NOW()),
  ('service.hide', 'service', 'service', 'hide', 'Hide services', NOW()),
  ('service.delete', 'service', 'service', 'delete', 'Delete services', NOW()),
  ('service.approve', 'service', 'service', 'approve', 'Approve services', NOW()),
  ('booking.create', 'booking', 'booking', 'create', 'Create bookings', NOW()),
  ('booking.read_self', 'booking', 'booking', 'read_self', 'Read own bookings', NOW()),
  ('booking.read_all', 'booking', 'booking', 'read_all', 'Read all bookings', NOW()),
  ('booking.update_status', 'booking', 'booking', 'update_status', 'Update booking status', NOW()),
  ('booking.cancel', 'booking', 'booking', 'cancel', 'Cancel bookings', NOW()),
  ('payment.create', 'payment', 'payment', 'create', 'Create payments', NOW()),
  ('payment.read_self', 'payment', 'payment', 'read_self', 'Read own payments', NOW()),
  ('payment.read_all', 'payment', 'payment', 'read_all', 'Read all payments', NOW()),
  ('payment.reconcile', 'payment', 'payment', 'reconcile', 'Reconcile payments', NOW()),
  ('refund.request', 'refund', 'refund', 'request', 'Request refunds', NOW()),
  ('refund.approve', 'refund', 'refund', 'approve', 'Approve refunds', NOW()),
  ('refund.process', 'refund', 'refund', 'process', 'Process refunds', NOW()),
  ('refund.read_all', 'refund', 'refund', 'read_all', 'Read all refunds', NOW()),
  ('promotion.create', 'promotion', 'promotion', 'create', 'Create promotions', NOW()),
  ('promotion.update', 'promotion', 'promotion', 'update', 'Update promotions', NOW()),
  ('promotion.delete', 'promotion', 'promotion', 'delete', 'Delete promotions', NOW()),
  ('voucher.create', 'promotion', 'voucher', 'create', 'Create vouchers', NOW()),
  ('voucher.apply', 'promotion', 'voucher', 'apply', 'Apply vouchers', NOW()),
  ('support.create', 'support', 'ticket', 'create', 'Create support tickets', NOW()),
  ('support.read_self', 'support', 'ticket', 'read_self', 'Read own support tickets', NOW()),
  ('support.reply', 'support', 'ticket', 'reply', 'Reply to support tickets', NOW()),
  ('support.assign', 'support', 'ticket', 'assign', 'Assign support tickets', NOW()),
  ('support.close', 'support', 'ticket', 'close', 'Close support tickets', NOW()),
  ('dashboard.read', 'admin', 'dashboard', 'read', 'Read dashboard data', NOW()),
  ('report.export', 'admin', 'report', 'export', 'Export reports', NOW()),
  ('audit.read', 'admin', 'audit', 'read', 'Read audit logs', NOW()),
  ('email_log.read', 'mail', 'email_log', 'read', 'Read email logs', NOW()),
  ('email.send', 'mail', 'email', 'send', 'Send emails', NOW()),
  ('notification.create', 'notification', 'notification', 'create', 'Create notifications', NOW()),
  ('notification.read_self', 'notification', 'notification', 'read_self', 'Read own notifications', NOW()),
  ('notification.broadcast', 'notification', 'notification', 'broadcast', 'Broadcast notifications', NOW()),
  ('system_setting.manage', 'system', 'system_setting', 'manage', 'Manage system settings', NOW()),
  ('system_admin.manage', 'system', 'system_admin', 'manage', 'Manage system administrators', NOW())
ON CONFLICT (code) DO UPDATE
SET
  module = EXCLUDED.module,
  resource = EXCLUDED.resource,
  action = EXCLUDED.action,
  description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
JOIN permissions p ON p.code IN (
  'user.read_self',
  'user.update_self',
  'service.read',
  'booking.create',
  'booking.read_self',
  'booking.cancel',
  'payment.create',
  'payment.read_self',
  'voucher.apply',
  'support.create',
  'support.read_self',
  'notification.read_self'
)
WHERE r.code = 'customer'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
JOIN permissions p ON p.code IN (
  'user.read_self',
  'user.update_self',
  'service.read',
  'service.create',
  'service.update',
  'booking.read_all',
  'booking.update_status',
  'booking.cancel',
  'payment.read_all',
  'refund.request',
  'refund.read_all',
  'promotion.create',
  'promotion.update',
  'voucher.create',
  'voucher.apply',
  'support.reply',
  'support.assign',
  'support.close',
  'email_log.read',
  'email.send',
  'notification.create',
  'notification.read_self'
)
WHERE r.code = 'staff'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
JOIN permissions p ON p.code IN (
  'user.read_self',
  'user.update_self',
  'user.read_all',
  'user.update_status',
  'role.read',
  'role.create',
  'role.update',
  'permission.assign',
  'service.read',
  'service.create',
  'service.update',
  'service.hide',
  'service.delete',
  'service.approve',
  'booking.read_all',
  'booking.update_status',
  'booking.cancel',
  'payment.read_all',
  'payment.reconcile',
  'refund.request',
  'refund.approve',
  'refund.process',
  'refund.read_all',
  'promotion.create',
  'promotion.update',
  'promotion.delete',
  'voucher.create',
  'voucher.apply',
  'support.reply',
  'support.assign',
  'support.close',
  'dashboard.read',
  'report.export',
  'audit.read',
  'email_log.read',
  'email.send',
  'notification.create',
  'notification.read_self',
  'notification.broadcast'
)
WHERE r.code = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'system_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
