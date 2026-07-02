const { query: defaultQuery } = require('./client');

const PUBLIC_SETTINGS_TABLE_SCHEMA = 'public';
const PUBLIC_SETTINGS_TABLE_NAME = 'settings_store';
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

const pickPayloadCandidate = (payload) => {
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
        PUBLIC_FIELD_NAMES.some((fieldName) => fieldName in candidate),
    ) ||
    payload
  );
};

const buildQueryPlan = (columns) => {
  const availableColumns = new Set(columns.map((column) => column.column_name));
  const keyColumn = pickFirstColumn(availableColumns, KEY_COLUMN_CANDIDATES);
  const payloadColumn =
    pickFirstColumn(availableColumns, PAYLOAD_COLUMN_CANDIDATES) ||
    columns.find((column) => ['json', 'jsonb'].includes(column.udt_name))
      ?.column_name ||
    null;
  const hasDirectFields = PUBLIC_FIELD_NAMES.some((fieldName) =>
    availableColumns.has(fieldName),
  );

  if (!payloadColumn && !hasDirectFields) {
    throw new Error(
      'settings_store does not expose a supported public settings payload',
    );
  }

  const selectedColumns = new Set([
    ...(keyColumn ? [keyColumn] : []),
    ...(payloadColumn ? [payloadColumn] : []),
    ...PUBLIC_FIELD_NAMES.filter((fieldName) => availableColumns.has(fieldName)),
    ...['id', 'created_at', 'updated_at'].filter((fieldName) =>
      availableColumns.has(fieldName),
    ),
  ]);

  const selectClause = Array.from(selectedColumns)
    .map((column) => quoteIdentifier(column))
    .join(', ');
  const orderByClause = buildOrderByClause(availableColumns);

  if (keyColumn) {
    return {
      availableColumns,
      keyColumn,
      payloadColumn,
      text: `SELECT ${selectClause} FROM ${PUBLIC_SETTINGS_TABLE_SCHEMA}.${PUBLIC_SETTINGS_TABLE_NAME} WHERE LOWER(${quoteIdentifier(
        keyColumn,
      )}::text) = ANY($1::text[])${orderByClause} LIMIT 1`,
      values: [PUBLIC_ROW_KEY_CANDIDATES],
    };
  }

  return {
    availableColumns,
    keyColumn: null,
    payloadColumn,
    text: `SELECT ${selectClause} FROM ${PUBLIC_SETTINGS_TABLE_SCHEMA}.${PUBLIC_SETTINGS_TABLE_NAME}${orderByClause} LIMIT 1`,
    values: [],
  };
};

const extractPublicSettings = ({
  availableColumns,
  payloadColumn,
  row,
}) => {
  const directFields = extractDirectFields(row, availableColumns);
  const payload = pickPayloadCandidate(parsePayload(row[payloadColumn]));

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

const createSettingsRepository = ({
  query = defaultQuery,
} = {}) => {
  const getPublicSettings = async () => {
    const columnsResult = await query(
      `SELECT column_name, data_type, udt_name
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
       ORDER BY ordinal_position`,
      [PUBLIC_SETTINGS_TABLE_SCHEMA, PUBLIC_SETTINGS_TABLE_NAME],
    );
    const columns = columnsResult.rows || [];

    if (columns.length === 0) {
      throw new Error('settings_store is not available');
    }

    const plan = buildQueryPlan(columns);
    const settingsResult = await query(plan.text, plan.values);
    const row = settingsResult.rows?.[0];

    if (!row) {
      return null;
    }

    return extractPublicSettings({
      availableColumns: plan.availableColumns,
      payloadColumn: plan.payloadColumn,
      row,
    });
  };

  return {
    getPublicSettings,
  };
};

module.exports = {
  PUBLIC_FIELD_NAMES,
  createSettingsRepository,
};
