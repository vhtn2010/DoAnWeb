const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { apiPrefix, backendUrl, env } = require('../config');
const backendPackage = require('../../package.json');

const SWAGGER_PUBLIC_PATH = '/swagger-ui';
const SWAGGER_API_ALIAS_PATH = `${apiPrefix}/docs`;
const ROUTE_PROBE_CANDIDATES = [
  `${apiPrefix}/__codex_probe__`,
  `${SWAGGER_PUBLIC_PATH}/__codex_probe__`,
  `${SWAGGER_API_ALIAS_PATH}/__codex_probe__`,
];
const AUTH_MIDDLEWARE_MARKERS = [
  'extractBearerToken',
  'verifyAccessToken',
  'resolveAuthenticatedUser',
  'resolveAuthContext',
];
const HTTP_METHODS = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
]);

const jsonContent = (schema) => ({
  'application/json': {
    schema,
  },
});

const successEnvelope = {
  type: 'object',
  properties: {
    success: {
      type: 'boolean',
      example: true,
    },
    message: {
      type: 'string',
      example: 'OK',
    },
    data: {
      oneOf: [
        { type: 'object', additionalProperties: true },
        { type: 'array', items: { type: 'object', additionalProperties: true } },
        { type: 'string' },
        { type: 'number' },
        { type: 'boolean' },
      ],
    },
    meta: {
      type: 'object',
      additionalProperties: true,
    },
  },
};

const errorEnvelope = {
  type: 'object',
  properties: {
    success: {
      type: 'boolean',
      example: false,
    },
    message: {
      type: 'string',
      example: 'Validation failed',
    },
    error: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'VALIDATION_ERROR',
        },
        details: {
          oneOf: [
            { type: 'array', items: { type: 'object', additionalProperties: true } },
            { type: 'object', additionalProperties: true },
          ],
        },
      },
    },
  },
};

const titleCase = (value) =>
  value
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const joinPaths = (basePath = '', childPath = '') => {
  const base = basePath === '/' ? '' : basePath.replace(/\/+$/, '');
  const child = childPath.replace(/^\/+/, '');
  const joined = [base, child].filter(Boolean).join('/');

  return joined ? `/${joined.replace(/^\/+/, '')}` : '/';
};

const toConcreteSamplePath = (path) => {
  if (!path) {
    return '/';
  }

  return path.replace(/:([A-Za-z0-9_]+)/g, (_, paramName) => {
    const normalizedName = paramName.toLowerCase();

    if (normalizedName.includes('slug')) {
      return 'sample-slug';
    }

    return normalizedName.includes('id')
      ? '11111111-1111-4111-8111-111111111111'
      : 'sample';
  });
};

const normalizePathForSpec = (path) => {
  const withoutPrefix = path.startsWith(apiPrefix)
    ? path.slice(apiPrefix.length) || '/'
    : path;

  return withoutPrefix.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
};

const extractPathParameters = (path) => {
  const matches = [...path.matchAll(/:([A-Za-z0-9_]+)/g)];

  return matches.map((match) => {
    const name = match[1];
    const normalizedName = name.toLowerCase();
    const isUuidLike =
      normalizedName.includes('id') && !normalizedName.includes('slug');

    return {
      in: 'path',
      name,
      required: true,
      schema: isUuidLike
        ? {
            type: 'string',
            format: 'uuid',
          }
        : {
            type: 'string',
          },
    };
  });
};

const inferTagFromPath = (path) => {
  const [firstSegment, secondSegment, thirdSegment] = path
    .split('/')
    .filter(Boolean);

  if (
    !firstSegment ||
    ['health', 'version', 'tours', 'supabase-test'].includes(firstSegment)
  ) {
    return 'System';
  }

  if (firstSegment === 'auth') {
    return 'Auth';
  }

  if (firstSegment === 'me') {
    return 'Profile';
  }

  if (firstSegment === 'admin' && secondSegment === 'users') {
    return 'Admin Users';
  }

  if (
    firstSegment === 'admin' &&
    (secondSegment === 'permissions' || thirdSegment === 'permissions')
  ) {
    return 'Admin Permissions';
  }

  if (firstSegment === 'admin' && secondSegment === 'roles') {
    return 'Admin Roles';
  }

  if (['lookups', 'locations', 'services'].includes(firstSegment)) {
    return 'Public Search';
  }

  return titleCase(firstSegment);
};

const inferSummary = (method, path) => `${method.toUpperCase()} ${path}`;

const inferDescription = (method, path, tag) =>
  `Auto-generated from Express routes for ${tag}. Source route: ${method.toUpperCase()} ${path}.`;

const getHandlerSource = (handler) => {
  if (typeof handler !== 'function') {
    return '';
  }

  return Function.prototype.toString.call(handler);
};

const isAuthMiddleware = (handler) => {
  const source = getHandlerSource(handler);

  return AUTH_MIDDLEWARE_MARKERS.some((marker) => source.includes(marker));
};

const matchLayerPath = (layer, samplePath) => {
  if (!Array.isArray(layer?.matchers)) {
    return null;
  }

  for (const matcher of layer.matchers) {
    const result = matcher(samplePath);

    if (result) {
      return result.path || null;
    }
  }

  return null;
};

const detectMountPath = (layer, samplePaths = []) => {
  for (const samplePath of samplePaths) {
    const matchedPath = matchLayerPath(layer, samplePath);

    if (matchedPath) {
      return matchedPath;
    }
  }

  return null;
};

const buildRouteSamplePath = (basePath, routePath) =>
  toConcreteSamplePath(joinPaths(basePath, routePath));

const routeUsesAuth = (routeLayer, authGuards, basePath) => {
  const routeHasAuthMiddleware = routeLayer.route.stack.some((stackLayer) =>
    isAuthMiddleware(stackLayer.handle),
  );

  if (routeHasAuthMiddleware) {
    return true;
  }

  const samplePath = buildRouteSamplePath(basePath, routeLayer.route.path);

  return authGuards.some((guardLayer) => Boolean(matchLayerPath(guardLayer, samplePath)));
};

const createOperation = ({ method, path, requiresAuth }) => {
  const normalizedMethod = method.toLowerCase();
  const tag = inferTagFromPath(path);
  const requestBodyMethods = new Set(['post', 'put', 'patch', 'delete']);
  const operation = {
    tags: [tag],
    summary: inferSummary(normalizedMethod, path),
    description: inferDescription(normalizedMethod, path, tag),
    parameters: extractPathParameters(path),
    responses: {
      200: {
        description: 'Successful response',
        content: jsonContent(successEnvelope),
      },
      400: {
        description: 'Validation or malformed request',
        content: jsonContent(errorEnvelope),
      },
      404: {
        description: 'Resource not found',
        content: jsonContent(errorEnvelope),
      },
      429: {
        description: 'Rate limit exceeded',
        content: jsonContent(errorEnvelope),
      },
    },
  };

  if (requiresAuth) {
    operation.security = [{ bearerAuth: [] }];
    operation.responses[401] = {
      description: 'Authentication required or token invalid',
      content: jsonContent(errorEnvelope),
    };
    operation.responses[403] = {
      description: 'Forbidden',
      content: jsonContent(errorEnvelope),
    };
  }

  if (requestBodyMethods.has(normalizedMethod)) {
    operation.requestBody = {
      required: false,
      content: jsonContent({
        type: 'object',
        additionalProperties: true,
      }),
    };
  }

  return operation;
};

const collectRoutesFromLayers = (layers, basePath = '', authGuards = []) => {
  const paths = {};
  const activeAuthGuards = [...authGuards];

  for (const layer of layers) {
    if (layer.route) {
      const routePath = joinPaths(basePath, layer.route.path);
      const normalizedPath = normalizePathForSpec(routePath);

      if (
        !normalizedPath.startsWith('/') ||
        normalizedPath.startsWith('/docs') ||
        normalizedPath.startsWith('/swagger-ui')
      ) {
        continue;
      }

      const methods = Object.keys(layer.route.methods || {}).filter((method) =>
        HTTP_METHODS.has(method),
      );

      if (methods.length === 0) {
        continue;
      }

      const requiresAuth = routeUsesAuth(layer, activeAuthGuards, basePath);

      paths[normalizedPath] = paths[normalizedPath] || {};

      for (const method of methods) {
        paths[normalizedPath][method] = createOperation({
          method,
          path: normalizedPath,
          requiresAuth,
        });
      }

      continue;
    }

    if (isAuthMiddleware(layer.handle)) {
      activeAuthGuards.push(layer);
      continue;
    }

    if (Array.isArray(layer.handle?.stack)) {
      const childRouteSamples = layer.handle.stack
        .filter((childLayer) => childLayer.route?.path)
        .map((childLayer) => toConcreteSamplePath(childLayer.route.path));
      const nestedMountPath = detectMountPath(layer, childRouteSamples);
      const nestedBasePath = nestedMountPath
        ? joinPaths(basePath, nestedMountPath)
        : basePath;
      const nestedPaths = collectRoutesFromLayers(
        layer.handle.stack,
        nestedBasePath,
        activeAuthGuards,
      );

      Object.assign(paths, nestedPaths);
    }
  }

  return paths;
};

const buildOpenApiSpec = (app) => {
  const rootPaths = {};
  const layers = app?.router?.stack || [];

  for (const layer of layers) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods || {}).filter((method) =>
        HTTP_METHODS.has(method),
      );
      const normalizedPath = normalizePathForSpec(layer.route.path);

      if (!normalizedPath.startsWith('/')) {
        continue;
      }

      rootPaths[normalizedPath] = rootPaths[normalizedPath] || {};

      for (const method of methods) {
        rootPaths[normalizedPath][method] = createOperation({
          method,
          path: normalizedPath,
          requiresAuth: routeUsesAuth(layer, [], ''),
        });
      }

      continue;
    }

    if (!Array.isArray(layer.handle?.stack)) {
      continue;
    }

    const mountPath = detectMountPath(layer, ROUTE_PROBE_CANDIDATES);

    if (!mountPath || mountPath !== apiPrefix) {
      continue;
    }

    Object.assign(rootPaths, collectRoutesFromLayers(layer.handle.stack, mountPath));
  }

  const orderedPaths = Object.fromEntries(
    Object.entries(rootPaths).sort(([leftPath], [rightPath]) =>
      leftPath.localeCompare(rightPath),
    ),
  );

  return {
    openapi: '3.0.3',
    info: {
      title: 'Net Viet Travel API',
      version: backendPackage.version,
      description:
        'Auto-generated Swagger document from the mounted Express routes. New API routes appear automatically after they are registered in the app.',
    },
    servers: [
      {
        url: `${backendUrl}${apiPrefix}`,
        description: `${env} API server`,
      },
    ],
    tags: [
      { name: 'System', description: 'Health, version, and smoke endpoints.' },
      { name: 'Auth', description: 'Authentication and account recovery.' },
      { name: 'Profile', description: 'Current user profile management.' },
      { name: 'Admin Users', description: 'Internal user administration.' },
      { name: 'Admin Roles', description: 'Role management.' },
      { name: 'Admin Permissions', description: 'Permission catalog and assignment.' },
      { name: 'Public Search', description: 'Public lookups and service search.' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    paths: orderedPaths,
  };
};

const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Net Viet Travel Swagger UI',
  explorer: true,
  swaggerOptions: {
    url: './openapi.json',
    defaultModelsExpandDepth: 1,
    displayRequestDuration: true,
    docExpansion: 'list',
    persistAuthorization: true,
  },
};

const removeSwaggerCsp = (req, res, next) => {
  res.removeHeader('Content-Security-Policy');
  next();
};

const createSwaggerRouter = () => {
  const router = express.Router();
  const swaggerUiHandler = swaggerUi.setup(null, swaggerUiOptions);

  router.get('/openapi.json', (req, res) => {
    res.json(buildOpenApiSpec(req.app));
  });

  router.get('/', swaggerUiHandler);
  router.get('/index.html', swaggerUiHandler);
  router.use(swaggerUi.serve);

  return router;
};

module.exports = {
  buildOpenApiSpec,
  createSwaggerRouter,
  removeSwaggerCsp,
};
