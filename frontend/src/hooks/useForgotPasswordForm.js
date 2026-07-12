import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  buildPasswordResetRequestPayload,
  buildResetPasswordPayload,
  createForgotPasswordFormValues,
  mapApiValidationErrors,
  validatePasswordResetRequestPayload,
  validateResetPasswordPayload,
} from '../mappers/authMappers.js'
import { requestPasswordReset, resetPassword } from '../repositories/authRepository.js'

export default function useForgotPasswordForm() {
  const [searchParams] = useSearchParams()
  const resetToken = String(searchParams.get('token') ?? '').trim()
  const [formValues, setFormValues] = useState(() => createForgotPasswordFormValues())
  const [errors, setErrors] = useState({})
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackTone, setFeedbackTone] = useState('info')
  const [sentCode, setSentCode] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!resetToken) {
      return
    }

    setFormValues((currentValues) => ({
      ...currentValues,
      otp_code: currentValues.otp_code || resetToken,
    }))
    setSentCode(true)
    setFeedbackMessage('Vui lòng nhập mật khẩu mới để hoàn tất việc đặt lại tài khoản.')
    setFeedbackTone('info')
  }, [resetToken])

  function handleFieldChange(event) {
    const { checked, name, type, value } = event.target
    const nextValue = type === 'checkbox' ? checked : value

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: nextValue,
    }))
    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: '',
    }))
    setFeedbackMessage('')
    setFeedbackTone('info')
  }

  async function handleSendCode() {
    const nextErrors = validatePasswordResetRequestPayload(formValues)

    if (Object.keys(nextErrors).length > 0) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        ...nextErrors,
      }))
      setFeedbackMessage('')
      setFeedbackTone('error')
      return
    }

    setIsSendingCode(true)
    setErrors((currentErrors) => ({
      ...currentErrors,
      email: '',
    }))
    setFeedbackMessage('')
    setFeedbackTone('info')

    try {
      const response = await requestPasswordReset(
        buildPasswordResetRequestPayload(formValues),
      )

      setSentCode(response.success)
      setFeedbackMessage(response.message)
      setFeedbackTone(response.success ? 'success' : 'error')
    } catch (error) {
      const apiFieldErrors = mapApiValidationErrors(error?.details)

      if (Object.keys(apiFieldErrors).length > 0) {
        setErrors((currentErrors) => ({
          ...currentErrors,
          ...apiFieldErrors,
        }))
      }

      setSentCode(false)
      setFeedbackMessage(error?.message ?? 'Không thể gửi mã xác nhận lúc này.')
      setFeedbackTone('error')
    } finally {
      setIsSendingCode(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validateResetPasswordPayload(formValues)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setFeedbackMessage('')
      setFeedbackTone('error')
      return
    }

    setIsSubmitting(true)
    setErrors({})
    setFeedbackMessage('')
    setFeedbackTone('info')

    try {
      const response = await resetPassword(buildResetPasswordPayload(formValues))

      setFeedbackMessage(response.message)
      setFeedbackTone(response.success ? 'success' : 'error')

      if (response.success) {
        setFormValues((currentValues) => ({
          ...createForgotPasswordFormValues(),
          email: currentValues.email,
        }))
        setSentCode(false)
        setShowPassword(false)
        setShowConfirmPassword(false)
      }
    } catch (error) {
      const apiFieldErrors = mapApiValidationErrors(error?.details)

      if (Object.keys(apiFieldErrors).length > 0) {
        setErrors(apiFieldErrors)
      }

      setFeedbackMessage(error?.message ?? 'Không thể đổi mật khẩu lúc này.')
      setFeedbackTone('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
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
  }
}
