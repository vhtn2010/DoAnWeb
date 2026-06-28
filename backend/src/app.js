const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { apiPrefix, corsOrigin, isTest } = require('./config');
const {
  isSupabaseConfigured,
  testSupabaseConnection,
} = require('./config/supabase');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: corsOrigin,
  }),
);
app.use(express.json());

if (!isTest) {
  app.use(morgan('dev'));
}

app.get(`${apiPrefix}/health`, (req, res) => {
  res.json({
    status: 'ok',
    service: 'net-viet-travel-api',
    timestamp: new Date().toISOString(),
  });
});

app.get(`${apiPrefix}/tours`, (req, res) => {
  res.json({
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
  });
});

app.get(`${apiPrefix}/supabase-test`, async (req, res, next) => {
  try {
    const result = await testSupabaseConnection();

    res.status(result.ok ? 200 : 500).json({
      ok: result.ok,
      configured: isSupabaseConfigured,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
  });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    message: err.message || 'Internal server error',
  });
});

module.exports = app;
