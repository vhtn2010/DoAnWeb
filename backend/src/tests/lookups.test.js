const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const lookupService = require('../services/lookupService');

const request = (server, path, options = {}) =>
  new Promise((resolve, reject) => {
    const { port } = server.address();
    const req = http.request(`http://127.0.0.1:${port}${path}`, options, (res) => {
      let body = '';

      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          body: JSON.parse(body),
          headers: res.headers,
          statusCode: res.statusCode,
        });
      });
    });

    req.on('error', reject);
    req.end();
  });

test('lookupService.getPublicEnums returns only public-safe enums', () => {
  const enums = lookupService.getPublicEnums();

  assert.deepEqual(enums.service_type, [
    'tour',
    'hotel',
    'flight',
    'train',
    'combo',
  ]);
  assert.deepEqual(enums.cabin_class, [
    'economy',
    'premium_economy',
    'business',
    'first',
  ]);
  assert.deepEqual(enums.seat_class, [
    'hard_seat',
    'soft_seat',
    'sleeper',
    'vip',
  ]);
  assert.equal('role' in enums, false);
  assert.equal(enums.service_type.includes('room'), false);
});

test('lookupService.getPopularLocations normalizes, groups, sorts, and caps limit', async () => {
  const service = lookupService.createLookupService({
    repository: {
      listActiveServiceSummaries: async ({ serviceType }) => {
        assert.equal(serviceType, 'tour');

        return [
          { location_text: ' \u0110\u00e0   L\u1ea1t ', service_type: 'tour' },
          { location_text: '\u0111\u00e0 l\u1ea1t', service_type: 'tour' },
          { location_text: 'Ha Noi', service_type: 'tour' },
          { location_text: 'ha noi', service_type: 'tour' },
          { location_text: ' ', service_type: 'tour' },
          { location_text: null, service_type: 'tour' },
          { location_text: 'Da Nang', service_type: 'tour' },
        ];
      },
    },
  });

  const result = await service.getPopularLocations({
    limit: '99',
    type: 'tour',
  });

  assert.deepEqual(result, {
    locations: [
      {
        location: '\u0110\u00e0 L\u1ea1t',
        service_count: 2,
      },
      {
        location: 'Ha Noi',
        service_count: 2,
      },
      {
        location: 'Da Nang',
        service_count: 1,
      },
    ],
  });
});

test('lookupService.getPopularLocations rejects invalid type and limit', async () => {
  const service = lookupService.createLookupService({
    repository: {
      listActiveServiceSummaries: async () => [],
    },
  });

  await assert.rejects(
    () => service.getPopularLocations({ type: 'room' }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.equal(error.statusCode, 400);
      assert.deepEqual(error.details, [
        {
          field: 'type',
          message: 'type must be one of: tour, hotel, flight, train, combo',
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    () => service.getPopularLocations({ limit: '0' }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.equal(error.statusCode, 400);
      assert.deepEqual(error.details, [
        {
          field: 'limit',
          message: 'limit must be greater than or equal to 1',
        },
      ]);
      return true;
    },
  );
});

test('lookupService.getServiceFilterOptions computes public metadata from active services', async () => {
  const service = lookupService.createLookupService({
    repository: {
      listActiveFlightCabinClasses: async () => [
        { cabin_class: 'business' },
        { cabin_class: 'economy' },
      ],
      listActiveHotelStarRatings: async () => [
        { star_rating: '4.0' },
        { star_rating: '5.0' },
        { star_rating: '4.0' },
      ],
      listActiveServiceSummaries: async () => [
        {
          base_price: '3000000',
          location_text: ' \u0110\u00e0 L\u1ea1t ',
          sale_price: '2500000',
          service_type: 'tour',
        },
        {
          base_price: '1200000',
          location_text: 'ha noi',
          sale_price: null,
          service_type: 'hotel',
        },
        {
          base_price: '5000000',
          location_text: '\u0110\u00e0 L\u1ea1t',
          sale_price: '4500000',
          service_type: 'room',
        },
        {
          base_price: '2200000',
          location_text: 'Da Nang',
          sale_price: null,
          service_type: 'flight',
        },
      ],
      listActiveTourTransportTypes: async () => [
        { transport_type: 'flight' },
        { transport_type: 'bus' },
      ],
      listActiveTrainSeatClasses: async () => [
        { seat_class: 'vip' },
        { seat_class: 'soft_seat' },
      ],
    },
  });

  const result = await service.getServiceFilterOptions();

  assert.deepEqual(result, {
    cabin_classes: ['economy', 'business'],
    locations: ['Da Nang', '\u0110\u00e0 L\u1ea1t', 'Ha Noi'],
    price_range: {
      max_price: 2500000,
      min_price: 1200000,
    },
    seat_classes: ['soft_seat', 'vip'],
    service_types: ['tour', 'hotel', 'flight'],
    sort_options: ['price_asc', 'price_desc', 'newest', 'oldest', 'popular'],
    star_ratings: [4, 5],
    transport_types: ['bus', 'flight'],
  });
});

test('GET /api/lookups/enums returns public lookup enums and cache headers', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/lookups/enums`);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Lookup enums retrieved successfully');
    assert.deepEqual(response.body.data.service_type, [
      'tour',
      'hotel',
      'flight',
      'train',
      'combo',
    ]);
    assert.match(response.headers['cache-control'], /max-age=86400/);
  } finally {
    server.close();
  }
});

test('GET /api/locations/popular validates invalid type without requiring a token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/locations/popular?type=room`,
    );

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Validation failed');
    assert.equal(response.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);
    assert.deepEqual(response.body.error.details, [
      {
        field: 'type',
        message: 'type must be one of: tour, hotel, flight, train, combo',
      },
    ]);
  } finally {
    server.close();
  }
});

test('GET /api/locations/popular returns metadata and short cache headers', async () => {
  const originalGetPopularLocations = lookupService.getPopularLocations;
  const server = app.listen(0);

  lookupService.getPopularLocations = async (query) => {
    assert.deepEqual({ ...query }, {
      limit: '5',
      type: 'hotel',
    });

    return {
      locations: [
        {
          location: 'Da Nang',
          service_count: 4,
        },
      ],
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/locations/popular?type=hotel&limit=5`,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Popular locations retrieved successfully');
    assert.deepEqual(response.body.data.locations, [
      {
        location: 'Da Nang',
        service_count: 4,
      },
    ]);
    assert.match(response.headers['cache-control'], /max-age=900/);
  } finally {
    lookupService.getPopularLocations = originalGetPopularLocations;
    server.close();
  }
});

test('GET /api/locations/popular validates invalid limit', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/locations/popular?limit=1.5`,
    );

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Validation failed');
    assert.equal(response.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);
    assert.deepEqual(response.body.error.details, [
      {
        field: 'limit',
        message: 'limit must be a positive integer',
      },
    ]);
  } finally {
    server.close();
  }
});

test('GET /api/services/filter-options returns public filter metadata', async () => {
  const originalGetServiceFilterOptions = lookupService.getServiceFilterOptions;
  const server = app.listen(0);

  lookupService.getServiceFilterOptions = async () => ({
    cabin_classes: ['economy'],
    locations: ['\u0110\u00e0 L\u1ea1t'],
    price_range: {
      max_price: 2990000,
      min_price: 2590000,
    },
    seat_classes: ['soft_seat'],
    service_types: ['tour'],
    sort_options: ['price_asc', 'price_desc', 'newest', 'oldest', 'popular'],
    star_ratings: [4],
    transport_types: ['bus'],
  });

  try {
    const response = await request(server, `${apiPrefix}/services/filter-options`);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Service filter options retrieved successfully',
    );
    assert.deepEqual(response.body.data, {
      cabin_classes: ['economy'],
      locations: ['\u0110\u00e0 L\u1ea1t'],
      price_range: {
        max_price: 2990000,
        min_price: 2590000,
      },
      seat_classes: ['soft_seat'],
      service_types: ['tour'],
      sort_options: ['price_asc', 'price_desc', 'newest', 'oldest', 'popular'],
      star_ratings: [4],
      transport_types: ['bus'],
    });
    assert.match(response.headers['cache-control'], /max-age=900/);
  } finally {
    lookupService.getServiceFilterOptions = originalGetServiceFilterOptions;
    server.close();
  }
});
