import { SERVICE_STATUSES } from '../constants/serviceStatuses.js'

function createEmptyFilters() {
  return {
    airline: '',
    tour: '',
    hotel: '',
    train: '',
  }
}

function filterActiveServices(services = []) {
  return services.filter((service) => service?.status === SERVICE_STATUSES.active)
}

function normalizeDestination(service) {
  return {
    ...service,
    badge_text: service.details?.badge_text ?? '',
    size: service.details?.card_size ?? 'small',
  }
}

function normalizeFlashSaleService(service) {
  return {
    ...service,
    discount_percent: service.details?.discount_percent ?? 0,
    price_unit: service.details?.price_unit ?? '',
  }
}

export function createDate(year, monthIndex, day) {
  return new Date(year, monthIndex, day)
}

export function parseFixtureDate(value, fallbackDate = null) {
  const [yearText, monthText, dayText] = String(value ?? '').split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!year || !month || !day) {
    return fallbackDate
  }

  return createDate(year, month - 1, day)
}

export function addMonths(date, offset) {
  return createDate(date.getFullYear(), date.getMonth() + offset, 1)
}

export function compareDates(firstDate, secondDate) {
  const first = createDate(
    firstDate.getFullYear(),
    firstDate.getMonth(),
    firstDate.getDate(),
  ).getTime()
  const second = createDate(
    secondDate.getFullYear(),
    secondDate.getMonth(),
    secondDate.getDate(),
  ).getTime()

  if (first === second) {
    return 0
  }

  return first > second ? 1 : -1
}

export function isSameDay(firstDate, secondDate) {
  return compareDates(firstDate, secondDate) === 0
}

export function formatDateDisplay(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return ''
  }

  return `${String(date.getDate()).padStart(2, '0')} thg ${date.getMonth() + 1} ${date.getFullYear()}`
}

export function formatCompactDateDisplay(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return ''
  }

  return `${String(date.getDate()).padStart(2, '0')} Th${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function formatDateRangeDisplay(startDate, endDate) {
  if (!startDate || !endDate) {
    return ''
  }

  return `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`
}

export function formatCompactDateRangeDisplay(startDate, endDate) {
  if (!startDate || !endDate) {
    return ''
  }

  return `${formatCompactDateDisplay(startDate)} - ${formatCompactDateDisplay(endDate)}`
}

export function formatMonthLabel(date) {
  return `tháng ${date.getMonth() + 1} năm ${date.getFullYear()}`
}

export function formatQueryDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return ''
  }

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

export function slugifyQueryValue(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

export function getMonthDays(monthDate) {
  const firstDayOfMonth = createDate(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const startOffset = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1
  const gridStartDate = createDate(
    firstDayOfMonth.getFullYear(),
    firstDayOfMonth.getMonth(),
    1 - startOffset,
  )

  return Array.from({ length: 42 }, (_, index) =>
    createDate(
      gridStartDate.getFullYear(),
      gridStartDate.getMonth(),
      gridStartDate.getDate() + index,
    ),
  )
}

export function createHomePageViewState(payload = {}) {
  return {
    hero: {
      title_leading: payload.hero?.title_leading ?? '',
      title_script: payload.hero?.title_script ?? '',
      description: payload.hero?.description ?? '',
      cta_label: payload.hero?.cta_label ?? 'Bắt đầu hành trình',
      cta_path: payload.hero?.cta_path ?? '/services',
      art_image_alt: payload.hero?.art_image_alt ?? 'Nét Việt Travel',
      art_image_url: payload.hero?.art_image_url ?? '',
    },
    searchDefaults: {
      from: '',
      to: '',
      startDate: null,
      endDate: null,
      sort: '',
      filters: createEmptyFilters(),
    },
    featuredServices: filterActiveServices(payload.featured_services ?? []),
    flashSaleServices: filterActiveServices(payload.flash_sale_services ?? []).map(
      normalizeFlashSaleService,
    ),
    destinations: filterActiveServices(payload.destinations ?? []).map(normalizeDestination),
    valueProps: Array.isArray(payload.value_props) ? payload.value_props : [],
    flashSaleMeta: {
      day_label: payload.flash_sale_meta?.day_label ?? 'NGÀY',
      hour_label: payload.flash_sale_meta?.hour_label ?? 'GIỜ',
      minute_label: payload.flash_sale_meta?.minute_label ?? 'PHÚT',
      timer: {
        days: payload.flash_sale_meta?.timer?.days ?? '02',
        hours: payload.flash_sale_meta?.timer?.hours ?? '14',
        minutes: payload.flash_sale_meta?.timer?.minutes ?? '45',
      },
    },
    provinces: Array.isArray(payload.provinces) ? payload.provinces : [],
  }
}
