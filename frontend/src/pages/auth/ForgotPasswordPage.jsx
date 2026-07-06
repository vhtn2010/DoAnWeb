import { Link } from 'react-router-dom'
import useForgotPasswordForm from '../../hooks/useForgotPasswordForm.js'
import './authTemplate.css'

function MailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m6 8 5.1 4a1.5 1.5 0 0 0 1.8 0L18 8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function CodeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M8.5 8 5 12l3.5 4M15.5 8 19 12l-3.5 4M13.5 6 10.5 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M7.5 10V8.5a4.5 4.5 0 1 1 9 0V10"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 13.5v3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function EyeIcon({ visible }) {
  if (visible) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path
          d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M3 3 21 21M10.7 6A10.3 10.3 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15.7 15.7 0 0 1-4 4.7M14.5 14.7A3 3 0 0 1 9.3 9.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M6.8 6.8A15.9 15.9 0 0 0 2.5 12S6 18.5 12 18.5c1.8 0 3.3-.6 4.5-1.4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function ForgotPasswordPage() {
  const {
    errors,
    feedbackMessage,
    feedbackTone,
    formValues,
    handleFieldChange,
    handleSendCode,
    handleSubmit,
    isSendingCode,
    isSubmitting,
    sentCode,
    setShowConfirmPassword,
    setShowPassword,
    showConfirmPassword,
    showPassword,
  } = useForgotPasswordForm()

  return (
    <section className="auth-forgot-page">
      <img
        alt="Nét Việt Travel"
        className="auth-forgot-page__logo"
        src="/assets/template/auth/quenmatkhau/forgot-password-logo.png"
      />

      <div className="auth-forgot-page__card">
        <header className="auth-forgot-page__header">
          <div className="auth-forgot-page__copy">
            <h1 className="auth-forgot-page__title">Quên mật khẩu</h1>
            <p className="auth-forgot-page__description">
              Nhập địa chỉ email đã đăng ký để nhận liên kết đặt lại mật khẩu.
            </p>
          </div>
        </header>

        <form className="auth-forgot-form" noValidate onSubmit={handleSubmit}>
          <label className="auth-forgot-form__field" htmlFor="forgot-password-email">
            <span className="auth-forgot-form__label">Địa chỉ Email</span>
            <div
              className={`auth-forgot-form__control auth-forgot-form__control--email${
                errors.email ? ' auth-forgot-form__control--error' : ''
              }`}
            >
              <span aria-hidden="true" className="auth-forgot-form__icon">
                <MailIcon />
              </span>
              <input
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                className="auth-forgot-form__input"
                id="forgot-password-email"
                name="email"
                placeholder="example@gmail.com"
                type="email"
                value={formValues.email}
                onChange={handleFieldChange}
              />
              <button
                className={`auth-forgot-form__inline-button${sentCode ? ' auth-forgot-form__inline-button--sent' : ''}`}
                disabled={isSendingCode}
                type="button"
                onClick={handleSendCode}
              >
                {isSendingCode ? 'Đang gửi...' : sentCode ? 'Đã gửi' : 'Gửi link'}
              </button>
            </div>
            {errors.email ? <p className="auth-form__field-error">{errors.email}</p> : null}
          </label>

          <label className="auth-forgot-form__field" htmlFor="forgot-password-code">
            <span className="auth-forgot-form__label">Token đặt lại mật khẩu</span>
            <div
              className={`auth-forgot-form__control${
                errors.otp_code ? ' auth-forgot-form__control--error' : ''
              }`}
            >
              <span aria-hidden="true" className="auth-forgot-form__icon">
                <CodeIcon />
              </span>
              <input
                aria-invalid={Boolean(errors.otp_code)}
                className="auth-forgot-form__input"
                id="forgot-password-code"
                name="otp_code"
                placeholder="Dán token từ email"
                type="text"
                value={formValues.otp_code}
                onChange={handleFieldChange}
              />
            </div>
            {errors.otp_code ? <p className="auth-form__field-error">{errors.otp_code}</p> : null}
          </label>

          <label className="auth-forgot-form__field" htmlFor="forgot-password-new-password">
            <span className="auth-forgot-form__label">Mật khẩu mới</span>
            <div
              className={`auth-forgot-form__control${
                errors.new_password ? ' auth-forgot-form__control--error' : ''
              }`}
            >
              <span aria-hidden="true" className="auth-forgot-form__icon">
                <LockIcon />
              </span>
              <input
                autoComplete="new-password"
                aria-invalid={Boolean(errors.new_password)}
                className="auth-forgot-form__input"
                id="forgot-password-new-password"
                name="new_password"
                placeholder="••••••••"
                type={showPassword ? 'text' : 'password'}
                value={formValues.new_password}
                onChange={handleFieldChange}
              />
              <button
                aria-label={showPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                className="auth-forgot-form__toggle"
                type="button"
                onClick={() => setShowPassword((value) => !value)}
              >
                <EyeIcon visible={showPassword} />
              </button>
            </div>
            {errors.new_password ? (
              <p className="auth-form__field-error">{errors.new_password}</p>
            ) : null}
          </label>

          <label className="auth-forgot-form__field" htmlFor="forgot-password-confirm-password">
            <span className="auth-forgot-form__label">Nhập lại mật khẩu mới</span>
            <div
              className={`auth-forgot-form__control${
                errors.confirm_password ? ' auth-forgot-form__control--error' : ''
              }`}
            >
              <span aria-hidden="true" className="auth-forgot-form__icon">
                <LockIcon />
              </span>
              <input
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirm_password)}
                className="auth-forgot-form__input"
                id="forgot-password-confirm-password"
                name="confirm_password"
                placeholder="••••••••"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formValues.confirm_password}
                onChange={handleFieldChange}
              />
              <button
                aria-label={
                  showConfirmPassword
                    ? 'Ẩn xác nhận mật khẩu mới'
                    : 'Hiện xác nhận mật khẩu mới'
                }
                className="auth-forgot-form__toggle"
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
              >
                <EyeIcon visible={showConfirmPassword} />
              </button>
            </div>
            {errors.confirm_password ? (
              <p className="auth-form__field-error">{errors.confirm_password}</p>
            ) : null}
          </label>

          <label className="auth-forgot-form__agreement" htmlFor="forgot-password-agreement">
            <input
              checked={formValues.accepted_terms}
              id="forgot-password-agreement"
              name="accepted_terms"
              type="checkbox"
              onChange={handleFieldChange}
            />
            <span>
              Tôi đồng ý với <a href="#">Điều khoản</a> & <a href="#">Chính sách bảo mật</a> của
              Nét Việt.
            </span>
          </label>
          {errors.accepted_terms ? (
            <p className="auth-form__field-error">{errors.accepted_terms}</p>
          ) : null}

          {feedbackMessage ? (
            <p className={`auth-form__feedback auth-form__feedback--${feedbackTone}`}>
              {feedbackMessage}
            </p>
          ) : null}

          <div className="auth-forgot-form__actions">
            <button
              className="auth-forgot-form__button auth-forgot-form__button--primary"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Hoàn tất thay đổi'}
            </button>
            <Link
              className="auth-forgot-form__button auth-forgot-form__button--secondary"
              to="/login"
            >
              Hủy bỏ
            </Link>
          </div>
        </form>
      </div>
    </section>
  )
}

export default ForgotPasswordPage
