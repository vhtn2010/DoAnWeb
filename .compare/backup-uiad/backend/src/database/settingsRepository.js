const { query: defaultQuery, withTransaction } = require('./client');

const PUBLIC_SETTINGS_TABLE_SCHEMA = 'public';
const PUBLIC_SETTINGS_TABLE_NAME = 'settings_store';
const SETTINGS_STORAGE_UNAVAILABLE_MESSAGE = 'settings_store is not available';
const PUBLIC_SETTINGS_UPDATE_ACTION = 'settings.public.update';
const DIRECT_PAYMENT_SETTINGS_UPDATE_ACTION = 'settings.direct_payment.update';
const BUSINESS_SETTINGS_UPDATE_ACTION = 'settings.business.update';
const KEY_COLUMN_CANDIDATES = Object.freeze([
  'setting_key',
  'key',
  'code',
  'slug',
  'name',
  'scope',
  'category',
  'type',
]);
const PAYLOAD_COLUMN_CANDIDATES = Object.freeze([
  'setting_value',
  'value',
  'config',
  'payload',
  'data',
  'content',
  'json_value',
  'metadata',
]);
const PUBLIC_ROW_KEY_CANDIDATES = Object.freeze([
  'public',
  'public_settings',
  'website_public',
  'site_public',
]);
const DIRECT_PAYMENT_ROW_KEY_CANDIDATES = Object.freeze([
  'direct_payment',
  'direct-payment',
  'payment_direct',
  'payment_methods_direct',
]);
const BUSINESS_ROW_KEY_CANDIDATES = Object.freeze([
  'business',
  'business_settings',
  'invoice_business',
  'company_business',
]);
const PUBLIC_FIELD_NAMES = Object.freeze([
  'site_name',
  'logo_url',
  'hotline',
  'support_email',
  'address',
  'social_links',
  'business_hours',
  'business_info_public',
]);
const ADMIN_PUBLIC_FIELD_NAMES = Object.freeze([
  ...PUBLIC_FIELD_NAMES,
  'seo_title',
  'seo_description',
  'footer_text',
]);
const DIRECT_PAYMENT_FIELD_NAMES = Object.freeze([
  'hotline',
  'methods',
]);
const BUSINESS_FIELD_NAMES = Object.freeze([
  'company_name',
  'tax_code',
  'address',
  'invoice_email',
  'invoice_phone',
  'legal_representative',
  'business_license_no',
  'invoice_note',
]);
const CREATED_AT_COLUMN_CANDIDATES = Object.freeze([
  'created_at',
]);
const UPDATED_AT_COLUMN_CANDIDATES = Object.freeze([
  'updated_at',
]);
const UPDATED_BY_COLUMN_CANDIDATES = Object.freeze([
  'updated_by',
  'updated_by_user_id',
  'updated_by_id',
  'modified_by',
  'modified_by_user_id',
]);
const CTID_ALIAS = '__row_ctid';

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const quoteIdentifier = (identifier) => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`);
  }

  return `"${identifier}"`;
};

const pickFirstColumn = (availableColumns, candidates) =>
  candidates.find((candidate) => availableColumns.has(candidate)) || null;

const getColumnMap = (columns) =>
  columns.reduce((accumulator, column) => {
    accumulator.set(column.column_name, column);
    return accumulator;
  }, new Map());

const buildOrderByClause = (availableColumns) => {
  const sortableColumns = ['updated_at', 'created_at', 'id'].filter((column) =>
    availableColumns.has(column),
  );

  if (sortableColumns.length === 0) {
    return '';
  }

  return ` ORDER BY ${sortableColumns
    .map((column) => `${quoteIdentifier(column)} DESC NULLS LAST`)
    .join(', ')}`;
};

const parsePayload = (value) => {
  if (value == null) {
    return null;
  }

  if (isPlainObject(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return isPlainObject(parsed) ? parsed : null;
  } catch (error) {
    return null;
  }
};

const extractDirectFields = (row, availableColumns) =>
  PUBLIC_FIELD_NAMES.reduce((accumulator, fieldName) => {
    if (availableColumns.has(fieldName) && row[fieldName] !== undefined) {
      accumulator[fieldName] = row[fieldName];
    }

    return accumulator;
  }, {});

const extractScopedFields = (row, availableColumns, fieldNames) =>
  fieldNames.reduce((accumulator, fieldName) => {
    if (availableColumns.has(fieldName) && row[fieldName] !== undefined) {
      accumulator[fieldName] = row[fieldName];
    }

    return accumulator;
  }, {});

const pickPayloadCandidate = (payload, fieldNames = PUBLIC_FIELD_NAMES) => {
  if (!isPlainObject(payload)) {
    return null;
  }

  const nestedCandidates = [
    payload,
    payload.public,
    payload.public_settings,
    payload.settings?.public,
    payload.website?.public,
  ];

  return (
    nestedCandidates.find(
      (candidate) =>
        isPlainObject(candidate) &&
        fieldNames.some((fieldName) => fieldName in candidate),
    ) ||
    payload
  );
};

const buildQueryPlan = (
  columns,
  {
    fieldNames = PUBLIC_FIELD_NAMES,
    includeCtid = false,
    rowKeyCandidates = PUBLIC_ROW_KEY_CANDIDATES,
  } = {},
) => {
  const availableColumns = new Set(columns.map((column) => column.column_name));
  const columnMap = getColumnMap(columns);
  const keyColumn = pickFirstColumn(availableColumns, KEY_COLUMN_CANDIDATES);
  const payloadColumn =
    pickFirstColumn(availableColumns, PAYLOAD_COLUMN_CANDIDATES) ||
    columns.find((column) => ['json', 'jsonb'].includes(column.udt_name))
      ?.column_name ||
    null;
  const createdAtColumn = pickFirstColumn(
    availableColumns,
    CREATED_AT_COLUMN_CANDIDATES,
  );
  const updatedAtColumn = pickFirstColumn(
    availableColumns,
    UPDATED_AT_COLUMN_CANDIDATES,
  );
  const updatedByColumn = pickFirstColumn(
    availableColumns,
    UPDATED_BY_COLUMN_CANDIDATES,
  );
  const directFields = fieldNames.filter((fieldName) =>
    availableColumns.has(fieldName),
  );
  const hasDirectFields = directFields.length > 0;

  if (!payloadColumn && !hasDirectFields) {
    throw new Error('settings_store does not expose a supported settings payload');
  }

  const selectedColumns = new Set([
    ...(keyColumn ? [keyColumn] : []),
    ...(payloadColumn ? [payloadColumn] : []),
    ...directFields,
    ...['id', createdAtColumn, updatedAtColumn, updatedByColumn].filter((fieldName) =>
      availableColumns.has(fieldName),
    ),
  ]);
  const selectFragments = [];

  if (includeCtid) {
    selectFragments.push(`ctid::text AS ${quoteIdentifier(CTID_ALIAS)}`);
  }

  selectFragments.push(
    ...Array.from(selectedColumns).map((column) => quoteIdentifier(column)),
  );

  const selectClause = selectFragments.join(', ');
  const orderByClause = buildOrderByClause(availableColumns);

  if (keyColumn) {
    return {
      availableColumns,
      columnMap,
      createdAtColumn,
      directFields,
      keyColumn,
      payloadColumn,
      updatedAtColumn,
      updatedByColumn,
      text: `SELECT ${selectClause} FROM ${PUBLIC_SETTINGS_TABLE_SCHEMA}.${PUBLIC_SETTINGS_TABLE_NAME} WHERE LOWER(${quoteIdentifier(
        keyColumn,
      )}::text) = ANY($1::text[])${orderByClause} LIMIT 1`,
      values: [rowKeyCandidates],
    };
  }

  return {
    availableColumns,
    columnMap,
    createdAtColumn,
    directFields,
    keyColumn: null,
    payloadColumn,
    updatedAtColumn,
    updatedByColumn,
    text: `SELECT ${selectClause} FROM ${PUBLIC_SETTINGS_TABLE_SCHEMA}.${PUBLIC_SETTINGS_TABLE_NAME}${orderByClause} LIMIT 1`,
    values: [],
  };
};

const extractPublicSettings = ({
  availableColumns,
  fieldNames = PUBLIC_FIELD_NAMES,
  payloadColumn,
  row,
}) => {
  const directFields = extractScopedFields(row, availableColumns, fieldNames);
  const payload = pickPayloadCandidate(parsePayload(row[payloadColumn]), fieldNames);

  if (isPlainObject(payload)) {
    return {
      ...payload,
      ...directFields,
    };
  }

  if (Object.keys(directFields).length > 0) {
    return directFields;
  }

  return null;
};

const extractMetadata = ({
  row,
  updatedAtColumn,
  updatedByColumn,
}) => ({
  updated_at: updatedAtColumn ? row[updatedAtColumn] || null : null,
  updated_by: updatedByColumn ? row[updatedByColumn] || null : null,
});

const buildPayloadValueExpression = (columnInfo, parameterIndex) => {
  if (!columnInfo) {
    return `$${parameterIndex}`;
  }

  if (['json', 'jsonb'].includes(columnInfo.udt_name)) {
    return `$${parameterIndex}::${columnInfo.udt_name}`;
  }

  return `$${parameterIndex}`;
};

const serializeColumnValue = (value) => {
  if (value == null) {
    return null;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return value;
};

const executeQuery = (queryExecutor, text, params) =>
  typeof queryExecutor === 'function'
    ? queryExecutor(text, params)
    : queryExecutor.query(text, params);

const isSettingsStorageUnavailableError = (error) =>
  error?.message === SETTINGS_STORAGE_UNAVAILABLE_MESSAGE;

const createSettingsRepository = ({
  query = defaultQuery,
  withTransactionImpl = withTransaction,
} = {}) => {
  const loadColumns = async (queryExecutor) => {
    const columnsResult = await executeQuery(
      queryExecutor,
      `SELECT column_name, data_type, udt_name
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
       ORDER BY ordinal_position`,
      [PUBLIC_SETTINGS_TABLE_SCHEMA, PUBLIC_SETTINGS_TABLE_NAME],
    );
    const columns = columnsResult.rows || [];

    if (columns.length === 0) {
      throw new Error(SETTINGS_STORAGE_UNAVAILABLE_MESSAGE);
    }

    return columns;
  };

  const readSettingsRecord = async ({
    fieldNames = PUBLIC_FIELD_NAMES,
    includeCtid = false,
    queryExecutor = query,
    rowKeyCandidates = PUBLIC_ROW_KEY_CANDIDATES,
  } = {}) => {
    const columns = await loadColumns(queryExecutor);
    const plan = buildQueryPlan(columns, {
      fieldNames,
      includeCtid,
      rowKeyCandidates,
    });
    const settingsResult = await executeQuery(queryExecutor, plan.text, plan.values);
    const row = settingsResult.rows?.[0];

    if (!row) {
      return {
        exists: false,
        metadata: {
          updated_at: null,
          updated_by: null,
        },
        plan,
        row: null,
        settings: null,
      };
    }

    return {
      exists: true,
      metadata: extractMetadata({
        row,
        updatedAtColumn: plan.updatedAtColumn,
        updatedByColumn: plan.updatedByColumn,
      }),
      plan,
      row,
      settings: extractPublicSettings({
        availableColumns: plan.availableColumns,
        fieldNames,
        payloadColumn: plan.payloadColumn,
        row,
      }),
    };
  };

  const getPublicSettings = async () => {
    const result = await readSettingsRecord();

    return result.settings;
  };

  const getAdminPublicSettings = async () => {
    const result = await readSettingsRecord({
      fieldNames: ADMIN_PUBLIC_FIELD_NAMES,
    });

    return {
      exists: result.exists,
      metadata: result.metadata,
      settings: result.settings,
    };
  };

  const getDirectPaymentSettings = async () => {
    const result = await readSettingsRecord({
      fieldNames: DIRECT_PAYMENT_FIELD_NAMES,
      rowKeyCandidates: DIRECT_PAYMENT_ROW_KEY_CANDIDATES,
    });

    return {
      exists: result.exists,
      metadata: result.metadata,
      settings: result.settings,
    };
  };

  const getBusinessSettings = async () => {
    const result = await readSettingsRecord({
      fieldNames: BUSINESS_FIELD_NAMES,
      rowKeyCandidates: BUSINESS_ROW_KEY_CANDIDATES,
    });

    return {
      exists: result.exists,
      metadata: result.metadata,
      settings: result.settings,
    };
  };

  const listPermissionCodesByRoleId = async (roleId) => {
    const result = await query(
      `
        SELECT p.code
        FROM role_permissions rp
        JOIN permissions p ON p.id = rp.permission_id
        WHERE rp.role_id = $1
        ORDER BY p.code ASC
      `,
      [roleId],
    );

    return result.rows.map((row) => row.code);
  };

  const setLocalConfig = async (client, key, value) => {
    await client.query('SELECT set_config($1, $2, TRUE)', [key, value]);
  };

  const buildUpsertAssignments = ({
    actorUserId,
    plan,
    rowKeyCandidates = PUBLIC_ROW_KEY_CANDIDATES,
    settings,
  }) => {
    const assignments = [];
    const insertColumns = [];
    const insertValues = [];
    const params = [];

    if (plan.keyColumn) {
      insertColumns.push(plan.keyColumn);
      params.push(rowKeyCandidates[0]);
      insertValues.push(buildPayloadValueExpression(
        plan.columnMap.get(plan.keyColumn),
        params.length,
      ));
    }

    if (plan.payloadColumn) {
      insertColumns.push(plan.payloadColumn);
      params.push(JSON.stringify(settings));
      const payloadExpression = buildPayloadValueExpression(
        plan.columnMap.get(plan.payloadColumn),
        params.length,
      );

      insertValues.push(payloadExpression);
      assignments.push(
        `${quoteIdentifier(plan.payloadColumn)} = ${payloadExpression}`,
      );
    }

    for (const fieldName of plan.directFields) {
      insertColumns.push(fieldName);
      params.push(serializeColumnValue(settings[fieldName]));
      const expression = buildPayloadValueExpression(
        plan.columnMap.get(fieldName),
        params.length,
      );

      insertValues.push(expression);
      assignments.push(`${quoteIdentifier(fieldName)} = ${expression}`);
    }

    if (plan.createdAtColumn) {
      insertColumns.push(plan.createdAtColumn);
      insertValues.push('NOW()');
    }

    if (plan.updatedAtColumn) {
      assignments.push(`${quoteIdentifier(plan.updatedAtColumn)} = NOW()`);
      insertColumns.push(plan.updatedAtColumn);
      insertValues.push('NOW()');
    }

    if (plan.updatedByColumn) {
      params.push(actorUserId || null);
      const expression = buildPayloadValueExpression(
        plan.columnMap.get(plan.updatedByColumn),
        params.length,
      );

      assignments.push(`${quoteIdentifier(plan.updatedByColumn)} = ${expression}`);
      insertColumns.push(plan.updatedByColumn);
      insertValues.push(expression);
    }

    return {
      assignments,
      insertColumns,
      insertValues,
      params,
    };
  };

  const saveScopedSettings = ({
    actorUserId,
    changedFields,
    fieldNames,
    ipAddress,
    logAction,
    logMetadata,
    rowKeyCandidates,
    settings,
    userAgent,
  } = {}) =>
    withTransactionImpl(async (client) => {
      await setLocalConfig(client, 'app.current_user_id', String(actorUserId || ''));

      if (userAgent) {
        await setLocalConfig(client, 'app.user_agent', String(userAgent));
      }

      const record = await readSettingsRecord({
        fieldNames,
        includeCtid: true,
        queryExecutor: client,
        rowKeyCandidates,
      });
      const {
        assignments,
        insertColumns,
        insertValues,
        params,
      } = buildUpsertAssignments({
        actorUserId,
        plan: record.plan,
        rowKeyCandidates,
        settings,
      });

      if (assignments.length === 0) {
        throw new Error('settings_store does not expose writable settings columns');
      }

      let saveResult;

      if (record.exists) {
        if (record.plan.keyColumn) {
          saveResult = await client.query(
            `
              UPDATE ${PUBLIC_SETTINGS_TABLE_SCHEMA}.${PUBLIC_SETTINGS_TABLE_NAME}
              SET ${assignments.join(', ')}
              WHERE LOWER(${quoteIdentifier(record.plan.keyColumn)}::text) = ANY($${params.length + 1}::text[])
                AND $1::text IS NOT NULL
              RETURNING *
            `,
            [...params, rowKeyCandidates],
          );
        } else {
          saveResult = await client.query(
            `
              UPDATE ${PUBLIC_SETTINGS_TABLE_SCHEMA}.${PUBLIC_SETTINGS_TABLE_NAME}
              SET ${assignments.join(', ')}
              WHERE ctid IN (
                SELECT ctid
                FROM ${PUBLIC_SETTINGS_TABLE_SCHEMA}.${PUBLIC_SETTINGS_TABLE_NAME}
                ${buildOrderByClause(record.plan.availableColumns)}
                LIMIT 1
              )
              RETURNING *
            `,
            params,
          );
        }
      }

      if (!record.exists || saveResult.rowCount === 0) {
        saveResult = await client.query(
          `
            INSERT INTO ${PUBLIC_SETTINGS_TABLE_SCHEMA}.${PUBLIC_SETTINGS_TABLE_NAME} (
              ${insertColumns.map((column) => quoteIdentifier(column)).join(', ')}
            )
            VALUES (${insertValues.join(', ')})
            RETURNING *
          `,
          params,
        );
      }

      const savedRow = saveResult.rows[0];
      const savedSettings = extractPublicSettings({
        availableColumns: record.plan.availableColumns,
        fieldNames,
        payloadColumn: record.plan.payloadColumn,
        row: savedRow,
      });
      const savedMetadata = extractMetadata({
        row: savedRow,
        updatedAtColumn: record.plan.updatedAtColumn,
        updatedByColumn: record.plan.updatedByColumn,
      });

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
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
        `,
        [
          actorUserId || null,
          logAction,
          'settings',
          savedRow?.id || null,
          ipAddress || null,
          userAgent || null,
          JSON.stringify({
            changed_fields: Array.isArray(changedFields) ? changedFields : [],
            ...(logMetadata || {}),
          }),
        ],
      );

      return {
        metadata: savedMetadata,
        settings: savedSettings,
      };
    });

  const saveAdminPublicSettings = async ({
    actorUserId,
    changedFields,
    ipAddress,
    settings,
    userAgent,
  } = {}) =>
    saveScopedSettings({
      actorUserId,
      changedFields,
      fieldNames: ADMIN_PUBLIC_FIELD_NAMES,
      ipAddress,
      logAction: PUBLIC_SETTINGS_UPDATE_ACTION,
      logMetadata: {
        scope: 'public',
      },
      rowKeyCandidates: PUBLIC_ROW_KEY_CANDIDATES,
      settings,
      userAgent,
    });

  const saveDirectPaymentSettings = async ({
    actorUserId,
    changedMethodCodes,
    ipAddress,
    settings,
    userAgent,
  } = {}) =>
    saveScopedSettings({
      actorUserId,
      changedFields: changedMethodCodes,
      fieldNames: DIRECT_PAYMENT_FIELD_NAMES,
      ipAddress,
      logAction: DIRECT_PAYMENT_SETTINGS_UPDATE_ACTION,
      logMetadata: {
        method_codes: Array.isArray(changedMethodCodes)
          ? changedMethodCodes
          : [],
        scope: 'direct_payment',
      },
      rowKeyCandidates: DIRECT_PAYMENT_ROW_KEY_CANDIDATES,
      settings,
      userAgent,
    });

  const saveBusinessSettings = async ({
    actorUserId,
    changedFields,
    ipAddress,
    settings,
    userAgent,
  } = {}) =>
    saveScopedSettings({
      actorUserId,
      changedFields,
      fieldNames: BUSINESS_FIELD_NAMES,
      ipAddress,
      logAction: BUSINESS_SETTINGS_UPDATE_ACTION,
      logMetadata: {
        scope: 'business',
      },
      rowKeyCandidates: BUSINESS_ROW_KEY_CANDIDATES,
      settings,
      userAgent,
    });

  return {
    getAdminPublicSettings,
    getBusinessSettings,
    getDirectPaymentSettings,
    getPublicSettings,
    listPermissionCodesByRoleId,
    saveAdminPublicSettings,
    saveBusinessSettings,
    saveDirectPaymentSettings,
  };
};

module.exports = {
  ADMIN_PUBLIC_FIELD_NAMES,
  BUSINESS_FIELD_NAMES,
  BUSINESS_SETTINGS_UPDATE_ACTION,
  DIRECT_PAYMENT_FIELD_NAMES,
  DIRECT_PAYMENT_SETTINGS_UPDATE_ACTION,
  PUBLIC_FIELD_NAMES,
  PUBLIC_SETTINGS_UPDATE_ACTION,
  createSettingsRepository,
  isSettingsStorageUnavailableError,
  SETTINGS_STORAGE_UNAVAILABLE_MESSAGE,
};
