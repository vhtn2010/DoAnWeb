function HotelAmenityList({ items, title }) {
  const amenityItems = Array.isArray(items) ? items : []

  return (
    <section className="hotel-detail-card hotel-detail-card--soft">
      <div className="hotel-detail-section-heading">
        <span className="hotel-detail-section-heading__eyebrow">Thông tin nổi bật</span>
        <h2 className="hotel-detail-section-heading__title">{title}</h2>
      </div>

      <div className="hotel-detail-pill-list">
        {amenityItems.map((item) => (
          <span className="hotel-detail-pill-list__item" key={item}>
            {item}
          </span>
        ))}
      </div>
    </section>
  )
}

export default HotelAmenityList
