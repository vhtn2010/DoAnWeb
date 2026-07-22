import { mapTourServiceToView } from './serviceMappers.js'

const DEFAULT_REVIEW_SAMPLES = Object.freeze([
  {
    author_name: 'Net Viet Guest',
    author_initials: 'NV',
    content:
      'Trải nghiệm được điều phối gọn gàng, đội ngũ hỗ trợ rõ ràng và toàn bộ hành trình mang lại cảm giác dễ chịu.',
    month_label: 'Gần đây',
    rating_value: 5,
  },
  {
    author_name: 'Khách hàng thân thiết',
    author_initials: 'KH',
    content:
      'Thông tin minh bạch, hạng mục rõ ràng và cách tư vấn khiến việc chọn dịch vụ trở nên nhẹ đầu hơn nhiều.',
    month_label: 'Gần đây',
    rating_value: 5,
  },
])

const FALLBACK_SERVICE_IMAGE_URL = '/assets/template/service/list/tour-mien-trung.png'

function toOptionalNumber(value) {
  if (value == null || value === '') {
    return null
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

function normalizeComboItems(items = []) {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => ({
      day_number: index + 1,
      description: item.description ?? item.short_description ?? '',
      location_text: item.location_text ?? '',
      quantity: Number(item.quantity) || 1,
      service_type: item.service_type ?? '',
      short_description: item.short_description ?? '',
      slug: item.slug ?? '',
      title: item.title ?? `Hạng mục ${index + 1}`,
    }))
}

function mapComboServiceToView(service, { detailPath } = {}) {
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
  const comboItems = normalizeComboItems(service.details?.combo_items)
  const reviewSamples =
    Array.isArray(service.review_samples) && service.review_samples.length
      ? service.review_samples
      : DEFAULT_REVIEW_SAMPLES

  return {
    ...service,
    base_price: resolvedBasePrice,
    badge_text: 'Combo nổi bật',
    category_label: 'Combo',
    detail_path: detailPath ?? `/services/${service.slug}`,
    duration_group: 'other',
    duration_text: comboItems.length ? `${comboItems.length} hạng mục` : 'Combo linh hoạt',
    extra_gallery_count: 0,
    gallery_images:
      Array.isArray(service.gallery_images) && service.gallery_images.length
        ? service.gallery_images
        : [imageUrl].filter(Boolean),
    has_sale_price:
      Boolean(service.has_sale_price) ||
      (basePrice != null && salePrice != null && salePrice < basePrice),
    image_url: imageUrl,
    is_combo_service: true,
    location_text: service.location_text ?? 'Đang cập nhật',
    rating_text: '4.8 Đánh giá',
    rating_value: 4.8,
    recommendation_label: 'COMBO ĐẶC BIỆT',
    review_count: reviewSamples.length,
    review_samples: reviewSamples,
    sale_price: resolvedSalePrice,
    similar_card_image_url: imageUrl,
    sort_order: 999,
    tour_type: 'Combo du lịch chọn lọc',
    transport_text: 'Theo từng hạng mục',
    details: {
      combo_items: comboItems,
      departure_dates: [],
      departure_location: '',
      departure_schedule: [],
      destination_location: service.location_text ?? '',
      duration_days: 1,
      duration_nights: 0,
      excluded_services: [
        'Chi phí phát sinh ngoài từng hạng mục trong combo.',
      ],
      included_services: comboItems.length
        ? comboItems.map((item) =>
            item.quantity > 1 ? `${item.title} x${item.quantity}` : item.title,
          )
        : ['Các hạng mục trong combo sẽ được xác nhận khi tư vấn.'],
      itinerary: comboItems.length
        ? comboItems.map((item, index) => ({
            day_number: index + 1,
            highlights: [item.location_text || item.short_description || item.title],
            summary:
              item.short_description ||
              item.description ||
              'Hạng mục thành phần trong combo được sắp xếp linh hoạt theo nhu cầu.',
            title: item.title,
          }))
        : [
            {
              day_number: 1,
              highlights: ['Combo được xác nhận theo từng hạng mục dịch vụ.'],
              summary: 'Đội ngũ tư vấn sẽ xác nhận các hạng mục thành phần sau khi tiếp nhận yêu cầu.',
              title: service.title ?? 'Combo du lịch',
            },
          ],
      max_group_size: null,
      terms: [
        'Combo hiện được tư vấn và xác nhận theo từng hạng mục dịch vụ.',
        'Thời gian sử dụng và điều kiện áp dụng sẽ được đội ngũ hỗ trợ gửi lại sau khi tiếp nhận yêu cầu.',
      ],
      transport_type: 'mixed',
    },
  }
}

export function mapPublicServiceToView(service, options = {}) {
  if (service?.service_type === 'combo') {
    return mapComboServiceToView(service, options)
  }

  return mapTourServiceToView(service, options)
}
