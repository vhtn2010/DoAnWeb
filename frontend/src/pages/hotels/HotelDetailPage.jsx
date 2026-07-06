import HotelAmenityList from '../../components/hotels/HotelAmenityList.jsx'
import HotelBookingPanel from '../../components/hotels/HotelBookingPanel.jsx'
import HotelGallery from '../../components/hotels/HotelGallery.jsx'
import HotelReviewSummary from '../../components/hotels/HotelReviewSummary.jsx'
import HotelRoomCard from '../../components/hotels/HotelRoomCard.jsx'
import useHotelDetail from '../../hooks/useHotelDetail.js'

function StarIcon() {
  return (
    <svg fill="currentColor" viewBox="0 0 24 24">
      <path d="m12 2.6 2.85 5.77 6.37.93-4.61 4.49 1.09 6.34L12 17.13 6.3 20.13l1.09-6.34L2.78 9.3l6.37-.93L12 2.6Z" />
    </svg>
  )
}

function HotelStars({ total = 5 }) {
  return (
    <div className="hotel-detail-title__stars" aria-label={`${total} sao`}>
      {Array.from({ length: total }, (_, index) => (
        <span key={index} aria-hidden="true">
          <StarIcon />
        </span>
      ))}
    </div>
  )
}

function TitleActionButton({ label, children }) {
  return (
    <button aria-label={label} className="hotel-detail-title__action" type="button">
      {children}
    </button>
  )
}

function HotelPriceSummary({ formatCurrency, value }) {
  return (
    <div className="hotel-detail-title__price" aria-label="Giá tham khảo mỗi đêm">
      <strong className="hotel-detail-title__price-value">
        {value ? formatCurrency(value) : '--'}
      </strong>

      <div className="hotel-detail-title__price-copy">
        <span>Giá từ</span>
        <small>/đêm</small>
      </div>
    </div>
  )
}

function HotelLocationIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M12 20s6-4.9 6-10a6 6 0 1 0-12 0c0 5.1 6 10 6 10Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="10" fill="currentColor" r="1.8" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M15 8 9 12l6 4M18 6.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM18 22.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M12 20.5 5.6 14A4.8 4.8 0 0 1 12 7.4 4.8 4.8 0 0 1 18.4 14L12 20.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function HotelDetailPage() {
  const {
    availability,
    error,
    feedback,
    formatCurrency,
    galleryState,
    goToCartMock,
    goToCheckoutMock,
    hotel,
    loading,
    retry,
    rooms,
    selectRoom,
    selectedRoom,
    selectedRoomId,
  } = useHotelDetail()

  if (error && !hotel && !loading) {
    return (
      <div className="hotel-detail-page">
        <div className="hotel-detail-page__shell">
          <section className="hotel-detail-card hotel-detail-card--empty">
            <p className="hotel-detail-page__eyebrow">Khong kha dung</p>
            <h1 className="hotel-detail-page__title">Khong tim thay khach san</h1>
            <p className="hotel-detail-page__description">{error}</p>
            <button className="hotel-detail-page__retry" type="button" onClick={retry}>
              Tai lai du lieu mock
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
            <p className="hotel-detail-page__eyebrow">Dang tai</p>
            <h1 className="hotel-detail-page__title">Chi tiet khach san dang duoc chuan bi</h1>
            <p className="hotel-detail-page__description">
              Du lieu dang duoc doc tu mock adapter theo API-ready pattern.
            </p>
          </section>
        </div>
      </div>
    )
  }

  const featuredRooms = rooms.slice(0, 3)

  return (
    <div className="hotel-detail-page">
      <div className="hotel-detail-page__shell">
        <section className="hotel-detail-title">
          <div className="hotel-detail-title__copy">
            <HotelStars total={hotel.details?.star_rating ?? 5} />
            <h1 className="hotel-detail-page__title">{hotel.title}</h1>

            <div className="hotel-detail-title__address">
              <span className="hotel-detail-title__address-icon" aria-hidden="true">
                <HotelLocationIcon />
              </span>
              <span>{hotel.address}</span>
              <button className="hotel-detail-title__map-link" type="button">
                Xem trên bản đồ
              </button>
            </div>
          </div>

          <div className="hotel-detail-title__side">
            <div className="hotel-detail-title__actions">
              <TitleActionButton label="Chia sẻ khách sạn">
                <ShareIcon />
              </TitleActionButton>
              <TitleActionButton label="Lưu khách sạn">
                <HeartIcon />
              </TitleActionButton>
            </div>

            <HotelPriceSummary
              formatCurrency={formatCurrency}
              value={selectedRoom?.sale_price ?? hotel.sale_price}
            />
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
            <section className="hotel-detail-card hotel-detail-card--plain hotel-detail-copy">
              <div className="hotel-detail-section-heading">
                <h2 className="hotel-detail-section-heading__title">Mô tả</h2>
              </div>

              <p className="hotel-detail-page__description">{hotel.description}</p>
            </section>

            <HotelAmenityList items={hotel.amenities} title="Tiện nghi" />
          </div>

          <HotelBookingPanel
            availability={availability}
            feedback={feedback}
            formatCurrency={formatCurrency}
            hotel={hotel}
            selectedRoom={selectedRoom}
            onAddToCart={goToCartMock}
            onCheckout={goToCheckoutMock}
          />
        </div>

        <section className="hotel-detail-card hotel-detail-card--plain hotel-detail-rooms">
          <div className="hotel-detail-section-heading">
            <h2 className="hotel-detail-section-heading__title">Các loại phòng</h2>
          </div>

          <div className="hotel-detail-room-list">
            {featuredRooms.map((room) => (
              <HotelRoomCard
                key={room.id}
                formatCurrency={formatCurrency}
                isSelected={selectedRoomId === room.id}
                room={room}
                onReserve={goToCheckoutMock}
                onSelect={selectRoom}
              />
            ))}
          </div>
        </section>

        <HotelReviewSummary
          rating={hotel.rating}
          reviewCount={hotel.review_count}
          reviews={hotel.details?.review_items}
        />
      </div>
    </div>
  )
}

export default HotelDetailPage
