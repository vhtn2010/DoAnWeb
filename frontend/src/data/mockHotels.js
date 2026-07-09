const hotelRatingsById = {
  'hotel-da-nang-golden-lotus': 4.9,
  'hotel-ha-long-watson-premium': 4.8,
  'hotel-da-lat-la-cle': 4.9,
  'hotel-my-tho-central-plaza': 4.8,
  'hotel-ho-chi-minh-saigon-reverie': 4.9,
  'hotel-sa-pa-summit-retreat': 4.8,
  'hotel-ho-tram-pearl-oceanfront': 4.9,
  'hotel-hue-imperial-riverside': 4.8,
  'hotel-can-tho-legacy-riverside': 4.7,
}

const hotelDurationGroupsById = {
  'hotel-da-nang-golden-lotus': '1-3',
  'hotel-ha-long-watson-premium': '1-3',
  'hotel-da-lat-la-cle': '4-7',
  'hotel-my-tho-central-plaza': '1-3',
  'hotel-ho-chi-minh-saigon-reverie': 'other',
  'hotel-sa-pa-summit-retreat': '4-7',
  'hotel-ho-tram-pearl-oceanfront': '1-3',
  'hotel-hue-imperial-riverside': '1-3',
  'hotel-can-tho-legacy-riverside': '4-7',
}

export const mockHotelServices = [
  {
    id: 'hotel-da-nang-golden-lotus',
    service_code: 'HOTEL-DN-001',
    service_type: 'hotel',
    title: 'Golden Lotus Grand Da Nang - Panoramic Rooftop Bar & Daily',
    slug: 'golden-lotus-grand-da-nang',
    short_description:
      'Khách sạn trung tâm Đà Nẵng với rooftop bar toàn cảnh, buffet sáng và hồ bơi thư giãn.',
    description:
      'Không gian lưu trú hiện đại gần biển Mỹ Khê, phù hợp cho kỳ nghỉ city break hoặc công tác ngắn ngày tại Đà Nẵng.',
    provider_name: 'Net Viet Hospitality',
    location_text: 'Đà Nẵng, Việt Nam',
    base_price: 2900000,
    sale_price: 2300000,
    currency: 'VND',
    status: 'active',
    image_url: '/assets/template/service/list/tour-mien-trung.png',
    cancellation_policy: 'Miễn phí hủy phòng trước 48 giờ nhận phòng.',
    details: {
      star_rating: 5,
      address: '86 đường Lê Quang Đạo, Đà Nẵng, Việt Nam',
      checkin_time: '14:00',
      checkout_time: '12:00',
      amenities: ['Rooftop bar', 'Hồ bơi', 'Buffet sáng', 'Xe đưa đón sân bay'],
      hotel_policy: 'Không hút thuốc trong phòng. Có thể phụ thu cuối tuần và lễ.',
    },
    room_types: [
      {
        id: 'room-dn-grand-deluxe',
        hotel_service_id: 'hotel-da-nang-golden-lotus',
        name: 'Grand Deluxe City View',
        bed_type: '1 giường đôi lớn',
        max_adults: 2,
        max_children: 1,
        total_rooms: 28,
        available_rooms: 9,
        base_price: 2300000,
        description: 'Phòng rộng rãi với cửa sổ lớn, bàn làm việc và minibar.',
        status: 'active',
      },
    ],
  },
  {
    id: 'hotel-ha-long-watson-premium',
    service_code: 'HOTEL-HL-002',
    service_type: 'hotel',
    title: 'The Watson Premium HaLong Hotel',
    slug: 'the-watson-premium-halong-hotel',
    short_description:
      'Khách sạn hướng vịnh Hạ Long với thiết kế sang trọng, hồ bơi trong nhà và nhà hàng hải sản.',
    description:
      'Lựa chọn nổi bật cho kỳ nghỉ ngắm vịnh với vị trí gần khu Bãi Cháy và các dịch vụ chăm sóc cao cấp.',
    provider_name: 'Watson Premium Hospitality',
    location_text: 'Hạ Long, Quảng Ninh',
    base_price: 2500000,
    sale_price: 1900000,
    currency: 'VND',
    status: 'active',
    image_url: '/assets/template/service/detail/ha-long-gallery-main.png',
    cancellation_policy: 'Hỗ trợ đổi ngày trước 72 giờ nhận phòng.',
    details: {
      star_rating: 5,
      address:
        'Lô 9 đường Hoàng Quốc Việt, Khu du lịch và đô thị mới Hùng Thắng, Bãi Cháy, Hạ Long, Việt Nam',
      checkin_time: '14:00',
      checkout_time: '12:00',
      amenities: ['Hồ bơi trong nhà', 'Phòng gym', 'Spa', 'Nhà hàng buffet'],
      hotel_policy: 'Nhận phòng sớm theo tình trạng phòng thực tế.',
    },
    room_types: [
      {
        id: 'room-hl-premium-bay',
        hotel_service_id: 'hotel-ha-long-watson-premium',
        name: 'Premium Bay View',
        bed_type: '2 giường đơn',
        max_adults: 2,
        max_children: 1,
        total_rooms: 34,
        available_rooms: 14,
        base_price: 1900000,
        description: 'Phòng hướng vịnh với ban công nhỏ và khu tiếp khách mini.',
        status: 'active',
      },
    ],
  },
  {
    id: 'hotel-da-lat-la-cle',
    service_code: 'HOTEL-DL-003',
    service_type: 'hotel',
    title: "La Cle' Đà Lạt",
    slug: 'la-cle-da-lat',
    short_description:
      'Không gian boutique giữa Đà Lạt thơ mộng, gần hồ Xuân Hương và các quán cà phê đặc trưng.',
    description:
      'Khách sạn phong cách châu Âu nhẹ nhàng, nổi bật với khu vườn hoa nhỏ và bữa sáng phục vụ tại phòng theo yêu cầu.',
    provider_name: 'La Cle Boutique',
    location_text: 'Đà Lạt, Lâm Đồng',
    base_price: 2750000,
    sale_price: 2150000,
    currency: 'VND',
    status: 'active',
    image_url: '/assets/template/service/list/tour-da-lat.png',
    cancellation_policy: 'Miễn phí hủy trước 5 ngày đối với đặt phòng tiêu chuẩn.',
    details: {
      star_rating: 4,
      address: '3/9 đường 3 Tháng 4, Đà Lạt, Việt Nam',
      checkin_time: '14:00',
      checkout_time: '12:00',
      amenities: ['Vườn hoa', 'Tiệc trà chiều', 'Lò sưởi lounge', 'Đưa đón trung tâm'],
      hotel_policy: 'Phụ thu trẻ em từ 6 tuổi nếu dùng giường sẵn có.',
    },
    room_types: [
      {
        id: 'room-dl-garden-suite',
        hotel_service_id: 'hotel-da-lat-la-cle',
        name: 'Garden Suite',
        bed_type: '1 giường queen',
        max_adults: 2,
        max_children: 1,
        total_rooms: 16,
        available_rooms: 5,
        base_price: 2150000,
        description: 'Phòng suite nhìn ra vườn với nội thất gỗ và bồn tắm đứng.',
        status: 'active',
      },
    ],
  },
  {
    id: 'hotel-my-tho-central-plaza',
    service_code: 'HOTEL-MT-004',
    service_type: 'hotel',
    title: 'CENTRAL PLAZA HOTEL - Mỹ Tho',
    slug: 'central-plaza-hotel-my-tho',
    short_description:
      'Khách sạn trung tâm thành phố Mỹ Tho, thuận tiện tham quan chợ đêm và bến tàu du lịch.',
    description:
      'Điểm lưu trú phù hợp cho kỳ nghỉ ngắn ngày miền Tây với phòng nghỉ rộng, bãi đỗ xe và nhà hàng nội khu.',
    provider_name: 'Central Plaza Group',
    location_text: 'Mỹ Tho, Tiền Giang',
    base_price: 2050000,
    sale_price: 1450000,
    currency: 'VND',
    status: 'active',
    image_url: '/assets/template/home/v1_137.png',
    cancellation_policy: 'Có thể hủy miễn phí trước 24 giờ nhận phòng.',
    details: {
      star_rating: 4,
      address: '15 đường 30 Tháng 4, Phường 1, Mỹ Tho, Tiền Giang, Việt Nam',
      checkin_time: '14:00',
      checkout_time: '12:00',
      amenities: ['Nhà hàng', 'Bãi đỗ xe', 'Phòng họp', 'Wifi tốc độ cao'],
      hotel_policy: 'Phụ thu nhận phòng sau 22:00 nếu không báo trước.',
    },
    room_types: [
      {
        id: 'room-mt-superior-city',
        hotel_service_id: 'hotel-my-tho-central-plaza',
        name: 'Superior City View',
        bed_type: '1 giường đôi',
        max_adults: 2,
        max_children: 1,
        total_rooms: 22,
        available_rooms: 7,
        base_price: 1450000,
        description: 'Phòng tiêu chuẩn đầy đủ tiện nghi với cửa sổ nhìn ra thành phố.',
        status: 'active',
      },
    ],
  },
  {
    id: 'hotel-ho-chi-minh-saigon-reverie',
    service_code: 'HOTEL-SGN-005',
    service_type: 'hotel',
    title: 'Saigon Reverie Boutique Hotel',
    slug: 'saigon-reverie-boutique-hotel',
    short_description:
      'Boutique hotel sang trọng tại Quận 1, thuận tiện cho chuyến đi thành phố và nghỉ dưỡng cuối tuần.',
    description:
      'Nằm gần phố đi bộ Nguyễn Huệ, khách sạn mang đến trải nghiệm lưu trú tinh gọn với lounge riêng và dịch vụ concierge.',
    provider_name: 'Saigon Reverie Collection',
    location_text: 'TP. Hồ Chí Minh, Việt Nam',
    base_price: 4100000,
    sale_price: 3250000,
    currency: 'VND',
    status: 'active',
    image_url: '/assets/template/home/v39_1669.png',
    cancellation_policy: 'Đổi lịch trước 72 giờ, hủy miễn phí trước 48 giờ.',
    details: {
      star_rating: 5,
      address: '18 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh, Việt Nam',
      checkin_time: '15:00',
      checkout_time: '12:00',
      amenities: ['Concierge', 'Lounge riêng', 'Bữa sáng chọn món', 'Xe điện trung tâm'],
      hotel_policy: 'Có phụ thu thêm người lớn thứ 3 theo từng loại phòng.',
    },
    room_types: [
      {
        id: 'room-sgn-river-suite',
        hotel_service_id: 'hotel-ho-chi-minh-saigon-reverie',
        name: 'River View Signature Suite',
        bed_type: '1 giường king',
        max_adults: 2,
        max_children: 2,
        total_rooms: 12,
        available_rooms: 4,
        base_price: 3250000,
        description: 'Phòng suite cao tầng nhìn ra sông Sài Gòn với khu tiếp khách tách biệt.',
        status: 'active',
      },
    ],
  },
  {
    id: 'hotel-sa-pa-summit-retreat',
    service_code: 'HOTEL-SP-006',
    service_type: 'hotel',
    title: 'Sapa Summit Retreat Hotel',
    slug: 'sapa-summit-retreat-hotel',
    short_description:
      'Khách sạn nghỉ dưỡng giữa núi non Tây Bắc, phù hợp săn mây và nghỉ cuối tuần tại Sa Pa.',
    description:
      'Không gian ấm cúng với phòng kính ngắm thung lũng, trà thảo mộc bản địa và shuttle tới trung tâm thị trấn.',
    provider_name: 'Summit Retreat',
    location_text: 'Sa Pa, Lào Cai',
    base_price: 3600000,
    sale_price: 2850000,
    currency: 'VND',
    status: 'active',
    image_url: '/assets/template/service/list/hero-terrace.png',
    cancellation_policy: 'Hoàn hủy miễn phí trước 4 ngày nhận phòng.',
    details: {
      star_rating: 4,
      address: 'Bản Cát Cát, Sa Pa, Lào Cai, Việt Nam',
      checkin_time: '14:00',
      checkout_time: '12:00',
      amenities: ['Shuttle trung tâm', 'Trà chiều', 'Ban công ngắm núi', 'Spa thảo dược'],
      hotel_policy: 'Nên đặt trước dịch vụ xe đón do đường đèo và thời tiết biến động.',
    },
    room_types: [
      {
        id: 'room-sp-mountain-view',
        hotel_service_id: 'hotel-sa-pa-summit-retreat',
        name: 'Mountain View Retreat',
        bed_type: '1 giường king',
        max_adults: 2,
        max_children: 1,
        total_rooms: 18,
        available_rooms: 6,
        base_price: 2850000,
        description: 'Phòng hướng núi có ban công và khu trà riêng.',
        status: 'active',
      },
    ],
  },
  {
    id: 'hotel-ho-tram-pearl-oceanfront',
    service_code: 'HOTEL-HT-007',
    service_type: 'hotel',
    title: 'Ho Tram Pearl Oceanfront Hotel',
    slug: 'ho-tram-pearl-oceanfront-hotel',
    short_description:
      'Resort-style hotel sát biển Hồ Tràm với hồ bơi vô cực và không gian nghỉ dưỡng cho gia đình.',
    description:
      'Phù hợp cho kỳ nghỉ biển ngắn ngày với các tiện ích thư giãn, beach club và khu vui chơi trẻ em.',
    provider_name: 'Pearl Oceanfront',
    location_text: 'Hồ Tràm, Bà Rịa - Vũng Tàu',
    base_price: 5200000,
    sale_price: 4380000,
    currency: 'VND',
    status: 'active',
    image_url: '/assets/template/service/detail/ha-long-gallery-sunset.png',
    cancellation_policy: 'Hỗ trợ dời lịch một lần trước 5 ngày.',
    details: {
      star_rating: 5,
      address: 'Ven biển Hồ Tràm, Xuyên Mộc, Bà Rịa - Vũng Tàu, Việt Nam',
      checkin_time: '15:00',
      checkout_time: '12:00',
      amenities: ['Beach club', 'Hồ bơi vô cực', 'Kids club', 'BBQ ngoài trời'],
      hotel_policy: 'Có thể phụ thu cuối tuần và dịp lễ theo chính sách nhà cung cấp.',
    },
    room_types: [
      {
        id: 'room-ht-ocean-balcony',
        hotel_service_id: 'hotel-ho-tram-pearl-oceanfront',
        name: 'Ocean Balcony Deluxe',
        bed_type: '1 giường king',
        max_adults: 2,
        max_children: 2,
        total_rooms: 20,
        available_rooms: 8,
        base_price: 4380000,
        description: 'Phòng hướng biển với ban công rộng và sofa đọc sách.',
        status: 'active',
      },
    ],
  },
  {
    id: 'hotel-hue-imperial-riverside',
    service_code: 'HOTEL-HUE-008',
    service_type: 'hotel',
    title: 'Hue Imperial Riverside Hotel',
    slug: 'hue-imperial-riverside-hotel',
    short_description:
      'Khách sạn ven sông Hương với phong cách hoàng cung, gần khu Đại Nội và phố đi bộ Huế.',
    description:
      'Không gian nghỉ dưỡng đậm nét cố đô, phù hợp cho hành trình khám phá văn hóa Huế và ẩm thực địa phương.',
    provider_name: 'Imperial Riverside',
    location_text: 'Huế, Thừa Thiên Huế',
    base_price: 2700000,
    sale_price: 2180000,
    currency: 'VND',
    status: 'active',
    image_url: '/assets/template/service/detail/recommendation-mien-trung.png',
    cancellation_policy: 'Hủy miễn phí trước 72 giờ nhận phòng.',
    details: {
      star_rating: 4,
      address: '12 Lê Lợi, Phú Hội, Huế, Việt Nam',
      checkin_time: '14:00',
      checkout_time: '12:00',
      amenities: ['Nhà hàng cung đình', 'Trà chiều', 'Xe đạp dạo phố', 'Phòng connecting'],
      hotel_policy: 'Bổ sung giấy tờ tùy thân khi nhận phòng theo quy định lưu trú.',
    },
    room_types: [
      {
        id: 'room-hue-riverside-deluxe',
        hotel_service_id: 'hotel-hue-imperial-riverside',
        name: 'Riverside Deluxe',
        bed_type: '2 giường đơn',
        max_adults: 2,
        max_children: 1,
        total_rooms: 24,
        available_rooms: 11,
        base_price: 2180000,
        description: 'Phòng nhìn sông với nội thất gỗ tối màu và bàn trà riêng.',
        status: 'active',
      },
    ],
  },
  {
    id: 'hotel-can-tho-legacy-riverside',
    service_code: 'HOTEL-CT-009',
    service_type: 'hotel',
    title: 'Legacy Mekong Riverside Hotel',
    slug: 'legacy-mekong-riverside-hotel',
    short_description:
      'Khách sạn bên bờ sông Cần Thơ, phù hợp cho kỳ nghỉ miền Tây kết hợp khám phá chợ nổi.',
    description:
      'Điểm lưu trú thanh lịch với sân vườn xanh mát, quầy bar ngắm hoàng hôn và dịch vụ đặt tour sông nước.',
    provider_name: 'Legacy Mekong',
    location_text: 'Cần Thơ, Việt Nam',
    base_price: 3200000,
    sale_price: 2480000,
    currency: 'VND',
    status: 'active',
    image_url: '/assets/template/service/list/tour-mien-tay.png',
    cancellation_policy: 'Miễn phí hủy trước 3 ngày nhận phòng.',
    details: {
      star_rating: 3,
      address: '2 Hai Bà Trưng, Ninh Kiều, Cần Thơ, Việt Nam',
      checkin_time: '14:00',
      checkout_time: '12:00',
      amenities: ['Quầy bar sân thượng', 'Thuê thuyền riêng', 'Buffet sáng', 'Xe đạp miễn phí'],
      hotel_policy: 'Phụ thu thêm khách ngoài tiêu chuẩn tùy loại phòng.',
    },
    room_types: [
      {
        id: 'room-ct-riverside-family',
        hotel_service_id: 'hotel-can-tho-legacy-riverside',
        name: 'Riverside Family Room',
        bed_type: '2 giường đôi',
        max_adults: 4,
        max_children: 2,
        total_rooms: 10,
        available_rooms: 3,
        base_price: 2480000,
        description: 'Phòng gia đình có cửa sổ nhìn sông và bàn ăn nhỏ.',
        status: 'active',
      },
    ],
  },
]

export const hotelSortOptions = [
  { value: 'recommended', label: 'Đề xuất' },
  { value: 'price_asc', label: 'Giá thấp nhất' },
  { value: 'price_desc', label: 'Giá cao nhất' },
  { value: 'rating_desc', label: 'Đánh giá cao' },
]

function normalizeText(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

function matchesPriceRanges(service, selectedPrices) {
  if (!selectedPrices.length) {
    return true
  }

  return selectedPrices.some((priceRange) => {
    if (priceRange === 'under-2m') {
      return service.sale_price < 2000000
    }

    if (priceRange === '2-5m') {
      return service.sale_price >= 2000000 && service.sale_price <= 5000000
    }

    if (priceRange === 'over-5m') {
      return service.sale_price > 5000000
    }

    return false
  })
}

function matchesDurationGroups(service, selectedDurations) {
  if (!selectedDurations.length) {
    return true
  }

  const durationGroup = hotelDurationGroupsById[service.id] ?? 'other'
  return selectedDurations.includes(durationGroup)
}

function matchesStarRatings(service, selectedStars) {
  if (!selectedStars.length) {
    return true
  }

  return selectedStars.includes(String(service.details.star_rating))
}

export function formatCurrencyVND(amount = 0) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/\s/g, '')
}

export function getHotelRatingValue(serviceId) {
  return hotelRatingsById[serviceId] ?? 4.8
}

export function filterHotelServices(
  services,
  {
    searchLocation = '',
    sidebarLocation = '',
    priceRanges = [],
    durations = [],
    starRatings = [],
  } = {},
) {
  const normalizedSearchLocation = normalizeText(searchLocation)
  const normalizedSidebarLocation = normalizeText(sidebarLocation)

  return services.filter((service) => {
    if (service.status !== 'active' || service.service_type !== 'hotel') {
      return false
    }

    const searchableText = normalizeText(
      `${service.title} ${service.location_text} ${service.details.address}`
    )

    const matchesSearchLocation =
      !normalizedSearchLocation || searchableText.includes(normalizedSearchLocation)
    const matchesSidebarLocation =
      !normalizedSidebarLocation || searchableText.includes(normalizedSidebarLocation)

    return (
      matchesSearchLocation &&
      matchesSidebarLocation &&
      matchesPriceRanges(service, priceRanges) &&
      matchesDurationGroups(service, durations) &&
      matchesStarRatings(service, starRatings)
    )
  })
}

export function sortHotelServices(services, sortValue = 'recommended') {
  const nextServices = [...services]

  if (sortValue === 'price_asc') {
    nextServices.sort((first, second) => first.sale_price - second.sale_price)
    return nextServices
  }

  if (sortValue === 'price_desc') {
    nextServices.sort((first, second) => second.sale_price - first.sale_price)
    return nextServices
  }

  if (sortValue === 'rating_desc') {
    nextServices.sort(
      (first, second) => getHotelRatingValue(second.id) - getHotelRatingValue(first.id)
    )
    return nextServices
  }

  return nextServices
}

export function buildHotelSearchParams({
  auth: _auth = '',
  location = '',
  checkin = '',
  checkout = '',
  sidebarLocation = '',
  prices = [],
  durations = [],
  stars = [],
  sort = 'recommended',
  page = 1,
} = {}) {
  const nextSearchParams = new URLSearchParams()

  if (location.trim()) {
    nextSearchParams.set('location', location.trim())
  }

  if (checkin.trim()) {
    nextSearchParams.set('checkin', checkin.trim())
  }

  if (checkout.trim()) {
    nextSearchParams.set('checkout', checkout.trim())
  }

  if (sidebarLocation.trim()) {
    nextSearchParams.set('destination', sidebarLocation.trim())
  }

  if (prices.length) {
    nextSearchParams.set('prices', prices.join(','))
  }

  if (durations.length) {
    nextSearchParams.set('durations', durations.join(','))
  }

  if (stars.length) {
    nextSearchParams.set('stars', stars.join(','))
  }

  if (sort && sort !== 'recommended') {
    nextSearchParams.set('sort', sort)
  }

  if (page > 1) {
    nextSearchParams.set('page', String(page))
  }

  return nextSearchParams
}
