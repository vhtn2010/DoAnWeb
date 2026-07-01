const { DOMAIN_CONSTRAINTS } = require('../constants/domainConstraints');
const { withTransaction } = require('../database/client');
const { createCartRepository } = require('../database/cartRepository');
const AppError = require('../utils/AppError');

const UNIQUE_VIOLATION_ERROR_CODE = '23505';

const toIsoString = (value) => value?.toISOString?.() || value || null;

const toNumber = (value) => {
  if (value == null) {
    return null;
  }

  return Number(value);
};

const buildServiceDetails = (item) => {
  if (item.service_type === 'tour') {
    return {
      departure_location: item.departure_location,
      destination_location: item.destination_location,
      duration_days:
        item.duration_days == null ? null : Number(item.duration_days),
      duration_nights:
        item.duration_nights == null ? null : Number(item.duration_nights),
      transport_type: item.transport_type,
    };
  }

  if (item.service_type === 'hotel') {
    return {
      address: item.address,
      checkin_time: item.checkin_time,
      checkout_time: item.checkout_time,
      star_rating:
        item.star_rating == null ? null : Number(item.star_rating),
    };
  }

  return null;
};

const buildSelection = (item) => {
  if (item.service_type === 'hotel' && item.room_type_id) {
    return {
      available_rooms:
        item.room_type_available_rooms == null
          ? null
          : Number(item.room_type_available_rooms),
      base_price: toNumber(item.room_type_base_price),
      bed_type: item.room_type_bed_type,
      id: item.room_type_id,
      max_adults:
        item.room_type_max_adults == null
          ? null
          : Number(item.room_type_max_adults),
      max_children:
        item.room_type_max_children == null
          ? null
          : Number(item.room_type_max_children),
      name: item.room_type_name,
      status: item.room_type_status,
      type: 'room_type',
    };
  }

  if (item.service_type === 'flight' && item.flight_detail_id) {
    return {
      airline_name: item.airline_name,
      arrival_airport: item.arrival_airport,
      arrival_at: toIsoString(item.arrival_at),
      cabin_class: item.cabin_class,
      departure_airport: item.departure_airport,
      departure_at: toIsoString(item.departure_at),
      fare_price: toNumber(item.fare_price),
      flight_number: item.flight_number,
      id: item.flight_detail_id,
      seats_available:
        item.seats_available == null ? null : Number(item.seats_available),
      status: item.flight_status,
      type: 'flight_detail',
    };
  }

  if (item.service_type === 'train' && item.train_detail_id) {
    return {
      arrival_at: toIsoString(item.train_arrival_at),
      arrival_station: item.arrival_station,
      departure_at: toIsoString(item.train_departure_at),
      departure_station: item.departure_station,
      fare_price: toNumber(item.train_fare_price),
      id: item.train_detail_id,
      seat_class: item.seat_class,
      seats_available:
        item.train_seats_available == null
          ? null
          : Number(item.train_seats_available),
      status: item.train_status,
      train_number: item.train_number,
      type: 'train_detail',
    };
  }

  return null;
};

const mapCartItem = (item) => {
  const quantity = Number(item.quantity);
  const unitPrice = Number(item.unit_price_snapshot);
  const totalAmount = unitPrice * quantity;

  return {
    created_at: toIsoString(item.created_at),
    end_at: toIsoString(item.end_at),
    id: item.id,
    options: item.options || null,
    quantity,
    reference_id: item.reference_id,
    selection: buildSelection(item),
    service: {
      base_price: toNumber(item.base_price),
      cancellation_policy: item.cancellation_policy,
      currency: item.currency || DOMAIN_CONSTRAINTS.defaultCurrency,
      current_price: toNumber(item.current_price),
      details: buildServiceDetails(item),
      id: item.service_id,
      location_text: item.location_text,
      primary_image: item.primary_image || null,
      sale_price: toNumber(item.sale_price),
      short_description: item.short_description,
      slug: item.slug,
      status: item.service_status,
      title: item.title,
      service_type: item.service_type,
    },
    service_id: item.service_id,
    service_type: item.service_type,
    start_at: toIsoString(item.start_at),
    total_amount: totalAmount,
    unit_price_snapshot: unitPrice,
  };
};

const mapCart = (cart, itemRows) => {
  const items = itemRows.map(mapCartItem);
  const subtotalAmount = items.reduce(
    (total, item) => total + item.total_amount,
    0,
  );
  const quantityTotal = items.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  return {
    created_at: toIsoString(cart.created_at),
    id: cart.id,
    items,
    status: cart.status,
    summary: {
      currency: DOMAIN_CONSTRAINTS.defaultCurrency,
      item_count: items.length,
      quantity_total: quantityTotal,
      subtotal_amount: subtotalAmount,
      total_amount: subtotalAmount,
    },
    updated_at: toIsoString(cart.updated_at),
  };
};

const logMultipleActiveCarts = (logger, userId, carts) => {
  if (carts.length <= 1) {
    return;
  }

  logger.error(
    `Detected multiple active carts for user ${userId}. Using newest cart ${carts[0].id}.`,
  );
};

const createCartService = ({
  logger = console,
  now = () => new Date(),
  repository = createCartRepository(),
  withTransactionImpl = withTransaction,
} = {}) => {
  const getActiveCart = async ({ userId }) =>
    withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      let activeCarts = await repository.findActiveCartsByUser(
        queryExecutor,
        userId,
      );

      logMultipleActiveCarts(logger, userId, activeCarts);

      let activeCart = activeCarts[0] || null;

      if (!activeCart) {
        try {
          activeCart = await repository.createActiveCart(queryExecutor, {
            createdAt: now(),
            userId,
          });
        } catch (error) {
          if (error?.code !== UNIQUE_VIOLATION_ERROR_CODE) {
            throw error;
          }

          activeCarts = await repository.findActiveCartsByUser(
            queryExecutor,
            userId,
          );
          logMultipleActiveCarts(logger, userId, activeCarts);
          activeCart = activeCarts[0] || null;
        }
      }

      if (!activeCart) {
        throw new AppError('Unable to resolve active cart', {
          statusCode: 500,
        });
      }

      const itemRows = activeCart
        ? await repository.listCartItems(queryExecutor, activeCart.id)
        : [];

      return mapCart(activeCart, itemRows);
    });

  return {
    getActiveCart,
  };
};

module.exports = createCartService();
module.exports.createCartService = createCartService;
