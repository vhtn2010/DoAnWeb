import FlightDetailHeaderCard from '../../components/flights/FlightDetailHeaderCard.jsx'
import FlightEditorialSection from '../../components/flights/FlightEditorialSection.jsx'
import FlightFareOptions from '../../components/flights/FlightFareOptions.jsx'
import FlightInfoCards from '../../components/flights/FlightInfoCards.jsx'
import FlightLoginRequiredModal from '../../components/flights/FlightLoginRequiredModal.jsx'
import FlightPaymentSummary from '../../components/flights/FlightPaymentSummary.jsx'
import FlightPolicyCard from '../../components/flights/FlightPolicyCard.jsx'
import useFlightDetail from '../../hooks/useFlightDetail.js'

function ShareIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M14.25 5.25h4.5v4.5M10.5 13.5l8.25-8.25M18 13.5v4.2a1.05 1.05 0 0 1-1.05 1.05H6.3A1.05 1.05 0 0 1 5.25 17.7V7.05A1.05 1.05 0 0 1 6.3 6H10.5"
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
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="m12 19.2-.92-.84C6.18 13.9 3 11.02 3 7.5a4.2 4.2 0 0 1 4.28-4.2c1.69 0 3.31.8 4.32 2.07A5.5 5.5 0 0 1 15.92 3.3 4.2 4.2 0 0 1 20.2 7.5c0 3.52-3.18 6.4-8.08 10.86l-.12.12Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function FlightDetailTopActions({ isFavorite, onToggleFavorite }) {
  return (
    <div className="flight-detail-page__actions" aria-label="Tác vụ vé máy bay">
      <button className="flight-detail-page__action" type="button" aria-label="Chia sẻ">
        <ShareIcon />
      </button>
      <button
        aria-label="Lưu chuyến bay"
        className={`flight-detail-page__action ${isFavorite ? 'flight-detail-page__action--active' : ''}`}
        type="button"
        onClick={onToggleFavorite}
      >
        <HeartIcon />
      </button>
    </div>
  )
}

function FlightDetailPage() {
  const {
    addToCartAction,
    bookNowAction,
    closeLoginPrompt,
    error,
    feedback,
    flight,
    formatCurrency,
    goToLoginFromPrompt,
    goBackToFlights,
    handleToggleFavorite,
    isFavorite,
    isLoginPromptOpen,
    loginPromptVariant,
    loading,
    retry,
    selectFare,
    selectedFare,
    selectedFareId,
  } = useFlightDetail()

  const loginPromptContent =
    loginPromptVariant === 'booking'
      ? {
          eyebrow: 'Đặt chỗ',
          title: 'Đăng nhập để có thể đặt chỗ chuyến bay',
          description: 'Đăng nhập để tiếp tục đặt chỗ chuyến bay bạn đã chọn nhanh hơn.',
        }
      : {
          eyebrow: 'Giỏ hàng',
          title: 'Vui lòng đăng nhập để có thể thêm vào giỏ hàng',
          description: 'Đăng nhập để lưu dịch vụ bạn chọn và tiếp tục đặt chỗ thuận tiện hơn.',
        }

  if (error) {
    return (
      <div className="flight-detail-page">
        <div className="flight-detail-shell">
          <section className="flight-detail-state-card" role="alert">
            <p className="flight-detail-state-card__eyebrow">Không khả dụng</p>
            <h1>Không tìm thấy chuyến bay</h1>
            <p>{error}</p>
            <div className="flight-detail-state-card__actions">
              <button className="flight-detail-state-card__button" type="button" onClick={retry}>
                Tải lại
              </button>
              <button
                className="flight-detail-state-card__button flight-detail-state-card__button--secondary"
                type="button"
                onClick={goBackToFlights}
              >
                Quay lại danh sách vé
              </button>
            </div>
          </section>
        </div>
      </div>
    )
  }

  if (loading || !flight) {
    return (
      <div className="flight-detail-page">
        <div className="flight-detail-shell">
          <section className="flight-detail-state-card" role="status">
            <p className="flight-detail-state-card__eyebrow">Đang tải</p>
            <h1>Chi tiết vé máy bay đang được chuẩn bị</h1>
            <p>Dữ liệu chuyến bay đang được tải từ hệ thống.</p>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="flight-detail-page">
      <div className="flight-detail-shell">
        <FlightLoginRequiredModal
          isOpen={isLoginPromptOpen}
          onClose={closeLoginPrompt}
          onLogin={goToLoginFromPrompt}
          eyebrow={loginPromptContent.eyebrow}
          title={loginPromptContent.title}
          description={loginPromptContent.description}
        />

        <section className="flight-detail-page__topbar">
          <FlightDetailTopActions
            isFavorite={isFavorite}
            onToggleFavorite={handleToggleFavorite}
          />
        </section>

        {feedback.message ? (
          <p className={`flight-detail-page__feedback flight-detail-page__feedback--${feedback.tone}`}>
            {feedback.message}
          </p>
        ) : null}

        <div className="flight-detail-main">
          <div className="flight-detail-main__content">
            <FlightDetailHeaderCard flight={flight} />
            <FlightFareOptions
              fareOptions={flight.fare_options}
              selectedFareId={selectedFareId}
              onSelectFare={selectFare}
            />
            <FlightInfoCards flight={flight} selectedFare={selectedFare} />
            <FlightPolicyCard policies={flight.policies} />
            <FlightEditorialSection destination={flight.editorial_destination} />
          </div>

          <FlightPaymentSummary
            flight={flight}
            selectedFare={selectedFare}
            formatCurrency={formatCurrency}
            onAddToCart={addToCartAction}
            onBookNow={bookNowAction}
          />
        </div>
      </div>
    </div>
  )
}

export default FlightDetailPage
