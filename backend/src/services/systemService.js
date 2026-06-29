const { Buffer } = require('node:buffer');
const { apiPrefix, cloudinary, env, sendgrid } = require('../config');
const {
  isCloudinaryConfigured,
} = require('../config/cloudinary');
const {
  isSendgridConfigured,
} = require('../config/sendgrid');
const {
  isSupabaseConfigured,
  testSupabaseConnection,
} = require('../config/supabase');

const backendPackage = require('../../package.json');
const workspacePackage = require('../../../package.json');

const SERVICE_NAME = 'net-viet-travel-api';
const CONNECTION_STATUS = Object.freeze({
  CONNECTED: 'connected',
  CONNECTION_FAILED: 'connection_failed',
  DEGRADED: 'degraded',
  NOT_CONFIGURED: 'not_configured',
  READY: 'ready',
});
const serviceStartedAt = new Date();

const getTimestamp = () => new Date().toISOString();

const getUptimeSeconds = () => Number(process.uptime().toFixed(3));

const fetchWithTimeout = (url, options = {}, timeoutMs = 5000) =>
  fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
  });

const buildBaseReport = () => ({
  service: SERVICE_NAME,
  timestamp: getTimestamp(),
  uptimeSeconds: getUptimeSeconds(),
});

const buildConnectionCheck = ({
  message,
  ready,
  service,
  status,
}) => ({
  message,
  ready,
  service,
  status,
});

const createNotConfiguredCheck = (service, message) =>
  buildConnectionCheck({
    message,
    ready: false,
    service,
    status: CONNECTION_STATUS.NOT_CONFIGURED,
  });

const createConnectedCheck = (service, message) =>
  buildConnectionCheck({
    message,
    ready: true,
    service,
    status: CONNECTION_STATUS.CONNECTED,
  });

const createFailedCheck = (service, message) =>
  buildConnectionCheck({
    message,
    ready: false,
    service,
    status: CONNECTION_STATUS.CONNECTION_FAILED,
  });

const extractErrorMessage = (error, fallbackMessage) =>
  error?.message ? `${fallbackMessage}: ${error.message}` : fallbackMessage;

const testCloudinaryConnection = async () => {
  if (!isCloudinaryConfigured) {
    return createNotConfiguredCheck(
      'cloudinary',
      'Cloudinary credentials are missing',
    );
  }

  try {
    const credentials = Buffer.from(
      `${cloudinary.apiKey}:${cloudinary.apiSecret}`,
    ).toString('base64');
    const response = await fetchWithTimeout(
      `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/resources/image?max_results=1`,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
        method: 'GET',
      },
      cloudinary.requestTimeoutMs,
    );

    if (!response.ok) {
      return createFailedCheck(
        'cloudinary',
        `Cloudinary probe failed with status ${response.status}`,
      );
    }

    return createConnectedCheck(
      'cloudinary',
      'Cloudinary connection is working',
    );
  } catch (error) {
    return createFailedCheck(
      'cloudinary',
      extractErrorMessage(error, 'Cloudinary probe failed'),
    );
  }
};

const testSendgridConnection = async () => {
  if (!isSendgridConfigured()) {
    return createNotConfiguredCheck(
      'sendgrid',
      'SendGrid credentials are missing',
    );
  }

  try {
    const response = await fetchWithTimeout(
      'https://api.sendgrid.com/v3/scopes',
      {
        headers: {
          Authorization: `Bearer ${sendgrid.apiKey}`,
        },
        method: 'GET',
      },
      sendgrid.requestTimeoutMs,
    );

    if (!response.ok) {
      return createFailedCheck(
        'sendgrid',
        `SendGrid probe failed with status ${response.status}`,
      );
    }

    return createConnectedCheck('sendgrid', 'SendGrid connection is working');
  } catch (error) {
    return createFailedCheck(
      'sendgrid',
      extractErrorMessage(error, 'SendGrid probe failed'),
    );
  }
};

const testDatabaseConnection = async () => {
  try {
    const result = await testSupabaseConnection();

    if (!result.ok) {
      return buildConnectionCheck({
        message: result.message,
        ready: false,
        service: 'database',
        status: result.status,
      });
    }

    return buildConnectionCheck({
      message: result.message,
      ready: true,
      service: 'database',
      status: result.status,
    });
  } catch (error) {
    return createFailedCheck(
      'database',
      extractErrorMessage(error, 'Database probe failed'),
    );
  }
};

const getHealthReport = () => ({
  ...buildBaseReport(),
  status: 'ok',
});

const getLivenessReport = () => ({
  ...buildBaseReport(),
  status: 'alive',
});

const getReadinessReport = async () => {
  const [database, cloudinaryCheck, sendgridCheck] = await Promise.all([
    testDatabaseConnection(),
    testCloudinaryConnection(),
    testSendgridConnection(),
  ]);
  const checks = {
    cloudinary: cloudinaryCheck,
    database,
    sendgrid: sendgridCheck,
  };
  const ready = Object.values(checks).every((check) => check.ready);

  return {
    ...buildBaseReport(),
    checks,
    ready,
    status: ready ? CONNECTION_STATUS.READY : CONNECTION_STATUS.DEGRADED,
  };
};

const getVersionReport = () => ({
  ...buildBaseReport(),
  api: {
    name: SERVICE_NAME,
    prefix: apiPrefix,
    version: backendPackage.version,
  },
  build: {
    builtAt: process.env.APP_BUILD_TIME || process.env.BUILD_TIME || null,
    commitSha:
      process.env.APP_GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || null,
    environment: env,
    version: process.env.APP_BUILD_VERSION || workspacePackage.version,
  },
  runtime: {
    arch: process.arch,
    node: process.version,
    platform: process.platform,
    startedAt: serviceStartedAt.toISOString(),
  },
});

module.exports = {
  CONNECTION_STATUS,
  SERVICE_NAME,
  getHealthReport,
  getLivenessReport,
  getReadinessReport,
  getVersionReport,
  testCloudinaryConnection,
  testDatabaseConnection,
  testSendgridConnection,
};
