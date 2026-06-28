const { API_ERROR_CODES } = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');

const normalizeError = (error) => {
  if (error instanceof AppError) {
    return error;
  }

  if (error?.type === 'entity.parse.failed') {
    return new AppError('Request JSON is invalid', {
      code: API_ERROR_CODES.INVALID_JSON,
      statusCode: 400,
      details: [
        {
          field: 'body',
          message: 'Malformed JSON payload',
        },
      ],
    });
  }

  if (error?.type === 'entity.too.large') {
    return new AppError('Request payload is too large', {
      code: API_ERROR_CODES.PAYLOAD_TOO_LARGE,
      statusCode: 413,
    });
  }

  if (error?.statusCode || error?.status) {
    return new AppError(error.message || 'Request failed', {
      code: error.code || API_ERROR_CODES.BAD_REQUEST,
      details: error.details,
      statusCode: error.statusCode || error.status,
    });
  }

  return new AppError(error?.message || 'Internal server error', {
    code: error?.code || API_ERROR_CODES.INTERNAL_ERROR,
    details: error?.details,
    statusCode: 500,
  });
};

const errorHandler = (error, req, res, next) => {
  const normalizedError = normalizeError(error);

  if (process.env.NODE_ENV !== 'test' && normalizedError.statusCode >= 500) {
    console.error(normalizedError);
  }

  res.error({
    code: normalizedError.code,
    details: normalizedError.details,
    message: normalizedError.message,
    statusCode: normalizedError.statusCode,
  });
};

module.exports = {
  errorHandler,
  normalizeError,
};
