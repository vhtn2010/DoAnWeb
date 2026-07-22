function normalizeAmenityText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
}

function formatAmenityLabel(item = '') {
  const normalizedItem = normalizeAmenityText(item)

  if (normalizedItem.includes('wifi')) {
    return 'Wi-Fi'
  }

  if (
    normalizedItem.includes('breakfast') ||
    normalizedItem.includes('buffet sang') ||
    normalizedItem.includes('bua sang')
  ) {
    return 'Bữa sáng'
  }

  if (normalizedItem.includes('ho boi') || normalizedItem.includes('pool')) {
    return 'Hồ bơi'
  }

  if (
    normalizedItem.includes('xe dua don') ||
    normalizedItem.includes('airport transfer') ||
    normalizedItem.includes('shuttle')
  ) {
    return 'Xe đưa đón'
  }

  if (normalizedItem.includes('nha hang') || normalizedItem.includes('restaurant')) {
    return 'Nhà hàng'
  }

  return String(item ?? '')
}

function AmenityIcon({ item }) {
  const normalizedItem = normalizeAmenityText(item)

  if (normalizedItem.includes('ho boi')) {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M4 16c1.1 0 1.7-.5 2.4-1 .7-.5 1.3-1 2.4-1 1.1 0 1.7.5 2.4 1 .7.5 1.3 1 2.4 1 1.1 0 1.7-.5 2.4-1 .7-.5 1.3-1 2.4-1"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
        <path d="M7 12V8a2 2 0 0 1 4 0v4M15 12V6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    )
  }

  if (normalizedItem.includes('spa')) {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M12 20c4.2 0 7-2.7 7-6.2 0-2.6-1.5-4.7-4.1-6.3-.5 2.8-1.9 4.8-4.3 6.4-2.3 1.5-4.2 2.3-5.6 2.6 1.1 2.2 3.7 3.5 7 3.5Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path d="M11.5 11.8c0-2.9 1.4-5.4 4.3-7.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    )
  }

  if (normalizedItem.includes('wifi')) {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <path d="M4 9.5a12 12 0 0 1 16 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <path d="M7.5 13a7 7 0 0 1 9 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <path d="M11 16.4a2 2 0 0 1 2 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <circle cx="12" cy="19" fill="currentColor" r="1.2" />
      </svg>
    )
  }

  if (normalizedItem.includes('nha hang')) {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <path d="M7 4v7a2 2 0 1 1-4 0V4M5 4v16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <path d="M15 4v16M15 10c2.2 0 4-1.8 4-4V4h-4v6Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    )
  }

  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M4 13.5C6.4 12 8 9.6 8.8 6.2c2.2 1.1 4.2 2.5 5.8 4.2 1.8 1.8 3 3.9 3.4 6.2-2 .9-4.2 1.4-6.5 1.4-3.1 0-5.7-.8-7.5-2.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function HotelAmenityList({ items, title }) {
  const amenityItems = Array.isArray(items) ? items.slice(0, 4) : []

  return (
    <section className="hotel-detail-card hotel-detail-card--plain hotel-amenity-list">
      <div className="hotel-detail-section-heading">
        <h2 className="hotel-detail-section-heading__title">{title}</h2>
      </div>

      <div className="hotel-amenity-list__grid">
        {amenityItems.map((item) => (
          <div className="hotel-amenity-list__item" key={item}>
            <span className="hotel-amenity-list__icon" aria-hidden="true">
              <AmenityIcon item={item} />
            </span>
            <span>{formatAmenityLabel(item)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default HotelAmenityList
