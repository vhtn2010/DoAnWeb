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

  const mappedHotel = {
    ...hotel,
    detail_path: `${detailPathPrefix}/${hotel.slug}`,
    gallery: resolveGallery(hotel.gallery, hotel.image_url),
    amenities: resolveAmenities(hotel.amenities),
    policies: resolvePolicies(hotel.policies),
    rating: Number(hotel.rating ?? 0),
    review_count: Number(hotel.review_count ?? 0),
    checkin_time: hotel.checkin_time ?? '',
    checkout_time: hotel.checkout_time ?? '',
    details: {
      ...(hotel.details ?? {}),
      nearby_places: Array.isArray(hotel.details?.nearby_places)
        ? hotel.details.nearby_places
        : [],
      review_breakdown: resolveReviewBreakdown(hotel.details?.review_breakdown),
    },
  }

  return {
    hotel: mappedHotel,
    rooms: Array.isArray(responseData.rooms) ? responseData.rooms.map(mapHotelRoomToView) : [],
    relatedHotels: Array.isArray(responseData.related_hotels)
      ? responseData.related_hotels.map((relatedHotel) =>
          mapHotelSummaryToCardView(relatedHotel, {
            detailPath: `${detailPathPrefix}/${relatedHotel.slug}`,
          }),
        )
      : [],
  }
}
