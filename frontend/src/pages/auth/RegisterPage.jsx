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

function RegisterPage() {
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
            <input
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              className={`auth-template-form__input${
                errors.password ? ' auth-template-form__input--error' : ''
              }`}
              id="register-password"
              name="password"
              placeholder="Nhập mật khẩu"
              type="password"
              value={formValues.password}
              onChange={handleFieldChange}
            />
            {errors.password ? <p className="auth-form__field-error">{errors.password}</p> : null}
          </label>

          <label className="auth-template-form__field" htmlFor="register-password-confirm">
            <span className="auth-template-form__label">Nhập lại mật khẩu</span>
            <input
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirm_password)}
              className={`auth-template-form__input${
                errors.confirm_password ? ' auth-template-form__input--error' : ''
              }`}
              id="register-password-confirm"
              name="confirm_password"
              placeholder="Nhập lại mật khẩu"
              type="password"
              value={formValues.confirm_password}
              onChange={handleFieldChange}
            />
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
