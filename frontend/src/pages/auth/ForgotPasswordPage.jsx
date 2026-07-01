import { Link } from 'react-router-dom'
import './authTemplate.css'

function ForgotPasswordPage() {
  const handleSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <section className="auth-template-page">
      <header className="auth-template-page__header">
        <img
          alt="Nét Việt Travel"
          className="auth-template-page__logo"
          src="/assets/template/auth/dangky/logo.png"
        />
        <div className="auth-template-page__copy">
          <h1 className="auth-template-page__title">Quên mật khẩu</h1>
          <p className="auth-template-page__description">
            Nhập địa chỉ email đã đăng ký để xác nhận tài khoản và cập nhật mật khẩu
            mới cho lần đăng nhập tiếp theo.
          </p>
        </div>
      </header>

      <form className="auth-template-form" onSubmit={handleSubmit}>
        <label className="auth-template-form__field" htmlFor="forgot-password-email">
          <span className="auth-template-form__label">Địa chỉ Email</span>
          <input
            autoComplete="email"
            className="auth-template-form__input"
            id="forgot-password-email"
            name="email"
            placeholder="email@netviet.travel"
            type="email"
          />
        </label>

        <label className="auth-template-form__field" htmlFor="forgot-password-code">
          <span className="auth-template-form__label">Mã xác nhận</span>
          <input
            className="auth-template-form__input"
            id="forgot-password-code"
            name="verificationCode"
            placeholder="Nhập mã xác nhận"
            type="text"
          />
        </label>

        <label className="auth-template-form__field" htmlFor="forgot-password-new-password">
          <span className="auth-template-form__label">Mật khẩu mới</span>
          <input
            autoComplete="new-password"
            className="auth-template-form__input"
            id="forgot-password-new-password"
            name="newPassword"
            placeholder="Nhập mật khẩu mới"
            type="password"
          />
        </label>

        <label
          className="auth-template-form__field"
          htmlFor="forgot-password-confirm-password"
        >
          <span className="auth-template-form__label">Nhập lại mật khẩu mới</span>
          <input
            autoComplete="new-password"
            className="auth-template-form__input"
            id="forgot-password-confirm-password"
            name="confirmPassword"
            placeholder="Nhập lại mật khẩu mới"
            type="password"
          />
        </label>

        <div className="auth-template-form__actions">
          <button className="auth-template-form__button" type="submit">
            Hoàn tất
          </button>
          <Link
            className="auth-template-form__button auth-template-form__button--secondary"
            to="/login"
          >
            Hủy bỏ
          </Link>
        </div>
      </form>

      <div className="auth-template-page__footer">
        <span>Đã nhớ mật khẩu?</span>
        <Link className="auth-template-page__link" to="/login">
          Quay lại đăng nhập
        </Link>
        <span>hoặc</span>
        <Link className="auth-template-page__link" to="/register">
          Đăng ký mới
        </Link>
      </div>
    </section>
  )
}

export default ForgotPasswordPage
