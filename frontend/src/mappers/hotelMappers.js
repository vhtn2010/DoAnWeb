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
      stayed_text: 'Da luu tru - 2 tuan truoc',
      rating: 4.8,
      comment: 'Khong gian dep, nhan vien than thien va bua sang kha day dan.',
    },
    {
      id: 'review-linh-tran',
      name: 'Linh Tran',
      stayed_text: 'Da luu tru - 1 thang truoc',
      rating: 4.9,
      comment: 'View dep, phong sach se va rat phu hop cho ky nghi gia dinh.',
    },
  ]

  const sourceItems =
    Array.isArray(reviewItems) && reviewItems.length > 0 ? reviewItems : fallbackItems

  return sourceItems.map((item, index) => ({
    id: item.id ?? `hotel-review-${index + 1}`,
    name: item.name ?? 'Guest',
    initials: item.initials ?? buildInitials(item.name),
    stayed_text: item.stayed_text ?? 'Da luu tru gan day',
    rating: Number(item.rating ?? 0),
    comment: item.comment ?? '',
  }))
}

function applyHotelDetailDisplayOverride(hotel) {
  if (hotel?.slug !== 'the-watson-premium-halong-hotel') {
    return hotel
  }

  return {
    ...hotel,
    title: 'Vinpearl Resort & Spa Ha Long',
    short_description:
      'Khu nghi duong ven bien voi khong gian sang trong, ho boi, spa va nha hang huong vinh Ha Long.',
    description:
      'Vinpearl Resort & Spa Ha Long mang den trai nghiem nghi duong cao cap voi phong nghi huong bien, khu spa thu gian, nha hang phong cach hien dai va khong gian phu hop cho ky nghi gia dinh hoac cap doi.',
    location_text: 'Ha Long, Quang Ninh',
    address: 'Dao Reu, Phuong Bai Chay, Thanh pho Ha Long, Quang Ninh',
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
    amenities: ['Ho boi', 'Spa', 'Nha hang', 'WiFi mien phi'],
    details: {
      ...(hotel.details ?? {}),
      star_rating: 5,
      headline: 'Khong gian nghi duong cao cap voi tam nhin thanh binh huong ra Ha Long.',
      hotel_style: 'Resort & spa retreat',
      highlight_text:
        'Phu hop cho ky nghi bien, chuyen di gia dinh va ky nghi cuoi tuan thu gian.',
      nearby_places: ['Sun World Ha Long', 'Bai Chay', 'Cang tau khach quoc te'],
      review_items: resolveReviewItems([
        {
          id: 'review-an-nguyen',
          name: 'An Nguyen',
          stayed_text: 'Da luu tru - 2 tuan truoc',
          rating: 4.8,
          comment: 'Khuon vien dep, buffet sang ngon va phong nghi thong thoang.',
        },
        {
          id: 'review-thao-le',
          name: 'Thao Le',
          stayed_text: 'Da luu tru - 3 tuan truoc',
          rating: 4.9,
          comment: 'Nhan vien chu dao, be boi sach va rat phu hop cho ky nghi gia dinh.',
        },
        {
          id: 'review-minh-pham',
          name: 'Minh Pham',
          stayed_text: 'Da luu tru - 1 thang truoc',
          rating: 4.7,
          comment: 'View bien dep, spa thu gian va vi tri di chuyen thuan tien.',
        },
      ]),
      room_note: 'Mot so hang phong co the ke them giuong phu cho tre em.',
    },
  }
}

function applyHotelRoomDisplayOverrides(rooms = [], hotelSlug = '') {
  if (hotelSlug !== 'the-watson-premium-halong-hotel') {
    return rooms
  }

  const overriddenRooms = rooms.map((room) => {
    if (room.id === 'room-hl-premium-bay') {
      return {
        ...room,
        title: 'Deluxe Ocean View',
        short_description: 'Phong huong bien voi ban cong rong va khu ban tra nho gon.',
        sale_price: 1450000,
        base_price: 1650000,
        bed_type: '1 giuong doi lon',
        room_size: '38m2',
        options: {
          ...(room.options ?? {}),
          badge: 'Pho bien',
        },
      }
    }

    if (room.id === 'room-hl-executive-family') {
      return {
        ...room,
        title: 'Executive Bay Suite',
        short_description: 'Suite rong rai voi phong khach nho va tam nhin tron vinh.',
        sale_price: 2800000,
        base_price: 3200000,
        max_guests: 3,
        bed_type: '1 giuong king',
        room_size: '58m2',
        options: {
          ...(room.options ?? {}),
          badge: 'View dep',
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
      title: 'Presidential Lagoon Villa',
      slug: 'presidential-lagoon-villa',
      short_description: 'Biet thu cao cap co ho boi rieng va khu tiep khach sang trong.',
      description:
        'Khong gian nghi duong biet lap voi san tam nang, phong khach lon va tam nhin rong ra mat nuoc.',
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
      max_guests: 4,
      bed_type: '2 giuong king',
      room_size: '160m2',
      amenities: ['Ho boi rieng', 'Quan gia rieng', 'Bua sang tai phong', 'Dich vu dua don'],
      available_quantity: 2,
      options: {
        view: 'Dam nuoc rieng',
        breakfast_included: true,
        cancellation: 'Ho tro doi lich theo goi dat phong',
        badge: 'Hang sang',
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
