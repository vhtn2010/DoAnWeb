const { API_ERROR_CODES } = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');

const createHttpError =
  (statusCode, defaultCode) =>
  (message, options = {}) =>
    new AppError(message, {
      code: options.code || defaultCode,
      details: options.details,
      statusCode,
    });

const badRequest = createHttpError(400, API_ERROR_CODES.BAD_REQUEST);
const validationError = createHttpError(400, API_ERROR_CODES.VALIDATION_ERROR);
const unauthorized = createHttpError(401, API_ERROR_CODES.UNAUTHORIZED);
const forbidden = createHttpError(403, API_ERROR_CODES.FORBIDDEN);
const notFound = createHttpError(404, API_ERROR_CODES.RESOURCE_NOT_FOUND);
const conflict = createHttpError(409, API_ERROR_CODES.CONFLICT);
const unprocessableEntity = createHttpError(
  422,
  API_ERROR_CODES.UNPROCESSABLE_ENTITY,
);
const tooManyRequests = createHttpError(
  429,
  API_ERROR_CODES.TOO_MANY_REQUESTS,
);
const serviceUnavailable = createHttpError(
  503,
  API_ERROR_CODES.SERVICE_UNAVAILABLE,
);

module.exports = {
  badRequest,
  conflict,
  createHttpError,
  forbidden,
  notFound,
  serviceUnavailable,
  tooManyRequests,
  unauthorized,
  unprocessableEntity,
  validationError,
};
