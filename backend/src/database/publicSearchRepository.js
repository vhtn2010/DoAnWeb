const { query } = require('./queryClient');

const PUBLIC_SERVICE_TYPES = Object.freeze([
  'tour',
  'hotel',
  'flight',
  'train',
  'combo',
]);

const PUBLIC_SERVICE_TYPE_SQL = PUBLIC_SERVICE_TYPES.map(
  (value) => `'${value}'`,
).join(', ');

const BASE_CARD_SELECT = `
  SELECT
    s.id,
    s.service_type,
    s.title,
    s.slug,
    s.short_description,
    s.location_text,
    s.base_price,
    s.sale_price,
    COALESCE(s.sale_price, s.base_price) AS public_price,
    s.currency,
    image.image_url AS primary_image,
    s.created_at,
    CASE
      WHEN COALESCE(s.metadata->>'is_featured', 'false') = 'true' THEN 0
      ELSE 1
    END AS featured_rank
  FROM services s
  LEFT JOIN LATERAL (
    SELECT si.image_url
    FROM service_images si
    WHERE si.service_id = s.id
    ORDER BY si.is_primary DESC, si.sort_order ASC, si.created_at ASC, si.id ASC
    LIMIT 1
  ) image ON TRUE
`;

const BASE_PUBLIC_WHERE = `
  WHERE s.status = $1
    AND s.deleted_at IS NULL
    AND s.service_type IN (${PUBLIC_SERVICE_TYPE_SQL})
`;

const SEARCH_SORT_SQL = Object.freeze({
  newest: 'created_at DESC, id ASC',
  oldest: 'created_at ASC, id ASC',
  popular: 'created_at DESC, id ASC',
  price_asc: 'public_price ASC, created_at DESC, id ASC',
  price_desc: 'public_price DESC, created_at DESC, id ASC',
});

const buildNormalizedTextSql = (column) => `
  LOWER(
    REGEXP_REPLACE(BTRIM(COALESCE(${column}, '')), '\\s+', ' ', 'g')
  )
`;

const createPublicSearchRepository = ({ queryImpl = query } = {}) => {
  const listActiveServiceSummaries = async ({ serviceType } = {}) => {
    const params = ['active'];
    let sql = `
      SELECT
        s.service_type,
        s.location_text,
        s.base_price,
        s.sale_price
      FROM services s
      ${BASE_PUBLIC_WHERE}
    `;

    if (serviceType) {
      params.push(serviceType);
      sql += ` AND s.service_type = $${params.length}`;
    }

    sql += ' ORDER BY s.service_type ASC, s.location_text ASC NULLS LAST';

    const result = await queryImpl(sql, params);
    return result.rows;
  };

  const listActiveFlightCabinClasses = async () => {
    const result = await queryImpl(
      `
        SELECT DISTINCT fd.cabin_class
        FROM flight_details fd
        INNER JOIN services s ON s.id = fd.service_id
        WHERE s.status = $1
          AND s.deleted_at IS NULL
          AND s.service_type IN (${PUBLIC_SERVICE_TYPE_SQL})
      `,
      ['active'],
    );

    return result.rows;
  };

  const listActiveTrainSeatClasses = async () => {
    const result = await queryImpl(
      `
        SELECT DISTINCT td.seat_class
        FROM train_details td
        INNER JOIN services s ON s.id = td.service_id
        WHERE s.status = $1
          AND s.deleted_at IS NULL
          AND s.service_type IN (${PUBLIC_SERVICE_TYPE_SQL})
      `,
      ['active'],
    );

    return result.rows;
  };

  const listActiveTourTransportTypes = async () => {
    const result = await queryImpl(
      `
        SELECT DISTINCT td.transport_type
        FROM tour_details td
        INNER JOIN services s ON s.id = td.service_id
        WHERE s.status = $1
          AND s.deleted_at IS NULL
          AND s.service_type IN (${PUBLIC_SERVICE_TYPE_SQL})
      `,
      ['active'],
    );

    return result.rows;
  };

  const listActiveHotelStarRatings = async () => {
    const result = await queryImpl(
      `
        SELECT DISTINCT hd.star_rating
        FROM hotel_details hd
        INNER JOIN services s ON s.id = hd.service_id
        WHERE s.status = $1
          AND s.deleted_at IS NULL
          AND s.service_type IN (${PUBLIC_SERVICE_TYPE_SQL})
          AND hd.star_rating IS NOT NULL
      `,
      ['active'],
    );

    return result.rows;
  };

  const listFeaturedServices = async ({ limit, serviceType } = {}) => {
    const params = ['active'];
    let sql = `
      ${BASE_CARD_SELECT}
      ${BASE_PUBLIC_WHERE}
    `;

    if (serviceType) {
      params.push(serviceType);
      sql += ` AND s.service_type = $${params.length}`;
    }

    params.push(limit);
    sql += `
      ORDER BY featured_rank ASC, s.created_at DESC, s.id ASC
      LIMIT $${params.length}
    `;

    const result = await queryImpl(sql, params);
    return result.rows;
  };

  const getPublicServiceBySlug = async (slug) => {
    const result = await queryImpl(
      `
        ${BASE_CARD_SELECT.replace('s.created_at,', 's.description,\n    s.provider_name,\n    s.cancellation_policy,\n    s.metadata,\n    s.created_at,')}
        ${BASE_PUBLIC_WHERE}
          AND s.slug = $2
        LIMIT 1
      `,
      ['active', slug],
    );

    return result.rows[0] || null;
  };

  const getPublicComboBySlug = async (slug) => {
    const result = await queryImpl(
      `
        ${BASE_CARD_SELECT.replace('s.created_at,', 's.description,\n    s.provider_name,\n    s.cancellation_policy,\n    s.metadata,\n    s.created_at,')}
        ${BASE_PUBLIC_WHERE}
          AND s.service_type = $2
          AND s.slug = $3
        LIMIT 1
      `,
      ['active', 'combo', slug],
    );

    return result.rows[0] || null;
  };

  const getPublicServiceById = async (serviceId) => {
    const result = await queryImpl(
      `
        SELECT
          s.id,
          s.service_type,
          s.slug,
          s.title,
          s.base_price,
          s.sale_price,
          s.currency,
          s.metadata
        FROM services s
        ${BASE_PUBLIC_WHERE}
          AND s.id = $2
        LIMIT 1
      `,
      ['active', serviceId],
    );

    return result.rows[0] || null;
  };

  const getTourDetail = async (serviceId) => {
    const result = await queryImpl(
      `
        SELECT
          departure_location,
          destination_location,
          duration_days,
          duration_nights,
          transport_type,
          max_group_size,
          departure_schedule,
          itinerary,
          included_services,
          excluded_services,
          terms
        FROM tour_details
        WHERE service_id = $1
        LIMIT 1
      `,
      [serviceId],
    );

    return result.rows[0] || null;
  };

  const getHotelDetail = async (serviceId) => {
    const result = await queryImpl(
      `
        SELECT
          star_rating,
          address,
          checkin_time,
          checkout_time,
          amenities,
          hotel_policy
        FROM hotel_details
        WHERE service_id = $1
        LIMIT 1
      `,
      [serviceId],
    );

    return result.rows[0] || null;
  };

  const getFlightDetail = async (serviceId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          airline_name,
          flight_number,
          departure_airport,
          arrival_airport,
          departure_at,
          arrival_at,
          cabin_class,
          seats_available,
          fare_price,
          status
        FROM flight_details
        WHERE service_id = $1
        ORDER BY departure_at ASC, id ASC
        LIMIT 1
      `,
      [serviceId],
    );

    return result.rows[0] || null;
  };

  const getTrainDetail = async (serviceId) => {
    const result = await queryImpl(
      `
        SELECT
          train_number,
          departure_station,
          arrival_station,
          departure_at,
          arrival_at,
          seat_class,
          seats_available,
          fare_price,
          status
        FROM train_details
        WHERE service_id = $1
        ORDER BY departure_at ASC, id ASC
        LIMIT 1
      `,
      [serviceId],
    );

    return result.rows[0] || null;
  };

  const getRoomTypeById = async (roomTypeId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          hotel_service_id,
          name,
          max_adults,
          max_children,
          total_rooms,
          available_rooms,
          base_price,
          status
        FROM room_types
        WHERE id = $1
        LIMIT 1
      `,
      [roomTypeId],
    );

    return result.rows[0] || null;
  };

  const getFlightDetailById = async (flightDetailId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          service_id,
          airline_name,
          flight_number,
          departure_airport,
          arrival_airport,
          departure_at,
          arrival_at,
          cabin_class,
          seats_total,
          seats_available,
          fare_price,
          status
        FROM flight_details
        WHERE id = $1
        LIMIT 1
      `,
      [flightDetailId],
    );

    return result.rows[0] || null;
  };

  const getTrainDetailById = async (trainDetailId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          service_id,
          train_number,
          departure_station,
          arrival_station,
          departure_at,
          arrival_at,
          seat_class,
          seats_total,
          seats_available,
          fare_price,
          status
        FROM train_details
        WHERE id = $1
        LIMIT 1
      `,
      [trainDetailId],
    );

    return result.rows[0] || null;
  };

  const listServiceImages = async (serviceId) => {
    const result = await queryImpl(
      `
        SELECT
          image_url,
          alt_text,
          sort_order,
          is_primary
        FROM service_images
        WHERE service_id = $1
        ORDER BY is_primary DESC, sort_order ASC, created_at ASC, id ASC
      `,
      [serviceId],
    );

    return result.rows;
  };

  const listActiveRoomTypesByHotel = async (hotelServiceId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          name,
          bed_type,
          max_adults,
          max_children,
          available_rooms,
          base_price,
          description,
          status
        FROM room_types
        WHERE hotel_service_id = $1
          AND status = $2
        ORDER BY available_rooms DESC, base_price ASC, id ASC
      `,
      [hotelServiceId, 'active'],
    );

    return result.rows;
  };

  const searchFlights = async ({
    cabinClass,
    departureDateEnd,
    departureDateStart,
    from,
    to,
  }) => {
    const params = [
      'active',
      'flight',
      'open',
    ];
    let sql = `
      SELECT
        s.id AS service_id,
        s.slug,
        fd.id AS flight_detail_id,
        fd.airline_name,
        fd.flight_number,
        fd.departure_airport,
        fd.arrival_airport,
        fd.departure_at,
        fd.arrival_at,
        fd.cabin_class,
        fd.seats_available,
        fd.fare_price,
        COALESCE(s.currency, 'VND') AS currency
      FROM services s
      INNER JOIN flight_details fd ON fd.service_id = s.id
      WHERE s.status = $1
        AND s.deleted_at IS NULL
        AND s.service_type = $2
        AND fd.status = $3
        AND fd.seats_available > 0
        AND fd.departure_at >= NOW()
    `;

    if (from) {
      params.push(from);
      sql += ` AND ${buildNormalizedTextSql('fd.departure_airport')} = $${params.length}`;
    }

    if (to) {
      params.push(to);
      sql += ` AND ${buildNormalizedTextSql('fd.arrival_airport')} = $${params.length}`;
    }

    if (departureDateStart && departureDateEnd) {
      params.push(departureDateStart.toISOString());
      sql += ` AND fd.departure_at >= $${params.length}`;
      params.push(departureDateEnd.toISOString());
      sql += ` AND fd.departure_at < $${params.length}`;
    }

    if (cabinClass) {
      params.push(cabinClass);
      sql += ` AND fd.cabin_class = $${params.length}`;
    }

    sql += ' ORDER BY fd.departure_at ASC, fd.id ASC';

    const result = await queryImpl(sql, params);
    return result.rows;
  };

  const searchTrains = async ({
    departureDateEnd,
    departureDateStart,
    from,
    seatClass,
    to,
  }) => {
    const params = [
      'active',
      'train',
      'open',
    ];
    let sql = `
      SELECT
        s.id AS service_id,
        s.slug,
        td.id AS train_detail_id,
        td.train_number,
        td.departure_station,
        td.arrival_station,
        td.departure_at,
        td.arrival_at,
        td.seat_class,
        td.seats_available,
        td.fare_price,
        COALESCE(s.currency, 'VND') AS currency
      FROM services s
      INNER JOIN train_details td ON td.service_id = s.id
      WHERE s.status = $1
        AND s.deleted_at IS NULL
        AND s.service_type = $2
        AND td.status = $3
        AND td.seats_available > 0
        AND td.departure_at >= NOW()
    `;

    if (from) {
      params.push(from);
      sql += ` AND ${buildNormalizedTextSql('td.departure_station')} = $${params.length}`;
    }

    if (to) {
      params.push(to);
      sql += ` AND ${buildNormalizedTextSql('td.arrival_station')} = $${params.length}`;
    }

    if (departureDateStart && departureDateEnd) {
      params.push(departureDateStart.toISOString());
      sql += ` AND td.departure_at >= $${params.length}`;
      params.push(departureDateEnd.toISOString());
      sql += ` AND td.departure_at < $${params.length}`;
    }

    if (seatClass) {
      params.push(seatClass);
      sql += ` AND td.seat_class = $${params.length}`;
    }

    sql += ' ORDER BY td.departure_at ASC, td.id ASC';

    const result = await queryImpl(sql, params);
    return result.rows;
  };

  const searchCombos = async ({
    limit,
    location,
    maxPrice,
    minPrice,
    offset,
  }) => {
    const params = ['active', 'combo'];
    let filteredSql = `
      ${BASE_CARD_SELECT}
      ${BASE_PUBLIC_WHERE}
        AND s.service_type = $2
    `;

    if (location) {
      params.push(location.toLocaleLowerCase('vi-VN'));
      filteredSql += `
        AND LOWER(
          REGEXP_REPLACE(BTRIM(COALESCE(s.location_text, '')), '\\s+', ' ', 'g')
        ) = $${params.length}
      `;
    }

    if (minPrice != null) {
      params.push(minPrice);
      filteredSql += ` AND COALESCE(s.sale_price, s.base_price) >= $${params.length}`;
    }

    if (maxPrice != null) {
      params.push(maxPrice);
      filteredSql += ` AND COALESCE(s.sale_price, s.base_price) <= $${params.length}`;
    }

    const countParams = [...params];
    const dataParams = [...params, limit, offset];
    const limitParam = `$${dataParams.length - 1}`;
    const offsetParam = `$${dataParams.length}`;
    const [countResult, dataResult] = await Promise.all([
      queryImpl(
        `
          SELECT COUNT(*) AS total_count
          FROM (
            ${filteredSql}
          ) AS countable_combos
        `,
        countParams,
      ),
      queryImpl(
        `
          SELECT *
          FROM (
            ${filteredSql}
          ) AS combo_cards
          ORDER BY created_at DESC, id ASC
          LIMIT ${limitParam}
          OFFSET ${offsetParam}
        `,
        dataParams,
      ),
    ]);

    return {
      rows: dataResult.rows,
      total: Number(countResult.rows[0]?.total_count || 0),
    };
  };

  const searchServices = async ({
    keyword,
    limit,
    location,
    maxPrice,
    minPrice,
    offset,
    serviceType,
    sort,
  }) => {
    const params = ['active'];
    let filteredSql = `
      ${BASE_CARD_SELECT}
      ${BASE_PUBLIC_WHERE}
    `;

    if (serviceType) {
      params.push(serviceType);
      filteredSql += ` AND s.service_type = $${params.length}`;
    }

    if (keyword) {
      params.push(`%${keyword}%`);
      const keywordParam = `$${params.length}`;
      filteredSql += `
        AND (
          s.title ILIKE ${keywordParam}
          OR COALESCE(s.short_description, '') ILIKE ${keywordParam}
          OR COALESCE(s.description, '') ILIKE ${keywordParam}
          OR COALESCE(s.provider_name, '') ILIKE ${keywordParam}
          OR COALESCE(s.location_text, '') ILIKE ${keywordParam}
        )
      `;
    }

    if (location) {
      params.push(location.toLocaleLowerCase('vi-VN'));
      filteredSql += `
        AND LOWER(
          REGEXP_REPLACE(BTRIM(COALESCE(s.location_text, '')), '\\s+', ' ', 'g')
        ) = $${params.length}
      `;
    }

    if (minPrice != null) {
      params.push(minPrice);
      filteredSql += ` AND COALESCE(s.sale_price, s.base_price) >= $${params.length}`;
    }

    if (maxPrice != null) {
      params.push(maxPrice);
      filteredSql += ` AND COALESCE(s.sale_price, s.base_price) <= $${params.length}`;
    }

    const countParams = [...params];
    const dataParams = [...params, limit, offset];
    const limitParam = `$${dataParams.length - 1}`;
    const offsetParam = `$${dataParams.length}`;
    const [countResult, dataResult] = await Promise.all([
      queryImpl(
        `
          SELECT COUNT(*) AS total_count
          FROM (
            ${filteredSql}
          ) AS countable_cards
        `,
        countParams,
      ),
      queryImpl(
        `
          SELECT *
          FROM (
            ${filteredSql}
          ) AS cards
          ORDER BY ${SEARCH_SORT_SQL[sort]}
          LIMIT ${limitParam}
          OFFSET ${offsetParam}
        `,
        dataParams,
      ),
    ]);

    return {
      rows: dataResult.rows,
      total: Number(countResult.rows[0]?.total_count || 0),
    };
  };

  return {
    listActiveFlightCabinClasses,
    listActiveHotelStarRatings,
    listActiveServiceSummaries,
    listActiveTourTransportTypes,
    listActiveTrainSeatClasses,
    getFlightDetail,
    getFlightDetailById,
    getHotelDetail,
    getPublicComboBySlug,
    getPublicServiceById,
    getPublicServiceBySlug,
    getRoomTypeById,
    searchFlights,
    searchCombos,
    searchTrains,
    getTourDetail,
    getTrainDetail,
    getTrainDetailById,
    listActiveRoomTypesByHotel,
    listFeaturedServices,
    listServiceImages,
    searchServices,
  };
};

const publicSearchRepository = createPublicSearchRepository();

module.exports = {
  PUBLIC_SERVICE_TYPES,
  createPublicSearchRepository,
  listActiveFlightCabinClasses:
    publicSearchRepository.listActiveFlightCabinClasses,
  listActiveHotelStarRatings:
    publicSearchRepository.listActiveHotelStarRatings,
  listActiveServiceSummaries:
    publicSearchRepository.listActiveServiceSummaries,
  listActiveTourTransportTypes:
    publicSearchRepository.listActiveTourTransportTypes,
  listActiveTrainSeatClasses:
    publicSearchRepository.listActiveTrainSeatClasses,
  getFlightDetail:
    publicSearchRepository.getFlightDetail,
  getFlightDetailById:
    publicSearchRepository.getFlightDetailById,
  getHotelDetail:
    publicSearchRepository.getHotelDetail,
  getPublicComboBySlug:
    publicSearchRepository.getPublicComboBySlug,
  getPublicServiceById:
    publicSearchRepository.getPublicServiceById,
  getPublicServiceBySlug:
    publicSearchRepository.getPublicServiceBySlug,
  getRoomTypeById:
    publicSearchRepository.getRoomTypeById,
  searchFlights:
    publicSearchRepository.searchFlights,
  searchCombos:
    publicSearchRepository.searchCombos,
  searchTrains:
    publicSearchRepository.searchTrains,
  getTourDetail:
    publicSearchRepository.getTourDetail,
  getTrainDetail:
    publicSearchRepository.getTrainDetail,
  getTrainDetailById:
    publicSearchRepository.getTrainDetailById,
  listActiveRoomTypesByHotel:
    publicSearchRepository.listActiveRoomTypesByHotel,
  listFeaturedServices:
    publicSearchRepository.listFeaturedServices,
  listServiceImages:
    publicSearchRepository.listServiceImages,
  searchServices:
    publicSearchRepository.searchServices,
};
