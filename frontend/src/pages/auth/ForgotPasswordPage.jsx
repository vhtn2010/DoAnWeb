import { useState } from 'react'
import { Link } from 'react-router-dom'
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [sentCode, setSentCode] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <section className="auth-forgot-page">
      <header className="auth-forgot-page__header">
        <img
          alt="Nét Việt Travel"
          className="auth-forgot-page__logo"
          src="/assets/template/auth/quenmatkhau/forgot-password-logo.png"
        />
        <div className="auth-forgot-page__copy">
          <h1 className="auth-forgot-page__title">Quên mật khẩu</h1>
          <p className="auth-forgot-page__description">
            Nhập địa chỉ email đã đăng ký để nhận liên kết đặt lại mật khẩu.
          </p>
        </div>
      </header>

      <form className="auth-forgot-form" onSubmit={handleSubmit}>
        <label className="auth-forgot-form__field" htmlFor="forgot-password-email">
          <span className="auth-forgot-form__label">Địa chỉ Email</span>
          <div className="auth-forgot-form__control auth-forgot-form__control--email">
            <span aria-hidden="true" className="auth-forgot-form__icon">
              <MailIcon />
            </span>
            <input
              autoComplete="email"
              className="auth-forgot-form__input"
              id="forgot-password-email"
              name="email"
              placeholder="example@gmail.com"
              type="email"
            />
            <button
              className={`auth-forgot-form__inline-button${sentCode ? ' auth-forgot-form__inline-button--sent' : ''}`}
              type="button"
              onClick={() => setSentCode(true)}
            >
              {sentCode ? 'Đã gửi' : 'Gửi mã'}
            </button>
          </div>
        </label>

        <label className="auth-forgot-form__field" htmlFor="forgot-password-code">
          <span className="auth-forgot-form__label">Mã xác nhận</span>
          <div className="auth-forgot-form__control">
            <span aria-hidden="true" className="auth-forgot-form__icon">
              <CodeIcon />
            </span>
            <input
              className="auth-forgot-form__input"
              id="forgot-password-code"
              name="verificationCode"
              placeholder="1234"
              type="text"
            />
          </div>
        </label>

        <label className="auth-forgot-form__field" htmlFor="forgot-password-new-password">
          <span className="auth-forgot-form__label">Mật khẩu mới</span>
          <div className="auth-forgot-form__control">
            <span aria-hidden="true" className="auth-forgot-form__icon">
              <LockIcon />
            </span>
            <input
              autoComplete="new-password"
              className="auth-forgot-form__input"
              id="forgot-password-new-password"
              name="newPassword"
              placeholder="••••••••"
              type={showPassword ? 'text' : 'password'}
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
        </label>

        <label className="auth-forgot-form__field" htmlFor="forgot-password-confirm-password">
          <span className="auth-forgot-form__label">Nhập lại mật khẩu mới</span>
          <div className="auth-forgot-form__control">
            <span aria-hidden="true" className="auth-forgot-form__icon">
              <LockIcon />
            </span>
            <input
              autoComplete="new-password"
              className="auth-forgot-form__input"
              id="forgot-password-confirm-password"
              name="confirmPassword"
              placeholder="••••••••"
              type={showConfirmPassword ? 'text' : 'password'}
            />
            <button
              aria-label={showConfirmPassword ? 'Ẩn xác nhận mật khẩu mới' : 'Hiện xác nhận mật khẩu mới'}
              className="auth-forgot-form__toggle"
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
            >
              <EyeIcon visible={showConfirmPassword} />
            </button>
          </div>
        </label>

        <label className="auth-forgot-form__agreement" htmlFor="forgot-password-agreement">
          <input
            checked={acceptedTerms}
            id="forgot-password-agreement"
            name="agreement"
            type="checkbox"
            onChange={(event) => setAcceptedTerms(event.target.checked)}
          />
          <span>
            Tôi đồng ý với <a href="#">Điều khoản</a> & <a href="#">Chính sách bảo mật</a> của
            Nét Việt.
          </span>
        </label>

        <div className="auth-forgot-form__actions">
          <button className="auth-forgot-form__button auth-forgot-form__button--primary" type="submit">
            Hoàn tất thay đổi
          </button>
          <Link className="auth-forgot-form__button auth-forgot-form__button--secondary" to="/login">
            Hủy bỏ
          </Link>
        </div>
      </form>
    </section>
  )
}

export default ForgotPasswordPage
