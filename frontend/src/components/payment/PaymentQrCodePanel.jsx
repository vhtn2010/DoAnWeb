import { PAYMENT_METHOD_CODES } from '../../constants/payments.js'

function createQrMatrix(payload = '') {
  const matrixSize = 17
  const payloadSeed = Array.from(payload).reduce(
    (seedValue, character, index) => seedValue + character.charCodeAt(0) * (index + 1),
    97,
  )

  return Array.from({ length: matrixSize }, (_, rowIndex) =>
    Array.from({ length: matrixSize }, (_, columnIndex) => {
      const inCorner =
        (rowIndex < 4 && columnIndex < 4) ||
        (rowIndex < 4 && columnIndex > matrixSize - 5) ||
        (rowIndex > matrixSize - 5 && columnIndex < 4)

      if (inCorner) {
        return rowIndex === 0 ||
          rowIndex === 3 ||
          columnIndex === 0 ||
          columnIndex === 3 ||
          (rowIndex === 2 && columnIndex === 2)
      }

      return ((rowIndex * 19 + columnIndex * 13 + payloadSeed) % 7) < 3
    }),
  )
}

function PaymentQrCodePanel({
  amountLabel,
  bookingCode,
  errors = {},
  method,
  onSubmitProof,
  proofActionLabel = 'Gửi bill cho admin',
  isSubmittingProof = false,
  onProofFieldChange,
  onProofFileChange,
  payment,
  paymentProof,
  proofForm,
  showProofForm = true,
  showQrSurface = true,
  uploadingProof,
}) {
  const methodCode = method?.code ?? ''
  const qrPayload = [
    methodCode,
    bookingCode ?? '',
    payment?.payment_code ?? '',
    amountLabel ?? '',
  ].join('|')
  const qrMatrix = createQrMatrix(qrPayload)
  const isBankTransfer = methodCode === PAYMENT_METHOD_CODES.manualBankTransfer
  const hasProof = Boolean(paymentProof?.proof_image_url)

  return (
    <section className="payment-qr-code-panel" aria-label="Hướng dẫn thanh toán trực tiếp">
      {isBankTransfer && showQrSurface ? (
        <div className="payment-qr-code-panel__surface">
          <div className="payment-qr-code-panel__grid" aria-hidden="true">
            {qrMatrix.map((row, rowIndex) =>
              row.map((cell, columnIndex) => (
                <span
                  className={`payment-qr-code-panel__cell ${
                    cell ? 'payment-qr-code-panel__cell--filled' : ''
                  }`}
                  key={`${rowIndex}-${columnIndex}`}
                />
              )),
            )}
          </div>
        </div>
      ) : null}

      <div className="payment-qr-code-panel__copy">
        <strong>
          {isBankTransfer ? 'Chuyển khoản theo thông tin bên dưới' : method?.label}
        </strong>
        <span>Số tiền cần thanh toán: {amountLabel}</span>
        {bookingCode ? <span>Mã đơn hàng: {bookingCode}</span> : null}
        {payment?.payment_code ? <span>Mã giao dịch: {payment.payment_code}</span> : null}
        {method?.description ? <span>{method.description}</span> : null}
      </div>

      {Array.isArray(method?.details) && method.details.length > 0 ? (
        <div className="payment-qr-code-panel__details">
          {method.details.map((detail) => (
            <div className="payment-qr-code-panel__detail" key={`${detail.label}-${detail.value}`}>
              <span>{detail.label}</span>
              <strong>{detail.value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {isBankTransfer && showProofForm ? (
        <div className="payment-qr-code-panel__proof">
          <p className="payment-qr-code-panel__hint">
            Sau khi chuyển khoản, bạn có thể tải chứng từ ngay tại đây để bộ phận vận hành kiểm
            tra và xác nhận thanh toán.
          </p>

          <label className="payment-qr-code-panel__field">
            <span>Mã giao dịch ngân hàng</span>
            <input
              className="payment-contact-input"
              name="bank_transaction_code"
              placeholder="Ví dụ: FT240710123456"
              type="text"
              value={proofForm.bank_transaction_code}
              onChange={onProofFieldChange}
            />
          </label>

          <label className="payment-qr-code-panel__field">
            <span>Ghi chú chuyển khoản</span>
            <textarea
              className="payment-qr-code-panel__textarea"
              name="transfer_note"
              placeholder="Ví dụ: Chuyển khoản cho booking BK202607..."
              rows={3}
              value={proofForm.transfer_note}
              onChange={onProofFieldChange}
            />
          </label>

          <label className="payment-qr-code-panel__field">
            <span>Ảnh chứng từ thanh toán</span>
            <input
              accept="image/*"
              className="payment-qr-code-panel__file-input"
              type="file"
              onChange={onProofFileChange}
            />
            {proofForm.file ? (
              <small className="payment-qr-code-panel__hint">Đã chọn: {proofForm.file.name}</small>
            ) : null}
            {hasProof ? (
              <small className="payment-qr-code-panel__hint">
                Hệ thống đã có chứng từ trước đó.{' '}
                <a href={paymentProof.proof_image_url} target="_blank" rel="noreferrer">
                  Xem ảnh hiện tại
                </a>
              </small>
            ) : null}
            {uploadingProof ? (
              <small className="payment-qr-code-panel__hint">
                Đang tải chứng từ lên hệ thống...
              </small>
            ) : null}
            {errors.proof_file ? <small>{errors.proof_file}</small> : null}
          </label>

          {onSubmitProof ? (
            <button
              className="payment-qr-code-panel__action"
              disabled={isSubmittingProof || uploadingProof}
              type="button"
              onClick={onSubmitProof}
            >
              {isSubmittingProof ? 'Đang gửi bill...' : proofActionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export default PaymentQrCodePanel
