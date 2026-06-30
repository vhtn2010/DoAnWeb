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
    listFeaturedServices,
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
  listFeaturedServices:
    publicSearchRepository.listFeaturedServices,
  searchServices:
    publicSearchRepository.searchServices,
};
