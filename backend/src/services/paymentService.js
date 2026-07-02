const { directPayment } = require('../config');
const {
  API_ERROR_CODES,
  DIRECT_PAYMENT_METHOD_VALUES,
} = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');

const DIRECT_PAYMENT_CACHE_SECONDS = 5 * 60;

const METHOD_DISPLAY_NAMES = Object.freeze({
  cash_at_office: 'Cash at office',
  manual_bank_transfer: 'Manual bank transfer',
  staff_collect: 'Staff collect',
});

const normalizeOptionalString = (value) => {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const hasConfigEntries = (value) =>
  Boolean(value && typeof value === 'object' && Object.keys(value).length > 0);

const createMissingConfigError = (methodCode, fields) =>
  new AppError('Direct payment configuration not found', {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    details: [
      {
        field: 'direct_payment',
        message: `Enabled direct payment method ${methodCode} is missing required public configuration: ${fields.join(', ')}`,
      },
    ],
    statusCode: 404,
  });

const assertRequiredFields = (methodCode, payload, requiredFields) => {
  const missingFields = requiredFields.filter((field) => !payload[field]);

  if (missingFields.length > 0) {
    throw createMissingConfigError(methodCode, missingFields);
  }
};

const assertRequiredAnyOf = (methodCode, payload, requiredFields) => {
  if (requiredFields.some((field) => payload[field])) {
    return;
  }

  throw createMissingConfigError(methodCode, requiredFields);
};

const sanitizeCashAtOfficeMethod = (config, fallbackHotline) => {
  const payload = {
    code: 'cash_at_office',
    name: METHOD_DISPLAY_NAMES.cash_at_office,
    office_address: normalizeOptionalString(config.office_address),
    office_hours: normalizeOptionalString(config.office_hours),
    hotline: normalizeOptionalString(config.hotline) || fallbackHotline,
    instructions: normalizeOptionalString(config.instructions),
  };

  assertRequiredFields(payload.code, payload, [
    'office_address',
    'office_hours',
    'hotline',
  ]);

  return payload;
};

const sanitizeManualBankTransferMethod = (config) => {
  const payload = {
    code: 'manual_bank_transfer',
    name: METHOD_DISPLAY_NAMES.manual_bank_transfer,
    bank_name: normalizeOptionalString(config.bank_name),
    account_number: normalizeOptionalString(config.account_number),
    account_holder: normalizeOptionalString(config.account_holder),
    branch: normalizeOptionalString(config.branch),
    transfer_content_template: normalizeOptionalString(
      config.transfer_content_template,
    ),
    instructions: normalizeOptionalString(config.instructions),
  };

  assertRequiredFields(payload.code, payload, [
    'bank_name',
    'account_number',
    'account_holder',
    'transfer_content_template',
  ]);

  return payload;
};

const sanitizeStaffCollectMethod = (config, fallbackHotline) => {
  const payload = {
    code: 'staff_collect',
    name: METHOD_DISPLAY_NAMES.staff_collect,
    hotline: normalizeOptionalString(config.hotline) || fallbackHotline,
    conditions: normalizeOptionalString(config.conditions),
    instructions: normalizeOptionalString(config.instructions),
  };

  assertRequiredAnyOf(payload.code, payload, [
    'hotline',
    'conditions',
    'instructions',
  ]);

  return payload;
};

const sanitizeMethodConfig = (methodCode, config, fallbackHotline) => {
  if (!config?.enabled) {
    return null;
  }

  if (methodCode === 'cash_at_office') {
    return sanitizeCashAtOfficeMethod(config, fallbackHotline);
  }

  if (methodCode === 'manual_bank_transfer') {
    return sanitizeManualBankTransferMethod(config);
  }

  if (methodCode === 'staff_collect') {
    return sanitizeStaffCollectMethod(config, fallbackHotline);
  }

  return null;
};

const createPaymentService = ({ directPaymentConfig = directPayment } = {}) => {
  const getDirectPaymentMethods = () => {
    const methodsConfig = directPaymentConfig?.methods;
    const hotline = normalizeOptionalString(directPaymentConfig?.hotline);

    if (!hasConfigEntries(methodsConfig)) {
      return {
        hotline,
        methods: [],
      };
    }

    const methods = DIRECT_PAYMENT_METHOD_VALUES.reduce((accumulator, method) => {
      const payload = sanitizeMethodConfig(
        method,
        methodsConfig[method],
        hotline,
      );

      if (payload) {
        accumulator.push(payload);
      }

      return accumulator;
    }, []);

    return {
      hotline,
      methods,
    };
  };

  return {
    getDirectPaymentMethods,
  };
};

module.exports = Object.assign(createPaymentService(), {
  DIRECT_PAYMENT_CACHE_SECONDS,
  METHOD_DISPLAY_NAMES,
  createPaymentService,
});
