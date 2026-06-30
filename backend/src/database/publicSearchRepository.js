const { query } = require('./queryClient');

const createPublicSearchRepository = ({ queryImpl = query } = {}) => {
  const listActiveServiceSummaries = async ({ serviceType } = {}) => {
    const params = ['active'];
    let sql = `
      SELECT
        service_type,
        location_text,
        base_price,
        sale_price
      FROM services
      WHERE status = $1
    `;

    if (serviceType) {
      params.push(serviceType);
      sql += ' AND service_type = $2';
    }

    sql += ' ORDER BY service_type ASC, location_text ASC NULLS LAST';

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
          AND hd.star_rating IS NOT NULL
      `,
      ['active'],
    );

    return result.rows;
  };

  return {
    listActiveFlightCabinClasses,
    listActiveHotelStarRatings,
    listActiveServiceSummaries,
    listActiveTourTransportTypes,
    listActiveTrainSeatClasses,
  };
};

const publicSearchRepository = createPublicSearchRepository();

module.exports = {
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
};
