const settingsService = require('../services/settingsService');

const setCacheHeaders = (res, seconds) => {
  res.set(
    'Cache-Control',
    `public, max-age=${seconds}, s-maxage=${seconds}, stale-while-revalidate=60`,
  );
};

const getPublicSettings = async (req, res) => {
  const data = await settingsService.getPublicSettings();

  setCacheHeaders(res, settingsService.PUBLIC_SETTINGS_CACHE_SECONDS);
  res.success({
    data,
    message: 'Public settings retrieved successfully',
  });
};

module.exports = {
  getPublicSettings,
};
