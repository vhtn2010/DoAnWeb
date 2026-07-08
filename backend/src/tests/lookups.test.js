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
    const req = http.request(
      `http://127.0.0.1:${port}${path}`,
      options,
      (res) => {
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
      },
    );

    if (options.body) {
      req.write(options.body);
    }

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

test('lookupService.getPopularLocations rejects invalid type and invalid low limit', async () => {
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
          message:
            'type=room is not supported in public service search. Use /services/{hotel_service_id}/rooms.',
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

test('lookupService.getFeaturedServices validates input and maps service cards', async () => {
  const service = lookupService.createLookupService({
    repository: {
      listFeaturedServices: async ({ limit, serviceType }) => {
        assert.equal(limit, 3);
        assert.equal(serviceType, 'hotel');

        return [
          {
            base_price: '3000000',
            currency: null,
            id: 'service-1',
            location_text: 'Da Nang',
            primary_image: 'https://example.com/primary.jpg',
            public_price: '2500000',
            sale_price: '2500000',
            service_type: 'hotel',
            short_description: 'Beachfront stay',
            slug: 'hotel-da-nang',
            title: 'Hotel Da Nang',
          },
        ];
      },
    },
  });

  const result = await service.getFeaturedServices({
    limit: '3',
    type: 'hotel',
  });

  assert.deepEqual(result, [
    {
      base_price: 3000000,
      currency: 'VND',
      id: 'service-1',
      location_text: 'Da Nang',
      primary_image: 'https://example.com/primary.jpg',
      public_price: 2500000,
      sale_price: 2500000,
      service_type: 'hotel',
      short_description: 'Beachfront stay',
      slug: 'hotel-da-nang',
      title: 'Hotel Da Nang',
    },
  ]);
});

test('lookupService.searchServices validates filters and returns service cards with pagination meta', async () => {
  const service = lookupService.createLookupService({
    repository: {
      searchServices: async (filters) => {
        assert.deepEqual(filters, {
          keyword: 'Da Nang',
          limit: 2,
          location: 'Da Nang',
          maxPrice: 4000000,
          minPrice: 1000000,
          offset: 2,
          serviceType: 'tour',
          sort: 'price_desc',
        });

        return {
          rows: [
            {
              base_price: '4500000',
              currency: 'VND',
              id: 'service-2',
              location_text: 'Da Nang',
              primary_image: null,
              public_price: '3900000',
              sale_price: '3900000',
              service_type: 'tour',
              short_description: 'A short trip',
              slug: 'tour-da-nang',
              title: 'Tour Da Nang',
            },
          ],
          total: 5,
        };
      },
    },
  });

  const result = await service.searchServices({
    limit: '2',
    location: '  Da Nang  ',
    max_price: '4000000',
    min_price: '1000000',
    page: '2',
    q: '  Da Nang  ',
    sort: 'price_desc',
    type: 'tour',
  });

  assert.deepEqual(result, {
    meta: {
      has_next: true,
      limit: 2,
      page: 2,
      total: 5,
      total_pages: 3,
    },
    services: [
      {
        base_price: 4500000,
        currency: 'VND',
        id: 'service-2',
        location_text: 'Da Nang',
        primary_image: null,
        public_price: 3900000,
        sale_price: 3900000,
        service_type: 'tour',
        short_description: 'A short trip',
        slug: 'tour-da-nang',
        title: 'Tour Da Nang',
      },
    ],
  });
});

test('lookupService.searchServices rejects invalid room, keyword, price range, sort, and limit', async () => {
  const service = lookupService.createLookupService({
    repository: {
      searchServices: async () => ({
        rows: [],
        total: 0,
      }),
    },
  });

  await assert.rejects(
    () => service.searchServices({ type: 'room' }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'type',
          message:
            'type=room is not supported in public service search. Use /services/{hotel_service_id}/rooms.',
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    () => service.searchServices({ q: 'a' }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'q',
          message: 'q must be at least 2 characters long',
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    () => service.searchServices({ q: 'bad<script>' }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'q',
          message: 'q contains unsupported characters',
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    () => service.searchServices({ min_price: '500', max_price: '100' }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'price_range',
          message: 'min_price must be less than or equal to max_price',
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    () => service.searchServices({ sort: 'random' }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'sort',
          message:
            'sort must be one of: price_asc, price_desc, newest, oldest, popular',
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    () => service.searchServices({ limit: '51' }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'limit',
          message: 'limit must be less than or equal to 50',
        },
      ]);
      return true;
    },
  );
});

test('lookupService.getCombos validates filters and returns combo cards with pagination meta', async () => {
  const service = lookupService.createLookupService({
    repository: {
      searchCombos: async (filters) => {
        assert.deepEqual(filters, {
          limit: 2,
          location: 'Da Nang',
          maxPrice: 5000000,
          minPrice: 2000000,
          offset: 2,
        });

        return {
          rows: [
            {
              base_price: '5500000',
              currency: 'VND',
              id: 'combo-1',
              location_text: 'Da Nang',
              primary_image: 'https://example.com/combo.jpg',
              public_price: '4900000',
              sale_price: '4900000',
              service_type: 'combo',
              short_description: 'Combo bien',
              slug: 'combo-da-nang',
              title: 'Combo Da Nang',
            },
          ],
          total: 3,
        };
      },
    },
  });

  const result = await service.getCombos({
    limit: '2',
    location: '  Da Nang ',
    max_price: '5000000',
    min_price: '2000000',
    page: '2',
  });

  assert.deepEqual(result, {
    combos: [
      {
        base_price: 5500000,
        currency: 'VND',
        id: 'combo-1',
        location_text: 'Da Nang',
        primary_image: 'https://example.com/combo.jpg',
        public_price: 4900000,
        sale_price: 4900000,
        service_type: 'combo',
        short_description: 'Combo bien',
        slug: 'combo-da-nang',
        title: 'Combo Da Nang',
      },
    ],
    meta: {
      has_next: false,
      limit: 2,
      page: 2,
      total: 3,
      total_pages: 2,
    },
  });
});

test('lookupService.getCombos rejects invalid combo filters', async () => {
  const service = lookupService.createLookupService({
    repository: {
      searchCombos: async () => ({
        rows: [],
        total: 0,
      }),
    },
  });

  await assert.rejects(
    () => service.getCombos({ min_price: '6000000', max_price: '1000000' }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'price_range',
          message: 'min_price must be less than or equal to max_price',
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    () => service.getCombos({ limit: '0' }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
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

test('lookupService.getComboDetail returns sanitized combo detail and bookable state', async () => {
  const service = lookupService.createLookupService({
    repository: {
      getPublicComboBySlug: async (slug) => {
        if (slug === 'combo-da-nang') {
          return {
            base_price: '6000000',
            cancellation_policy: 'Combo policy',
            currency: 'VND',
            description: 'Combo description',
            id: 'combo-service-1',
            location_text: 'Da Nang',
            metadata: {
              combo_items: [
                {
                  admin_note: 'hidden',
                  description: 'Khach san gan bien',
                  location_text: 'Da Nang',
                  quantity: '2',
                  service_id: 'child-service-1',
                  service_type: 'hotel',
                  short_description: 'Resort 3 ngay',
                  slug: 'hotel-da-nang',
                  supplier_cost: '123',
                  title: 'Hotel Da Nang',
                },
              ],
            },
            primary_image: 'https://example.com/combo.jpg',
            provider_name: 'Net Viet Travel',
            public_price: '5200000',
            sale_price: '5200000',
            service_type: 'combo',
            short_description: 'Combo short',
            slug,
            title: 'Combo Da Nang',
          };
        }

        return {
          base_price: '4000000',
          cancellation_policy: null,
          currency: 'VND',
          description: 'Incomplete combo',
          id: 'combo-service-2',
          location_text: 'Hue',
          metadata: {
            combo_items: [],
          },
          primary_image: null,
          provider_name: 'Net Viet Travel',
          public_price: '3800000',
          sale_price: null,
          service_type: 'combo',
          short_description: 'Incomplete',
          slug,
          title: 'Combo Hue',
        };
      },
      getPublicServiceById: async (serviceId) => {
        assert.equal(serviceId, 'child-service-1');

        return {
          id: serviceId,
          service_type: 'hotel',
          slug: 'hotel-da-nang',
          title: 'Hotel Da Nang',
        };
      },
    },
  });

  const detailResult = await service.getComboDetail({
    slug: 'combo-da-nang',
  });
  const incompleteResult = await service.getComboDetail({
    slug: 'combo-hue',
  });

  assert.deepEqual(detailResult, {
    base_price: 6000000,
    cancellation_policy: 'Combo policy',
    combo_items: [
      {
        description: 'Khach san gan bien',
        location_text: 'Da Nang',
        quantity: 2,
        service_id: 'child-service-1',
        service_type: 'hotel',
        short_description: 'Resort 3 ngay',
        slug: 'hotel-da-nang',
        title: 'Hotel Da Nang',
      },
    ],
    currency: 'VND',
    description: 'Combo description',
    id: 'combo-service-1',
    is_bookable: true,
    location_text: 'Da Nang',
    primary_image: 'https://example.com/combo.jpg',
    provider_name: 'Net Viet Travel',
    public_price: 5200000,
    sale_price: 5200000,
    service_type: 'combo',
    short_description: 'Combo short',
    slug: 'combo-da-nang',
    title: 'Combo Da Nang',
  });
  assert.equal(incompleteResult.is_bookable, false);
  assert.deepEqual(incompleteResult.combo_items, []);
});

test('lookupService.getComboDetail returns 404 for invalid combo slug target', async () => {
  const service = lookupService.createLookupService({
    repository: {
      getPublicComboBySlug: async () => null,
    },
  });

  await assert.rejects(
    () => service.getComboDetail({ slug: 'missing-combo' }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
      assert.equal(error.statusCode, 404);
      return true;
    },
  );
});

test('lookupService.searchFlights validates input and returns mapped flight results', async () => {
  const service = lookupService.createLookupService({
    repository: {
      searchFlights: async (filters) => {
        assert.deepEqual(filters, {
          cabinClass: 'business',
          departureDateEnd: new Date('2099-07-20T17:00:00.000Z'),
          departureDateStart: new Date('2099-07-19T17:00:00.000Z'),
          from: 'sgn',
          to: 'dad',
        });

        return [
          {
            airline_name: 'Vietnam Airlines',
            arrival_airport: 'DAD',
            arrival_at: '2099-07-20T03:30:00.000Z',
            cabin_class: 'business',
            currency: null,
            departure_airport: 'SGN',
            departure_at: '2099-07-20T01:00:00.000Z',
            fare_price: '4200000',
            flight_detail_id: 'flight-detail-1',
            flight_number: 'VN123',
            seats_available: '7',
            service_id: 'flight-service-1',
            slug: 'flight-sgn-dad',
          },
        ];
      },
    },
  });

  const result = await service.searchFlights({
    cabin_class: 'business',
    departure_date: '2099-07-20',
    from: '  SGN  ',
    to: ' dad ',
  });

  assert.deepEqual(result, [
    {
      airline_name: 'Vietnam Airlines',
      arrival_airport: 'DAD',
      arrival_at: '2099-07-20T03:30:00.000Z',
      cabin_class: 'business',
      currency: 'VND',
      departure_airport: 'SGN',
      departure_at: '2099-07-20T01:00:00.000Z',
      fare_price: 4200000,
      flight_detail_id: 'flight-detail-1',
      flight_number: 'VN123',
      seats_available: 7,
      service_id: 'flight-service-1',
      slug: 'flight-sgn-dad',
    },
  ]);
});

test('lookupService.searchFlights returns all open flights when query is omitted', async () => {
  const service = lookupService.createLookupService({
    repository: {
      searchFlights: async (filters) => {
        assert.deepEqual(filters, {});

        return [
          {
            airline_name: 'VietJet Air',
            arrival_airport: 'HAN',
            arrival_at: '2099-07-21T03:30:00.000Z',
            cabin_class: 'economy',
            currency: 'VND',
            departure_airport: 'SGN',
            departure_at: '2099-07-21T01:00:00.000Z',
            fare_price: '2300000',
            flight_detail_id: 'flight-detail-2',
            flight_number: 'VJ456',
            seats_available: '11',
            service_id: 'flight-service-2',
            slug: 'flight-sgn-han',
          },
        ];
      },
    },
  });

  const result = await service.searchFlights();

  assert.deepEqual(result, [
    {
      airline_name: 'VietJet Air',
      arrival_airport: 'HAN',
      arrival_at: '2099-07-21T03:30:00.000Z',
      cabin_class: 'economy',
      currency: 'VND',
      departure_airport: 'SGN',
      departure_at: '2099-07-21T01:00:00.000Z',
      fare_price: 2300000,
      flight_detail_id: 'flight-detail-2',
      flight_number: 'VJ456',
      seats_available: 11,
      service_id: 'flight-service-2',
      slug: 'flight-sgn-han',
    },
  ]);
});

test('lookupService.searchFlights rejects invalid route, date, and cabin class', async () => {
  const service = lookupService.createLookupService({
    repository: {
      searchFlights: async () => [],
    },
  });

  await assert.rejects(
    () => service.searchFlights({
      departure_date: '2099-07-20',
      from: 'SGN',
      to: 'sgn',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'route',
          message: 'from and to must be different',
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    () => service.searchFlights({
      departure_date: '2099-02-30',
      from: 'SGN',
      to: 'DAD',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'departure_date',
          message: 'departure_date must be a valid date in YYYY-MM-DD format',
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    () => service.searchFlights({
      cabin_class: 'vip',
      departure_date: '2099-07-20',
      from: 'SGN',
      to: 'DAD',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'cabin_class',
          message:
            'cabin_class must be one of: economy, premium_economy, business, first',
        },
      ]);
      return true;
    },
  );
});

test('lookupService.searchTrains validates input and returns mapped train results', async () => {
  const service = lookupService.createLookupService({
    repository: {
      searchTrains: async (filters) => {
        assert.deepEqual(filters, {
          departureDateEnd: new Date('2099-07-20T17:00:00.000Z'),
          departureDateStart: new Date('2099-07-19T17:00:00.000Z'),
          from: 'ha noi',
          seatClass: 'soft_seat',
          to: 'da nang',
        });

        return [
          {
            arrival_at: '2099-07-20T13:00:00.000Z',
            arrival_station: 'Da Nang',
            currency: 'VND',
            departure_at: '2099-07-20T03:00:00.000Z',
            departure_station: 'Ha Noi',
            fare_price: '850000',
            seat_class: 'soft_seat',
            seats_available: '12',
            service_id: 'train-service-1',
            slug: 'train-ha-noi-da-nang',
            train_detail_id: 'train-detail-1',
            train_number: 'SE3',
          },
        ];
      },
    },
  });

  const result = await service.searchTrains({
    departure_date: '2099-07-20',
    from: ' Ha Noi ',
    seat_class: 'soft_seat',
    to: 'Da Nang',
  });

  assert.deepEqual(result, [
    {
      arrival_at: '2099-07-20T13:00:00.000Z',
      arrival_station: 'Da Nang',
      currency: 'VND',
      departure_at: '2099-07-20T03:00:00.000Z',
      departure_station: 'Ha Noi',
      fare_price: 850000,
      seat_class: 'soft_seat',
      seats_available: 12,
      service_id: 'train-service-1',
      slug: 'train-ha-noi-da-nang',
      train_detail_id: 'train-detail-1',
      train_number: 'SE3',
    },
  ]);
});

test('lookupService.searchTrains rejects missing from and invalid seat class', async () => {
  const service = lookupService.createLookupService({
    repository: {
      searchTrains: async () => [],
    },
  });

  await assert.rejects(
    () => service.searchTrains({
      departure_date: '2099-07-20',
      to: 'Da Nang',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'from',
          message: 'from is required',
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    () => service.searchTrains({
      departure_date: '2099-07-20',
      from: 'Ha Noi',
      seat_class: 'business',
      to: 'Da Nang',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'seat_class',
          message:
            'seat_class must be one of: hard_seat, soft_seat, sleeper, vip',
        },
      ]);
      return true;
    },
  );
});

test('lookupService.getServiceDetail returns mapped tour detail for a public service slug', async () => {
  const service = lookupService.createLookupService({
    repository: {
      getPublicServiceBySlug: async (slug) => {
        assert.equal(slug, 'tour-da-lat-3n2d');

        return {
          base_price: '3200000',
          cancellation_policy: 'Cancel before 7 days',
          currency: 'VND',
          description: 'Detailed tour description',
          id: 'service-tour-1',
          location_text: 'Da Lat',
          metadata: {
            internal_note: 'do not expose',
          },
          primary_image: 'https://example.com/tour.jpg',
          provider_name: 'Net Viet Travel',
          public_price: '2890000',
          sale_price: '2890000',
          service_type: 'tour',
          short_description: 'Tour short description',
          slug: 'tour-da-lat-3n2d',
          title: 'Tour Da Lat 3N2D',
        };
      },
      getTourDetail: async (serviceId) => {
        assert.equal(serviceId, 'service-tour-1');

        return {
          departure_location: 'TP.HCM',
          departure_schedule: [{ date: '2026-07-20', slots: 10 }],
          destination_location: 'Da Lat',
          duration_days: 3,
          duration_nights: 2,
          excluded_services: 'Personal expenses',
          included_services: 'Transport and breakfast',
          itinerary: [{ day: 1, title: 'Start trip' }],
          max_group_size: 30,
          terms: 'Tour terms',
          transport_type: 'bus',
        };
      },
    },
  });

  const result = await service.getServiceDetail({
    slug: 'tour-da-lat-3n2d',
  });

  assert.deepEqual(result, {
    base_price: 3200000,
    cancellation_policy: 'Cancel before 7 days',
    currency: 'VND',
    description: 'Detailed tour description',
    details: {
      departure_location: 'TP.HCM',
      departure_schedule: [{ date: '2026-07-20', slots: 10 }],
      destination_location: 'Da Lat',
      duration_days: 3,
      duration_nights: 2,
      excluded_services: 'Personal expenses',
      included_services: 'Transport and breakfast',
      itinerary: [{ day: 1, title: 'Start trip' }],
      max_group_size: 30,
      terms: 'Tour terms',
      transport_type: 'bus',
    },
    id: 'service-tour-1',
    location_text: 'Da Lat',
    primary_image: 'https://example.com/tour.jpg',
    provider_name: 'Net Viet Travel',
    public_price: 2890000,
    sale_price: 2890000,
    service_type: 'tour',
    short_description: 'Tour short description',
    slug: 'tour-da-lat-3n2d',
    title: 'Tour Da Lat 3N2D',
  });
});

test('lookupService.getServiceDetail computes flight is_bookable and sanitizes combo metadata', async () => {
  const service = lookupService.createLookupService({
    repository: {
      getFlightDetailById: async () => null,
      getFlightDetail: async () => ({
        airline_name: 'Vietnam Airlines',
        arrival_airport: 'DAD',
        arrival_at: '2099-07-20T10:00:00.000Z',
        cabin_class: 'business',
        departure_airport: 'SGN',
        departure_at: '2099-07-20T08:00:00.000Z',
        fare_price: '4200000',
        flight_number: 'VN123',
        seats_available: 5,
        service_id: 'flight-service-1',
        status: 'open',
      }),
      getPublicServiceBySlug: async (slug) => {
        if (slug === 'flight-sgn-dad') {
          return {
            base_price: '4500000',
            cancellation_policy: null,
            currency: 'VND',
            description: 'Flight detail',
            id: 'flight-service-1',
            location_text: 'Da Nang',
            metadata: null,
            primary_image: null,
            provider_name: 'Vietnam Airlines',
            public_price: '4200000',
            sale_price: '4200000',
            service_type: 'flight',
            short_description: 'Fast flight',
            slug,
            title: 'Flight SGN - DAD',
          };
        }

        return {
          base_price: '6000000',
          cancellation_policy: 'Combo policy',
          currency: 'VND',
          description: 'Combo detail',
          id: 'combo-service-1',
          location_text: 'Phu Quoc',
          metadata: {
            combo_items: [
              {
                base_price: '3000000',
                cloudinary_public_id: 'hidden',
                location_text: 'Phu Quoc',
                public_price: '2800000',
                sale_price: '2800000',
                service_id: 'child-1',
                service_type: 'hotel',
                slug: 'hotel-phu-quoc',
                title: 'Hotel Phu Quoc',
              },
            ],
            internal_flags: {
              hidden: true,
            },
          },
          primary_image: 'https://example.com/combo.jpg',
          provider_name: 'Net Viet Travel',
          public_price: '5500000',
          sale_price: '5500000',
          service_type: 'combo',
          short_description: 'Combo short',
          slug,
          title: 'Combo Phu Quoc',
        };
      },
    },
  });

  const flightResult = await service.getServiceDetail({
    slug: 'flight-sgn-dad',
  });
  const comboResult = await service.getServiceDetail({
    slug: 'combo-phu-quoc',
  });

  assert.equal(flightResult.details.is_bookable, true);
  assert.deepEqual(comboResult.details, {
    combo_items: [
      {
        base_price: 3000000,
        location_text: 'Phu Quoc',
        public_price: 2800000,
        sale_price: 2800000,
        service_id: 'child-1',
        service_type: 'hotel',
        slug: 'hotel-phu-quoc',
        title: 'Hotel Phu Quoc',
      },
    ],
  });
});

test('lookupService.getServiceDetail resolves flight detail by reference_id when provided', async () => {
  const service = lookupService.createLookupService({
    repository: {
      getFlightDetail: async () => {
        assert.fail('getFlightDetail should not be used when reference_id is provided');
      },
      getFlightDetailById: async (referenceId) => {
        assert.equal(referenceId, '11111111-1111-4111-8111-111111111111');

        return {
          airline_name: 'Vietnam Airlines',
          arrival_airport: 'HAN',
          arrival_at: '2099-07-21T11:30:00.000Z',
          cabin_class: 'economy',
          departure_airport: 'DAD',
          departure_at: '2099-07-21T09:00:00.000Z',
          fare_price: '2100000',
          flight_number: 'VN456',
          id: '11111111-1111-4111-8111-111111111111',
          seats_available: 8,
          service_id: 'flight-service-2',
          status: 'open',
        };
      },
      getPublicServiceBySlug: async (slug) => ({
        base_price: '2300000',
        cancellation_policy: null,
        currency: 'VND',
        description: 'Flight detail',
        id: 'flight-service-2',
        location_text: 'Ha Noi',
        metadata: null,
        primary_image: null,
        provider_name: 'Vietnam Airlines',
        public_price: '2100000',
        sale_price: '2100000',
        service_type: 'flight',
        short_description: 'Morning flight',
        slug,
        title: 'Flight DAD - HAN',
      }),
    },
  });

  const result = await service.getServiceDetail({
    reference_id: '11111111-1111-4111-8111-111111111111',
    slug: 'flight-dad-han',
  });

  assert.equal(result.details.id, '11111111-1111-4111-8111-111111111111');
  assert.equal(result.details.flight_number, 'VN456');
  assert.equal(result.details.departure_airport, 'DAD');
});

test('lookupService.getServiceDetail rejects invalid slug and missing public detail', async () => {
  const service = lookupService.createLookupService({
    repository: {
      getHotelDetail: async () => null,
      getPublicServiceBySlug: async (slug) => {
        if (slug === 'hotel-da-nang') {
          return {
            base_price: '2000000',
            cancellation_policy: null,
            currency: 'VND',
            description: 'Hotel detail',
            id: 'hotel-service-1',
            location_text: 'Da Nang',
            metadata: null,
            primary_image: null,
            provider_name: 'Net Viet Travel',
            public_price: '2000000',
            sale_price: null,
            service_type: 'hotel',
            short_description: 'Hotel short',
            slug,
            title: 'Hotel Da Nang',
          };
        }

        return null;
      },
    },
  });

  await assert.rejects(
    () => service.getServiceDetail({ slug: 'Bad Slug' }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'slug',
          message:
            'slug must contain only lowercase letters, numbers, and hyphens',
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    () => service.getServiceDetail({ slug: 'unknown-service' }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
      assert.equal(error.statusCode, 404);
      return true;
    },
  );

  await assert.rejects(
    () => service.getServiceDetail({ slug: 'hotel-da-nang' }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
      assert.equal(error.statusCode, 404);
      return true;
    },
  );
});

test('lookupService.getServiceImages validates UUID, checks parent service, and returns public image fields only', async () => {
  const service = lookupService.createLookupService({
    repository: {
      getPublicServiceById: async (serviceId) => {
        assert.equal(serviceId, '11111111-1111-4111-8111-111111111111');

        return {
          id: serviceId,
          service_type: 'tour',
          slug: 'tour-da-lat-3n2d',
          title: 'Tour Da Lat 3N2D',
        };
      },
      listServiceImages: async (serviceId) => {
        assert.equal(serviceId, '11111111-1111-4111-8111-111111111111');

        return [
          {
            alt_text: 'Primary image',
            cloudinary_public_id: 'hidden-id',
            image_url: 'https://example.com/1.jpg',
            is_primary: true,
            sort_order: '0',
          },
          {
            alt_text: 'Secondary image',
            cloudinary_public_id: 'hidden-id-2',
            image_url: 'https://example.com/2.jpg',
            is_primary: false,
            sort_order: '1',
          },
        ];
      },
    },
  });

  const result = await service.getServiceImages({
    service_id: '11111111-1111-4111-8111-111111111111',
  });

  assert.deepEqual(result, [
    {
      alt_text: 'Primary image',
      image_url: 'https://example.com/1.jpg',
      is_primary: true,
      sort_order: 0,
    },
    {
      alt_text: 'Secondary image',
      image_url: 'https://example.com/2.jpg',
      is_primary: false,
      sort_order: 1,
    },
  ]);

  await assert.rejects(
    () => service.getServiceImages({ service_id: 'not-a-uuid' }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'service_id',
          message: 'service_id must be a valid UUID',
        },
      ]);
      return true;
    },
  );
});

test('lookupService.getServiceImages returns 404 for non-public parent service', async () => {
  const service = lookupService.createLookupService({
    repository: {
      getPublicServiceById: async () => null,
      listServiceImages: async () => [],
    },
  });

  await assert.rejects(
    () => service.getServiceImages({
      service_id: '11111111-1111-4111-8111-111111111111',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
      assert.equal(error.statusCode, 404);
      return true;
    },
  );
});

test('lookupService.getServiceAvailability returns tour availability for matching future schedule', async () => {
  const service = lookupService.createLookupService({
    repository: {
      getPublicServiceById: async (serviceId) => {
        assert.equal(serviceId, '11111111-1111-4111-8111-111111111111');

        return {
          base_price: '3500000',
          currency: 'VND',
          id: serviceId,
          metadata: null,
          sale_price: '3200000',
          service_type: 'tour',
          slug: 'tour-da-lat',
          title: 'Tour Da Lat',
        };
      },
      getTourDetail: async () => ({
        departure_schedule: [
          {
            available_slots: 5,
            date: '2099-07-20',
          },
        ],
      }),
    },
  });

  const result = await service.getServiceAvailability({
    body: {
      quantity: 2,
      service_type: 'tour',
      start_at: '2099-07-20T07:00:00.000Z',
    },
    service_id: '11111111-1111-4111-8111-111111111111',
  });

  assert.deepEqual(result, {
    available: true,
    available_quantity: 5,
    currency: 'VND',
    issues: [],
    total_amount: 6400000,
    unit_price: 3200000,
  });
});

test('lookupService.getServiceAvailability validates service_type mismatch and quantity rules', async () => {
  const service = lookupService.createLookupService({
    repository: {
      getPublicServiceById: async () => ({
        base_price: '1000000',
        currency: 'VND',
        id: '11111111-1111-4111-8111-111111111111',
        metadata: null,
        sale_price: null,
        service_type: 'hotel',
        slug: 'hotel-test',
        title: 'Hotel Test',
      }),
    },
  });

  await assert.rejects(
    () => service.getServiceAvailability({
      body: {
        quantity: 1,
        service_type: 'tour',
      },
      service_id: '11111111-1111-4111-8111-111111111111',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'service_type',
          message: 'service_type does not match the target service',
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    () => service.getServiceAvailability({
      body: {
        quantity: 0,
        service_type: 'hotel',
      },
      service_id: '11111111-1111-4111-8111-111111111111',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'quantity',
          message: 'quantity must be a positive integer',
        },
      ]);
      return true;
    },
  );
});

test('lookupService.getServiceAvailability returns hotel availability based on room type inventory and capacity', async () => {
  const service = lookupService.createLookupService({
    repository: {
      getPublicServiceById: async () => ({
        base_price: '1200000',
        currency: 'VND',
        id: '11111111-1111-4111-8111-111111111111',
        metadata: null,
        sale_price: null,
        service_type: 'hotel',
        slug: 'hotel-da-nang',
        title: 'Hotel Da Nang',
      }),
      getRoomTypeById: async (referenceId) => {
        assert.equal(referenceId, '22222222-2222-4222-8222-222222222222');

        return {
          available_rooms: 3,
          base_price: '1500000',
          hotel_service_id: '11111111-1111-4111-8111-111111111111',
          id: referenceId,
          max_adults: 2,
          max_children: 1,
          status: 'active',
        };
      },
    },
  });

  const availableResult = await service.getServiceAvailability({
    body: {
      quantity: 2,
      reference_id: '22222222-2222-4222-8222-222222222222',
      service_type: 'hotel',
      start_at: '2099-07-20T14:00:00.000Z',
      end_at: '2099-07-22T12:00:00.000Z',
    },
    service_id: '11111111-1111-4111-8111-111111111111',
  });

  assert.equal(availableResult.available, true);
  assert.equal(availableResult.available_quantity, 3);
  assert.equal(availableResult.unit_price, 1500000);

  const capacityResult = await service.getServiceAvailability({
    body: {
      options: {
        adults: 3,
      },
      quantity: 1,
      reference_id: '22222222-2222-4222-8222-222222222222',
      service_type: 'hotel',
      start_at: '2099-07-20T14:00:00.000Z',
      end_at: '2099-07-22T12:00:00.000Z',
    },
    service_id: '11111111-1111-4111-8111-111111111111',
  });

  assert.equal(capacityResult.available, false);
  assert.equal(capacityResult.issues[0].code, 'MAX_ADULTS_EXCEEDED');
});

test('lookupService.getServiceAvailability returns flight or train unavailable without mutating inventory', async () => {
  const service = lookupService.createLookupService({
    repository: {
      getFlightDetailById: async () => ({
        departure_at: '2099-07-20T08:00:00.000Z',
        fare_price: '2500000',
        seats_available: 1,
        service_id: '11111111-1111-4111-8111-111111111111',
        status: 'open',
      }),
      getPublicServiceById: async () => ({
        base_price: '2600000',
        currency: 'VND',
        id: '11111111-1111-4111-8111-111111111111',
        metadata: null,
        sale_price: null,
        service_type: 'flight',
        slug: 'flight-sgn-dad',
        title: 'Flight SGN DAD',
      }),
    },
  });

  const result = await service.getServiceAvailability({
    body: {
      quantity: 2,
      reference_id: '33333333-3333-4333-8333-333333333333',
      service_type: 'flight',
    },
    service_id: '11111111-1111-4111-8111-111111111111',
  });

  assert.deepEqual(result, {
    available: false,
    available_quantity: 1,
    currency: 'VND',
    issues: [
      {
        code: 'INSUFFICIENT_AVAILABILITY',
        message: 'Requested quantity exceeds the available inventory.',
      },
    ],
    total_amount: 5000000,
    unit_price: 2500000,
  });
});

test('lookupService.getServiceAvailability checks combo child items', async () => {
  const service = lookupService.createLookupService({
    repository: {
      getPublicServiceById: async (serviceId) => {
        if (serviceId === '11111111-1111-4111-8111-111111111111') {
          return {
            base_price: '5000000',
            currency: 'VND',
            id: serviceId,
            metadata: {
              combo_items: [
                {
                  quantity: 1,
                  reference_id: '44444444-4444-4444-8444-444444444444',
                  service_id: '55555555-5555-4555-8555-555555555555',
                  service_type: 'train',
                },
              ],
            },
            sale_price: '4500000',
            service_type: 'combo',
            slug: 'combo-test',
            title: 'Combo Test',
          };
        }

        return {
          base_price: '1000000',
          currency: 'VND',
          id: serviceId,
          metadata: null,
          sale_price: null,
          service_type: 'train',
          slug: 'train-child',
          title: 'Train Child',
        };
      },
      getTrainDetailById: async () => ({
        departure_at: '2099-07-20T08:00:00.000Z',
        fare_price: '900000',
        seats_available: 0,
        service_id: '55555555-5555-4555-8555-555555555555',
        status: 'open',
      }),
    },
  });

  const result = await service.getServiceAvailability({
    body: {
      quantity: 1,
      service_type: 'combo',
    },
    service_id: '11111111-1111-4111-8111-111111111111',
  });

  assert.equal(result.available, false);
  assert.equal(result.issues[0].code, 'COMBO_ITEM_UNAVAILABLE');
});

test('lookupService.getHotelRooms validates query and returns only active rooms with enough capacity', async () => {
  const service = lookupService.createLookupService({
    repository: {
      getPublicServiceById: async (serviceId) => {
        assert.equal(serviceId, '11111111-1111-4111-8111-111111111111');

        return {
          currency: 'VND',
          id: serviceId,
          service_type: 'hotel',
          title: 'Hotel Da Nang',
        };
      },
      listActiveRoomTypesByHotel: async (hotelServiceId) => {
        assert.equal(hotelServiceId, '11111111-1111-4111-8111-111111111111');

        return [
          {
            available_rooms: 3,
            base_price: '1500000',
            bed_type: 'King',
            description: 'Large room',
            id: 'room-1',
            max_adults: 2,
            max_children: 1,
            name: 'Deluxe',
          },
          {
            available_rooms: 0,
            base_price: '900000',
            bed_type: 'Twin',
            description: 'Compact room',
            id: 'room-2',
            max_adults: 1,
            max_children: 0,
            name: 'Standard',
          },
        ];
      },
    },
  });

  const result = await service.getHotelRooms({
    adults: '2',
    checkin: '2099-07-20T14:00:00.000Z',
    checkout: '2099-07-22T12:00:00.000Z',
    children: '1',
    hotel_service_id: '11111111-1111-4111-8111-111111111111',
  });

  assert.deepEqual(result, [
    {
      available_rooms: 3,
      base_price: 1500000,
      bed_type: 'King',
      currency: 'VND',
      description: 'Large room',
      id: 'room-1',
      is_available: true,
      max_adults: 2,
      max_children: 1,
      name: 'Deluxe',
    },
  ]);
});

test('lookupService.getHotelRooms returns empty list for no matching room and rejects invalid input', async () => {
  const service = lookupService.createLookupService({
    repository: {
      getPublicServiceById: async () => ({
        currency: 'VND',
        id: '11111111-1111-4111-8111-111111111111',
        service_type: 'hotel',
        title: 'Hotel Da Nang',
      }),
      listActiveRoomTypesByHotel: async () => [
        {
          available_rooms: 0,
          base_price: '900000',
          bed_type: 'Twin',
          description: 'Compact room',
          id: 'room-2',
          max_adults: 1,
          max_children: 0,
          name: 'Standard',
        },
      ],
    },
  });

  const emptyResult = await service.getHotelRooms({
    adults: '2',
    children: '1',
    hotel_service_id: '11111111-1111-4111-8111-111111111111',
  });

  assert.deepEqual(emptyResult, []);

  await assert.rejects(
    () => service.getHotelRooms({
      checkin: '2099-07-20T14:00:00.000Z',
      hotel_service_id: '11111111-1111-4111-8111-111111111111',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'checkin_checkout',
          message: 'checkin and checkout must be provided together',
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    () => service.getHotelRooms({
      adults: '0',
      hotel_service_id: '11111111-1111-4111-8111-111111111111',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'adults',
          message: 'adults must be greater than or equal to 1',
        },
      ]);
      return true;
    },
  );
});

test('lookupService.getHotelRooms returns 404 for missing or non-hotel parent service', async () => {
  const service = lookupService.createLookupService({
    repository: {
      getPublicServiceById: async (serviceId) => {
        if (serviceId === '11111111-1111-4111-8111-111111111111') {
          return null;
        }

        return {
          currency: 'VND',
          id: serviceId,
          service_type: 'tour',
          title: 'Tour Parent',
        };
      },
      listActiveRoomTypesByHotel: async () => [],
    },
  });

  await assert.rejects(
    () => service.getHotelRooms({
      hotel_service_id: '11111111-1111-4111-8111-111111111111',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
      return true;
    },
  );

  await assert.rejects(
    () => service.getHotelRooms({
      hotel_service_id: '22222222-2222-4222-8222-222222222222',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
      return true;
    },
  );
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
        message:
          'type=room is not supported in public service search. Use /services/{hotel_service_id}/rooms.',
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

test('GET /api/services/featured returns featured service cards and cache headers', async () => {
  const originalGetFeaturedServices = lookupService.getFeaturedServices;
  const server = app.listen(0);

  lookupService.getFeaturedServices = async (query) => {
    assert.deepEqual({ ...query }, {
      limit: '4',
      type: 'tour',
    });

    return [
      {
        base_price: 3200000,
        currency: 'VND',
        id: 'featured-1',
        location_text: 'Da Lat',
        primary_image: 'https://example.com/card.jpg',
        public_price: 2890000,
        sale_price: 2890000,
        service_type: 'tour',
        short_description: 'Featured card',
        slug: 'featured-tour',
        title: 'Featured Tour',
      },
    ];
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/services/featured?type=tour&limit=4`,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Featured services retrieved successfully',
    );
    assert.deepEqual(response.body.data, [
      {
        base_price: 3200000,
        currency: 'VND',
        id: 'featured-1',
        location_text: 'Da Lat',
        primary_image: 'https://example.com/card.jpg',
        public_price: 2890000,
        sale_price: 2890000,
        service_type: 'tour',
        short_description: 'Featured card',
        slug: 'featured-tour',
        title: 'Featured Tour',
      },
    ]);
    assert.match(response.headers['cache-control'], /max-age=900/);
  } finally {
    lookupService.getFeaturedServices = originalGetFeaturedServices;
    server.close();
  }
});

test('GET /api/services validates room type with public-safe error', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/services?type=room`);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Validation failed');
    assert.equal(response.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);
    assert.deepEqual(response.body.error.details, [
      {
        field: 'type',
        message:
          'type=room is not supported in public service search. Use /services/{hotel_service_id}/rooms.',
      },
    ]);
  } finally {
    server.close();
  }
});

test('GET /api/services returns service cards with pagination meta', async () => {
  const originalSearchServices = lookupService.searchServices;
  const server = app.listen(0);

  lookupService.searchServices = async (query) => {
    assert.deepEqual({ ...query }, {
      limit: '2',
      location: 'Da Nang',
      max_price: '5000000',
      min_price: '1000000',
      page: '2',
      q: 'tour',
      sort: 'newest',
      type: 'tour',
    });

    return {
      meta: {
        has_next: false,
        limit: 2,
        page: 2,
        total: 3,
        total_pages: 2,
      },
      services: [
        {
          base_price: 4200000,
          currency: 'VND',
          id: 'service-3',
          location_text: 'Da Nang',
          primary_image: null,
          public_price: 3990000,
          sale_price: 3990000,
          service_type: 'tour',
          short_description: 'Search result card',
          slug: 'tour-da-nang-search',
          title: 'Tour Da Nang Search',
        },
      ],
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/services?type=tour&q=tour&location=Da%20Nang&min_price=1000000&max_price=5000000&sort=newest&page=2&limit=2`,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Services retrieved successfully');
    assert.deepEqual(response.body.data, [
      {
        base_price: 4200000,
        currency: 'VND',
        id: 'service-3',
        location_text: 'Da Nang',
        primary_image: null,
        public_price: 3990000,
        sale_price: 3990000,
        service_type: 'tour',
        short_description: 'Search result card',
        slug: 'tour-da-nang-search',
        title: 'Tour Da Nang Search',
      },
    ]);
    assert.deepEqual(response.body.meta, {
      has_next: false,
      limit: 2,
      page: 2,
      total: 3,
      total_pages: 2,
    });
  } finally {
    lookupService.searchServices = originalSearchServices;
    server.close();
  }
});

test('GET /api/services/combos returns combo cards, meta, and cache headers', async () => {
  const originalGetCombos = lookupService.getCombos;
  const server = app.listen(0);

  lookupService.getCombos = async (query) => {
    assert.deepEqual({ ...query }, {
      limit: '2',
      location: 'Da Nang',
      max_price: '5000000',
      min_price: '1000000',
      page: '1',
    });

    return {
      combos: [
        {
          base_price: 5800000,
          currency: 'VND',
          id: 'combo-1',
          location_text: 'Da Nang',
          primary_image: 'https://example.com/combo.jpg',
          public_price: 5100000,
          sale_price: 5100000,
          service_type: 'combo',
          short_description: 'Combo card',
          slug: 'combo-da-nang',
          title: 'Combo Da Nang',
        },
      ],
      meta: {
        has_next: false,
        limit: 2,
        page: 1,
        total: 1,
        total_pages: 1,
      },
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/services/combos?location=Da%20Nang&min_price=1000000&max_price=5000000&page=1&limit=2`,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Combos retrieved successfully');
    assert.deepEqual(response.body.data, [
      {
        base_price: 5800000,
        currency: 'VND',
        id: 'combo-1',
        location_text: 'Da Nang',
        primary_image: 'https://example.com/combo.jpg',
        public_price: 5100000,
        sale_price: 5100000,
        service_type: 'combo',
        short_description: 'Combo card',
        slug: 'combo-da-nang',
        title: 'Combo Da Nang',
      },
    ]);
    assert.deepEqual(response.body.meta, {
      has_next: false,
      limit: 2,
      page: 1,
      total: 1,
      total_pages: 1,
    });
    assert.match(response.headers['cache-control'], /max-age=900/);
  } finally {
    lookupService.getCombos = originalGetCombos;
    server.close();
  }
});

test('GET /api/services/combos validates invalid price range without token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/services/combos?min_price=5000000&max_price=1000000`,
    );

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Validation failed');
    assert.equal(response.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);
    assert.deepEqual(response.body.error.details, [
      {
        field: 'price_range',
        message: 'min_price must be less than or equal to max_price',
      },
    ]);
  } finally {
    server.close();
  }
});

test('GET /api/services/combos/{slug} returns combo detail and cache headers', async () => {
  const originalGetComboDetail = lookupService.getComboDetail;
  const server = app.listen(0);

  lookupService.getComboDetail = async (params) => {
    assert.deepEqual({ ...params }, {
      slug: 'combo-da-nang',
    });

    return {
      base_price: 6000000,
      cancellation_policy: 'Combo policy',
      combo_items: [
        {
          quantity: 2,
          service_id: 'child-service-1',
          service_type: 'hotel',
          slug: 'hotel-da-nang',
          title: 'Hotel Da Nang',
        },
      ],
      currency: 'VND',
      description: 'Combo description',
      id: 'combo-service-1',
      is_bookable: true,
      location_text: 'Da Nang',
      primary_image: 'https://example.com/combo.jpg',
      provider_name: 'Net Viet Travel',
      public_price: 5200000,
      sale_price: 5200000,
      service_type: 'combo',
      short_description: 'Combo short',
      slug: 'combo-da-nang',
      title: 'Combo Da Nang',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/services/combos/combo-da-nang`,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Combo detail retrieved successfully');
    assert.equal(response.body.data.slug, 'combo-da-nang');
    assert.equal(response.body.data.is_bookable, true);
    assert.deepEqual(response.body.data.combo_items, [
      {
        quantity: 2,
        service_id: 'child-service-1',
        service_type: 'hotel',
        slug: 'hotel-da-nang',
        title: 'Hotel Da Nang',
      },
    ]);
    assert.match(response.headers['cache-control'], /max-age=900/);
  } finally {
    lookupService.getComboDetail = originalGetComboDetail;
    server.close();
  }
});

test('GET /api/services/combos/{slug} propagates 404 for hidden or missing combo', async () => {
  const originalGetComboDetail = lookupService.getComboDetail;
  const server = app.listen(0);

  lookupService.getComboDetail = async () => {
    const error = new Error('Combo not found');
    error.code = API_ERROR_CODES.RESOURCE_NOT_FOUND;
    error.statusCode = 404;
    throw error;
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/services/combos/hidden-combo`,
    );

    assert.equal(response.statusCode, 404);
    assert.equal(response.body.success, false);
    assert.equal(
      response.body.error.code,
      API_ERROR_CODES.RESOURCE_NOT_FOUND,
    );
  } finally {
    lookupService.getComboDetail = originalGetComboDetail;
    server.close();
  }
});

test('GET /api/services/flights/search returns public flight search results', async () => {
  const originalSearchFlights = lookupService.searchFlights;
  const server = app.listen(0);

  lookupService.searchFlights = async (query) => {
    assert.deepEqual({ ...query }, {
      cabin_class: 'economy',
      departure_date: '2099-07-20',
      from: 'SGN',
      to: 'DAD',
    });

    return [
      {
        airline_name: 'Vietnam Airlines',
        arrival_airport: 'DAD',
        arrival_at: '2099-07-20T03:30:00.000Z',
        cabin_class: 'economy',
        currency: 'VND',
        departure_airport: 'SGN',
        departure_at: '2099-07-20T01:00:00.000Z',
        fare_price: 2100000,
        flight_detail_id: 'flight-detail-1',
        flight_number: 'VN123',
        seats_available: 9,
        service_id: 'flight-service-1',
        slug: 'flight-sgn-dad',
      },
    ];
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/services/flights/search?from=SGN&to=DAD&departure_date=2099-07-20&cabin_class=economy`,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Flights retrieved successfully');
    assert.deepEqual(response.body.data, [
      {
        airline_name: 'Vietnam Airlines',
        arrival_airport: 'DAD',
        arrival_at: '2099-07-20T03:30:00.000Z',
        cabin_class: 'economy',
        currency: 'VND',
        departure_airport: 'SGN',
        departure_at: '2099-07-20T01:00:00.000Z',
        fare_price: 2100000,
        flight_detail_id: 'flight-detail-1',
        flight_number: 'VN123',
        seats_available: 9,
        service_id: 'flight-service-1',
        slug: 'flight-sgn-dad',
      },
    ]);
  } finally {
    lookupService.searchFlights = originalSearchFlights;
    server.close();
  }
});

test('GET /api/services/flights/search without query returns all public flights', async () => {
  const originalSearchFlights = lookupService.searchFlights;
  const server = app.listen(0);

  lookupService.searchFlights = async (query) => {
    assert.deepEqual({ ...query }, {});

    return [
      {
        airline_name: 'VietJet Air',
        arrival_airport: 'HAN',
        arrival_at: '2099-07-21T03:30:00.000Z',
        cabin_class: 'economy',
        currency: 'VND',
        departure_airport: 'SGN',
        departure_at: '2099-07-21T01:00:00.000Z',
        fare_price: 2300000,
        flight_detail_id: 'flight-detail-2',
        flight_number: 'VJ456',
        seats_available: 11,
        service_id: 'flight-service-2',
        slug: 'flight-sgn-han',
      },
    ];
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/services/flights/search`,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Flights retrieved successfully');
    assert.deepEqual(response.body.data, [
      {
        airline_name: 'VietJet Air',
        arrival_airport: 'HAN',
        arrival_at: '2099-07-21T03:30:00.000Z',
        cabin_class: 'economy',
        currency: 'VND',
        departure_airport: 'SGN',
        departure_at: '2099-07-21T01:00:00.000Z',
        fare_price: 2300000,
        flight_detail_id: 'flight-detail-2',
        flight_number: 'VJ456',
        seats_available: 11,
        service_id: 'flight-service-2',
        slug: 'flight-sgn-han',
      },
    ]);
  } finally {
    lookupService.searchFlights = originalSearchFlights;
    server.close();
  }
});

test('GET /api/services/trains/search returns public train search results', async () => {
  const originalSearchTrains = lookupService.searchTrains;
  const server = app.listen(0);

  lookupService.searchTrains = async (query) => {
    assert.deepEqual({ ...query }, {
      departure_date: '2099-07-20',
      from: 'Ha Noi',
      seat_class: 'sleeper',
      to: 'Da Nang',
    });

    return [
      {
        arrival_at: '2099-07-20T13:00:00.000Z',
        arrival_station: 'Da Nang',
        currency: 'VND',
        departure_at: '2099-07-20T03:00:00.000Z',
        departure_station: 'Ha Noi',
        fare_price: 990000,
        seat_class: 'sleeper',
        seats_available: 5,
        service_id: 'train-service-1',
        slug: 'train-ha-noi-da-nang',
        train_detail_id: 'train-detail-1',
        train_number: 'SE3',
      },
    ];
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/services/trains/search?from=Ha%20Noi&to=Da%20Nang&departure_date=2099-07-20&seat_class=sleeper`,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Trains retrieved successfully');
    assert.deepEqual(response.body.data, [
      {
        arrival_at: '2099-07-20T13:00:00.000Z',
        arrival_station: 'Da Nang',
        currency: 'VND',
        departure_at: '2099-07-20T03:00:00.000Z',
        departure_station: 'Ha Noi',
        fare_price: 990000,
        seat_class: 'sleeper',
        seats_available: 5,
        service_id: 'train-service-1',
        slug: 'train-ha-noi-da-nang',
        train_detail_id: 'train-detail-1',
        train_number: 'SE3',
      },
    ]);
  } finally {
    lookupService.searchTrains = originalSearchTrains;
    server.close();
  }
});

test('GET /api/services/trains/search validates invalid seat class', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/services/trains/search?from=Ha%20Noi&to=Da%20Nang&departure_date=2099-07-20&seat_class=business`,
    );

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Validation failed');
    assert.equal(response.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);
    assert.deepEqual(response.body.error.details, [
      {
        field: 'seat_class',
        message:
          'seat_class must be one of: hard_seat, soft_seat, sleeper, vip',
      },
    ]);
  } finally {
    server.close();
  }
});

test('GET /api/services/{slug} returns public service detail and cache headers', async () => {
  const originalGetServiceDetail = lookupService.getServiceDetail;
  const server = app.listen(0);

  lookupService.getServiceDetail = async (params) => {
    assert.deepEqual({ ...params }, {
      slug: 'tour-da-lat-3n2d',
    });

    return {
      base_price: 3200000,
      cancellation_policy: 'Cancel before 7 days',
      currency: 'VND',
      description: 'Detailed description',
      details: {
        duration_days: 3,
        duration_nights: 2,
        transport_type: 'bus',
      },
      id: 'service-tour-1',
      location_text: 'Da Lat',
      primary_image: 'https://example.com/tour.jpg',
      provider_name: 'Net Viet Travel',
      public_price: 2890000,
      sale_price: 2890000,
      service_type: 'tour',
      short_description: 'Short description',
      slug: 'tour-da-lat-3n2d',
      title: 'Tour Da Lat 3N2D',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/services/tour-da-lat-3n2d`,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Service detail retrieved successfully',
    );
    assert.equal(response.body.data.slug, 'tour-da-lat-3n2d');
    assert.equal(response.body.data.details.transport_type, 'bus');
    assert.match(response.headers['cache-control'], /max-age=900/);
  } finally {
    lookupService.getServiceDetail = originalGetServiceDetail;
    server.close();
  }
});

test('GET /api/services/{slug} forwards reference_id query to service detail lookup', async () => {
  const originalGetServiceDetail = lookupService.getServiceDetail;
  const server = app.listen(0);

  lookupService.getServiceDetail = async (params) => {
    assert.deepEqual({ ...params }, {
      reference_id: '11111111-1111-4111-8111-111111111111',
      slug: 'flight-dad-han',
    });

    return {
      base_price: 2300000,
      cancellation_policy: null,
      currency: 'VND',
      description: 'Flight detail',
      details: {
        arrival_airport: 'HAN',
        arrival_at: '2099-07-21T11:30:00.000Z',
        cabin_class: 'economy',
        departure_airport: 'DAD',
        departure_at: '2099-07-21T09:00:00.000Z',
        fare_price: 2100000,
        flight_number: 'VN456',
        id: '11111111-1111-4111-8111-111111111111',
        is_bookable: true,
        seats_available: 8,
      },
      id: 'flight-service-2',
      location_text: 'Ha Noi',
      primary_image: null,
      provider_name: 'Vietnam Airlines',
      public_price: 2100000,
      sale_price: 2100000,
      service_type: 'flight',
      short_description: 'Morning flight',
      slug: 'flight-dad-han',
      title: 'Flight DAD - HAN',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/services/flight-dad-han?reference_id=11111111-1111-4111-8111-111111111111`,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.data.details.id,
      '11111111-1111-4111-8111-111111111111',
    );
  } finally {
    lookupService.getServiceDetail = originalGetServiceDetail;
    server.close();
  }
});

test('GET /api/services/{slug} validates bad slug format', async () => {
  const server = app.listen(0);

  try {
    const badSlugResponse = await request(
      server,
      `${apiPrefix}/services/Bad%20Slug`,
    );

    assert.equal(badSlugResponse.statusCode, 400);
    assert.equal(badSlugResponse.body.success, false);
    assert.equal(
      badSlugResponse.body.error.code,
      API_ERROR_CODES.VALIDATION_ERROR,
    );
  } finally {
    server.close();
  }
});

test('GET /api/services/{slug} returns 404 for hidden or missing service', async () => {
  const originalGetServiceDetail = lookupService.getServiceDetail;
  const server = app.listen(0);

  lookupService.getServiceDetail = async () => {
    const error = new Error('Service not found');
    error.code = API_ERROR_CODES.RESOURCE_NOT_FOUND;
    error.statusCode = 404;
    throw error;
  };

  try {
    const notFoundResponse = await request(
      server,
      `${apiPrefix}/services/hidden-service`,
    );

    assert.equal(notFoundResponse.statusCode, 404);
    assert.equal(notFoundResponse.body.success, false);
    assert.equal(
      notFoundResponse.body.error.code,
      API_ERROR_CODES.RESOURCE_NOT_FOUND,
    );
  } finally {
    lookupService.getServiceDetail = originalGetServiceDetail;
    server.close();
  }
});

test('GET /api/services/{service_id}/images returns public images and cache headers', async () => {
  const originalGetServiceImages = lookupService.getServiceImages;
  const server = app.listen(0);

  lookupService.getServiceImages = async (params) => {
    assert.deepEqual({ ...params }, {
      service_id: '11111111-1111-4111-8111-111111111111',
    });

    return [
      {
        alt_text: 'Primary image',
        image_url: 'https://example.com/1.jpg',
        is_primary: true,
        sort_order: 0,
      },
    ];
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/services/11111111-1111-4111-8111-111111111111/images`,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Service images retrieved successfully',
    );
    assert.deepEqual(response.body.data, [
      {
        alt_text: 'Primary image',
        image_url: 'https://example.com/1.jpg',
        is_primary: true,
        sort_order: 0,
      },
    ]);
    assert.match(response.headers['cache-control'], /max-age=900/);
  } finally {
    lookupService.getServiceImages = originalGetServiceImages;
    server.close();
  }
});

test('GET /api/services/{service_id}/images validates bad UUID', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/services/not-a-uuid/images`);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Validation failed');
    assert.equal(response.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);
    assert.deepEqual(response.body.error.details, [
      {
        field: 'service_id',
        message: 'service_id must be a valid UUID',
      },
    ]);
  } finally {
    server.close();
  }
});

test('POST /api/services/{service_id}/availability returns read-only availability payload', async () => {
  const originalGetServiceAvailability = lookupService.getServiceAvailability;
  const server = app.listen(0);

  lookupService.getServiceAvailability = async (payload) => {
    assert.deepEqual(payload, {
      body: {
        quantity: 2,
        reference_id: '22222222-2222-4222-8222-222222222222',
        service_type: 'hotel',
        start_at: '2099-07-20T14:00:00.000Z',
        end_at: '2099-07-22T12:00:00.000Z',
      },
      service_id: '11111111-1111-4111-8111-111111111111',
    });

    return {
      available: true,
      available_quantity: 3,
      currency: 'VND',
      issues: [],
      total_amount: 3000000,
      unit_price: 1500000,
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/services/11111111-1111-4111-8111-111111111111/availability`,
      {
        body: JSON.stringify({
          quantity: 2,
          reference_id: '22222222-2222-4222-8222-222222222222',
          service_type: 'hotel',
          start_at: '2099-07-20T14:00:00.000Z',
          end_at: '2099-07-22T12:00:00.000Z',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Service availability retrieved successfully',
    );
    assert.deepEqual(response.body.data, {
      available: true,
      available_quantity: 3,
      currency: 'VND',
      issues: [],
      total_amount: 3000000,
      unit_price: 1500000,
    });
  } finally {
    lookupService.getServiceAvailability = originalGetServiceAvailability;
    server.close();
  }
});

test('POST /api/services/{service_id}/availability validates bad UUID', async () => {
  const server = app.listen(0);

  try {
    const invalidResponse = await request(
      server,
      `${apiPrefix}/services/not-a-uuid/availability`,
      {
        body: JSON.stringify({
          quantity: 1,
          service_type: 'tour',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    );

    assert.equal(invalidResponse.statusCode, 400);
    assert.equal(invalidResponse.body.success, false);
    assert.equal(
      invalidResponse.body.error.code,
      API_ERROR_CODES.VALIDATION_ERROR,
    );
  } finally {
    server.close();
  }
});

test('POST /api/services/{service_id}/availability propagates 404 for hidden or missing service', async () => {
  const originalGetServiceAvailability = lookupService.getServiceAvailability;
  const server = app.listen(0);

  lookupService.getServiceAvailability = async () => {
    const error = new Error('Service not found');
    error.code = API_ERROR_CODES.RESOURCE_NOT_FOUND;
    error.statusCode = 404;
    throw error;
  };

  try {
    const notFoundResponse = await request(
      server,
      `${apiPrefix}/services/11111111-1111-4111-8111-111111111111/availability`,
      {
        body: JSON.stringify({
          quantity: 1,
          service_type: 'tour',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    );

    assert.equal(notFoundResponse.statusCode, 404);
    assert.equal(notFoundResponse.body.success, false);
    assert.equal(
      notFoundResponse.body.error.code,
      API_ERROR_CODES.RESOURCE_NOT_FOUND,
    );
  } finally {
    lookupService.getServiceAvailability = originalGetServiceAvailability;
    server.close();
  }
});

test('GET /api/services/{hotel_service_id}/rooms returns public room list and cache headers', async () => {
  const originalGetHotelRooms = lookupService.getHotelRooms;
  const server = app.listen(0);

  lookupService.getHotelRooms = async (params) => {
    assert.deepEqual({ ...params }, {
      adults: '2',
      checkin: '2099-07-20T14:00:00.000Z',
      checkout: '2099-07-22T12:00:00.000Z',
      children: '1',
      hotel_service_id: '11111111-1111-4111-8111-111111111111',
    });

    return [
      {
        available_rooms: 3,
        base_price: 1500000,
        bed_type: 'King',
        currency: 'VND',
        description: 'Large room',
        id: 'room-1',
        is_available: true,
        max_adults: 2,
        max_children: 1,
        name: 'Deluxe',
      },
    ];
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/services/11111111-1111-4111-8111-111111111111/rooms?checkin=2099-07-20T14:00:00.000Z&checkout=2099-07-22T12:00:00.000Z&adults=2&children=1`,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Hotel rooms retrieved successfully');
    assert.deepEqual(response.body.data, [
      {
        available_rooms: 3,
        base_price: 1500000,
        bed_type: 'King',
        currency: 'VND',
        description: 'Large room',
        id: 'room-1',
        is_available: true,
        max_adults: 2,
        max_children: 1,
        name: 'Deluxe',
      },
    ]);
    assert.match(response.headers['cache-control'], /max-age=900/);
  } finally {
    lookupService.getHotelRooms = originalGetHotelRooms;
    server.close();
  }
});

test('GET /api/services/{hotel_service_id}/rooms validates bad UUID', async () => {
  const server = app.listen(0);

  try {
    const invalidUuidResponse = await request(
      server,
      `${apiPrefix}/services/not-a-uuid/rooms`,
    );

    assert.equal(invalidUuidResponse.statusCode, 400);
    assert.equal(
      invalidUuidResponse.body.error.code,
      API_ERROR_CODES.VALIDATION_ERROR,
    );
  } finally {
    server.close();
  }
});

test('GET /api/services/{hotel_service_id}/rooms validates checkin and checkout pair', async () => {
  const server = app.listen(0);

  try {
    const invalidPairResponse = await request(
      server,
      `${apiPrefix}/services/11111111-1111-4111-8111-111111111111/rooms?checkin=2099-07-20T14:00:00.000Z`,
    );

    assert.equal(invalidPairResponse.statusCode, 400);
    assert.equal(
      invalidPairResponse.body.error.code,
      API_ERROR_CODES.VALIDATION_ERROR,
    );
  } finally {
    server.close();
  }
});

test('GET /api/services/{hotel_service_id}/rooms propagates 404 for hidden or missing parent hotel', async () => {
  const originalGetHotelRooms = lookupService.getHotelRooms;
  const server = app.listen(0);

  lookupService.getHotelRooms = async () => {
    const error = new Error('Hotel not found');
    error.code = API_ERROR_CODES.RESOURCE_NOT_FOUND;
    error.statusCode = 404;
    throw error;
  };

  try {
    const notFoundResponse = await request(
      server,
      `${apiPrefix}/services/11111111-1111-4111-8111-111111111111/rooms`,
    );

    assert.equal(notFoundResponse.statusCode, 404);
    assert.equal(
      notFoundResponse.body.error.code,
      API_ERROR_CODES.RESOURCE_NOT_FOUND,
    );
  } finally {
    lookupService.getHotelRooms = originalGetHotelRooms;
    server.close();
  }
});
