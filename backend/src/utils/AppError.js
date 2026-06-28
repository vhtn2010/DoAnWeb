const { API_ERROR_CODES } = require('../constants/domainConstraints');

class AppError extends Error {
  constructor(
    message,
    {
      code = API_ERROR_CODES.INTERNAL_ERROR,
      details,
      statusCode = 500,
    } = {},
  ) {
    super(message);

    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
  }
}

module.exports = AppError;
