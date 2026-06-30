const { query } = require('./client');

const createAdminServiceCatalogRepository = ({ queryImpl = query } = {}) => {
  const buildScopedWhere = ({
    allowedServiceIds,
    keyword,
    serviceStatus,
    serviceType,
  }) => {
    const params = [];
    const conditions = [];

    if (serviceType) {
      params.push(serviceType);
      conditions.push(`s.service_type = $${params.length}`);
    }

    if (serviceStatus) {
      params.push(serviceStatus);
      conditions.push(`s.status = $${params.length}`);
    }

    if (keyword) {
      params.push(`%${keyword}%`);
      const keywordParam = `$${params.length}`;
      conditions.push(`
        (
          s.title ILIKE ${keywordParam}
          OR s.service_code ILIKE ${keywordParam}
          OR COALESCE(s.provider_name, '') ILIKE ${keywordParam}
          OR COALESCE(s.location_text, '') ILIKE ${keywordParam}
          OR s.slug ILIKE ${keywordParam}
        )
      `);
    }

    if (Array.isArray(allowedServiceIds)) {
      if (allowedServiceIds.length === 0) {
        conditions.push('1 = 0');
      } else {
        params.push(allowedServiceIds);
        conditions.push(`s.id = ANY($${params.length}::uuid[])`);
      }
    }

    return {
      params,
      whereSql:
        conditions.length > 0
          ? `WHERE ${conditions.join('\n        AND ')}`
          : '',
    };
  };

  const listServices = async ({
    allowedServiceIds,
    keyword,
    limit,
    offset,
    serviceStatus,
    serviceType,
  }) => {
    const { params, whereSql } = buildScopedWhere({
      allowedServiceIds,
      keyword,
      serviceStatus,
      serviceType,
    });
    const filteredSql = `
      SELECT
        s.id,
        s.service_code,
        s.service_type,
        s.title,
        s.slug,
        s.short_description,
        s.provider_name,
        s.location_text,
        s.base_price,
        s.sale_price,
        COALESCE(s.sale_price, s.base_price) AS public_price,
        s.currency,
        s.status,
        s.created_by,
        s.updated_by,
        s.approved_by,
        s.approved_at,
        s.created_at,
        s.updated_at,
        s.deleted_at,
        image.image_url AS primary_image
      FROM services s
      LEFT JOIN LATERAL (
        SELECT si.image_url
        FROM service_images si
        WHERE si.service_id = s.id
        ORDER BY si.is_primary DESC, si.sort_order ASC, si.created_at ASC, si.id ASC
        LIMIT 1
      ) image ON TRUE
      ${whereSql}
    `;
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
          ) AS countable_services
        `,
        countParams,
      ),
      queryImpl(
        `
          SELECT *
          FROM (
            ${filteredSql}
          ) AS admin_services
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

  const getServiceById = async ({ allowedServiceIds, serviceId }) => {
    const { params, whereSql } = buildScopedWhere({
      allowedServiceIds,
    });

    params.push(serviceId);

    const result = await queryImpl(
      `
        SELECT
          s.id,
          s.service_code,
          s.service_type,
          s.title,
          s.slug,
          s.short_description,
          s.description,
          s.provider_name,
          s.location_text,
          s.base_price,
          s.sale_price,
          COALESCE(s.sale_price, s.base_price) AS public_price,
          s.currency,
          s.status,
          s.cancellation_policy,
          s.metadata,
          s.created_by,
          s.updated_by,
          s.approved_by,
          s.approved_at,
          s.created_at,
          s.updated_at,
          s.deleted_at
        FROM services s
        ${whereSql ? `${whereSql}\n          AND s.id = $${params.length}` : `WHERE s.id = $${params.length}`}
        LIMIT 1
      `,
      params,
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

  const listRoomTypesByHotel = async (serviceId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          name,
          bed_type,
          max_adults,
          max_children,
          total_rooms,
          available_rooms,
          base_price,
          description,
          status,
          created_at,
          updated_at
        FROM room_types
        WHERE hotel_service_id = $1
        ORDER BY created_at DESC, id ASC
      `,
      [serviceId],
    );

    return result.rows;
  };

  const listFlightDetailsByService = async (serviceId) => {
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
          seats_total,
          seats_available,
          fare_price,
          status
        FROM flight_details
        WHERE service_id = $1
        ORDER BY departure_at ASC, id ASC
      `,
      [serviceId],
    );

    return result.rows;
  };

  const listTrainDetailsByService = async (serviceId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
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
        WHERE service_id = $1
        ORDER BY departure_at ASC, id ASC
      `,
      [serviceId],
    );

    return result.rows;
  };

  const listServiceImages = async (serviceId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          image_url,
          cloudinary_public_id,
          alt_text,
          sort_order,
          is_primary,
          created_at
        FROM service_images
        WHERE service_id = $1
        ORDER BY is_primary DESC, sort_order ASC, created_at ASC, id ASC
      `,
      [serviceId],
    );

    return result.rows;
  };

  return {
    getHotelDetail,
    getServiceById,
    getTourDetail,
    listFlightDetailsByService,
    listRoomTypesByHotel,
    listServiceImages,
    listServices,
    listTrainDetailsByService,
  };
};

const adminServiceCatalogRepository = createAdminServiceCatalogRepository();

module.exports = {
  createAdminServiceCatalogRepository,
  getHotelDetail: adminServiceCatalogRepository.getHotelDetail,
  getServiceById: adminServiceCatalogRepository.getServiceById,
  getTourDetail: adminServiceCatalogRepository.getTourDetail,
  listFlightDetailsByService:
    adminServiceCatalogRepository.listFlightDetailsByService,
  listRoomTypesByHotel:
    adminServiceCatalogRepository.listRoomTypesByHotel,
  listServiceImages:
    adminServiceCatalogRepository.listServiceImages,
  listServices: adminServiceCatalogRepository.listServices,
  listTrainDetailsByService:
    adminServiceCatalogRepository.listTrainDetailsByService,
};
