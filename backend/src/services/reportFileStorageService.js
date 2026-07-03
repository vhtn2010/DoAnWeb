const fs = require('node:fs/promises');
const path = require('node:path');

const {
  apiPrefix,
  backendUrl,
  cloudinary,
} = require('../config');
const { uploadImage } = require('./cloudinaryService');

const DEFAULT_EXPORT_DIRECTORY = path.resolve(
  __dirname,
  '..',
  '..',
  'tmp',
  'report-exports',
);
const SAFE_FILE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const getMimeType = (format) => {
  if (format === 'pdf') {
    return 'application/pdf';
  }

  if (format === 'xlsx') {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }

  return 'application/octet-stream';
};

const createReportFileStorageService = ({
  apiPrefixValue = apiPrefix,
  backendUrlValue = backendUrl,
  cloudinaryConfig = cloudinary,
  exportDirectory = DEFAULT_EXPORT_DIRECTORY,
  uploadFile = uploadImage,
} = {}) => {
  const ensureSafeFileName = (fileName) => {
    if (!SAFE_FILE_NAME_PATTERN.test(fileName || '')) {
      throw new Error('Invalid export file name');
    }
  };

  const saveLocalFile = async ({
    buffer,
    fileName,
    format,
  }) => {
    ensureSafeFileName(fileName);
    await fs.mkdir(exportDirectory, {
      recursive: true,
    });

    const absolutePath = path.join(exportDirectory, fileName);
    await fs.writeFile(absolutePath, buffer);

    return {
      file_url: `${backendUrlValue}${apiPrefixValue}/admin/reports/files/${encodeURIComponent(fileName)}`,
      local_path: absolutePath,
      mime_type: getMimeType(format),
      storage: 'local',
    };
  };

  const saveCloudinaryFile = async ({
    buffer,
    fileName,
    format,
    publicId,
  }) => {
    const uploadResult = await uploadFile(buffer, {
      fileName,
      folder: `${cloudinaryConfig.folder}/reports`,
      mimeType: getMimeType(format),
      publicId,
      resourceType: 'raw',
    });

    return {
      file_url: uploadResult.secure_url || uploadResult.url,
      mime_type: getMimeType(format),
      public_id: uploadResult.public_id || null,
      storage: 'cloudinary',
    };
  };

  const saveFile = async ({
    buffer,
    fileName,
    format,
    publicId,
  }) => {
    if (
      cloudinaryConfig?.isConfigured &&
      cloudinaryConfig?.cloudName &&
      cloudinaryConfig?.apiKey &&
      cloudinaryConfig?.apiSecret
    ) {
      return saveCloudinaryFile({
        buffer,
        fileName,
        format,
        publicId,
      });
    }

    return saveLocalFile({
      buffer,
      fileName,
      format,
    });
  };

  const getLocalFileDescriptor = async (fileName) => {
    ensureSafeFileName(fileName);
    const absolutePath = path.join(exportDirectory, fileName);
    await fs.access(absolutePath);

    const extension = path.extname(fileName).replace(/^\./, '').toLowerCase();

    return {
      absolutePath,
      fileName,
      mimeType: getMimeType(extension),
    };
  };

  return {
    getLocalFileDescriptor,
    saveFile,
  };
};

module.exports = Object.assign(createReportFileStorageService(), {
  DEFAULT_EXPORT_DIRECTORY,
  SAFE_FILE_NAME_PATTERN,
  createReportFileStorageService,
});
