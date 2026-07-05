function ReviewBar({ label, value }) {
  return (
    <div className="hotel-review-summary__bar-row">
      <span>{label}</span>
      <div className="hotel-review-summary__bar-track" aria-hidden="true">
        <span className="hotel-review-summary__bar-fill" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <strong>{value.toFixed(1)}</strong>
    </div>
  )
}

function HotelReviewSummary({ rating, reviewCount, breakdown }) {
  return (
    <section className="hotel-detail-card hotel-review-summary">
      <div className="hotel-detail-section-heading">
        <span className="hotel-detail-section-heading__eyebrow">Đánh giá thực tế</span>
        <h2 className="hotel-detail-section-heading__title">Cảm nhận từ khách lưu trú</h2>
      </div>

      <div className="hotel-review-summary__layout">
        <div className="hotel-review-summary__score">
          <strong>{rating.toFixed(1)}</strong>
          <span>/ 5.0</span>
          <p>{reviewCount} đánh giá đã xác thực trong dữ liệu mock.</p>
        </div>

        <div className="hotel-review-summary__bars">
          <ReviewBar label="Sạch sẽ" value={breakdown.cleanliness} />
          <ReviewBar label="Dịch vụ" value={breakdown.service} />
          <ReviewBar label="Vị trí" value={breakdown.location} />
          <ReviewBar label="Thoải mái" value={breakdown.comfort} />
        </div>
      </div>
    </section>
  )
}

export default HotelReviewSummary
