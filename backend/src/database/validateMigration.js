const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.join(
  __dirname,
  'migrations',
  '001_initial_schema.up.sql',
);

const sql = fs.readFileSync(migrationPath, 'utf8');

const expectedTables = [
  'users',
  'roles',
  'permissions',
  'role_permissions',
  'user_logs',
  'services',
  'tour_details',
  'hotel_details',
  'room_types',
  'flight_details',
  'train_details',
  'service_images',
  'carts',
  'cart_items',
  'bookings',
  'booking_items',
  'booking_status_histories',
  'payments',
  'refunds',
  'promotions',
  'vouchers',
  'support_tickets',
  'support_replies',
  'notifications',
  'email_logs',
];

const expectedEnums = [
  'user_status',
  'service_type',
  'service_status',
  'cart_status',
  'booking_status',
  'booking_item_status',
  'payment_status',
  'refund_status',
  'promotion_status',
  'voucher_status',
  'support_ticket_status',
  'notification_status',
  'email_status',
  'transport_type',
  'cabin_class',
  'transport_schedule_status',
  'seat_class',
  'discount_type',
  'payment_provider',
  'payment_method',
  'support_ticket_priority',
  'sender_type',
  'notification_type',
];

const expectedIndexes = [
  'idx_users_role_id',
  'idx_users_status',
  'idx_role_permissions_role_id',
  'idx_role_permissions_permission_id',
  'idx_services_type_status',
  'idx_services_location_text',
  'idx_services_price',
  'idx_room_types_hotel_service_id',
  'idx_flight_details_service_id',
  'idx_flight_details_departure_at',
  'idx_train_details_service_id',
  'idx_train_details_departure_at',
  'idx_service_images_service_id',
  'idx_carts_user_status',
  'uq_carts_one_active_per_user',
  'idx_cart_items_cart_id',
  'idx_cart_items_service_id',
  'idx_bookings_user_status',
  'idx_bookings_created_at',
  'idx_booking_items_booking_id',
  'idx_booking_items_service_id',
  'idx_booking_status_histories_booking_id',
  'idx_payments_booking_status',
  'idx_payments_provider_transaction',
  'idx_refunds_booking_status',
  'idx_vouchers_code_status',
  'idx_support_tickets_user_status',
  'idx_support_tickets_assigned_status',
  'idx_notifications_user_status',
  'idx_email_logs_user_status',
  'uq_service_images_one_primary_per_service',
];

const expectedFunctions = [
  'app_setting_text',
  'app_current_user_id',
  'write_user_log',
  'set_updated_at',
  'prevent_delete_system_admin',
  'validate_booking_status_transition',
  'validate_payment_status_transition',
  'validate_refund_status_transition',
  'log_booking_status_change',
  'validate_voucher_usage',
  'decrease_inventory_after_confirm',
  'create_notification_on_booking_change',
  'create_email_log_on_payment_success',
];

const missing = [];

const expectCreate = (kind, name, pattern) => {
  if (!pattern.test(sql)) {
    missing.push(`${kind}: ${name}`);
  }
};

for (const table of expectedTables) {
  expectCreate(
    'table',
    table,
    new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`, 'i'),
  );
}

for (const enumName of expectedEnums) {
  expectCreate(
    'enum',
    enumName,
    new RegExp(`CREATE TYPE ${enumName}\\b`, 'i'),
  );
}

for (const indexName of expectedIndexes) {
  expectCreate(
    'index',
    indexName,
    new RegExp(`CREATE (UNIQUE )?INDEX IF NOT EXISTS ${indexName}\\b`, 'i'),
  );
}

for (const functionName of expectedFunctions) {
  expectCreate(
    'function',
    functionName,
    new RegExp(`CREATE OR REPLACE FUNCTION ${functionName}\\b`, 'i'),
  );
}

const seedMarkers = [
  "'customer'",
  "'staff'",
  "'admin'",
  "'system_admin'",
  "'profile.read_self'",
  "'service.read_all'",
  "'booking.read_all'",
  "'notification.manage'",
  "'settings.update'",
];

for (const marker of seedMarkers) {
  if (!sql.includes(marker)) {
    missing.push(`seed marker: ${marker}`);
  }
}

if (missing.length > 0) {
  console.error('Migration validation failed.');
  for (const item of missing) {
    console.error(`- Missing ${item}`);
  }
  process.exit(1);
}

console.log('Migration validation passed.');
console.log(`- tables: ${expectedTables.length}`);
console.log(`- enums: ${expectedEnums.length}`);
console.log(`- indexes: ${expectedIndexes.length}`);
console.log(`- functions: ${expectedFunctions.length}`);
