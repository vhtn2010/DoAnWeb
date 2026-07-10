import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useLoginForm from '../../hooks/useLoginForm.js'
import './authTemplate.css'

function SocialButton({ children, disabled, onClick, provider }) {
  return (
    <button
      className="auth-login-form__social-button"
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      <span aria-hidden="true" className="auth-login-form__social-icon">
        {children}
      </span>
      <span>{provider}</span>
    </button>
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

function LoginPage() {
  const [showPassword, setShowPassword] = useState(() => false)
  const {
    errors,
    feedbackMessage,
    feedbackTone,
    formValues,
    handleFieldChange,
    handleSocialLogin,
    handleSubmit,
    isSubmitting,
  } = useLoginForm()

  useEffect(() => {
    setShowPassword(false)
  }, [])

  useEffect(() => {
    if (isSubmitting) {
      setShowPassword(false)
    }
  }, [isSubmitting])

  return (
    <section className="auth-login-page">
      <header className="auth-login-page__header">
        <div className="auth-login-page__tabs" role="tablist" aria-label="Điều hướng xác thực">
          <span
            aria-selected="true"
            className="auth-login-page__tab auth-login-page__tab--active"
            role="tab"
          >
            ĐĂNG NHẬP
          </span>
          <Link className="auth-login-page__tab" role="tab" to="/register">
            ĐĂNG KÝ
          </Link>
        </div>

        <div className="auth-login-page__intro">
          <h1 className="auth-login-page__title">Chào mừng trở lại</h1>
          <p className="auth-login-page__subtitle">
            Vui lòng đăng nhập để bắt đầu chuyến đi của bạn.
          </p>
        </div>
      </header>

      <form className="auth-login-form" noValidate onSubmit={handleSubmit}>
        <label className="auth-login-form__field" htmlFor="login-email">
          <span className="auth-login-form__label">Địa chỉ Email</span>
          <input
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            className={`auth-login-form__input${
              errors.email ? ' auth-login-form__input--error' : ''
            } auth-login-form__input--email`}
            id="login-email"
            name="email"
            placeholder="VD: email@gmail.com"
            type="email"
            value={formValues.email}
            onChange={handleFieldChange}
          />
          {errors.email ? <p className="auth-form__field-error">{errors.email}</p> : null}
        </label>

        <label className="auth-login-form__field" htmlFor="login-password">
          <span className="auth-login-form__label">Mật khẩu</span>
          <div
            className={`auth-login-form__control${
              errors.password ? ' auth-login-form__control--error' : ''
            }`}
          >
            <input
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              className="auth-login-form__input auth-login-form__input--password"
              id="login-password"
              name="password"
              placeholder="Nhập mật khẩu"
              type={showPassword ? 'text' : 'password'}
              value={formValues.password}
              onChange={handleFieldChange}
            />
            <button
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="auth-login-form__toggle"
              type="button"
              onClick={() => setShowPassword((currentValue) => !currentValue)}
            >
              <EyeIcon visible={showPassword} />
            </button>
          </div>
          {errors.password ? <p className="auth-form__field-error">{errors.password}</p> : null}
        </label>

        <div className="auth-login-form__meta">
          <Link className="auth-login-form__forgot-link" to="/forgot-password">
            Quên mật khẩu?
          </Link>
        </div>

        {feedbackMessage ? (
          <p className={`auth-form__feedback auth-form__feedback--${feedbackTone}`}>
            {feedbackMessage}
          </p>
        ) : null}

        <button className="auth-login-form__submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>

      <section className="auth-login-social" aria-label="Đăng nhập mạng xã hội">
        <div className="auth-login-social__divider">
          <span>HOẶC TIẾP TỤC VỚI</span>
        </div>

        <div className="auth-login-social__actions">
          <SocialButton
            disabled={isSubmitting}
            provider="Google"
            onClick={() => handleSocialLogin('google')}
          >
            <svg fill="none" viewBox="0 0 24 24">
              <path
                d="M20.5 12.3c0-.7-.1-1.3-.2-1.9H12v3.6h4.7a4 4 0 0 1-1.8 2.6v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5Z"
                fill="#F4C542"
              />
              <path
                d="M12 21c2.4 0 4.4-.8 5.9-2.2l-2.9-2.2c-.8.5-1.8.9-3 .9-2.3 0-4.2-1.5-4.9-3.6H4.1v2.3A9 9 0 0 0 12 21Z"
                fill="#D62828"
              />
              <path
                d="M7.1 13.9A5.4 5.4 0 0 1 7.1 10.1V7.8h-3A9 9 0 0 0 3 12c0 1.4.3 2.7 1.1 3.9l3-2Z"
                fill="#F7D878"
              />
              <path
                d="M12 6.5c1.3 0 2.5.5 3.4 1.3l2.5-2.5A8.5 8.5 0 0 0 12 3a9 9 0 0 0-7.9 4.8l3 2.3C7.8 8 9.7 6.5 12 6.5Z"
                fill="#FFFFFF"
              />
            </svg>
          </SocialButton>

          <SocialButton
            disabled={isSubmitting}
            provider="Facebook"
            onClick={() => handleSocialLogin('facebook')}
          >
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M13.8 20v-6h2.6l.4-3h-3V9.1c0-.9.3-1.6 1.6-1.6H17V4.8c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4V11H8.3v3h2.5v6h3Z" />
            </svg>
          </SocialButton>
        </div>
      </section>

      <div className="auth-login-page__footer">
        <span>Chưa có tài khoản?</span>
        <Link className="auth-login-page__footer-link" to="/register">
          Đăng ký ngay
        </Link>
      </div>
    </section>
  )
}

export default LoginPage
