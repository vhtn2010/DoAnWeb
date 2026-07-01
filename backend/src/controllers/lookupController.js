const lookupService = require('../services/lookupService');

const setCacheHeaders = (res, seconds) => {
  res.set(
    'Cache-Control',
    `public, max-age=${seconds}, s-maxage=${seconds}, stale-while-revalidate=60`,
  );
};

const getPublicEnums = (req, res) => {
  setCacheHeaders(res, lookupService.ENUMS_CACHE_SECONDS);

  res.success({
    data: lookupService.getPublicEnums(),
    message: 'Lookup enums retrieved successfully',
  });
};

const getFeaturedServices = async (req, res) => {
  const data = await lookupService.getFeaturedServices(req.query);

  setCacheHeaders(res, lookupService.FEATURED_CACHE_SECONDS);
  res.success({
    data,
    message: 'Featured services retrieved successfully',
  });
};

const getCombos = async (req, res) => {
  const result = await lookupService.getCombos(req.query);

  setCacheHeaders(res, lookupService.COMBO_CACHE_SECONDS);
  res.success({
    data: result.combos,
    message: 'Combos retrieved successfully',
    meta: result.meta,
  });
};

const getComboDetail = async (req, res) => {
  const data = await lookupService.getComboDetail(req.params);

  setCacheHeaders(res, lookupService.DETAIL_CACHE_SECONDS);
  res.success({
    data,
    message: 'Combo detail retrieved successfully',
  });
};

const searchFlights = async (req, res) => {
  const data = await lookupService.searchFlights(req.query);

  res.success({
    data,
    message: 'Flights retrieved successfully',
  });
};

const getServiceDetail = async (req, res) => {
  const data = await lookupService.getServiceDetail(req.params);

  setCacheHeaders(res, lookupService.DETAIL_CACHE_SECONDS);
  res.success({
    data,
    message: 'Service detail retrieved successfully',
  });
};

const getHotelRooms = async (req, res) => {
  const data = await lookupService.getHotelRooms({
    ...req.params,
    ...req.query,
  });

  setCacheHeaders(res, lookupService.ROOM_LIST_CACHE_SECONDS);
  res.success({
    data,
    message: 'Hotel rooms retrieved successfully',
  });
};

const getPopularLocations = async (req, res) => {
  const data = await lookupService.getPopularLocations(req.query);

  setCacheHeaders(res, lookupService.FILTER_CACHE_SECONDS);
  res.success({
    data,
    message: 'Popular locations retrieved successfully',
  });
};

const getServiceFilterOptions = async (req, res) => {
  const data = await lookupService.getServiceFilterOptions();

  setCacheHeaders(res, lookupService.FILTER_CACHE_SECONDS);
  res.success({
    data,
    message: 'Service filter options retrieved successfully',
  });
};

const getServiceImages = async (req, res) => {
  const data = await lookupService.getServiceImages(req.params);

  setCacheHeaders(res, lookupService.IMAGE_CACHE_SECONDS);
  res.success({
    data,
    message: 'Service images retrieved successfully',
  });
};

const searchTrains = async (req, res) => {
  const data = await lookupService.searchTrains(req.query);

  res.success({
    data,
    message: 'Trains retrieved successfully',
  });
};

const getServiceAvailability = async (req, res) => {
  const data = await lookupService.getServiceAvailability({
    ...req.params,
    body: req.body,
  });

  res.success({
    data,
    message: 'Service availability retrieved successfully',
  });
};

const getServices = async (req, res) => {
  const result = await lookupService.searchServices(req.query);

  res.success({
    data: result.services,
    message: 'Services retrieved successfully',
    meta: result.meta,
  });
};

module.exports = {
  getComboDetail,
  getCombos,
  getFeaturedServices,
  getHotelRooms,
  getPopularLocations,
  getPublicEnums,
  searchFlights,
  getServiceAvailability,
  getServiceDetail,
  getServiceFilterOptions,
  getServiceImages,
  getServices,
  searchTrains,
};
