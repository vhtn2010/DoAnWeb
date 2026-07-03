const uploadSignatureService = require('../services/uploadSignatureService');
const uploadDeleteService = require('../services/uploadDeleteService');

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

module.exports = {
  createUploadSignature,
  deleteCloudinaryUpload,
};
