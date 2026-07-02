const uploadSignatureService = require('../services/uploadSignatureService');

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

module.exports = {
  createUploadSignature,
};
