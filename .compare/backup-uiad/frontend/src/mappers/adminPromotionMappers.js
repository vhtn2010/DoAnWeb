import {
  ADMIN_PROMOTION_INITIAL_FEEDBACK,
  ADMIN_PROMOTION_STATUS_META,
  ADMIN_PROMOTION_STATUSES,
  ADMIN_PROMOTION_TARGET_SERVICE_OPTIONS,
} from '../constants/adminPromotions.js'

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

function createPromotionCode(promotion = {}) {
  if (promotion.code) {
    return promotion.code
  }

  if (!promotion.id) {
    return 'KM-MOI'
  }

  return `KM-${String(promotion.id).slice(0, 8).toUpperCase()}`
}

function parseDateValue(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getPromotionDefaultPriority(status) {
  switch (status) {
    case ADMIN_PROMOTION_STATUSES.active:
      return 0
    case ADMIN_PROMOTION_STATUSES.draft:
      return 1
    case ADMIN_PROMOTION_STATUSES.cancelled:
      return 2
    case ADMIN_PROMOTION_STATUSES.paused:
      return 3
    case ADMIN_PROMOTION_STATUSES.expired:
      return 4
    default:
      return 5
  }
}

function toDateTimeLocalValue(value) {
  const date = parseDateValue(value)

  if (!date) {
    return ''
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 16)
}

function createDefaultDateTimeLocal(daysFromNow) {
  const date = new Date()

  date.setDate(date.getDate() + daysFromNow)
  date.setMinutes(0, 0, 0)

  if (daysFromNow === 0) {
    date.setHours(date.getHours() + 1)
  }

  return toDateTimeLocalValue(date.toISOString())
}

export function getAdminPromotionStatusMeta(status) {
  return ADMIN_PROMOTION_STATUS_META[status] ?? {
    className: 'draft',
    label: status || 'Chưa cập nhật',
    tone: 'neutral',
  }
}

export function getAdminPromotionTargetServiceLabel(value) {
  return (
    ADMIN_PROMOTION_TARGET_SERVICE_OPTIONS.find((option) => option.value === (value || ''))?.label ||
    value ||
    'Tất cả dịch vụ'
  )
}

export function mapAdminPromotion(promotion = {}) {
  const statusMeta = getAdminPromotionStatusMeta(promotion.status)

  return {
    activeVoucherCount: Number(promotion.active_voucher_count || 0),
    code: createPromotionCode(promotion),
    createdAt: promotion.created_at || '',
    createdBy: promotion.created_by_user || null,
    description: promotion.description || 'Chưa có mô tả khuyến mãi.',
    endDate: promotion.valid_to || '',
    id: promotion.id,
    name: promotion.name || 'Chương trình chưa đặt tên',
    raw: promotion,
    startDate: promotion.valid_from || '',
    status: promotion.status || ADMIN_PROMOTION_STATUSES.draft,
    statusClassName: statusMeta.className,
    targetServiceLabel: getAdminPromotionTargetServiceLabel(promotion.target_service_type),
    targetServiceType: promotion.target_service_type || '',
    updatedAt: promotion.updated_at || '',
    voucherCount: Number(promotion.voucher_count || 0),
  }
}

export function createAdminPromotionPageNumbers(totalPages = 1) {
  return Array.from({ length: Math.max(Number(totalPages) || 1, 1) }, (_, index) => index + 1)
}

export function createAdminPromotionFeedback(tone = 'info', message = '') {
  if (!message) {
    return ADMIN_PROMOTION_INITIAL_FEEDBACK
  }

  return { message, tone }
}

export function matchesAdminPromotionSearch(promotion, searchQuery) {
  const query = normalizeText(searchQuery.trim())

  if (!query) {
    return true
  }

  return normalizeText(
    [
      promotion.code,
      promotion.name,
      promotion.description,
      promotion.targetServiceLabel,
      promotion.status,
    ].join(' '),
  ).includes(query)
}

export function sortAdminPromotions(promotions = [], sortOrder = 'default') {
  if (sortOrder === 'default') {
    return [...promotions].sort((firstPromotion, secondPromotion) => {
      const priorityDifference =
        getPromotionDefaultPriority(firstPromotion.status) -
        getPromotionDefaultPriority(secondPromotion.status)

      if (priorityDifference !== 0) {
        return priorityDifference
      }

      const firstDate = parseDateValue(firstPromotion.createdAt)
      const secondDate = parseDateValue(secondPromotion.createdAt)

      if (!firstDate || !secondDate) {
        if (!firstDate && !secondDate) {
          return 0
        }

        return firstDate ? -1 : 1
      }

      return secondDate - firstDate
    })
  }

  return [...promotions].sort((firstPromotion, secondPromotion) => {
    const firstDate = parseDateValue(
      sortOrder === 'ending' ? firstPromotion.endDate : firstPromotion.createdAt,
    )
    const secondDate = parseDateValue(
      sortOrder === 'ending' ? secondPromotion.endDate : secondPromotion.createdAt,
    )

    if (!firstDate || !secondDate) {
      if (!firstDate && !secondDate) {
        return 0
      }

      return firstDate ? -1 : 1
    }

    return sortOrder === 'ending'
      ? firstDate - secondDate
      : secondDate - firstDate
  })
}

export function createAdminPromotionOverview(promotions = []) {
  const activeCount = promotions.filter(
    (promotion) => promotion.status === ADMIN_PROMOTION_STATUSES.active,
  ).length
  const preparationCount = promotions.filter((promotion) =>
    [ADMIN_PROMOTION_STATUSES.draft, ADMIN_PROMOTION_STATUSES.paused].includes(promotion.status),
  ).length
  const closedCount = promotions.filter((promotion) =>
    [ADMIN_PROMOTION_STATUSES.expired, ADMIN_PROMOTION_STATUSES.cancelled].includes(promotion.status),
  ).length

  return [
    { label: 'Đang hoạt động', value: activeCount, tone: 'brand' },
    { label: 'Nháp/Tạm dừng', value: preparationCount, tone: 'info' },
    { label: 'Đã kết thúc/Hủy', value: closedCount, tone: 'neutral' },
  ]
}

export function createInitialAdminPromotionFormValues(promotion = null) {
  if (promotion) {
    return {
      description: promotion.raw?.description ?? promotion.description ?? '',
      name: promotion.name ?? '',
      status: promotion.status ?? ADMIN_PROMOTION_STATUSES.draft,
      targetServiceType: promotion.targetServiceType ?? '',
      validFrom: toDateTimeLocalValue(promotion.startDate),
      validTo: toDateTimeLocalValue(promotion.endDate),
    }
  }

  return {
    description: '',
    name: '',
    status: ADMIN_PROMOTION_STATUSES.draft,
    targetServiceType: '',
    validFrom: createDefaultDateTimeLocal(0),
    validTo: createDefaultDateTimeLocal(30),
  }
}

export function validateAdminPromotionForm(values, { isCreateMode = true } = {}) {
  const errors = {}
  const validFrom = parseDateValue(values.validFrom)
  const validTo = parseDateValue(values.validTo)

  if (!values.name.trim()) {
    errors.name = 'Nhập tên chương trình khuyến mãi.'
  }

  if (!values.status && isCreateMode) {
    errors.status = 'Chọn trạng thái khuyến mãi.'
  }

  if (!validFrom) {
    errors.validFrom = 'Chọn thời gian bắt đầu hợp lệ.'
  }

  if (!validTo) {
    errors.validTo = 'Chọn thời gian kết thúc hợp lệ.'
  }

  if (validFrom && validTo && validTo <= validFrom) {
    errors.validTo = 'Thời gian kết thúc phải sau thời gian bắt đầu.'
  }

  if (isCreateMode && validTo && validTo <= new Date()) {
    errors.validTo = 'Thời gian kết thúc phải ở tương lai.'
  }

  return errors
}

export function buildAdminPromotionPayloadFromForm(values, { includeStatus = true } = {}) {
  const payload = {
    description: values.description.trim() || null,
    name: values.name.trim(),
    targetServiceType: values.targetServiceType || null,
    validFrom: new Date(values.validFrom).toISOString(),
    validTo: new Date(values.validTo).toISOString(),
  }

  if (includeStatus) {
    payload.status = values.status
  }

  return payload
}

export function getAdminPromotionStatusAction(promotion) {
  if (!promotion) {
    return null
  }

  if (promotion.status === ADMIN_PROMOTION_STATUSES.active) {
    return {
      label: 'Kết thúc',
      nextStatus: ADMIN_PROMOTION_STATUSES.expired,
    }
  }

  if (
    promotion.status === ADMIN_PROMOTION_STATUSES.draft ||
    promotion.status === ADMIN_PROMOTION_STATUSES.paused
  ) {
    return {
      label: 'Kích hoạt',
      nextStatus: ADMIN_PROMOTION_STATUSES.active,
    }
  }

  return null
}
