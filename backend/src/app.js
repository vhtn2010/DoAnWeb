const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { apiPrefix, corsOrigin, isTest } = require('./config');
const { createSwaggerRouter, removeSwaggerCsp } = require('./docs/swagger');
const apiResponse = require('./middleware/apiResponse');
const asyncHandler = require('./middleware/asyncHandler');
const { errorHandler } = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFoundHandler');
const authRoutes = require('./routes/authRoutes');
const adminBookingRoutes = require('./routes/adminBookingRoutes');
const adminServiceCatalogRoutes = require('./routes/adminServiceCatalogRoutes');
const adminRoleRoutes = require('./routes/adminRoleRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const adminPermissionRoutes = require('./routes/adminPermissionRoutes');
const adminPromotionRoutes = require('./routes/adminPromotionRoutes');
const adminVoucherRoutes = require('./routes/adminVoucherRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const profileRoutes = require('./routes/profileRoutes');
const lookupRoutes = require('./routes/lookupRoutes');
const cartRoutes = require('./routes/cartRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const voucherRoutes = require('./routes/voucherRoutes');
const systemRoutes = require('./routes/systemRoutes');
const supportRoutes = require('./routes/supportRoutes');
const {
  isSupabaseConfigured,
  testSupabaseConnection,
} = require('./config/supabase');
const {
  API_ERROR_CODES,
  SUPABASE_CONNECTION_STATUS,
} = require('./constants/domainConstraints');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: corsOrigin,
  }),
);
app.use(apiResponse);
app.use(express.json());

if (!isTest) {
  app.use(morgan('dev'));
}

app.use('/swagger-ui', removeSwaggerCsp, createSwaggerRouter());
app.use(`${apiPrefix}/docs`, removeSwaggerCsp, createSwaggerRouter());

app.use(apiPrefix, systemRoutes);
app.use(apiPrefix, authRoutes);
app.use(apiPrefix, adminBookingRoutes);
app.use(apiPrefix, adminServiceCatalogRoutes);
app.use(apiPrefix, adminUserRoutes);
app.use(apiPrefix, adminRoleRoutes);
app.use(apiPrefix, adminPermissionRoutes);
app.use(apiPrefix, adminPromotionRoutes);
app.use(apiPrefix, adminVoucherRoutes);
app.use(apiPrefix, profileRoutes);
app.use(apiPrefix, lookupRoutes);
app.use(apiPrefix, bookingRoutes);
app.use(apiPrefix, cartRoutes);
app.use(apiPrefix, promotionRoutes);
app.use(apiPrefix, voucherRoutes);
app.use(apiPrefix, supportRoutes);

app.get(`${apiPrefix}/tours`, (req, res) => {
  res.success({
    data: [
      {
        id: 'ha-long-3n2d',
        title: 'Ha Long 3N2D',
        location: 'Quang Ninh',
        duration: '3 ngay 2 dem',
        priceFrom: 3290000,
      },
      {
        id: 'da-nang-hoi-an',
        title: 'Da Nang - Hoi An',
        location: 'Mien Trung',
        duration: '4 ngay 3 dem',
        priceFrom: 4590000,
      },
      {
        id: 'mekong-delta',
        title: 'Mien Tay Song Nuoc',
        location: 'Mekong Delta',
        duration: '2 ngay 1 dem',
        priceFrom: 1890000,
      },
    ],
    message: 'Fetched tours successfully',
  });
});

app.get(
  `${apiPrefix}/supabase-test`,
  asyncHandler(async (req, res) => {
    const result = await testSupabaseConnection();

    if (!result.ok) {
      const isNotConfigured =
        result.status === SUPABASE_CONNECTION_STATUS.NOT_CONFIGURED;

      res.error({
        code: isNotConfigured
          ? API_ERROR_CODES.SUPABASE_NOT_CONFIGURED
          : API_ERROR_CODES.SUPABASE_CONNECTION_FAILED,
        details: {
          configured: isSupabaseConfigured,
          status: result.status,
        },
        message: result.message,
        statusCode: isNotConfigured ? 503 : 502,
      });
      return;
    }

    res.success({
      data: {
        configured: isSupabaseConfigured,
        status: result.status,
      },
      message: result.message,
    });
  }),
);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
