const { API_ERROR_CODES } = require('../constants/domainConstraints');

const buildSuccessResponse = ({
  data = {},
  message = 'OK',
  meta,
} = {}) => {
  const response = {
    success: true,
    message,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return response;
};

const buildErrorResponse = ({
  code = API_ERROR_CODES.INTERNAL_ERROR,
  details,
  message = 'Internal server error',
} = {}) => {
  const response = {
    success: false,
    message,
    error: {
      code,
    },
  };

  if (details) {
    response.error.details = details;
  }

  return response;
};

const buildPaginationMeta = ({
  limit,
  page,
  total,
} = {}) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.max(Number(limit) || 1, 1);
  const safeTotal = Math.max(Number(total) || 0, 0);
  const totalPages = safeTotal === 0 ? 0 : Math.ceil(safeTotal / safeLimit);

  return {
    page: safePage,
    limit: safeLimit,
    total: safeTotal,
    total_pages: totalPages,
    has_next: safePage < totalPages,
  };
};

module.exports = {
  buildErrorResponse,
  buildPaginationMeta,
  buildSuccessResponse,
};
