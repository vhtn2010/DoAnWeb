const { API_ERROR_CODES } = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');

const notFoundHandler = (req, res, next) => {
  next(
    new AppError('Route not found', {
      code: API_ERROR_CODES.ROUTE_NOT_FOUND,
      statusCode: 404,
    }),
  );
};

module.exports = notFoundHandler;
