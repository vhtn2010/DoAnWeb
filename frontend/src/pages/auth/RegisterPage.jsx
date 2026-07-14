import { useState } from 'react'
import { Link } from 'react-router-dom'
import useRegisterForm from '../../hooks/useRegisterForm.js'
import './authTemplate.css'

function buildVerifyEmailLink(email = '') {
  const normalizedEmail = String(email).trim().toLowerCase()

  if (!normalizedEmail) {
    return '/verify-email'
  }

  return `/verify-email?email=${encodeURIComponent(normalizedEmail)}`
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

function RegisterPage() {
  const [showPassword, setShowPassword] = useState(() => false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(() => false)
  const {
    errors,
    feedbackMessage,
    feedbackTone,
    formValues,
    handleFieldChange,
    handleSubmit,
    isSubmitting,
    registeredEmail,
  } = useRegisterForm()
  const shouldShowVerificationActions = feedbackTone === 'success' && Boolean(feedbackMessage)

  return (
    <section className="auth-register-page">
      <img
        alt="Nét Việt Travel"
        className="auth-register-page__logo"
        src="/assets/template/auth/dangky/logo.png"
      />

      <div className="auth-register-page__card">
        <header className="auth-template-page__header auth-register-page__header">
          <div className="auth-template-page__copy auth-register-page__copy">
            <h1 className="auth-template-page__title">Đăng ký tài khoản</h1>
            <p className="auth-template-page__description">
              Quý khách vui lòng điền thông tin vào mẫu bên dưới để đăng ký thành viên. Xin
              chân thành cảm ơn quý khách!
            </p>
          </div>
        </header>

        <form className="auth-template-form" noValidate onSubmit={handleSubmit}>
          <label className="auth-template-form__field" htmlFor="register-full-name">
            <span className="auth-template-form__label">Họ và tên (*)</span>
            <input
              autoComplete="name"
              aria-invalid={Boolean(errors.full_name)}
              className={`auth-template-form__input${
                errors.full_name ? ' auth-template-form__input--error' : ''
              }`}
              id="register-full-name"
              name="full_name"
              placeholder="Nhập họ và tên"
              type="text"
              value={formValues.full_name}
              onChange={handleFieldChange}
            />
            {errors.full_name ? <p className="auth-form__field-error">{errors.full_name}</p> : null}
          </label>

          <label className="auth-template-form__field" htmlFor="register-email">
            <span className="auth-template-form__label">Địa chỉ Email</span>
            <input
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              className={`auth-template-form__input${
                errors.email ? ' auth-template-form__input--error' : ''
              }`}
              id="register-email"
              name="email"
              placeholder="email@netviet.travel"
              type="email"
              value={formValues.email}
              onChange={handleFieldChange}
            />
            {errors.email ? <p className="auth-form__field-error">{errors.email}</p> : null}
          </label>

          <label className="auth-template-form__field" htmlFor="register-password">
            <span className="auth-template-form__label">Mật khẩu</span>
            <div
              className={`auth-template-form__control${
                errors.password ? ' auth-template-form__control--error' : ''
              }`}
            >
              <input
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                className="auth-template-form__input auth-template-form__input--password"
                id="register-password"
                name="password"
                placeholder="Nhập mật khẩu"
                type={showPassword ? 'text' : 'password'}
                value={formValues.password}
                onChange={handleFieldChange}
              />
              <button
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="auth-template-form__toggle"
                type="button"
                onClick={() => setShowPassword((value) => !value)}
              >
                <EyeIcon visible={showPassword} />
              </button>
            </div>
            {errors.password ? <p className="auth-form__field-error">{errors.password}</p> : null}
          </label>

          <label className="auth-template-form__field" htmlFor="register-password-confirm">
            <span className="auth-template-form__label">Nhập lại mật khẩu</span>
            <div
              className={`auth-template-form__control${
                errors.confirm_password ? ' auth-template-form__control--error' : ''
              }`}
            >
              <input
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirm_password)}
                className="auth-template-form__input auth-template-form__input--password"
                id="register-password-confirm"
                name="confirm_password"
                placeholder="Nhập lại mật khẩu"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formValues.confirm_password}
                onChange={handleFieldChange}
              />
              <button
                aria-label={showConfirmPassword ? 'Ẩn nhập lại mật khẩu' : 'Hiện nhập lại mật khẩu'}
                className="auth-template-form__toggle"
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

          <label className="auth-template-form__agreement" htmlFor="register-agreement">
            <input
              checked={formValues.accepted_terms}
              id="register-agreement"
              name="accepted_terms"
              type="checkbox"
              onChange={handleFieldChange}
            />
            <span>Tôi đồng ý với Điều khoản & Chính sách bảo mật của Nét Việt.</span>
          </label>
          {errors.accepted_terms ? (
            <p className="auth-form__field-error">{errors.accepted_terms}</p>
          ) : null}

          {feedbackMessage ? (
            <p className={`auth-form__feedback auth-form__feedback--${feedbackTone}`}>
              {feedbackMessage}
            </p>
          ) : null}

          {shouldShowVerificationActions ? (
            <div className="auth-template-form__actions">
              <Link className="auth-template-form__button" to={buildVerifyEmailLink(registeredEmail)}>
                Xác minh email
              </Link>
              <Link
                className="auth-template-form__button auth-template-form__button--secondary"
                to="/login"
              >
                Đăng nhập
              </Link>
            </div>
          ) : null}

          <button className="auth-template-form__button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Đang xử lý...' : 'Đăng ký tài khoản'}
          </button>
        </form>

        <div className="auth-template-page__footer">
          <span>Đã có tài khoản?</span>
          <Link className="auth-template-page__link" to="/login">
            Đăng nhập
          </Link>
        </div>
      </div>
    </section>
  )
}

export default RegisterPage
