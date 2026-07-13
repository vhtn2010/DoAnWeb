import { useEffect, useMemo, useState } from 'react'
import { PAYMENT_METHOD_CODES } from '../../constants/payments.js'

const FALLBACK_BANK_TRANSFER_QR = '/assets/payment/bank-transfer-hero.jpg'
const FALLBACK_BANK_DETAILS = Object.freeze({
  accountHolder: 'NGUYEN THI THUY NGAN',
  accountNumber: '5420102006',
  bankName: 'MB Bank',
})

function UploadIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M12 15.5V4.75m0 0-4.25 4.25M12 4.75 16.25 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
      <path
        d="M5.25 14.25v2.5A2.75 2.75 0 0 0 8 19.5h8a2.75 2.75 0 0 0 2.75-2.75v-2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
    </svg>
  )
}

function ReceiptIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M7 3.75h10A1.25 1.25 0 0 1 18.25 5v15.25l-2.45-1.4-2.5 1.4-2.5-1.4-2.5 1.4-2.55-1.45V5A1.25 1.25 0 0 1 7 3.75Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M8.75 8h6.5M8.75 11.5h6.5M8.75 15h3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function getDetailValue(details, labels) {
  const normalizedLabels = labels.map((label) => label.toLowerCase())
  const detail = details.find((item) =>
    normalizedLabels.some((label) => item.label?.toLowerCase().includes(label)),
  )

  return detail?.value ?? ''
}

function formatTransferContent(template, bookingCode, paymentCode) {
  const fallbackContent = paymentCode || bookingCode ? `NVT ${bookingCode ?? paymentCode}` : ''

  if (!template) {
    return fallbackContent
  }

  return template
    .replaceAll('{booking_code}', bookingCode ?? '')
    .replaceAll('{payment_code}', paymentCode ?? '')
    .replaceAll('{amount}', '')
    .replace(/\s+/g, ' ')
    .trim()
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
  const [previewUrl, setPreviewUrl] = useState('')
  const methodCode = method?.code ?? ''
  const isBankTransfer = methodCode === PAYMENT_METHOD_CODES.manualBankTransfer
  const hasProof = Boolean(paymentProof?.proof_image_url)
  const methodDetails = useMemo(
    () => (Array.isArray(method?.details) ? method.details : []),
    [method?.details],
  )

  const bankDetails = useMemo(() => {
    const transferTemplate =
      method?.transferContentTemplate ||
      method?.transfer_content_template ||
      getDetailValue(methodDetails, ['nội dung chuyển khoản', 'noi dung chuyen khoan'])

    return {
      accountHolder: FALLBACK_BANK_DETAILS.accountHolder,
      accountNumber: FALLBACK_BANK_DETAILS.accountNumber,
      amount: amountLabel,
      bankName: FALLBACK_BANK_DETAILS.bankName,
      transferContent: formatTransferContent(
        transferTemplate,
        bookingCode,
        payment?.payment_code,
      ),
    }
  }, [amountLabel, bookingCode, method, methodDetails, payment?.payment_code])

  const qrImageUrl = method?.qrCodeUrl || method?.qr_code_url || FALLBACK_BANK_TRANSFER_QR

  useEffect(() => {
    if (!proofForm.file) {
      setPreviewUrl('')
      return undefined
    }

    const nextPreviewUrl = URL.createObjectURL(proofForm.file)
    setPreviewUrl(nextPreviewUrl)

    return () => {
      URL.revokeObjectURL(nextPreviewUrl)
    }
  }, [proofForm.file])

  if (!isBankTransfer) {
    return (
      <section className="payment-qr-code-panel" aria-label="Hướng dẫn thanh toán trực tiếp">
        <div className="payment-qr-code-panel__copy">
          <strong>{method?.label}</strong>
          {method?.description ? <span>{method.description}</span> : null}
        </div>
      </section>
    )
  }

  return (
    <section className="payment-qr-code-panel" aria-label="Hướng dẫn thanh toán chuyển khoản">
      <div className="payment-qr-code-panel__bank">
        <div className="payment-qr-code-panel__hero-card">
          {showQrSurface ? (
            <>
              <img
                alt="Mã QR chuyển khoản ngân hàng"
                className="payment-qr-code-panel__hero-image"
                src={qrImageUrl}
              />
              <div className="payment-qr-code-panel__hero-intro">
                <span className="payment-qr-code-panel__eyebrow">Thông tin chuyển khoản</span>
                <h3>Quét QR hoặc chuyển khoản thủ công</h3>
                <p>
                  Vui lòng kiểm tra kỹ số tiền và nội dung chuyển khoản trước khi gửi bill để admin
                  đối soát.
                </p>
              </div>
              <div className="payment-qr-code-panel__hero-floating">
                <div className="payment-qr-code-panel__floating-grid">
                  <div className="payment-qr-code-panel__floating-card">
                    <span>Tên ngân hàng</span>
                    <strong>{bankDetails.bankName}</strong>
                  </div>
                  <div className="payment-qr-code-panel__floating-card">
                    <span>Chủ tài khoản</span>
                    <strong>{bankDetails.accountHolder}</strong>
                  </div>
                  <div className="payment-qr-code-panel__floating-card">
                    <span>Số tài khoản</span>
                    <strong>{bankDetails.accountNumber}</strong>
                  </div>
                  <div className="payment-qr-code-panel__floating-card payment-qr-code-panel__floating-card--accent">
                    <span>Số tiền cần chuyển</span>
                    <strong>{bankDetails.amount}</strong>
                  </div>
                </div>
                <div className="payment-qr-code-panel__floating-card payment-qr-code-panel__floating-card--note">
                  <span>Nội dung chuyển khoản bắt buộc</span>
                  <strong>{bankDetails.transferContent || bookingCode || payment?.payment_code}</strong>
                  <small>Ghi đúng nội dung này để admin đối soát giao dịch.</small>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {showProofForm ? (
        <div className="payment-qr-code-panel__proof">
          <div className="payment-qr-code-panel__proof-header">
            <span className="payment-qr-code-panel__proof-icon" aria-hidden="true">
              <ReceiptIcon />
            </span>
            <div>
              <h3>Minh chứng thanh toán</h3>
              <p>Tải ảnh bill sau khi chuyển khoản và gửi admin duyệt.</p>
            </div>
          </div>

          <label className="payment-qr-code-panel__upload">
            <input
              accept="image/*"
              className="payment-qr-code-panel__file-input"
              type="file"
              onChange={onProofFileChange}
            />
            {previewUrl ? (
              <span className="payment-qr-code-panel__upload-media">
                <img
                  alt="Ảnh bill đã chọn"
                  className="payment-qr-code-panel__upload-preview"
                  src={previewUrl}
                />
              </span>
            ) : hasProof ? (
              <span className="payment-qr-code-panel__upload-media">
                <img
                  alt="Ảnh bill hiện tại"
                  className="payment-qr-code-panel__upload-preview"
                  src={paymentProof.proof_image_url}
                />
              </span>
            ) : (
              <span className="payment-qr-code-panel__upload-placeholder">
                <UploadIcon />
                <strong>Tải ảnh bill chuyển khoản</strong>
                <small>JPG, PNG, WEBP. Ảnh rõ mã giao dịch và số tiền.</small>
              </span>
            )}
          </label>

          {proofForm.file ? (
            <p className="payment-qr-code-panel__hint">Đã chọn: {proofForm.file.name}</p>
          ) : null}

          {hasProof ? (
            <p className="payment-qr-code-panel__hint">
              Hệ thống đã có chứng từ trước đó.{' '}
              <a href={paymentProof.proof_image_url} target="_blank" rel="noreferrer">
                Xem ảnh hiện tại
              </a>
            </p>
          ) : null}

          <label className="payment-qr-code-panel__field">
            <span>Mã giao dịch ngân hàng nếu có</span>
            <input
              className="payment-contact-input"
              name="bank_transaction_code"
              placeholder="Ví dụ: FT240710123456"
              type="text"
              value={proofForm.bank_transaction_code}
              onChange={onProofFieldChange}
            />
          </label>

          {uploadingProof ? (
            <p className="payment-qr-code-panel__hint" role="status">
              Đang tải chứng từ lên hệ thống...
            </p>
          ) : null}

          {errors.proof_file ? (
            <p className="payment-qr-code-panel__error" role="alert">
              {errors.proof_file}
            </p>
          ) : null}

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
