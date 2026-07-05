import { Link } from 'react-router-dom'
import HotelAmenityList from '../../components/hotels/HotelAmenityList.jsx'
import HotelBookingPanel from '../../components/hotels/HotelBookingPanel.jsx'
import HotelGallery from '../../components/hotels/HotelGallery.jsx'
import HotelReviewSummary from '../../components/hotels/HotelReviewSummary.jsx'
import HotelRoomCard from '../../components/hotels/HotelRoomCard.jsx'
import useHotelDetail from '../../hooks/useHotelDetail.js'

function HotelStars({ total = 5 }) {
  return (
    <div className="hotel-detail-title__stars" aria-label={`${total} sao`}>
      {Array.from({ length: total }, (_, index) => (
        <span key={index} aria-hidden="true">
          ★
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
      <path d="M15 8 9 12l6 4M18 6.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM18 22.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path d="M12 20.5 5.6 14A4.8 4.8 0 0 1 12 7.4 4.8 4.8 0 0 1 18.4 14L12 20.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

function HotelDetailPage() {
  const {
    availability,
    breadcrumbHomePath,
    breadcrumbListPath,
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
              Trang chu
            </Link>
            <span aria-hidden="true">/</span>
            <Link className="hotel-detail-page__breadcrumb-link" to={breadcrumbListPath}>
              Khach san
            </Link>
          </nav>

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
        <nav aria-label="Breadcrumb" className="hotel-detail-page__breadcrumb">
          <Link className="hotel-detail-page__breadcrumb-link" to={breadcrumbHomePath}>
            Trang chu
          </Link>
          <span aria-hidden="true">/</span>
          <Link className="hotel-detail-page__breadcrumb-link" to={breadcrumbListPath}>
            Khach san
          </Link>
          <span aria-hidden="true">/</span>
          <span className="hotel-detail-page__breadcrumb-current">{hotel.title}</span>
        </nav>

        <section className="hotel-detail-title">
          <div className="hotel-detail-title__copy">
            <HotelStars total={hotel.details?.star_rating ?? 5} />
            <h1 className="hotel-detail-page__title">{hotel.title}</h1>

            <div className="hotel-detail-title__address">
              <span className="hotel-detail-title__address-icon" aria-hidden="true">
                <HotelLocationIcon />
              </span>
              <span>{hotel.address}</span>
            </div>

            <button className="hotel-detail-title__map-link" type="button">
              Xem tren ban do
            </button>
          </div>

          <div className="hotel-detail-title__actions">
            <TitleActionButton label="Chia se khach san">
              <ShareIcon />
            </TitleActionButton>
            <TitleActionButton label="Luu khach san">
              <HeartIcon />
            </TitleActionButton>
          </div>
        </section>

        <div className="hotel-detail-page__layout">
          <div className="hotel-detail-page__main">
            <HotelGallery
              images={galleryState.images}
              selectedImage={galleryState.selectedImage}
              title={hotel.title}
              onSelectImage={galleryState.setSelectedImage}
            />

            <section className="hotel-detail-card hotel-detail-card--plain hotel-detail-copy">
              <div className="hotel-detail-section-heading">
                <h2 className="hotel-detail-section-heading__title">Mo ta</h2>
              </div>

              <p className="hotel-detail-page__description">{hotel.description}</p>
              <p className="hotel-detail-page__description">{hotel.short_description}</p>
            </section>

            <HotelAmenityList items={hotel.amenities} title="Tien nghi" />

            <section className="hotel-detail-card hotel-detail-card--plain">
              <div className="hotel-detail-section-heading">
                <h2 className="hotel-detail-section-heading__title">Cac loai phong</h2>
                {hotel.details?.room_note ? (
                  <p className="hotel-detail-section-heading__note">{hotel.details.room_note}</p>
                ) : null}
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

          <HotelBookingPanel
            availability={availability}
            checkinDate={checkinDate}
            checkoutDate={checkoutDate}
            feedback={feedback}
            formatCurrency={formatCurrency}
            guests={guests}
            hotel={hotel}
            roomQuantity={roomQuantity}
            selectedRoom={selectedRoom}
            stayNights={stayNights}
            onAddToCart={goToCartMock}
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
