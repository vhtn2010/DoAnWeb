import { Link } from 'react-router-dom'
import HotelAmenityList from '../../components/hotels/HotelAmenityList.jsx'
import HotelBookingPanel from '../../components/hotels/HotelBookingPanel.jsx'
import HotelCard from '../../components/hotels/HotelCard.jsx'
import HotelGallery from '../../components/hotels/HotelGallery.jsx'
import HotelReviewSummary from '../../components/hotels/HotelReviewSummary.jsx'
import HotelRoomCard from '../../components/hotels/HotelRoomCard.jsx'
import useHotelDetail from '../../hooks/useHotelDetail.js'

function InfoItem({ label, value }) {
  return (
    <div className="hotel-detail-info-strip__item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function HotelDetailPage() {
  const {
    availability,
    breadcrumbHomePath,
    breadcrumbListPath,
    checkAvailability,
    checkinDate,
    checkoutDate,
    error,
    feedback,
    formatCurrency,
    galleryState,
    goToCartMock,
    goToCheckoutMock,
    guests,
    hotel,
    loading,
    relatedHotels,
    retry,
    roomQuantity,
    rooms,
    selectRoom,
    selectedRoom,
    selectedRoomId,
    stayNights,
    updateDateRange,
    updateGuests,
    updateRoomQuantity,
  } = useHotelDetail()

  if (error && !hotel && !loading) {
    return (
      <div className="hotel-detail-page">
        <div className="hotel-detail-page__shell">
          <nav aria-label="Breadcrumb" className="hotel-detail-page__breadcrumb">
            <Link className="hotel-detail-page__breadcrumb-link" to={breadcrumbHomePath}>
              Trang chủ
            </Link>
            <span aria-hidden="true">›</span>
            <Link className="hotel-detail-page__breadcrumb-link" to={breadcrumbListPath}>
              Khách sạn
            </Link>
          </nav>

          <section className="hotel-detail-card hotel-detail-card--empty">
            <p className="hotel-detail-page__eyebrow">Không khả dụng</p>
            <h1 className="hotel-detail-page__title">Không tìm thấy khách sạn</h1>
            <p className="hotel-detail-page__description">{error}</p>
            <button className="hotel-detail-page__retry" type="button" onClick={retry}>
              Tải lại dữ liệu mock
            </button>
          </section>
        </div>
      </div>
    )
  }

  if (loading || !hotel) {
    return (
      <div className="hotel-detail-page">
        <div className="hotel-detail-page__shell">
          <section className="hotel-detail-card hotel-detail-card--empty">
            <p className="hotel-detail-page__eyebrow">Đang tải</p>
            <h1 className="hotel-detail-page__title">Chi tiết khách sạn đang được chuẩn bị</h1>
            <p className="hotel-detail-page__description">
              Dữ liệu đang được đọc từ mock adapter theo API-ready pattern.
            </p>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="hotel-detail-page">
      <div className="hotel-detail-page__shell">
        <nav aria-label="Breadcrumb" className="hotel-detail-page__breadcrumb">
          <Link className="hotel-detail-page__breadcrumb-link" to={breadcrumbHomePath}>
            Trang chủ
          </Link>
          <span aria-hidden="true">›</span>
          <Link className="hotel-detail-page__breadcrumb-link" to={breadcrumbListPath}>
            Khách sạn
          </Link>
          <span aria-hidden="true">›</span>
          <span className="hotel-detail-page__breadcrumb-current">{hotel.title}</span>
        </nav>

        <section className="hotel-detail-hero">
          <div className="hotel-detail-hero__copy">
            <p className="hotel-detail-page__eyebrow">{hotel.details?.hotel_style}</p>
            <h1 className="hotel-detail-page__title">{hotel.title}</h1>
            <div className="hotel-detail-hero__meta">
              <span>{hotel.rating.toFixed(1)} / 5.0</span>
              <span>{hotel.review_count} đánh giá</span>
              <span>{hotel.location_text}</span>
            </div>
            <p className="hotel-detail-page__description">{hotel.description}</p>
          </div>

          <div className="hotel-detail-hero__note">
            <span className="hotel-detail-hero__note-label">Điểm nhấn</span>
            <p>{hotel.details?.highlight_text}</p>
            <strong>{hotel.details?.headline}</strong>
          </div>
        </section>

        <HotelGallery
          images={galleryState.images}
          selectedImage={galleryState.selectedImage}
          title={hotel.title}
          onSelectImage={galleryState.setSelectedImage}
        />

        <div className="hotel-detail-page__layout">
          <div className="hotel-detail-page__main">
            <section className="hotel-detail-info-strip">
              <InfoItem label="Địa chỉ" value={hotel.address} />
              <InfoItem label="Nhận phòng" value={hotel.checkin_time} />
              <InfoItem label="Trả phòng" value={hotel.checkout_time} />
              <InfoItem label="Xếp hạng" value={`${hotel.details?.star_rating ?? 0} sao`} />
            </section>

            <section className="hotel-detail-card">
              <div className="hotel-detail-section-heading">
                <span className="hotel-detail-section-heading__eyebrow">Về khách sạn</span>
                <h2 className="hotel-detail-section-heading__title">
                  Không gian nghỉ dưỡng phù hợp cho hành trình của bạn
                </h2>
              </div>

              <p className="hotel-detail-page__description">{hotel.short_description}</p>

              <div className="hotel-detail-nearby">
                {hotel.details?.nearby_places?.map((place) => (
                  <span className="hotel-detail-nearby__item" key={place}>
                    {place}
                  </span>
                ))}
              </div>
            </section>

            <div className="hotel-detail-page__content-grid">
              <HotelAmenityList items={hotel.amenities} title="Tiện nghi nổi bật" />
              <HotelAmenityList items={hotel.policies} title="Chính sách lưu trú" />
            </div>

            <HotelReviewSummary
              breakdown={hotel.details?.review_breakdown}
              rating={hotel.rating}
              reviewCount={hotel.review_count}
            />

            <section className="hotel-detail-card">
              <div className="hotel-detail-section-heading">
                <span className="hotel-detail-section-heading__eyebrow">Danh sách phòng</span>
                <h2 className="hotel-detail-section-heading__title">
                  Chọn hạng phòng phù hợp với nhu cầu lưu trú
                </h2>
              </div>

              <div className="hotel-detail-room-list">
                {rooms.map((room) => (
                  <HotelRoomCard
                    key={room.id}
                    formatCurrency={formatCurrency}
                    isSelected={selectedRoomId === room.id}
                    room={room}
                    onReserve={goToCartMock}
                    onSelect={selectRoom}
                  />
                ))}
              </div>
            </section>

            {relatedHotels.length ? (
              <section className="hotel-detail-card">
                <div className="hotel-detail-section-heading">
                  <span className="hotel-detail-section-heading__eyebrow">Gợi ý thêm</span>
                  <h2 className="hotel-detail-section-heading__title">
                    Khách sạn tương tự bạn có thể thích
                  </h2>
                </div>

                <div className="hotel-results__grid hotel-results__grid--related">
                  {relatedHotels.map((relatedHotel) => (
                    <HotelCard
                      key={relatedHotel.id}
                      actionLabel="Xem chi tiết"
                      formatCurrency={formatCurrency}
                      hotel={relatedHotel}
                      ratingValue={relatedHotel.displayRatingValue}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <HotelBookingPanel
            availability={{
              ...availability,
              message: availability.message,
            }}
            checkinDate={checkinDate}
            checkoutDate={checkoutDate}
            feedback={feedback}
            formatCurrency={formatCurrency}
            guests={guests}
            roomQuantity={roomQuantity}
            selectedRoom={selectedRoom}
            stayNights={stayNights}
            onAddToCart={goToCartMock}
            onCheckAvailability={checkAvailability}
            onCheckout={goToCheckoutMock}
            onDateChange={updateDateRange}
            onGuestsChange={updateGuests}
            onRoomQuantityChange={updateRoomQuantity}
          />
        </div>
      </div>
    </div>
  )
}

export default HotelDetailPage
