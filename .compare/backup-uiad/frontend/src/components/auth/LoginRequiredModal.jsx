import { useEffect, useId } from 'react'

function CloseIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M6 6 18 18M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function LoginRequiredModal({ isOpen, onClose, onLogin }) {
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      className="login-required-modal"
      role="dialog"
    >
      <div className="login-required-modal__backdrop" />
      <div className="login-required-modal__dialog">
        <button
          aria-label="Đóng popup đăng nhập"
          className="login-required-modal__close"
          type="button"
          onClick={onClose}
        >
          <CloseIcon />
        </button>

        <div className="login-required-modal__content">
          <p className="login-required-modal__eyebrow">Giỏ hàng</p>
          <h2 className="login-required-modal__title" id={titleId}>
            Vui lòng đăng nhập để có thể thêm vào giỏ hàng
          </h2>
          <p className="login-required-modal__description" id={descriptionId}>
            Đăng nhập để lưu dịch vụ bạn chọn và tiếp tục đặt chỗ thuận tiện hơn.
          </p>
        </div>

        <div className="login-required-modal__actions">
          <button
            className="login-required-modal__button login-required-modal__button--primary"
            type="button"
            onClick={onLogin}
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginRequiredModal
