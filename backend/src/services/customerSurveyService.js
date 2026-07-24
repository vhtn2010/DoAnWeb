const crypto = require('node:crypto');
const { query, withTransaction } = require('../database/client');
const {
  API_ERROR_CODES,
  USER_STATUS,
} = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');

const WELCOME_PROMOTION_NAME = 'Chào Mừng Thành Viên Mới';
const WELCOME_PROMOTION_CODE = 'KM-4E6BF0BA';
const CUSTOMER_SURVEY_ACTION = 'customer.survey.complete';
const MAX_TEXT_LENGTH = 200;
const REQUIRED_MULTI_SELECT_MIN = 1;

const OPTION_SETS = Object.freeze({
  budget_range: new Set([
    'under_3m',
    '3m_5m',
    '5m_10m',
    '10m_20m',
    'over_20m',
    'not_sure',
  ]),
  discovery_source: new Set([
    'search_engine',
    'social_media',
    'friends_family',
    'advertising',
    'travel_group',
    'returning_customer',
    'other',
  ]),
  loyalty_intent: new Set([
    'definitely',
    'likely',
    'considering',
    'not_sure',
  ]),
  preferred_contact_channel: new Set([
    'phone',
    'email',
    'zalo',
    'messenger',
    'website_chat',
  ]),
});

const MULTI_OPTION_SETS = Object.freeze({
  favorite_destinations: new Set([
    'beach',
    'mountain',
    'heritage_city',
    'nature',
    'international',
    'resort',
    'food_city',
    'other',
  ]),
  travel_forms: new Set([
    'solo',
    'couple',
    'family',
    'friends',
    'company',
    'tour_group',
    'other',
  ]),
  travel_styles: new Set([
    'relaxing',
    'discovery',
    'culture',
    'nature',
    'luxury',
    'budget',
    'food',
    'adventure',
    'other',
  ]),
});

function buildValidationError(details) {
  return new AppError('Validation failed', {
    code: API_ERROR_CODES.VALIDATION_ERROR,
    details,
    statusCode: 400,
  });
}

function buildDuplicateError(voucher = null) {
  return new AppError('Customer survey has already been completed', {
    code: API_ERROR_CODES.DUPLICATE_RESOURCE,
    details: voucher
      ? [
          {
            field: 'voucher',
            message: voucher.code,
          },
        ]
      : [],
    statusCode: 409,
  });
}

function buildUnavailableError(message) {
  return new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });
}

function trimText(value) {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

function normalizeRequiredText(field, payload, details) {
  const value = trimText(payload[field]);

  if (!value) {
    details.push({
      field,
      message: `${field} is required`,
    });
    return '';
  }

  if (value.length > MAX_TEXT_LENGTH) {
    details.push({
      field,
      message: `${field} must be at most ${MAX_TEXT_LENGTH} characters`,
    });
  }

  return value;
}

function normalizeOptionalText(field, payload, details) {
  const value = trimText(payload[field]);

  if (value.length > MAX_TEXT_LENGTH) {
    details.push({
      field,
      message: `${field} must be at most ${MAX_TEXT_LENGTH} characters`,
    });
  }

  return value || null;
}

function normalizeSingleOption(field, payload, optionSet, details) {
  const value = trimText(payload[field]);

  if (!value) {
    details.push({
      field,
      message: `${field} is required`,
    });
    return '';
  }

  if (!optionSet.has(value)) {
    details.push({
      field,
      message: `${field} is not supported`,
    });
  }

  return value;
}

function normalizeMultiOption(field, payload, optionSet, details) {
  const rawValue = payload[field];
  const values = Array.isArray(rawValue)
    ? rawValue.map((item) => trimText(item)).filter(Boolean)
    : [];
  const uniqueValues = [...new Set(values)];

  if (uniqueValues.length < REQUIRED_MULTI_SELECT_MIN) {
    details.push({
      field,
      message: `${field} requires at least one option`,
    });
    return [];
  }

  const unsupportedValues = uniqueValues.filter((value) => !optionSet.has(value));

  if (unsupportedValues.length > 0) {
    details.push({
      field,
      message: `${field} includes unsupported option(s): ${unsupportedValues.join(', ')}`,
    });
  }

  return uniqueValues;
}

function requireOtherText({
  details,
  field,
  otherField,
  otherValue,
  selectedValues,
}) {
  if (!selectedValues.includes('other')) {
    return;
  }

  if (!otherValue) {
    details.push({
      field: otherField,
      message: `${otherField} is required when ${field} includes other`,
    });
  }
}

function normalizeSurveyPayload(payload = {}) {
  const body = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload
    : {};
  const details = [];
  const input = {
    budget_range: normalizeSingleOption(
      'budget_range',
      body,
      OPTION_SETS.budget_range,
      details,
    ),
    discovery_source: normalizeSingleOption(
      'discovery_source',
      body,
      OPTION_SETS.discovery_source,
      details,
    ),
    discovery_source_other: normalizeOptionalText(
      'discovery_source_other',
      body,
      details,
    ),
    favorite_destination_other: normalizeOptionalText(
      'favorite_destination_other',
      body,
      details,
    ),
    favorite_destinations: normalizeMultiOption(
      'favorite_destinations',
      body,
      MULTI_OPTION_SETS.favorite_destinations,
      details,
    ),
    loyalty_intent: normalizeSingleOption(
      'loyalty_intent',
      body,
      OPTION_SETS.loyalty_intent,
      details,
    ),
    nationality: normalizeRequiredText('nationality', body, details),
    preferred_contact_channel: normalizeSingleOption(
      'preferred_contact_channel',
      body,
      OPTION_SETS.preferred_contact_channel,
      details,
    ),
    residence_location: normalizeRequiredText('residence_location', body, details),
    travel_form_other: normalizeOptionalText('travel_form_other', body, details),
    travel_forms: normalizeMultiOption(
      'travel_forms',
      body,
      MULTI_OPTION_SETS.travel_forms,
      details,
    ),
    travel_style_other: normalizeOptionalText('travel_style_other', body, details),
    travel_styles: normalizeMultiOption(
      'travel_styles',
      body,
      MULTI_OPTION_SETS.travel_styles,
      details,
    ),
  };

  if (input.discovery_source !== 'other') {
    input.discovery_source_other = null;
  }

  if (!input.favorite_destinations.includes('other')) {
    input.favorite_destination_other = null;
  }

  if (!input.travel_forms.includes('other')) {
    input.travel_form_other = null;
  }

  if (!input.travel_styles.includes('other')) {
    input.travel_style_other = null;
  }

  requireOtherText({
    details,
    field: 'discovery_source',
    otherField: 'discovery_source_other',
    otherValue: input.discovery_source_other,
    selectedValues: [input.discovery_source],
  });
  requireOtherText({
    details,
    field: 'favorite_destinations',
    otherField: 'favorite_destination_other',
    otherValue: input.favorite_destination_other,
    selectedValues: input.favorite_destinations,
  });
  requireOtherText({
    details,
    field: 'travel_forms',
    otherField: 'travel_form_other',
    otherValue: input.travel_form_other,
    selectedValues: input.travel_forms,
  });
  requireOtherText({
    details,
    field: 'travel_styles',
    otherField: 'travel_style_other',
    otherValue: input.travel_style_other,
    selectedValues: input.travel_styles,
  });

  if (details.length > 0) {
    throw buildValidationError(details);
  }

  return input;
}

function mapVoucher(row = {}) {
  if (!row) {
    return null;
  }

  return {
    code: row.code,
    discount_type: row.discount_type,
    discount_value: Number(row.discount_value),
    id: row.id,
    max_discount_amount:
      row.max_discount_amount == null ? null : Number(row.max_discount_amount),
    min_order_amount: Number(row.min_order_amount || 0),
    promotion: {
      id: row.promotion_id,
      name: row.promotion_name || WELCOME_PROMOTION_NAME,
    },
    status: row.status,
    valid_from: row.valid_from?.toISOString?.() || row.valid_from || null,
    valid_to: row.valid_to?.toISOString?.() || row.valid_to || null,
  };
}

function mapSurveyRow(row = {}) {
  if (!row) {
    return null;
  }

  return {
    completed: true,
    completed_at: row.completed_at?.toISOString?.() || row.completed_at,
    id: row.id,
    promotion: {
      code: WELCOME_PROMOTION_CODE,
      id: row.promotion_id,
      name: row.promotion_name || WELCOME_PROMOTION_NAME,
    },
    voucher: mapVoucher(row),
  };
}

async function loadCurrentUser(queryExecutor, userId, { forUpdate = false } = {}) {
  const result = await queryExecutor(
    `
      SELECT id, status, deleted_at
      FROM users
      WHERE id = $1
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    [userId],
  );

  return result.rows[0] || null;
}

function ensureCurrentUserCanSubmit(user) {
  if (!user || user.deleted_at != null || user.status !== USER_STATUS.ACTIVE) {
    throw new AppError('Customer account is not allowed to submit survey', {
      code: API_ERROR_CODES.FORBIDDEN,
      statusCode: 403,
    });
  }
}

async function loadSurveyState(queryExecutor, userId) {
  const result = await queryExecutor(
    `
      SELECT
        cs.id AS survey_id,
        cs.completed_at,
        cs.promotion_id,
        p.name AS promotion_name,
        v.id AS voucher_id,
        v.code,
        v.discount_type,
        v.discount_value,
        v.max_discount_amount,
        v.min_order_amount,
        v.status,
        v.valid_from,
        v.valid_to
      FROM customer_surveys cs
      INNER JOIN promotions p ON p.id = cs.promotion_id
      INNER JOIN vouchers v ON v.id = cs.voucher_id
      WHERE cs.user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  const row = result.rows[0] || null;

  if (!row) {
    return null;
  }

  return {
    completed: true,
    completed_at: row.completed_at,
    id: row.survey_id,
    promotion_id: row.promotion_id,
    promotion_name: row.promotion_name,
    voucher: {
      code: row.code,
      discount_type: row.discount_type,
      discount_value: row.discount_value,
      id: row.voucher_id,
      max_discount_amount: row.max_discount_amount,
      min_order_amount: row.min_order_amount,
      promotion_id: row.promotion_id,
      promotion_name: row.promotion_name,
      status: row.status,
      valid_from: row.valid_from,
      valid_to: row.valid_to,
    },
  };
}

async function loadWelcomePromotion(queryExecutor, currentTime, { forUpdate = false } = {}) {
  const result = await queryExecutor(
    `
      SELECT id, name, status, valid_from, valid_to, target_service_type
      FROM promotions
      WHERE name = $1
        AND UPPER('KM-' || SUBSTRING(id::text FROM 1 FOR 8)) = $2
        AND status = 'active'
        AND valid_from <= $3
        AND valid_to >= $3
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    [WELCOME_PROMOTION_NAME, WELCOME_PROMOTION_CODE, currentTime],
  );

  return result.rows[0] || null;
}

async function loadVoucherTemplate(queryExecutor, promotionId, currentTime) {
  const result = await queryExecutor(
    `
      SELECT
        id,
        promotion_id,
        code,
        discount_type,
        discount_value,
        max_discount_amount,
        min_order_amount,
        valid_from,
        valid_to
      FROM vouchers
      WHERE promotion_id = $1
        AND status = 'active'
        AND valid_from <= $2
        AND valid_to >= $2
      ORDER BY created_at ASC, id ASC
      LIMIT 1
      FOR UPDATE
    `,
    [promotionId, currentTime],
  );

  return result.rows[0] || null;
}

function createCustomerVoucherCode() {
  return `NVT-WELCOME-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

async function insertCustomerVoucher(queryExecutor, template, currentTime) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = createCustomerVoucherCode();

    try {
      const result = await queryExecutor(
        `
          INSERT INTO vouchers (
            promotion_id,
            code,
            discount_type,
            discount_value,
            max_discount_amount,
            min_order_amount,
            usage_limit_total,
            usage_limit_per_user,
            used_count,
            status,
            valid_from,
            valid_to,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, 1, 1, 0, 'active', $7, $8, $9)
          RETURNING
            id,
            promotion_id,
            code,
            discount_type,
            discount_value,
            max_discount_amount,
            min_order_amount,
            status,
            valid_from,
            valid_to
        `,
        [
          template.promotion_id,
          code,
          template.discount_type,
          template.discount_value,
          template.max_discount_amount,
          template.min_order_amount,
          template.valid_from,
          template.valid_to,
          currentTime,
        ],
      );

      return result.rows[0] || null;
    } catch (error) {
      if (error?.code !== '23505' || attempt === 4) {
        throw error;
      }
    }
  }

  return null;
}

async function insertSurvey(queryExecutor, {
  currentTime,
  input,
  promotion,
  userId,
  voucher,
}) {
  const result = await queryExecutor(
    `
      INSERT INTO customer_surveys (
        user_id,
        promotion_id,
        voucher_id,
        residence_location,
        nationality,
        discovery_source,
        discovery_source_other,
        travel_styles,
        travel_style_other,
        favorite_destinations,
        favorite_destination_other,
        budget_range,
        travel_forms,
        travel_form_other,
        preferred_contact_channel,
        loyalty_intent,
        answers,
        completed_at,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8::text[], $9, $10::text[], $11,
        $12, $13::text[], $14, $15, $16, $17::jsonb, $18, $18, $18
      )
      RETURNING id, completed_at, promotion_id
    `,
    [
      userId,
      promotion.id,
      voucher.id,
      input.residence_location,
      input.nationality,
      input.discovery_source,
      input.discovery_source_other,
      input.travel_styles,
      input.travel_style_other,
      input.favorite_destinations,
      input.favorite_destination_other,
      input.budget_range,
      input.travel_forms,
      input.travel_form_other,
      input.preferred_contact_channel,
      input.loyalty_intent,
      JSON.stringify(input),
      currentTime,
    ],
  );

  return result.rows[0] || null;
}

async function saveVoucherToWallet(queryExecutor, {
  currentTime,
  userId,
  voucherId,
}) {
  await queryExecutor(
    `
      INSERT INTO user_saved_vouchers (user_id, voucher_id, saved_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, voucher_id) DO NOTHING
    `,
    [userId, voucherId, currentTime],
  );
}

async function insertSurveyLog(client, {
  currentTime,
  ipAddress,
  surveyId,
  userAgent,
  userId,
  voucher,
}) {
  await client.query(
    `
      INSERT INTO user_logs (
        user_id,
        action,
        entity_name,
        entity_id,
        ip_address,
        user_agent,
        metadata,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
    `,
    [
      userId,
      CUSTOMER_SURVEY_ACTION,
      'customer_surveys',
      surveyId,
      ipAddress || null,
      trimText(userAgent) || null,
      JSON.stringify({
        promotion_code: WELCOME_PROMOTION_CODE,
        promotion_id: voucher.promotion_id,
        voucher_code: voucher.code,
        voucher_id: voucher.id,
      }),
      currentTime,
    ],
  );
}

function createCustomerSurveyService({
  now = () => new Date(),
  queryImpl = query,
  withTransactionImpl = withTransaction,
} = {}) {
  const getCurrentSurveyStatus = async ({ userId }) => {
    const currentUser = await loadCurrentUser(queryImpl, userId);

    ensureCurrentUserCanSubmit(currentUser);
    const survey = await loadSurveyState(queryImpl, userId);
    const currentTime = now();
    const promotion = await loadWelcomePromotion(queryImpl, currentTime);

    if (!survey) {
      return {
        completed: false,
        promotion: promotion
          ? {
              code: WELCOME_PROMOTION_CODE,
              id: promotion.id,
              name: promotion.name,
            }
          : {
              code: WELCOME_PROMOTION_CODE,
              id: null,
              name: WELCOME_PROMOTION_NAME,
            },
        voucher: null,
      };
    }

    return {
      completed: true,
      completed_at: survey.completed_at?.toISOString?.() || survey.completed_at,
      id: survey.id,
      promotion: {
        code: WELCOME_PROMOTION_CODE,
        id: survey.promotion_id,
        name: survey.promotion_name || WELCOME_PROMOTION_NAME,
      },
      voucher: mapVoucher(survey.voucher),
    };
  };

  const submitCurrentSurvey = async ({
    ipAddress,
    payload,
    userAgent,
    userId,
  }) =>
    withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const input = normalizeSurveyPayload(payload);
      const currentTime = now();
      const currentUser = await loadCurrentUser(queryExecutor, userId, {
        forUpdate: true,
      });

      ensureCurrentUserCanSubmit(currentUser);

      const existingSurvey = await loadSurveyState(queryExecutor, userId);

      if (existingSurvey) {
        throw buildDuplicateError(existingSurvey.voucher);
      }

      const promotion = await loadWelcomePromotion(queryExecutor, currentTime, {
        forUpdate: true,
      });

      if (!promotion) {
        throw buildUnavailableError('Welcome member promotion is not active');
      }

      const template = await loadVoucherTemplate(
        queryExecutor,
        promotion.id,
        currentTime,
      );

      if (!template) {
        throw buildUnavailableError('Welcome member voucher template is not available');
      }

      const voucher = await insertCustomerVoucher(
        queryExecutor,
        template,
        currentTime,
      );

      const survey = await insertSurvey(queryExecutor, {
        currentTime,
        input,
        promotion,
        userId,
        voucher,
      });

      await saveVoucherToWallet(queryExecutor, {
        currentTime,
        userId,
        voucherId: voucher.id,
      });

      await insertSurveyLog(client, {
        currentTime,
        ipAddress,
        surveyId: survey.id,
        userAgent,
        userId,
        voucher,
      });

      return {
        completed: true,
        completed_at: survey.completed_at?.toISOString?.() || survey.completed_at,
        id: survey.id,
        promotion: {
          code: WELCOME_PROMOTION_CODE,
          id: promotion.id,
          name: promotion.name,
        },
        voucher: mapVoucher({
          ...voucher,
          promotion_name: promotion.name,
        }),
      };
    });

  return {
    getCurrentSurveyStatus,
    submitCurrentSurvey,
  };
}

module.exports = createCustomerSurveyService();
module.exports.createCustomerSurveyService = createCustomerSurveyService;
module.exports.normalizeSurveyPayload = normalizeSurveyPayload;
module.exports.WELCOME_PROMOTION_CODE = WELCOME_PROMOTION_CODE;
module.exports.WELCOME_PROMOTION_NAME = WELCOME_PROMOTION_NAME;
