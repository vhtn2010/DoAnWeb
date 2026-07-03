const TRANSPORT_TYPE_LABELS = Object.freeze({
  bus: 'Xe du lịch cao cấp',
  flight: 'Máy bay khứ hồi',
  train: 'Tàu hoả',
  car: 'Xe cao cấp',
  ship: 'Du thuyền',
  mixed: 'Xe Limousine',
})

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
  if (durationDays >= 1 && durationDays <= 3) {
    return '1-3'
  }

  if (durationDays >= 4 && durationDays <= 7) {
    return '4-7'
  }

  return 'other'
}

function buildDurationText(durationDays, durationNights) {
  return `${durationDays} ngày ${durationNights} đêm`
}

function normalizeDetails(details = {}) {
  return {
    duration_days: details.duration_days ?? 0,
    duration_nights: details.duration_nights ?? 0,
    transport_type: details.transport_type ?? '',
    departure_location: details.departure_location ?? '',
    destination_location: details.destination_location ?? '',
    departure_dates: Array.isArray(details.departure_dates) ? details.departure_dates : [],
    itinerary: Array.isArray(details.itinerary) ? details.itinerary : [],
    included_services: Array.isArray(details.included_services) ? details.included_services : [],
    excluded_services: Array.isArray(details.excluded_services) ? details.excluded_services : [],
    terms: Array.isArray(details.terms) ? details.terms : [],
  }
}

export function normalizeTourService(service) {
  return {
    ...service,
    gallery_images:
      Array.isArray(service.gallery_images) && service.gallery_images.length
        ? service.gallery_images
        : [service.image_url].filter(Boolean),
    review_samples: Array.isArray(service.review_samples) ? service.review_samples : [],
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
      TRANSPORT_TYPE_LABELS[details.transport_type] ?? details.transport_type ?? '',
  }
}
