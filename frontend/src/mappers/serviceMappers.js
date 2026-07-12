const TRANSPORT_TYPE_LABELS = Object.freeze({
  bus: 'Xe du lịch cao cấp',
  flight: 'Máy bay khứ hồi',
  train: 'Tàu hoả',
  car: 'Xe cao cấp',
  ship: 'Du thuyền',
  mixed: 'Xe Limousine',
})

const FALLBACK_SERVICE_IMAGE_URL = '/assets/template/service/list/tour-mien-trung.png'

const DEFAULT_REVIEW_SAMPLES = Object.freeze([
  {
    author_name: 'Net Viet Guest',
    author_initials: 'NV',
    content:
      'Hanh trinh duoc sap xep gon gang, doi ngu ho tro nhiet tinh va trai nghiem tong the rat de chiu.',
    month_label: 'Gan day',
    rating_value: 5,
  },
  {
    author_name: 'Khach hang than thiet',
    author_initials: 'KH',
    content:
      'Lich trinh ro rang, thong tin de theo doi va cac diem dung chan tao cam giac thu thai.',
    month_label: 'Gan day',
    rating_value: 5,
  },
])

const TOUR_UI_META_BY_SLUG = Object.freeze({
  'di-san-mien-trung-da-nang-hoi-an-hue': {
    badgeText: 'Di sản nổi bật',
    categoryLabel: 'Văn hoá',
    extraGalleryCount: 6,
    ratingValue: 4.9,
    recommendationLabel: 'ĐÀ NẴNG - 3 NGÀY 2 ĐÊM',
    reviewCount: 96,
    similarCardImageUrl: '/assets/template/service/detail/recommendation-mien-trung.png',
    sortOrder: 2,
    tourType: 'Tour di sản chọn lọc',
  },
  'nghi-duong-vinh-ha-long-du-thuyen-signature': {
    badgeText: 'Bán chạy',
    categoryLabel: 'Nghỉ dưỡng',
    extraGalleryCount: 12,
    ratingValue: 4.8,
    recommendationLabel: 'VỊNH HẠ LONG - 2 NGÀY 1 ĐÊM',
    reviewCount: 128,
    similarCardImageUrl: '/assets/template/service/detail/ha-long-gallery-main.png',
    sortOrder: 4,
    tourType: 'Tour ghép cao cấp',
  },
  'da-lat-mong-mo-nghi-duong-lang-phap': {
    badgeText: 'Ưu tuyển',
    categoryLabel: 'Nghỉ dưỡng',
    extraGalleryCount: 8,
    ratingValue: 4.9,
    recommendationLabel: 'ĐÀ LẠT - 4 NGÀY 3 ĐÊM',
    reviewCount: 110,
    similarCardImageUrl: '/assets/template/service/detail/recommendation-da-lat.png',
    sortOrder: 1,
    tourType: 'Nghỉ dưỡng biệt thự',
  },
  'mien-tay-song-nuoc-cho-noi-dich-thuc': {
    badgeText: 'Đậm bản sắc',
    categoryLabel: 'Khám phá',
    extraGalleryCount: 4,
    ratingValue: 4.8,
    recommendationLabel: 'CẦN THƠ - 2 NGÀY 1 ĐÊM',
    reviewCount: 52,
    similarCardImageUrl: '/assets/template/service/detail/recommendation-mien-tay.png',
    sortOrder: 3,
    tourType: 'Tour trải nghiệm bản địa',
  },
})

function getDurationGroup(durationDays) {
  if (!Number.isFinite(durationDays) || durationDays <= 0) {
    return ''
  }

  if (durationDays >= 1 && durationDays <= 3) {
    return '1-3'
  }

  if (durationDays >= 4 && durationDays <= 7) {
    return '4-7'
  }

  return 'other'
}

function buildDurationText(durationDays, durationNights) {
  if (
    !Number.isFinite(durationDays) ||
    durationDays <= 0 ||
    !Number.isFinite(durationNights) ||
    durationNights < 0
  ) {
    return 'Dang cap nhat'
  }

  return `${durationDays} ngày ${durationNights} đêm`
}

function splitTextList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
  }

  if (typeof value !== 'string') {
    return []
  }

  const normalizedValue = value.replace(/\r/g, '').trim()

  if (!normalizedValue) {
    return []
  }

  const separatedValues = normalizedValue
    .split(/\n+|•\s*|●\s*|▪\s*|◦\s*|;\s*/g)
    .map((item) => item.trim())
    .filter(Boolean)

  if (separatedValues.length > 1) {
    return separatedValues
  }

  return normalizedValue
    .split(/\s*,\s*/g)
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatDepartureDate(value) {
  if (typeof value !== 'string') {
    return ''
  }

  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return ''
  }

  const isoDateMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (isoDateMatch) {
    return `${isoDateMatch[3]}/${isoDateMatch[2]}/${isoDateMatch[1]}`
  }

  const parsedDate = new Date(normalizedValue)

  if (Number.isNaN(parsedDate.getTime())) {
    return normalizedValue
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsedDate)
}

function normalizeDepartureDates(details = {}) {
  if (Array.isArray(details.departure_dates) && details.departure_dates.length) {
    return details.departure_dates
      .map((value) => String(value ?? '').trim())
      .filter(Boolean)
  }

  if (!Array.isArray(details.departure_schedule)) {
    return []
  }

  const seenDates = new Set()

  return details.departure_schedule
    .map((scheduleItem) =>
      formatDepartureDate(scheduleItem?.date ?? scheduleItem?.departure_at ?? ''),
    )
    .filter((value) => {
      if (!value || seenDates.has(value)) {
        return false
      }

      seenDates.add(value)
      return true
    })
}

function normalizeItinerary(itinerary = []) {
  if (!Array.isArray(itinerary)) {
    return []
  }

  return itinerary.map((day, index) => {
    if (typeof day === 'string') {
      const summary = day.trim()

      return {
        day_number: index + 1,
        highlights: summary ? [summary] : [],
        summary,
        title: `Ngay ${index + 1}`,
      }
    }

    const dayNumber = Number(day?.day_number ?? day?.day ?? index + 1)
    const highlights = Array.isArray(day?.highlights)
      ? splitTextList(day.highlights)
      : Array.isArray(day?.activities)
        ? splitTextList(day.activities)
        : splitTextList(day?.highlights ?? '')
    const summary =
      day?.summary ??
      day?.description ??
      (highlights.length ? highlights.join('. ') : '')

    return {
      day_number: Number.isFinite(dayNumber) && dayNumber > 0 ? dayNumber : index + 1,
      highlights,
      summary,
      title: day?.title ?? `Ngay ${index + 1}`,
    }
  })
}

function toOptionalNumber(value) {
  if (value == null || value === '') {
    return null
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

function normalizeDetails(details = {}) {
  const durationDays = Number(details.duration_days)
  const durationNights = Number(details.duration_nights)
  const departureSchedule = Array.isArray(details.departure_schedule)
    ? details.departure_schedule
    : []
  const itinerary = normalizeItinerary(details.itinerary)

  return {
    duration_days: Number.isFinite(durationDays) ? durationDays : 0,
    duration_nights: Number.isFinite(durationNights) ? durationNights : 0,
    transport_type: details.transport_type ?? '',
    departure_location: details.departure_location ?? '',
    destination_location: details.destination_location ?? '',
    departure_dates: normalizeDepartureDates(details),
    departure_schedule: departureSchedule,
    itinerary: itinerary.length
      ? itinerary
      : normalizeItinerary(departureSchedule.map((item) => ({
          title: item?.title ?? item?.label ?? item?.date ?? item?.departure_at,
          summary: item?.description ?? item?.note ?? item?.route ?? '',
          highlights: item?.highlights ?? item?.activities ?? [],
        }))),
    included_services: splitTextList(details.included_services),
    excluded_services: splitTextList(details.excluded_services),
    terms: splitTextList(details.terms),
  }
}

export function normalizeTourService(service) {
  const basePrice = toOptionalNumber(service.base_price)
  const salePrice = toOptionalNumber(service.sale_price)
  const publicPrice = toOptionalNumber(service.public_price)
  const imageUrl = service.image_url ?? service.primary_image ?? FALLBACK_SERVICE_IMAGE_URL
  const resolvedBasePrice = basePrice != null
    ? basePrice
    : salePrice != null
      ? salePrice
      : publicPrice != null
        ? publicPrice
        : 0
  const resolvedSalePrice = salePrice != null
    ? salePrice
    : publicPrice != null
      ? publicPrice
      : resolvedBasePrice
  const hasSalePrice =
    Boolean(service.has_sale_price) ||
    (basePrice != null && salePrice != null && salePrice < basePrice)
  const normalizedReviewSamples =
    Array.isArray(service.review_samples) && service.review_samples.length
      ? service.review_samples
      : DEFAULT_REVIEW_SAMPLES

  return {
    ...service,
    base_price: resolvedBasePrice,
    has_sale_price: hasSalePrice,
    image_url: imageUrl,
    gallery_images:
      Array.isArray(service.gallery_images) && service.gallery_images.length
        ? service.gallery_images
        : [imageUrl].filter(Boolean),
    review_samples: normalizedReviewSamples,
    sale_price: resolvedSalePrice,
    details: normalizeDetails(service.details),
  }
}

export function mapTourServiceToView(service, { detailPath } = {}) {
  const normalizedService = normalizeTourService(service)
  const details = normalizedService.details
  const uiMeta = TOUR_UI_META_BY_SLUG[normalizedService.slug] ?? {}
  const ratingValue = uiMeta.ratingValue ?? 4.8
  const reviewCount = uiMeta.reviewCount ?? normalizedService.review_samples.length

  return {
    ...normalizedService,
    badge_text: uiMeta.badgeText ?? '',
    category_label: uiMeta.categoryLabel ?? '',
    detail_path: detailPath ?? `/services/${normalizedService.slug}`,
    duration_group: getDurationGroup(details.duration_days),
    duration_text: buildDurationText(details.duration_days, details.duration_nights),
    extra_gallery_count: uiMeta.extraGalleryCount ?? 0,
    rating_text: `${ratingValue.toFixed(1)} Đánh giá`,
    rating_value: ratingValue,
    recommendation_label: uiMeta.recommendationLabel ?? '',
    review_count: reviewCount,
    similar_card_image_url: uiMeta.similarCardImageUrl ?? normalizedService.image_url,
    sort_order: uiMeta.sortOrder ?? 999,
    tour_type: uiMeta.tourType ?? normalizedService.provider_name,
    transport_text:
      TRANSPORT_TYPE_LABELS[details.transport_type] || details.transport_type || 'Dang cap nhat',
  }
}
