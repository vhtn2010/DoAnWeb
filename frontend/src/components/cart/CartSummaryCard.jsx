import { useEffect, useState } from 'react'
import { LocalLoading } from '../loading/Loading.jsx'
import './cartSummaryCard.css'

function CloseIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="m5 5 10 10M15 5 5 15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function CartVoucherPickerModal({
  canApplyVoucherSelection,
  isLoading,
  isOpen,
  isVoucherLoading,
  onApplyVoucher,
  onClose,
  onReload,
  vouchers,
  vouchersError,
}) {
  const [manualVoucherCode, setManualVoucherCode] = useState('')
  const [manualFeedback, setManualFeedback] = useState('')

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handleEscapeKey(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscapeKey)

    return () => {
      window.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      setManualFeedback('')
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  async function handleManualVoucherSubmit(event) {
    event.preventDefault()

    const normalizedCode = manualVoucherCode.trim().toUpperCase()

    if (!normalizedCode) {
      setManualFeedback('Vui lòng nhập mã voucher cần lưu hoặc áp dụng.')
      return
    }

    if (!canApplyVoucherSelection) {
      setManualFeedback('Hãy chọn ít nhất một dịch vụ trong giỏ hàng trước khi lưu mã voucher.')
      return
    }

    setManualFeedback('')
    const applied = await onApplyVoucher(normalizedCode)

    if (applied) {
      setManualVoucherCode('')
    }
  }

  return (
    <div
      className="cart-voucher-modal"
      role="presentation"
      onClick={onClose}
    >
      <div
        aria-labelledby="cart-voucher-modal-title"
        aria-modal="true"
        className="cart-voucher-modal__dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cart-voucher-modal__header">
          <div className="cart-voucher-modal__copy">
            <span className="cart-voucher-modal__eyebrow">Kho voucher của tôi</span>
            <h3 id="cart-voucher-modal-title">Chọn voucher để áp dụng</h3>
            <p>Phiên bản mini của kho voucher, lấy trực tiếp từ các mã đang gắn với tài khoản của bạn.</p>
          </div>

          <button
            aria-label="Đóng danh sách voucher"
            className="cart-voucher-modal__close"
            type="button"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        {!canApplyVoucherSelection ? (
          <div className="cart-voucher-modal__notice" role="status">
            Hãy chọn ít nhất một dịch vụ trong giỏ hàng trước khi áp dụng hoặc lưu mã voucher.
          </div>
        ) : null}

        <form className="cart-voucher-modal__save" onSubmit={handleManualVoucherSubmit}>
          <div className="cart-voucher-modal__save-copy">
            <span>Nhập mã voucher</span>
            <p>Lưu mã mới vào phiên giỏ hàng hiện tại và áp dụng ngay nếu mã hợp lệ.</p>
          </div>

          <div className="cart-voucher-modal__save-row">
            <label className="cart-voucher-modal__sr-only" htmlFor="cart-voucher-manual-code">
              Mã voucher
            </label>
            <input
              autoComplete="off"
              className="cart-voucher-modal__input"
              id="cart-voucher-manual-code"
              placeholder="Ví dụ: NETVIET500"
              type="text"
              value={manualVoucherCode}
              onChange={(event) => {
                setManualVoucherCode(event.target.value.toUpperCase())
                setManualFeedback('')
              }}
            />
            <button
              className="cart-voucher-modal__save-button"
              disabled={isVoucherLoading}
              type="submit"
            >
              {isVoucherLoading ? 'Đang lưu...' : 'Lưu mã'}
            </button>
          </div>

          {manualFeedback ? (
            <p className="cart-voucher-modal__feedback" role="status">
              {manualFeedback}
            </p>
          ) : null}
        </form>

        {isLoading ? (
          <LocalLoading className="cart-voucher-modal__state" minHeight="140px" />
        ) : null}

        {!isLoading && vouchersError ? (
          <div className="cart-voucher-modal__state cart-voucher-modal__state--error" role="alert">
            <p>{vouchersError}</p>
            <button
              className="cart-summary-card__ghost-button"
              type="button"
              onClick={onReload}
            >
              Tải lại voucher
            </button>
          </div>
        ) : null}

        {!isLoading && !vouchersError && vouchers.length === 0 ? (
          <div className="cart-voucher-modal__state" role="status">
            Hiện bạn chưa có voucher nào khả dụng trong kho.
          </div>
        ) : null}

        {!isLoading && !vouchersError && vouchers.length > 0 ? (
          <div className="cart-voucher-modal__list">
            {vouchers.map((voucher) => {
              const isActiveVoucher = voucher.status === 'active'

              return (
                <article
                  className={
                    isActiveVoucher
                      ? 'cart-voucher-card'
                      : 'cart-voucher-card cart-voucher-card--muted'
                  }
                  key={voucher.id || voucher.code}
                >
                  <div className="cart-voucher-card__code-panel">
                    <strong>{voucher.code}</strong>
                    <span>Mã Khuyến Mãi</span>
                  </div>

                  <div className="cart-voucher-card__content">
                    <div className="cart-voucher-card__top">
                      <div>
                        <h4>{voucher.title}</h4>
                      </div>
                      <strong className="cart-voucher-card__discount">{voucher.discount_label}</strong>
                    </div>

                    <p className="cart-voucher-card__description">{voucher.description}</p>

                    <div className="cart-voucher-card__meta">
                      <span>{voucher.target_label}</span>
                      <span>{voucher.min_order_label}</span>
                      <span>{voucher.validity_label}</span>
                    </div>

                    {voucher.promotion_name ? (
                      <div className="cart-voucher-card__promotion">{voucher.promotion_name}</div>
                    ) : null}

                    <div className="cart-voucher-card__actions">
                      <button
                        className="cart-summary-card__ghost-button cart-summary-card__ghost-button--brand"
                        disabled={!isActiveVoucher || !canApplyVoucherSelection || isVoucherLoading}
                        type="button"
                        onClick={() => onApplyVoucher(voucher.code)}
                      >
                        {isVoucherLoading ? 'Đang áp dụng...' : 'Áp dụng voucher này'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function getVoucherWalletMessage({ availableVoucherCount, isCustomer }) {
  if (!isCustomer) {
    return 'Đăng nhập tài khoản khách hàng để mở kho voucher cá nhân của bạn.'
  }

  if (availableVoucherCount <= 0) {
    return 'Hiện bạn chưa có voucher khả dụng trong kho.'
  }

  if (availableVoucherCount === 1) {
    return 'Bạn đang có 1 voucher khả dụng, hãy mở kho để chọn áp dụng.'
  }

  return `Bạn đang có ${availableVoucherCount} voucher khả dụng, hãy mở kho để chọn voucher phù hợp.`
}

function CartSummaryCard({
  appliedVoucher,
  availableVoucherCount,
  canApplyVoucherSelection,
  feedbackHint,
  isCheckingOut,
  isContinueDisabled,
  isCustomer,
  isVoucherLoading,
  isVoucherPickerOpen,
  isVoucherWalletLoading,
  onApplyVoucher,
  onCloseVoucherPicker,
  onContinue,
  onOpenVoucherPicker,
  onReloadVoucherWallet,
  onRemoveVoucher,
  summary,
  voucherWallet,
  voucherWalletError,
}) {
  return (
    <>
      <section className="cart-summary-card">
        <div className="cart-summary-card__accent" aria-hidden="true" />
        <div className="cart-summary-card__header">
          <h2 className="cart-summary-card__title">Tổng tiền</h2>
          <strong className="cart-summary-card__amount">{summary.total_amount}</strong>
        </div>

        <div className="cart-summary-card__details">
          <div className="cart-summary-card__row">
            <span>Đã chọn</span>
            <strong>{summary.selected_item_count} dịch vụ</strong>
          </div>
          <div className="cart-summary-card__row">
            <span>Tạm tính</span>
            <strong>{summary.subtotal_amount}</strong>
          </div>
          {summary.discount_amount_value > 0 ? (
            <div className="cart-summary-card__row">
              <span>Giảm giá</span>
              <strong>-{summary.discount_amount}</strong>
            </div>
          ) : null}
          {summary.vat_amount_value > 0 ? (
            <div className="cart-summary-card__row">
              <span>Thuế VAT (8%)</span>
              <strong>{summary.vat_amount}</strong>
            </div>
          ) : null}
          {summary.service_fee_amount_value > 0 ? (
            <div className="cart-summary-card__row">
              <span>Phí dịch vụ</span>
              <strong>{summary.service_fee_amount}</strong>
            </div>
          ) : null}
          {summary.surcharge_amount_value > 0 ? (
            <div className="cart-summary-card__row">
              <span>Phụ thu</span>
              <strong>{summary.surcharge_amount}</strong>
            </div>
          ) : null}
        </div>

        <div className="cart-summary-card__details">
          <div className="cart-summary-card__row">
            <span>Mã ưu đãi</span>
            <strong>{appliedVoucher?.code || 'Chưa áp dụng'}</strong>
          </div>

          <div className="cart-summary-card__voucher-panel">
            <div className="cart-summary-card__voucher-copy">
              <span className="cart-summary-card__voucher-label">Kho voucher của tôi</span>
              <p>{getVoucherWalletMessage({ availableVoucherCount, isCustomer })}</p>
            </div>

            <div className="cart-summary-card__voucher-actions">
              <button
                className="cart-summary-card__ghost-button cart-summary-card__ghost-button--brand"
                disabled={!isCustomer}
                type="button"
                onClick={onOpenVoucherPicker}
              >
                Chọn từ kho voucher
              </button>

              <button
                className="cart-summary-card__ghost-button"
                disabled={isVoucherLoading || !appliedVoucher}
                type="button"
                onClick={onRemoveVoucher}
              >
                Gỡ voucher
              </button>
            </div>
          </div>
        </div>

        <button
          aria-busy={isCheckingOut}
          className="cart-summary-card__button"
          disabled={isContinueDisabled}
          type="button"
          onClick={onContinue}
        >
          {isCheckingOut ? 'Đang kiểm tra...' : 'Tiếp tục'}
        </button>

        <p className="cart-summary-card__hint">
          {feedbackHint || 'Bạn có thể tiếp tục đặt dịch vụ và nhập thông tin liên hệ ở bước tiếp theo.'}
        </p>
      </section>

      <CartVoucherPickerModal
        canApplyVoucherSelection={canApplyVoucherSelection}
        isLoading={isVoucherWalletLoading}
        isOpen={isVoucherPickerOpen}
        isVoucherLoading={isVoucherLoading}
        onApplyVoucher={onApplyVoucher}
        onClose={onCloseVoucherPicker}
        onReload={onReloadVoucherWallet}
        vouchers={voucherWallet}
        vouchersError={voucherWalletError}
      />
    </>
  )
}

export default CartSummaryCard
