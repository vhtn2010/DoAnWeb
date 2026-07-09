const {
  buildErrorResponse,
  buildSuccessResponse,
} = require('../utils/apiResponse');

const apiResponse = (req, res, next) => {
  res.success = ({
    data = {},
    message = 'OK',
    meta,
    statusCode = 200,
  } = {}) =>
    res
      .status(statusCode)
      .json(buildSuccessResponse({ data, message, meta }));

  res.error = ({
    code = 'INTERNAL_ERROR',
    details,
    message = 'Internal server error',
    statusCode = 500,
  } = {}) =>
    res
      .status(statusCode)
      .json(buildErrorResponse({ code, details, message }));

  next();
};

module.exports = apiResponse;
