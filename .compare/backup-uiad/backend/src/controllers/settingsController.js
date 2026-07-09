const settingsService = require('../services/settingsService');
const adminSettingsService = require('../services/adminSettingsService');
const adminBusinessSettingsService = require('../services/adminBusinessSettingsService');
const adminDirectPaymentSettingsService = require('../services/adminDirectPaymentSettingsService');

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

const getAdminPublicSettings = async (req, res) => {
  const data = await adminSettingsService.getPublicSettings({
    auth: req.auth,
  });

  res.success({
    data,
    message: 'Admin public settings retrieved successfully',
  });
};

const updateAdminPublicSettings = async (req, res) => {
  const data = await adminSettingsService.updatePublicSettings({
    auth: req.auth,
    body: req.body,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data,
    message: 'Admin public settings updated successfully',
  });
};

const getAdminDirectPaymentSettings = async (req, res) => {
  const data = await adminDirectPaymentSettingsService.getDirectPaymentSettings({
    auth: req.auth,
  });

  res.success({
    data,
    message: 'Admin direct payment settings retrieved successfully',
  });
};

const updateAdminDirectPaymentSettings = async (req, res) => {
  const data =
    await adminDirectPaymentSettingsService.updateDirectPaymentSettings({
      auth: req.auth,
      body: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

  res.success({
    data,
    message: 'Admin direct payment settings updated successfully',
  });
};

const getAdminBusinessSettings = async (req, res) => {
  const data = await adminBusinessSettingsService.getBusinessSettings({
    auth: req.auth,
  });

  res.success({
    data,
    message: 'Admin business settings retrieved successfully',
  });
};

const updateAdminBusinessSettings = async (req, res) => {
  const data = await adminBusinessSettingsService.updateBusinessSettings({
    auth: req.auth,
    body: req.body,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data,
    message: 'Admin business settings updated successfully',
  });
};

module.exports = {
  getAdminBusinessSettings,
  getAdminDirectPaymentSettings,
  getAdminPublicSettings,
  getPublicSettings,
  updateAdminBusinessSettings,
  updateAdminDirectPaymentSettings,
  updateAdminPublicSettings,
};
