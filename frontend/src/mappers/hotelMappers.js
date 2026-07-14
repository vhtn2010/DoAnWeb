const VINPEARL_HA_LONG_SLUG = 'vinpearl-resort-spa-ha-long'

function resolveGallery(gallery = [], fallbackImage = '') {
  if (Array.isArray(gallery) && gallery.length > 0) {
    return gallery
  }

  return fallbackImage ? [fallbackImage] : []
}

function resolveAmenities(amenities = []) {
  return Array.isArray(amenities) ? amenities : []
}

function resolvePolicies(policies = []) {
  return Array.isArray(policies) ? policies : []
}

function resolveReviewBreakdown(reviewBreakdown = {}) {
  return {
    cleanliness: Number(reviewBreakdown.cleanliness ?? 0),
    service: Number(reviewBreakdown.service ?? 0),
    location: Number(reviewBreakdown.location ?? 0),
    comfort: Number(reviewBreakdown.comfort ?? 0),
  }
}

function formatCompactReviewCount(reviewCount = 0) {
  const numericCount = Number(reviewCount ?? 0)

  if (numericCount >= 1000) {
    return `${(numericCount / 1000).toFixed(1).replace('.0', '')}k`
  }

  return String(numericCount)
}

function buildInitials(name = '') {
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function resolveReviewItems(reviewItems = []) {
  const fallbackItems = [
    {
      id: 'review-an-nguyen',
      name: 'An Nguyen',
      stayed_text: 'Đã lưu trú - 2 tuần trước',
      rating: 4.8,
      comment: 'Không gian đẹp, nhân viên thân thiện và bữa sáng khá đầy đặn.',
    },
    {
      id: 'review-linh-tran',
      name: 'Linh Tran',
      stayed_text: 'Đã lưu trú - 1 tháng trước',
      rating: 4.9,
      comment: 'View đẹp, phòng sạch sẽ và rất phù hợp cho kỳ nghỉ gia đình.',
    },
  ]

  const sourceItems =
    Array.isArray(reviewItems) && reviewItems.length > 0 ? reviewItems : fallbackItems

  return sourceItems.map((item, index) => ({
    id: item.id ?? `hotel-review-${index + 1}`,
    name: item.name ?? 'Guest',
    initials: item.initials ?? buildInitials(item.name),
    stayed_text: item.stayed_text ?? 'Đã lưu trú gần đây',
    rating: Number(item.rating ?? 0),
    comment: item.comment ?? '',
  }))
}

function applyHotelDetailDisplayOverride(hotel) {
  if (hotel?.slug !== VINPEARL_HA_LONG_SLUG) {
    return hotel
  }

  return {
    ...hotel,
    title: 'Vinpearl Resort & Spa Hạ Long',
    short_description:
      'Khu nghỉ dưỡng ven biển với không gian sang trọng, hồ bơi, spa và nhà hàng hướng vịnh Hạ Long.',
    description:
      'Được lấy cảm hứng từ thiết kế của Nhà hát Opera Rennes tại Pháp, Vinpearl Resort & Spa Hạ Long mang đến trải nghiệm độc đáo trên một hòn đảo riêng biệt với bốn mặt hướng biển và tầm nhìn rộng ra Vịnh Hạ Long.',
    location_text: 'Hạ Long, Quảng Ninh',
    address: 'Đảo Rều, Phường Bãi Cháy, Thành phố Hạ Long, Quảng Ninh',
    sale_price: 1450000,
    review_count: 2400,
    display_review_count: '2.4k',
    display_rating_text: '4.8 / 5.0',
    gallery: [
      '/assets/template/service/detail/ha-long-gallery-main.png?photo=01',
      '/assets/template/service/detail/ha-long-gallery-sunset.png?photo=02',
      '/assets/template/service/detail/ha-long-gallery-dinner.png?photo=03',
      '/assets/template/service/detail/ha-long-gallery-deck.png?photo=04',
      '/assets/template/service/detail/ha-long-gallery-cabin.png?photo=05',
      '/assets/template/service/detail/ha-long-gallery-main.png?photo=06',
      '/assets/template/service/detail/ha-long-gallery-sunset.png?photo=07',
      '/assets/template/service/detail/ha-long-gallery-dinner.png?photo=08',
      '/assets/template/service/detail/ha-long-gallery-deck.png?photo=09',
      '/assets/template/service/detail/ha-long-gallery-cabin.png?photo=10',
      '/assets/template/service/detail/ha-long-gallery-main.png?photo=11',
      '/assets/template/service/detail/ha-long-gallery-sunset.png?photo=12',
      '/assets/template/service/detail/ha-long-gallery-dinner.png?photo=13',
      '/assets/template/service/detail/ha-long-gallery-deck.png?photo=14',
      '/assets/template/service/detail/ha-long-gallery-cabin.png?photo=15',
      '/assets/template/service/detail/ha-long-gallery-main.png?photo=16',
      '/assets/template/service/detail/ha-long-gallery-sunset.png?photo=17',
    ],
    amenities: ['Hồ bơi', 'Spa', 'Nhà hàng', 'WiFi miễn phí'],
    details: {
      ...(hotel.details ?? {}),
      star_rating: 5,
      headline: 'Không gian nghỉ dưỡng cao cấp với tầm nhìn thanh bình hướng ra Vịnh Hạ Long.',
      hotel_style: 'Resort & spa retreat',
      highlight_text:
        'Phù hợp cho kỳ nghỉ biển, chuyến đi gia đình và kỳ nghỉ cuối tuần thư giãn.',
      nearby_places: ['Sun World Hạ Long', 'Bãi Cháy', 'Cảng tàu khách quốc tế'],
      review_items: resolveReviewItems([
        {
          id: 'review-an-nguyen',
          name: 'An Nguyen',
          stayed_text: 'Đã lưu trú - 2 tuần trước',
          rating: 4.8,
          comment: 'Khuôn viên đẹp, buffet sáng ngon và phòng nghỉ thoáng đãng.',
        },
        {
          id: 'review-thao-le',
          name: 'Thao Le',
          stayed_text: 'Đã lưu trú - 3 tuần trước',
          rating: 4.9,
          comment: 'Nhân viên chu đáo, hồ bơi sạch và rất phù hợp cho kỳ nghỉ gia đình.',
        },
        {
          id: 'review-minh-pham',
          name: 'Minh Pham',
          stayed_text: 'Đã lưu trú - 1 tháng trước',
          rating: 4.7,
          comment: 'View biển đẹp, spa thư giãn và vị trí di chuyển thuận tiện.',
        },
      ]),
      room_note: 'Một số hạng phòng có thể kê thêm giường phụ cho trẻ em.',
    },
  }
}

function applyHotelRoomDisplayOverrides(rooms = [], hotelSlug = '') {
  if (hotelSlug !== VINPEARL_HA_LONG_SLUG) {
    return rooms
  }

  const overriddenRooms = rooms.map((room) => {
    if (room.id === 'room-hl-premium-bay') {
      return {
        ...room,
        title: 'Deluxe Hướng Biển',
        short_description: 'Phòng hướng biển với tầm nhìn mở ra khu vực Bãi Cháy.',
        sale_price: 1450000,
        base_price: 1650000,
        bed_type: '1 giường đôi lớn',
        room_size: '40m2',
        image_url: '/assets/template/service/detail/ha-long-gallery-cabin.png',
        display_badge: 'Phổ biến',
        display_guest_label: '2 Người lớn',
        display_secondary_meta: '40m2',
        display_price_text: '$145',
        display_price_suffix: 'mỗi đêm',
        options: {
          ...(room.options ?? {}),
          badge: 'Phổ biến',
        },
      }
    }

    if (room.id === 'room-hl-executive-family') {
      return {
        ...room,
        title: 'Executive Suite',
        short_description: 'Suite rong rai voi tam nhin tron vinh Ha Long.',
        sale_price: 2800000,
        base_price: 3200000,
        max_guests: 3,
        bed_type: '1 giường king',
        room_size: '76m2',
        image_url: '/assets/template/home/v39_1693.png',
        display_guest_label: '3 Người lớn',
        display_secondary_meta: '76m2',
        display_price_text: '$280',
        display_price_suffix: 'mỗi đêm',
        options: {
          ...(room.options ?? {}),
          badge: '',
        },
      }
    }

    return room
  })

  return [
    ...overriddenRooms,
    {
      id: 'room-hl-presidential-villa',
      service_code: 'ROOM-HL-003',
      service_type: overriddenRooms[0]?.service_type,
      hotel_service_id: overriddenRooms[0]?.hotel_service_id,
      title: 'Biệt thự Tổng thống',
      slug: 'presidential-lagoon-villa',
      short_description: 'Biệt thự cao cấp có hồ bơi riêng và khu tiếp khách sang trọng.',
      description:
        'Không gian nghỉ dưỡng biệt lập với sân tắm nắng, phòng khách lớn và tầm nhìn rộng ra mặt nước.',
      base_price: 9200000,
      sale_price: 8500000,
      currency: overriddenRooms[0]?.currency,
      status: overriddenRooms[0]?.status,
      image_url: '/assets/template/home/v39_1669.png',
      gallery: [
        '/assets/template/home/v39_1669.png',
        '/assets/template/service/detail/ha-long-gallery-sunset.png',
        '/assets/template/home/v39_1693.png',
      ],
      max_guests: 6,
      bed_type: '2 giường king',
      room_size: '160m2',
      amenities: ['Hồ bơi riêng', 'Quản gia riêng', 'Bữa sáng tại phòng', 'Dịch vụ đưa đón'],
      available_quantity: 2,
      display_guest_label: '6 Người lớn',
      display_secondary_meta: 'Hồ bơi riêng',
      display_price_text: '$850',
      display_price_suffix: 'mỗi đêm',
      options: {
        view: 'Đầm nước riêng',
        breakfast_included: true,
        cancellation: 'Hỗ trợ đổi lịch theo gói đặt phòng',
        badge: '',
      },
    },
  ]
}

export function mapHotelSummaryToCardView(hotel, { detailPath } = {}) {
  return {
    ...hotel,
    detail_path: detailPath ?? `/hotels/${hotel.slug}`,
    displayRatingValue: Number(hotel.rating ?? hotel.details?.star_rating ?? 0),
    displayAddress: hotel.address ?? hotel.details?.address ?? '',
    gallery: resolveGallery(hotel.gallery, hotel.image_url),
  }
}

export function mapHotelRoomToView(room) {
  return {
    ...room,
    gallery: resolveGallery(room.gallery, room.image_url),
    amenities: resolveAmenities(room.amenities),
    max_guests: Number(room.max_guests ?? 0),
    available_quantity: Number(room.available_quantity ?? 0),
    room_size: room.room_size ?? '',
    bed_type: room.bed_type ?? '',
    options: {
      ...(room.options ?? {}),
    },
  }
}

export function mapHotelDetailResponseToView(responseData, { detailPathPrefix = '/hotels' } = {}) {
  const hotel = responseData?.hotel

  if (!hotel) {
    return {
      hotel: null,
      rooms: [],
      relatedHotels: [],
    }
  }

  const mappedHotel = applyHotelDetailDisplayOverride({
    ...hotel,
    detail_path: `${detailPathPrefix}/${hotel.slug}`,
    gallery: resolveGallery(hotel.gallery, hotel.image_url),
    amenities: resolveAmenities(hotel.amenities),
    policies: resolvePolicies(hotel.policies),
    rating: Number(hotel.rating ?? 0),
    review_count: Number(hotel.review_count ?? 0),
    display_review_count: formatCompactReviewCount(hotel.review_count),
    display_rating_text: `${Number(hotel.rating ?? 0).toFixed(1)} / 5.0`,
    checkin_time: hotel.checkin_time ?? '',
    checkout_time: hotel.checkout_time ?? '',
    details: {
      ...(hotel.details ?? {}),
      star_rating: Number(hotel.details?.star_rating ?? hotel.rating ?? 0),
      nearby_places: Array.isArray(hotel.details?.nearby_places)
        ? hotel.details.nearby_places
        : [],
      review_breakdown: resolveReviewBreakdown(hotel.details?.review_breakdown),
      review_items: resolveReviewItems(hotel.details?.review_items),
    },
  })

  return {
    hotel: mappedHotel,
    rooms: Array.isArray(responseData.rooms)
      ? applyHotelRoomDisplayOverrides(
          responseData.rooms.map(mapHotelRoomToView),
          mappedHotel.slug,
        )
      : [],
    relatedHotels: Array.isArray(responseData.related_hotels)
      ? responseData.related_hotels.map((relatedHotel) =>
          mapHotelSummaryToCardView(relatedHotel, {
            detailPath: `${detailPathPrefix}/${relatedHotel.slug}`,
          }),
        )
      : [],
  }
}
