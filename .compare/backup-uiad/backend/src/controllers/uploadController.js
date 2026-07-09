const uploadSignatureService = require('../services/uploadSignatureService');
const uploadCompleteService = require('../services/uploadCompleteService');
const uploadDeleteService = require('../services/uploadDeleteService');
const uploadUsageService = require('../services/uploadUsageService');

const createUploadSignature = async (req, res) => {
  const data = await uploadSignatureService.createSignature({
    auth: req.auth,
    body: req.body,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data,
    message: 'Upload signature generated successfully',
  });
};

const completeUpload = async (req, res) => {
  const data = await uploadCompleteService.completeUpload({
    auth: req.auth,
    body: req.body,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data,
    message: 'Upload completed successfully',
  });
};

const deleteCloudinaryUpload = async (req, res) => {
  const data = await uploadDeleteService.deleteCloudinaryAsset({
    auth: req.auth,
    body: req.body,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data,
    message: 'Cloudinary asset deleted successfully',
  });
};

const getAdminUploadUsage = async (req, res) => {
  const data = await uploadUsageService.getUploadUsage({
    auth: req.auth,
    body: req.body,
    ipAddress: req.ip,
    query: req.query,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data,
    message: 'Upload usage retrieved successfully',
  });
};

module.exports = {
  completeUpload,
  createUploadSignature,
  deleteCloudinaryUpload,
  getAdminUploadUsage,
};
