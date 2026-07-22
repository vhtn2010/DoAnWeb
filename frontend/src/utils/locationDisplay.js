import { vietnamProvinceOptions } from '../data/vietnamProvinces.js'

const LOCATION_ALIASES = new Map(
  Object.entries({
    'da lat': 'Đà Lạt',
    'da nang': 'Đà Nẵng',
    'ha noi': 'Hà Nội',
    'ha long': 'Hạ Long',
    'hoi an': 'Hội An',
    'ho chi minh': 'TP. Hồ Chí Minh',
    'ho chi minh city': 'TP. Hồ Chí Minh',
    'nha trang': 'Nha Trang',
    'phu quoc': 'Phú Quốc',
    'quang ninh': 'Quảng Ninh',
    'quy nhon': 'Quy Nhơn',
    'sa pa': 'Sa Pa',
    'sai gon': 'Sài Gòn',
    'saigon': 'Sài Gòn',
    'sapa': 'Sa Pa',
    'viet nam': 'Việt Nam',
    'tp hcm': 'TP. Hồ Chí Minh',
  }).map(([alias, canonical]) => [normalizeLocationKey(alias), canonical]),
)

for (const province of vietnamProvinceOptions) {
  const normalizedKey = normalizeLocationKey(province)

  if (!LOCATION_ALIASES.has(normalizedKey)) {
    LOCATION_ALIASES.set(normalizedKey, province)
  }
}

function normalizeLocationKey(value = '') {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function normalizeLocationPart(value = '') {
  const trimmedValue = String(value ?? '').trim()

  if (!trimmedValue) {
    return ''
  }

  const lookupKey = normalizeLocationKey(trimmedValue.replace(/\([^)]*\)/g, ''))
  return LOCATION_ALIASES.get(lookupKey) ?? trimmedValue
}

export function normalizeVietnamLocationDisplay(value = '') {
  const rawValue = String(value ?? '').trim()

  if (!rawValue) {
    return ''
  }

  return rawValue
    .split(/\s*-\s*/g)
    .map((segment) =>
      segment
        .split(/\s*,\s*/g)
        .map((part) => normalizeLocationPart(part))
        .join(', '),
    )
    .join(' - ')
}

export function normalizeVietnamLocationOptions(values = []) {
  if (!Array.isArray(values)) {
    return []
  }

  const seen = new Set()
  const normalizedValues = []

  for (const value of values) {
    const displayValue = normalizeVietnamLocationDisplay(value)
    if (!displayValue) {
      continue
    }

    const normalizedKey = normalizeLocationKey(displayValue)
    if (seen.has(normalizedKey)) {
      continue
    }

    seen.add(normalizedKey)
    normalizedValues.push(displayValue)
  }

  return normalizedValues
}
