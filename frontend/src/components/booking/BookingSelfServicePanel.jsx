import {
  PublicButton,
  PublicCard,
  PublicEmptyState,
  PublicLoadingBlock,
  PublicNotice,
  PublicSectionHeader,
} from '../public/ui/index.js'
import './bookingSelfServicePanel.css'

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatDateTime(value) {
  const parsedDate = value ? new Date(value) : null

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return 'Đang cập nhật'
  }

  return dateTimeFormatter.format(parsedDate)
}

function formatStatusLabel(status = '') {
  return String(status).trim().replace(/_/g, ' ') || 'Đang cập nhật'
}

function formatNumberCurrency(amount = 0, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number(amount || 0))
}

function isRefundCreationAvailable(payment = {}) {
  return ['success', 'partially_refunded'].includes(String(payment.status ?? '').toLowerCase())
}

export default function BookingSelfServicePanel({
  actions,
  authState,
  booking,
  selfService,
}) {
  const availablePayments = Array.isArray(booking?.payments)
    ? booking.payments.filter(isRefundCreationAvailable)
    : []

  const isCustomerManagedBooking = authState === 'customer' && Boolean(booking?.id)

  if (!isCustomerManagedBooking) {
    return null
  }

  return (
    <div className="booking-self-service-panel">
      {selfService.feedback.message ? (
        <PublicNotice
          role="status"
          tone={selfService.feedback.tone === 'error' ? 'info' : selfService.feedback.tone}
        >
          {selfService.feedback.message}
        </PublicNotice>
      ) : null}

      <PublicCard padding="lg">
        <div className="booking-self-service-panel__group">
          <PublicSectionHeader
            eyebrow="Tự phục vụ"
            subtitle="Các API đơn hàng, tài liệu và hoàn tiền đã được nối trực tiếp để bạn xử lý nhanh từ màn này."
            title="Công cụ đơn đặt chỗ"
          />

          <div className="booking-self-service-panel__actions">
            <PublicButton
              loading={selfService.summaryLoading}
              type="button"
              variant="secondary"
              onClick={actions.downloadBookingSummary}
            >
              Tải tóm tắt PDF
            </PublicButton>

            <PublicButton
              loading={selfService.extraLoading}
              type="button"
              variant="ghost"
              onClick={actions.reloadSelfService}
            >
              Đồng bộ lại
            </PublicButton>
          </div>
        </div>
      </PublicCard>

      <PublicCard padding="lg">
        <div className="booking-self-service-panel__stack">
          <PublicSectionHeader
            subtitle="Dữ liệu từ `/bookings/:booking_id/invoice` giúp bạn kiểm tra nhanh số tiền và chứng từ."
            title="Tóm tắt chứng từ"
          />

          {selfService.extraLoading && !selfService.invoice ? (
            <PublicLoadingBlock rows={3} />
          ) : selfService.invoice ? (
            <>
              <div className="booking-self-service-panel__summary-row">
                <span>Loại chứng từ</span>
                <strong>{selfService.invoice.document_type || 'proforma'}</strong>
              </div>
              <div className="booking-self-service-panel__summary-row">
                <span>Tạm tính</span>
                <strong>
                  {formatNumberCurrency(
                    selfService.invoice.subtotal_amount,
                    selfService.invoice.currency,
                  )}
                </strong>
              </div>
              <div className="booking-self-service-panel__summary-row">
                <span>Giảm giá</span>
                <strong>
                  {formatNumberCurrency(
                    selfService.invoice.discount_amount,
                    selfService.invoice.currency,
                  )}
                </strong>
              </div>
              <div className="booking-self-service-panel__summary-row">
                <span>Tổng thanh toán</span>
                <strong>
                  {formatNumberCurrency(
                    selfService.invoice.total_amount,
                    selfService.invoice.currency,
                  )}
                </strong>
              </div>
            </>
          ) : (
            <PublicEmptyState
              description="Chứng từ sẽ hiển thị ở đây khi hệ thống trả về dữ liệu hợp lệ cho đơn này."
              eyebrow="Chưa có dữ liệu"
              title="Chưa tải được chứng từ"
            />
          )}
        </div>
      </PublicCard>

      <PublicCard padding="lg">
        <div className="booking-self-service-panel__stack">
          <PublicSectionHeader
            subtitle="Theo dõi các mốc thay đổi trạng thái lấy từ `/bookings/:booking_id/status-history`."
            title="Lịch sử trạng thái"
          />

          {selfService.extraLoading && selfService.statusHistory.length === 0 ? (
            <PublicLoadingBlock rows={4} />
          ) : selfService.statusHistory.length ? (
            <div className="booking-self-service-panel__timeline">
              {selfService.statusHistory.map((historyItem) => (
                <article className="booking-self-service-panel__status-item" key={historyItem.id}>
                  <div className="booking-self-service-panel__status-head">
                    <strong>{formatStatusLabel(historyItem.to_status)}</strong>
                    <span>{formatDateTime(historyItem.created_at)}</span>
                  </div>
                  <p>
                    {historyItem.from_status
                      ? `Từ ${formatStatusLabel(historyItem.from_status)} sang ${formatStatusLabel(historyItem.to_status)}.`
                      : 'Trạng thái khởi tạo của đơn đặt chỗ.'}
                  </p>
                  <p>
                    Nguồn cập nhật: {formatStatusLabel(historyItem.changed_by_type)}
                    {historyItem.reason ? ` • Lý do: ${historyItem.reason}` : ''}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <PublicEmptyState
              description="Hiện chưa có thêm mốc thay đổi trạng thái nào cho đơn này."
              eyebrow="Chưa có dữ liệu"
              title="Lịch sử trạng thái đang trống"
            />
          )}
        </div>
      </PublicCard>

      <PublicCard padding="lg">
        <div className="booking-self-service-panel__stack">
          <PublicSectionHeader
            subtitle="Gửi yêu cầu hủy hoặc hoàn tiền trực tiếp từ đơn hàng của bạn."
            title="Hủy đơn và hoàn tiền"
          />

          <form className="booking-self-service-panel__form" onSubmit={actions.submitCancellationRequest}>
            <label className="booking-self-service-panel__field">
              <span>Lý do muốn hủy đơn</span>
              <textarea
                name="cancellationReason"
                placeholder="Ví dụ: Tôi cần đổi lịch trình nên muốn gửi yêu cầu hủy."
                value={selfService.cancellationReason}
                onChange={actions.handleCancellationReasonChange}
              />
            </label>

            <div className="booking-self-service-panel__actions">
              <PublicButton
                loading={selfService.cancellationLoading}
                type="submit"
                variant="secondary"
              >
                Gửi yêu cầu hủy
              </PublicButton>
            </div>
          </form>

          <form className="booking-self-service-panel__form" onSubmit={actions.submitRefundRequest}>
            <label className="booking-self-service-panel__field">
              <span>Thanh toán cần hoàn</span>
              <select
                name="paymentId"
                value={selfService.refundDraft.paymentId}
                onChange={actions.handleRefundDraftChange}
              >
                <option value="">Chọn một thanh toán</option>
                {availablePayments.map((payment) => (
                  <option key={payment.id} value={payment.id}>
                    {payment.payment_code || payment.id} •{' '}
                    {formatNumberCurrency(payment.amount, payment.currency)}
                  </option>
                ))}
              </select>
            </label>

            <label className="booking-self-service-panel__field">
              <span>Số tiền hoàn</span>
              <input
                min="0"
                name="amount"
                placeholder="Ví dụ: 500000"
                step="1000"
                type="number"
                value={selfService.refundDraft.amount}
                onChange={actions.handleRefundDraftChange}
              />
            </label>

            <label className="booking-self-service-panel__field">
              <span>Lý do hoàn tiền</span>
              <textarea
                name="reason"
                placeholder="Ví dụ: Tôi cần hoàn một phần vì thay đổi dịch vụ."
                value={selfService.refundDraft.reason}
                onChange={actions.handleRefundDraftChange}
              />
            </label>

            <div className="booking-self-service-panel__actions">
              <PublicButton
                disabled={availablePayments.length === 0}
                loading={selfService.refundLoading}
                type="submit"
                variant="primary"
              >
                Gửi yêu cầu hoàn tiền
              </PublicButton>
            </div>
          </form>

          {selfService.refunds.length ? (
            <div className="booking-self-service-panel__refund-list">
              {selfService.refunds.map((refund) => (
                <article className="booking-self-service-panel__refund-item" key={refund.id}>
                  <div className="booking-self-service-panel__refund-head">
                    <strong>{refund.refund_code || refund.id}</strong>
                    <span>{formatStatusLabel(refund.status)}</span>
                  </div>

                  <div className="booking-self-service-panel__refund-meta">
                    <span>{formatNumberCurrency(refund.amount, booking.currency)}</span>
                    <span>{formatDateTime(refund.created_at)}</span>
                  </div>

                  <p>{refund.reason || 'Không có ghi chú bổ sung.'}</p>

                  <div className="booking-self-service-panel__refund-actions">
                    <button
                      className="booking-self-service-panel__ghost-button"
                      type="button"
                      onClick={() => actions.openRefundDetail(refund.id)}
                    >
                      Xem chi tiết
                    </button>
                    {String(refund.status).toLowerCase() === 'requested' ? (
                      <button
                        className="booking-self-service-panel__ghost-button"
                        type="button"
                        onClick={() => actions.cancelRefundRequest(refund.id)}
                      >
                        Hủy yêu cầu hoàn tiền
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <PublicEmptyState
              description="Các yêu cầu hoàn tiền của đơn này sẽ hiển thị tại đây sau khi được tạo."
              eyebrow="Chưa có dữ liệu"
              title="Chưa có yêu cầu hoàn tiền"
            />
          )}

          {selfService.selectedRefund ? (
            <PublicNotice tone="info">
              Đang xem {selfService.selectedRefund.refund_code || selfService.selectedRefund.id}
              {selfService.selectedRefund.reason
                ? ` • Lý do: ${selfService.selectedRefund.reason}`
                : ''}
            </PublicNotice>
          ) : null}
        </div>
      </PublicCard>
    </div>
  )
}
