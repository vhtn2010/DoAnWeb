import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  resendVerification,
  verifyEmail,
} from '../../repositories/authRepository.js'
import './authTemplate.css'

function normalizeEmail(value = '') {
  return String(value).trim().toLowerCase()
}

function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getErrorMessage(error) {
  return error?.message || 'Không thể xác minh email lúc này.'
}

function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = String(searchParams.get('token') ?? '').trim()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [status, setStatus] = useState(token ? 'loading' : 'error')
  const [feedbackMessage, setFeedbackMessage] = useState(
    token
      ? 'Đang xác minh địa chỉ email của bạn...'
      : 'Liên kết xác minh không hợp lệ hoặc thiếu token.',
  )
  const [feedbackTone, setFeedbackTone] = useState(token ? 'info' : 'error')
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setFeedbackTone('error')
      setFeedbackMessage('Liên kết xác minh không hợp lệ hoặc thiếu token.')
      return
    }

    let isActive = true

    async function submitVerification() {
      setStatus('loading')
      setFeedbackTone('info')
      setFeedbackMessage('Đang xác minh địa chỉ email của bạn...')

      try {
        const response = await verifyEmail({ token })

        if (!isActive) {
          return
        }

        setStatus('success')
        setFeedbackTone('success')
        setFeedbackMessage(response.message || 'Email đã được xác minh thành công.')
      } catch (error) {
        if (!isActive) {
          return
        }

        setStatus('error')
        setFeedbackTone('error')
        setFeedbackMessage(getErrorMessage(error))
      }
    }

    submitVerification()

    return () => {
      isActive = false
    }
  }, [token])

  async function handleResendVerification(event) {
    event.preventDefault()

    const normalizedEmail = normalizeEmail(email)

    if (!normalizedEmail) {
      setEmailError('Vui lòng nhập email.')
      return
    }

    if (!isValidEmail(normalizedEmail)) {
      setEmailError('Email chưa đúng định dạng.')
      return
    }

    setIsResending(true)
    setEmailError('')
    setFeedbackTone('info')
    setFeedbackMessage('Đang gửi lại email xác minh...')

    try {
      const response = await resendVerification({ email: normalizedEmail })

      setFeedbackTone(response.success ? 'success' : 'error')
      setFeedbackMessage(response.message)
    } catch (error) {
      setFeedbackTone('error')
      setFeedbackMessage(error?.message || 'Không thể gửi lại email xác minh lúc này.')
    } finally {
      setIsResending(false)
    }
  }

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
            <h1 className="auth-template-page__title">Xác minh email</h1>
            <p className="auth-template-page__description">
              Hoàn tất xác minh để kích hoạt tài khoản và đăng nhập vào Nét Việt Travel.
            </p>
          </div>
        </header>

        <div
          aria-live="polite"
          className={`auth-form__feedback auth-form__feedback--${feedbackTone}`}
          role={status === 'loading' ? 'status' : 'alert'}
        >
          {feedbackMessage}
        </div>

        {status === 'success' ? (
          <div className="auth-template-form__actions">
            <Link className="auth-template-form__button" to="/login">
              Đăng nhập
            </Link>
            <Link
              className="auth-template-form__button auth-template-form__button--secondary"
              to="/"
            >
              Về trang chủ
            </Link>
          </div>
        ) : null}

        {status === 'error' ? (
          <form className="auth-template-form" noValidate onSubmit={handleResendVerification}>
            <label className="auth-template-form__field" htmlFor="verify-email-resend">
              <span className="auth-template-form__label">Email đăng ký</span>
              <input
                autoComplete="email"
                aria-invalid={Boolean(emailError)}
                className={`auth-template-form__input${
                  emailError ? ' auth-template-form__input--error' : ''
                }`}
                disabled={isResending}
                id="verify-email-resend"
                name="email"
                placeholder="email@netviet.travel"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setEmailError('')
                }}
              />
              {emailError ? <p className="auth-form__field-error">{emailError}</p> : null}
            </label>

            <div className="auth-template-form__actions">
              <button
                className="auth-template-form__button"
                disabled={isResending}
                type="submit"
              >
                {isResending ? 'Đang gửi...' : 'Gửi lại email'}
              </button>
              <Link
                className="auth-template-form__button auth-template-form__button--secondary"
                to="/login"
              >
                Đăng nhập
              </Link>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  )
}

export default VerifyEmailPage
