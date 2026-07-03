const normalizeRole = (payload) => {
  const role =
    payload?.role_code ||
    payload?.roleCode ||
    payload?.role ||
    null;

  return typeof role === 'string'
    ? role.trim().toLowerCase()
    : null;
};

const extractPermissionCodes = (payload) => {
  const rawPermissions =
    payload?.permission_codes ||
    payload?.permissionCodes ||
    payload?.permissions ||
    null;

  return Array.isArray(rawPermissions)
    ? rawPermissions.filter(
        (permissionCode) =>
          typeof permissionCode === 'string' && permissionCode.trim(),
      )
    : [];
};

const extractUserIdFromPayload = (payload) =>
  payload?.sub ||
  payload?.user_id ||
  payload?.userId ||
  payload?.id ||
  null;

const normalizeScopeServiceIds = (payload) => {
  const scope =
    payload?.service_scope_ids ||
    payload?.serviceScopeIds ||
    payload?.scope?.service_ids ||
    null;

  return Array.isArray(scope)
    ? scope.filter((value) => typeof value === 'string' && value.trim())
    : null;
};

const setHiddenProperty = (target, key, value) => {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: false,
    value,
    writable: true,
  });
};

const assignTokenAliases = (target, keys, value) => {
  const presentKeys = keys.filter((key) =>
    Object.prototype.hasOwnProperty.call(target, key),
  );

  if (presentKeys.length > 0) {
    for (const key of presentKeys) {
      target[key] = value;
    }

    return;
  }

  for (const key of keys) {
    setHiddenProperty(target, key, value);
  }
};

const buildResolvedTokenPayload = (tokenPayload, authContext = {}) => {
  const role = authContext.roleCode || normalizeRole(tokenPayload);
  const permissions = Array.isArray(authContext.permissions)
    ? authContext.permissions
    : extractPermissionCodes(tokenPayload);
  const userId = authContext.userId || extractUserIdFromPayload(tokenPayload);
  const resolvedPayload = {
    ...tokenPayload,
  };

  assignTokenAliases(
    resolvedPayload,
    ['permission_codes', 'permissionCodes', 'permissions'],
    permissions,
  );
  assignTokenAliases(
    resolvedPayload,
    ['role', 'role_code', 'roleCode'],
    role,
  );
  assignTokenAliases(
    resolvedPayload,
    ['sub', 'user_id', 'userId'],
    userId,
  );

  return resolvedPayload;
};

module.exports = {
  buildResolvedTokenPayload,
  extractPermissionCodes,
  extractUserIdFromPayload,
  normalizeRole,
  normalizeScopeServiceIds,
};
