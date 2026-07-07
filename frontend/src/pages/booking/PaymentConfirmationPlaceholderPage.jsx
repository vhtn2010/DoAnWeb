import { useLocation } from 'react-router-dom'

function PaymentConfirmationPlaceholderPage() {
  const location = useLocation()
  const paymentRedirectPayload = location.state?.paymentRedirectPayload

  return (
    <div className="booking-confirmation-page">
      <div className="booking-confirmation-shell">
        <section className="booking-choice-card booking-choice-card--placeholder">
          <header className="booking-choice-card__header">
            <div className="booking-choice-card__heading">
              <div>
                <p className="booking-confirmation-page__eyebrow">Màn chờ task tiếp theo</p>
                <h1 className="booking-confirmation-page__title">
                  Xác nhận thanh toán sẽ được hoàn thiện sau
                </h1>
              </div>
            </div>
          </header>

          <div className="booking-choice-card__empty booking-choice-card__empty--placeholder">
            <p>
              Dữ liệu mock thanh toán đã được chuẩn bị để nối tiếp flow từ màn xác nhận đơn hàng.
            </p>
            {paymentRedirectPayload?.booking_code ? (
              <p>Mã đơn hiện tại: {paymentRedirectPayload.booking_code}</p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}

export default PaymentConfirmationPlaceholderPage
