import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getBookingByCode } from '../../repositories/bookingRepository.js'
import {
  createCustomerRefundRequest,
  listCustomerBookingPayments,
  listCustomerBookingRefunds,
} from '../../repositories/paymentRepository.js'
import { uploadRefundEvidenceAsset } from '../../adapters/api/uploadApiAdapter.js'
import usePublicSession from '../../hooks/usePublicSession.js'
import { buildPublicAuthPath } from '../../utils/publicNavigation.js'
import { formatCurrencyVND } from '../../utils/formatCurrency.js'
import './customerRefundRequestPage.css'

const REFUND_REASON_OPTIONS = Object.freeze([
  'Lịch trình cá nhân thay đổi',
  'Không thể tham gia do vấn đề sức khỏe',
  'Đặt nhầm ngày hoặc nhầm dịch vụ',
  'Muốn đổi sang dịch vụ khác',
  'Chuyến đi không còn phù hợp',
  'Khác',
])

const ACTIVE_REFUND_STATUSES = new Set(['requested', 'approved', 'processing', 'success'])
const REFUNDABLE_PAYMENT_STATUSES = new Set(['success', 'reconciled', 'partially_refunded'])
const REFUNDABLE_BOOKING_STATUSES = new Set([
  'paid',
  'confirmed',
  'completed',
  'partially_refunded',
])

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function parseDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getPrimaryItem(items = []) {
  return Array.isArray(items) && items.length ? normalizeObject(items[0]) : {}
}

function formatDate(value) {
  const date = parseDate(value)

  if (!date) {
    return 'Đang cập nhật'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function getTripTitle(booking, items = []) {
  const item = getPrimaryItem(items)
  const snapshot = normalizeObject(item.service_snapshot)

  return (
    snapshot.title ||
    item.title_snapshot ||
    item.service_title ||
    booking?.booking_code ||
    'Đơn hàng của bạn'
  )
}

function getTripStartAt(items = []) {
  const item = getPrimaryItem(items)

  return item.start_at ?? item.options?.start_at ?? null
}

function getCancellationPolicyText(items = []) {
  const item = getPrimaryItem(items)
  const snapshot = normalizeObject(item.service_snapshot)
  const details = normalizeObject(snapshot.details)

  return (
    snapshot.cancellation_policy ||
    snapshot.cancellationPolicy ||
    snapshot.refund_policy ||
    details.cancellation_policy ||
    details.cancellationPolicy ||
    details.refund_policy ||
    ''
  )
}

function pickRefundablePayment(payments = []) {
  return payments.find((payment) => REFUNDABLE_PAYMENT_STATUSES.has(payment.status)) ?? null
}

function sumActiveRefunds(refunds = []) {
  return refunds.reduce((total, refund) => {
    if (!ACTIVE_REFUND_STATUSES.has(refund.status)) {
      return total
    }

    return total + Number(refund.amount || 0)
  }, 0)
}

function getPolicyDayThreshold(policyText) {
  const normalizedPolicy = String(policyText || '').toLowerCase()
  const beforeMatch =
    normalizedPolicy.match(/(?:trước|before)\s*(\d{1,2})\s*(?:ngày|days?)/i) ||
    normalizedPolicy.match(/(\d{1,2})\s*(?:ngày|days?).*(?:trước|before)/i)

  return beforeMatch ? Number(beforeMatch[1]) : null
}

function getPolicyHourThreshold(policyText) {
  const normalizedPolicy = String(policyText || '').toLowerCase()
  const beforeMatch =
    normalizedPolicy.match(/(?:trước|before)\s*(\d{1,3})\s*(?:giờ|hours?)/i) ||
    normalizedPolicy.match(/(\d{1,3})\s*(?:giờ|hours?).*(?:trước|before)/i)

  return beforeMatch ? Number(beforeMatch[1]) : null
}

function getPolicyRefundRate(policyText) {
  const normalizedPolicy = String(policyText || '').toLowerCase()
  const percentMatch = normalizedPolicy.match(/(\d{1,3})\s*%/)

  if (percentMatch) {
    return Math.min(Number(percentMatch[1]) / 100, 1)
  }

  if (
    normalizedPolicy.includes('miễn phí') ||
    normalizedPolicy.includes('hoàn toàn bộ') ||
    normalizedPolicy.includes('free cancellation')
  ) {
    return 1
  }

  return null
}

function calculateRefundEstimate({ baseAmount, policyText, startAt }) {
  const startDate = parseDate(startAt)
  const amount = Math.max(Number(baseAmount || 0), 0)

  if (!startDate || amount <= 0) {
    return {
      daysBeforeStart: null,
      explanation: 'Hệ thống chưa có đủ dữ liệu lịch khởi hành hoặc số tiền thanh toán để tính hoàn tự động.',
      feeLabel: 'Chờ đối soát',
      rate: 0,
      refundAmount: 0,
    }
  }

  const diffMs = startDate.getTime() - Date.now()
  const daysBeforeStart = Math.floor(diffMs / 86400000)
  const hoursBeforeStart = diffMs / 3600000
  const policyDayThreshold = getPolicyDayThreshold(policyText)
  const policyHourThreshold = getPolicyHourThreshold(policyText)
  const policyRate = getPolicyRefundRate(policyText)

  if (
    Number.isFinite(policyHourThreshold) &&
    policyHourThreshold !== null &&
    policyRate !== null
  ) {
    if (hoursBeforeStart >= policyHourThreshold) {
      return {
        daysBeforeStart,
        explanation: `Áp dụng chính sách dịch vụ: "${policyText}". Yêu cầu gửi trước giờ khởi hành đủ ${policyHourThreshold} giờ nên dự kiến hoàn ${Math.round(policyRate * 100)}% số tiền còn có thể hoàn.`,
        feeLabel: policyRate >= 1 ? 'Không giữ phí hủy' : `Giữ ${Math.round((1 - policyRate) * 100)}% phí hủy`,
        rate: policyRate,
        refundAmount: Math.round(amount * policyRate),
      }
    }

    return {
      daysBeforeStart: Math.max(daysBeforeStart, 0),
      explanation: `Chính sách dịch vụ yêu cầu gửi trước ít nhất ${policyHourThreshold} giờ. Yêu cầu hiện tại chưa đạt điều kiện hoàn tự động, vui lòng liên hệ hỗ trợ để được xem xét thủ công.`,
      feeLabel: 'Không đủ điều kiện hoàn tự động',
      rate: 0,
      refundAmount: 0,
    }
  }

  if (
    Number.isFinite(policyDayThreshold) &&
    policyDayThreshold !== null &&
    policyRate !== null
  ) {
    if (daysBeforeStart >= policyDayThreshold) {
      return {
        daysBeforeStart,
        explanation: `Áp dụng chính sách dịch vụ: "${policyText}". Yêu cầu gửi trước ngày khởi hành đủ ${policyDayThreshold} ngày nên dự kiến hoàn ${Math.round(policyRate * 100)}% số tiền còn có thể hoàn.`,
        feeLabel: policyRate >= 1 ? 'Không giữ phí hủy' : `Giữ ${Math.round((1 - policyRate) * 100)}% phí hủy`,
        rate: policyRate,
        refundAmount: Math.round(amount * policyRate),
      }
    }

    return {
      daysBeforeStart: Math.max(daysBeforeStart, 0),
      explanation: `Chính sách dịch vụ yêu cầu gửi trước ít nhất ${policyDayThreshold} ngày. Yêu cầu hiện tại chưa đạt điều kiện hoàn tự động, vui lòng liên hệ hỗ trợ để được xem xét thủ công.`,
      feeLabel: 'Không đủ điều kiện hoàn tự động',
      rate: 0,
      refundAmount: 0,
    }
  }

  if (daysBeforeStart >= 7) {
    return {
      daysBeforeStart,
      explanation: 'Yêu cầu được gửi trước ngày khởi hành từ 7 ngày trở lên, dự kiến hoàn 100% số tiền còn có thể hoàn.',
      feeLabel: 'Không giữ phí hủy',
      rate: 1,
      refundAmount: Math.round(amount),
    }
  }

  if (daysBeforeStart >= 3) {
    return {
      daysBeforeStart,
      explanation: 'Yêu cầu được gửi trước ngày khởi hành từ 3 đến dưới 7 ngày, dự kiến hoàn 70% và giữ 30% phí xử lý/hủy dịch vụ.',
      feeLabel: 'Giữ 30% phí hủy',
      rate: 0.7,
      refundAmount: Math.round(amount * 0.7),
    }
  }

  if (hoursBeforeStart >= 24) {
    return {
      daysBeforeStart,
      explanation: 'Yêu cầu được gửi trước ngày khởi hành từ 24 giờ đến dưới 3 ngày, dự kiến hoàn 50% và giữ 50% phí hủy gấp.',
      feeLabel: 'Giữ 50% phí hủy',
      rate: 0.5,
      refundAmount: Math.round(amount * 0.5),
    }
  }

  return {
    daysBeforeStart: Math.max(daysBeforeStart, 0),
    explanation: 'Yêu cầu gửi trong vòng 24 giờ trước khởi hành hoặc sau thời điểm khởi hành không đủ điều kiện hoàn tự động. Bạn vẫn có thể liên hệ hỗ trợ để được xem xét thủ công.',
    feeLabel: 'Không đủ điều kiện hoàn tự động',
    rate: 0,
    refundAmount: 0,
  }
}

function buildRefundReason({
  evidenceUrl,
  estimate,
  note,
  reason,
}) {
  return [
    `Lý do khách chọn: ${reason}`,
    note ? `Mô tả thêm: ${note}` : '',
    evidenceUrl ? `Minh chứng: ${evidenceUrl}` : '',
    `Số tiền hoàn dự kiến: ${formatCurrencyVND(estimate.refundAmount)}`,
    `Cách tính: ${estimate.explanation}`,
  ].filter(Boolean).join('\n')
}

function CustomerRefundRequestPage() {
  const { bookingCode } = useParams()
  const navigate = useNavigate()
  const { authState, isCustomer } = usePublicSession()
  const [booking, setBooking] = useState(null)
  const [bookingItems, setBookingItems] = useState([])
  const [payments, setPayments] = useState([])
  const [refunds, setRefunds] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [reasonChoice, setReasonChoice] = useState(REFUND_REASON_OPTIONS[0])
  const [customReason, setCustomReason] = useState('')
  const [note, setNote] = useState('')
  const [evidenceFile, setEvidenceFile] = useState(null)

  useEffect(() => {
    let isActive = true

    async function loadRefundContext() {
      setLoading(true)
      setError('')

      try {
        const bookingResponse = await getBookingByCode(bookingCode, { authState })

        if (!bookingResponse.success || !bookingResponse.data?.booking) {
          throw new Error(bookingResponse.message || 'Không thể tải thông tin đơn hàng.')
        }

        const nextBooking = bookingResponse.data.booking
        const nextItems = Array.isArray(bookingResponse.data.booking_items)
          ? bookingResponse.data.booking_items
          : []
        const [paymentsResponse, refundsResponse] = await Promise.all([
          listCustomerBookingPayments(nextBooking.id),
          listCustomerBookingRefunds(nextBooking.id).catch(() => ({ data: { refunds: [] } })),
        ])

        if (!isActive) {
          return
        }

        setBooking(nextBooking)
        setBookingItems(nextItems)
        setPayments(Array.isArray(paymentsResponse.data) ? paymentsResponse.data : [])
        setRefunds(Array.isArray(refundsResponse.data?.refunds) ? refundsResponse.data.refunds : [])
      } catch (loadError) {
        if (isActive) {
          setError(loadError?.message || 'Không thể tải thông tin yêu cầu hoàn tiền.')
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadRefundContext()

    return () => {
      isActive = false
    }
  }, [authState, bookingCode])

  const refundablePayment = useMemo(() => pickRefundablePayment(payments), [payments])
  const activeRefundAmount = useMemo(() => sumActiveRefunds(refunds), [refunds])
  const remainingRefundableAmount = Math.max(
    Number(refundablePayment?.amount || booking?.total_amount || 0) - activeRefundAmount,
    0,
  )
  const estimate = useMemo(
    () => calculateRefundEstimate({
      baseAmount: remainingRefundableAmount,
      policyText: getCancellationPolicyText(bookingItems),
      startAt: getTripStartAt(bookingItems),
    }),
    [bookingItems, remainingRefundableAmount],
  )
  const requestedRefundAmount =
    estimate.refundAmount > 0 ? estimate.refundAmount : remainingRefundableAmount
  const requiresManualReview =
    estimate.refundAmount <= 0 && requestedRefundAmount > 0
  const selectedReason = reasonChoice === 'Khác' ? customReason.trim() : reasonChoice
  const bookingStatus = booking?.booking_status ?? booking?.status
  const isBookingRefundable = REFUNDABLE_BOOKING_STATUSES.has(bookingStatus)
  const canSubmit =
    Boolean(booking?.id) &&
    Boolean(refundablePayment?.id) &&
    Boolean(selectedReason) &&
    isBookingRefundable &&
    requestedRefundAmount > 0 &&
    !submitting

  function goBack() {
    navigate(buildPublicAuthPath(`/profile/trips/${bookingCode}`, isCustomer))
  }

  async function submitRefundRequest(event) {
    event.preventDefault()

    if (!canSubmit) {
      setFeedback(
        'Vui lòng chọn lý do và kiểm tra đơn hàng còn giao dịch đủ điều kiện hoàn tiền trước khi gửi.',
      )
      return
    }

    setSubmitting(true)
    setFeedback('')
    setError('')

    try {
      let evidenceUrl = ''

      if (evidenceFile) {
        const uploadResponse = await uploadRefundEvidenceAsset(evidenceFile)
        evidenceUrl = uploadResponse.data?.asset_url || uploadResponse.data?.url || ''
      }

      const response = await createCustomerRefundRequest(booking.id, {
        amount: requestedRefundAmount,
        payment_id: refundablePayment.id,
        reason: buildRefundReason({
          evidenceUrl,
          estimate: {
            ...estimate,
            refundAmount: requestedRefundAmount,
          },
          note: note.trim(),
          reason: selectedReason,
        }),
      })

      setFeedback(response.message || 'Đã gửi yêu cầu hoàn tiền. Bộ phận vận hành sẽ kiểm tra và phản hồi.')
      window.setTimeout(() => {
        navigate(buildPublicAuthPath(`/profile/trips/${bookingCode}`, isCustomer), {
          state: {
            refundCreated: response.data?.refund,
          },
        })
      }, 900)
    } catch (submitError) {
      setError(submitError?.message || 'Không thể gửi yêu cầu hoàn tiền lúc này.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="profile-page customer-refund-page">
      <main className="profile-shell customer-refund-shell">
        <button className="customer-refund-back" type="button" onClick={goBack}>
          <span aria-hidden="true">‹</span>
          <span>Quay lại chi tiết đơn</span>
        </button>

        <section className="customer-refund-card customer-refund-card--hero">
          <div>
            <p>Yêu cầu hoàn tiền</p>
            <h1>{getTripTitle(booking, bookingItems)}</h1>
            <span>Mã đơn {booking?.booking_code || bookingCode}</span>
          </div>
          <strong>{formatCurrencyVND(requestedRefundAmount)}</strong>
        </section>

        {loading ? (
          <section className="customer-refund-card" role="status">
            <p>Đang tải dữ liệu đơn hàng và chính sách hoàn tiền...</p>
          </section>
        ) : null}

        {!loading ? (
          <form className="customer-refund-grid" onSubmit={submitRefundRequest}>
            <section className="customer-refund-card customer-refund-form">
              {error ? <p className="customer-refund-alert customer-refund-alert--error">{error}</p> : null}
              {feedback ? <p className="customer-refund-alert customer-refund-alert--success">{feedback}</p> : null}

              <div className="customer-refund-field">
                <label>Lý do hủy/hoàn tiền</label>
                <div className="customer-refund-reasons">
                  {REFUND_REASON_OPTIONS.map((reason) => (
                    <label key={reason}>
                      <input
                        checked={reasonChoice === reason}
                        name="refund_reason"
                        type="radio"
                        value={reason}
                        onChange={() => setReasonChoice(reason)}
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {reasonChoice === 'Khác' ? (
                <div className="customer-refund-field">
                  <label htmlFor="custom-refund-reason">Nhập lý do khác</label>
                  <input
                    id="custom-refund-reason"
                    placeholder="Ví dụ: thay đổi kế hoạch đột xuất..."
                    value={customReason}
                    onChange={(event) => setCustomReason(event.target.value)}
                  />
                </div>
              ) : null}

              <div className="customer-refund-field">
                <label htmlFor="refund-note">Mô tả thêm</label>
                <textarea
                  id="refund-note"
                  placeholder="Nêu thêm bối cảnh để bộ phận vận hành dễ kiểm tra yêu cầu của bạn."
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>

              <div className="customer-refund-field">
                <label htmlFor="refund-evidence">Minh chứng (không bắt buộc)</label>
                <input
                  accept="image/*"
                  id="refund-evidence"
                  type="file"
                  onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
                />
                <small>Nếu có, bạn có thể tải ảnh giấy tờ, xác nhận y tế, lịch thay đổi hoặc bằng chứng liên quan để bộ phận vận hành kiểm tra nhanh hơn.</small>
              </div>

              <div className="customer-refund-actions">
                <button type="button" onClick={goBack}>
                  Quay lại
                </button>
                <button disabled={!canSubmit} type="submit">
                  {submitting ? 'Đang gửi...' : 'Gửi yêu cầu hoàn tiền'}
                </button>
              </div>
            </section>

            <aside className="customer-refund-card customer-refund-summary">
              <p>{requiresManualReview ? 'Khoản hoàn đề nghị' : 'Khoản hoàn dự kiến'}</p>
              <strong>{formatCurrencyVND(requestedRefundAmount)}</strong>
              <dl>
                <div>
                  <dt>Ngày khởi hành</dt>
                  <dd>{formatDate(getTripStartAt(bookingItems))}</dd>
                </div>
                <div>
                  <dt>Số tiền còn có thể hoàn</dt>
                  <dd>{formatCurrencyVND(remainingRefundableAmount)}</dd>
                </div>
                <div>
                  <dt>Chính sách áp dụng</dt>
                  <dd>{estimate.feeLabel}</dd>
                </div>
                {getCancellationPolicyText(bookingItems) ? (
                  <div>
                    <dt>Chính sách dịch vụ</dt>
                    <dd>{getCancellationPolicyText(bookingItems)}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="customer-refund-explain">{estimate.explanation}</p>
              {requiresManualReview ? (
                <p className="customer-refund-alert customer-refund-alert--info">
                  Yêu cầu này sẽ được kiểm tra thủ công. Số tiền thực tế do bộ phận vận hành
                  phê duyệt theo chính sách và minh chứng của bạn.
                </p>
              ) : null}
              {!refundablePayment ? (
                <p className="customer-refund-alert customer-refund-alert--error">
                  Chưa tìm thấy giao dịch đã thanh toán thành công để tạo yêu cầu hoàn tiền.
                </p>
              ) : null}
              {refundablePayment && !isBookingRefundable ? (
                <p className="customer-refund-alert customer-refund-alert--error">
                  Trạng thái hiện tại của đơn hàng chưa cho phép gửi yêu cầu hoàn tiền.
                </p>
              ) : null}
              {refundablePayment && remainingRefundableAmount <= 0 ? (
                <p className="customer-refund-alert customer-refund-alert--error">
                  Giao dịch này không còn số tiền có thể yêu cầu hoàn.
                </p>
              ) : null}
            </aside>
          </form>
        ) : null}
      </main>
    </div>
  )
}

export default CustomerRefundRequestPage
