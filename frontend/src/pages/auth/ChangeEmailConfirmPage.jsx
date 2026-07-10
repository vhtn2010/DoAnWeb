import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { confirmChangeEmail } from '../../repositories/authRepository.js'
import './authTemplate.css'

function ChangeEmailConfirmPage() {
  const [searchParams] = useSearchParams()
  const token = String(searchParams.get('token') ?? '').trim()
  const [status, setStatus] = useState(token ? 'loading' : 'error')
  const [feedbackMessage, setFeedbackMessage] = useState(
    token
      ? 'Đang xác nhận thay đổi email cho tài khoản của bạn...'
      : 'Liên kết đổi email không hợp lệ hoặc thiếu token.',
  )
  const [feedbackTone, setFeedbackTone] = useState(token ? 'info' : 'error')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setFeedbackTone('error')
      setFeedbackMessage('Liên kết đổi email không hợp lệ hoặc thiếu token.')
      return
    }

    let isActive = true

    async function submitChangeEmailConfirmation() {
      setStatus('loading')
      setFeedbackTone('info')
      setFeedbackMessage('Đang xác nhận thay đổi email cho tài khoản của bạn...')

      try {
        const response = await confirmChangeEmail({ token })

        if (!isActive) {
          return
        }

        setStatus('success')
        setFeedbackTone('success')
        setFeedbackMessage(
          response?.message || 'Email liên hệ đã được cập nhật thành công.',
        )
      } catch (error) {
        if (!isActive) {
          return
        }

        setStatus('error')
        setFeedbackTone('error')
        setFeedbackMessage(
          error?.message || 'Không thể xác nhận thay đổi email lúc này.',
        )
      }
    }

    submitChangeEmailConfirmation()

    return () => {
      isActive = false
    }
  }, [token])

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
            <h1 className="auth-template-page__title">Xác nhận đổi email</h1>
            <p className="auth-template-page__description">
              Hoàn tất bước xác nhận cuối cùng để cập nhật email liên hệ mới cho tài
              khoản của bạn.
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

        <div className="auth-template-form__actions">
          {status === 'success' ? (
            <Link className="auth-template-form__button" to="/profile">
              Về tài khoản
            </Link>
          ) : null}

          <Link
            className={
              status === 'success'
                ? 'auth-template-form__button auth-template-form__button--secondary'
                : 'auth-template-form__button'
            }
            to="/profile"
          >
            Quay lại hồ sơ
          </Link>
        </div>
      </div>
    </section>
  )
}

export default ChangeEmailConfirmPage
