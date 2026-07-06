import FlightDetailHeaderCard from '../../components/flights/FlightDetailHeaderCard.jsx'
import FlightEditorialSection from '../../components/flights/FlightEditorialSection.jsx'
import FlightFareOptions from '../../components/flights/FlightFareOptions.jsx'
import FlightInfoCards from '../../components/flights/FlightInfoCards.jsx'
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

function FlightDetailTopActions() {
  return (
    <div className="flight-detail-page__actions" aria-label="Tác vụ vé máy bay">
      <button className="flight-detail-page__action" type="button" aria-label="Chia sẻ">
        <ShareIcon />
      </button>
      <button className="flight-detail-page__action" type="button" aria-label="Lưu chuyến bay">
        <HeartIcon />
      </button>
    </div>
  )
}

function FlightDetailPage() {
  const {
    addToCartMock,
    bookNowMock,
    error,
    feedback,
    flight,
    formatCurrency,
    goBackToFlights,
    loading,
    retry,
    selectFare,
    selectedFare,
    selectedFareId,
  } = useFlightDetail()

  if (error) {
    return (
      <div className="flight-detail-page">
        <div className="flight-detail-page__shell">
          <section className="flight-detail-page__state-card" role="alert">
            <p className="flight-detail-page__eyebrow">Không khả dụng</p>
            <h1>Không tìm thấy chuyến bay</h1>
            <p>{error}</p>
            <div className="flight-detail-page__state-actions">
              <button className="flight-detail-page__button" type="button" onClick={retry}>
                Tải lại
              </button>
              <button
                className="flight-detail-page__button flight-detail-page__button--secondary"
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
        <div className="flight-detail-page__shell">
          <section className="flight-detail-page__state-card" role="status">
            <p className="flight-detail-page__eyebrow">Đang tải</p>
            <h1>Chi tiết vé máy bay đang được chuẩn bị</h1>
            <p>Dữ liệu đang được đọc từ mock adapter theo đúng pattern API-ready hiện tại.</p>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="flight-detail-page">
      <div className="flight-detail-page__shell">
        <section className="flight-detail-page__topbar">
          <div className="flight-detail-page__topbar-spacer" />
          <FlightDetailTopActions />
        </section>

        {feedback.message ? (
          <p className={`flight-detail-page__feedback flight-detail-page__feedback--${feedback.tone}`}>
            {feedback.message}
          </p>
        ) : null}

        <div className="flight-detail-page__main">
          <div className="flight-detail-page__content">
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
            onAddToCart={addToCartMock}
            onBookNow={bookNowMock}
          />
        </div>
      </div>
    </div>
  )
}

export default FlightDetailPage
