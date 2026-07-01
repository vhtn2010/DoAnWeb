import { Link } from 'react-router-dom'
import './authTemplate.css'

function RegisterPage() {
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
          <h1 className="auth-template-page__title">Đăng ký tài khoản</h1>
          <p className="auth-template-page__description">
            Quý khách vui lòng điền thông tin vào mẫu bên dưới để đăng ký thành viên.
            Xin chân thành cảm ơn quý khách!
          </p>
        </div>
      </header>

      <form className="auth-template-form" onSubmit={handleSubmit}>
        <label className="auth-template-form__field" htmlFor="register-full-name">
          <span className="auth-template-form__label">Họ và tên (*)</span>
          <input
            autoComplete="name"
            className="auth-template-form__input"
            id="register-full-name"
            name="fullName"
            placeholder="Nhập họ và tên"
            type="text"
          />
        </label>

        <label className="auth-template-form__field" htmlFor="register-email">
          <span className="auth-template-form__label">Địa chỉ Email</span>
          <input
            autoComplete="email"
            className="auth-template-form__input"
            id="register-email"
            name="email"
            placeholder="email@netviet.travel"
            type="email"
          />
        </label>

        <label className="auth-template-form__field" htmlFor="register-password">
          <span className="auth-template-form__label">Mật khẩu</span>
          <input
            autoComplete="new-password"
            className="auth-template-form__input"
            id="register-password"
            name="password"
            placeholder="Nhập mật khẩu"
            type="password"
          />
        </label>

        <label className="auth-template-form__field" htmlFor="register-password-confirm">
          <span className="auth-template-form__label">Nhập lại mật khẩu</span>
          <input
            autoComplete="new-password"
            className="auth-template-form__input"
            id="register-password-confirm"
            name="confirmPassword"
            placeholder="Nhập lại mật khẩu"
            type="password"
          />
        </label>

        <label className="auth-template-form__agreement" htmlFor="register-agreement">
          <input id="register-agreement" name="agreement" type="checkbox" />
          <span>Tôi đồng ý với Điều khoản & Chính sách bảo mật của Nét Việt.</span>
        </label>

        <button className="auth-template-form__button" type="submit">
          Đăng ký tài khoản
        </button>
      </form>

      <div className="auth-template-page__footer">
        <span>Đã có tài khoản?</span>
        <Link className="auth-template-page__link" to="/login">
          Đăng nhập
        </Link>
      </div>
    </section>
  )
}

export default RegisterPage
