const { query } = require('../database/client');
const {
  API_ERROR_CODES,
  USER_STATUS,
} = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');

const createNotFoundError = (message = 'User not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const createForbiddenError = (message) =>
  new AppError(message, {
    code: API_ERROR_CODES.FORBIDDEN,
    statusCode: 403,
  });

const mapCurrentProfile = (row) => ({
  avatar_url: row.avatar_url,
  created_at: row.created_at?.toISOString?.() || row.created_at,
  email: row.email,
  email_verified_at:
    row.email_verified_at?.toISOString?.() || row.email_verified_at,
  full_name: row.full_name,
  id: row.id,
  last_login_at: row.last_login_at?.toISOString?.() || row.last_login_at,
  permissions: row.permissions || [],
  phone: row.phone,
  role: {
    code: row.role_code,
    name: row.role_name,
  },
  status: row.status,
  updated_at: row.updated_at?.toISOString?.() || row.updated_at,
});

const createProfileService = ({
  queryImpl = query,
} = {}) => {
  const getCurrentProfile = async ({ userId }) => {
    const result = await queryImpl(
      `
        SELECT
          u.id,
          u.email,
          u.full_name,
          u.phone,
          u.avatar_url,
          u.status,
          u.email_verified_at,
          u.last_login_at,
          u.created_at,
          u.updated_at,
          u.deleted_at,
          r.code AS role_code,
          r.name AS role_name,
          COALESCE(
            array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL),
            '{}'
          ) AS permissions
        FROM users u
        JOIN roles r ON r.id = u.role_id
        LEFT JOIN role_permissions rp ON rp.role_id = r.id
        LEFT JOIN permissions p ON p.id = rp.permission_id
        WHERE u.id = $1
        GROUP BY
          u.id,
          u.email,
          u.full_name,
          u.phone,
          u.avatar_url,
          u.status,
          u.email_verified_at,
          u.last_login_at,
          u.created_at,
          u.updated_at,
          u.deleted_at,
          r.code,
          r.name
        LIMIT 1
      `,
      [userId],
    );

    if (result.rowCount === 0) {
      throw createNotFoundError();
    }

    const currentUser = result.rows[0];

    if (currentUser.deleted_at != null) {
      throw createForbiddenError('Deleted account is not allowed to view profile');
    }

    if (currentUser.status !== USER_STATUS.ACTIVE) {
      throw createForbiddenError(
        `Account with status ${currentUser.status} is not allowed to view profile`,
      );
    }

    return mapCurrentProfile(currentUser);
  };

  return {
    getCurrentProfile,
  };
};

module.exports = createProfileService();
module.exports.createProfileService = createProfileService;
