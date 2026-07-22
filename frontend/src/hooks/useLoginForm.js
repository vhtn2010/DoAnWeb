import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AUTH_SOCIAL_PROVIDERS } from '../constants/auth.js'
import {
  buildLoginPayload,
  createLoginFormValues,
  mapApiValidationErrors,
  validateLoginPayload,
} from '../mappers/authMappers.js'
import { login } from '../repositories/authRepository.js'
import { getAuthRedirectPath } from '../utils/loginRedirect.js'

export default function useLoginForm() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [formValues, setFormValues] = useState(() => createLoginFormValues())
  const [errors, setErrors] = useState({})
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackTone, setFeedbackTone] = useState('info')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleFieldChange(event) {
    const { name, value } = event.target

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: '',
    }))
    setFeedbackMessage('')
    setFeedbackTone('info')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validateLoginPayload(formValues)
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
      const response = await login(buildLoginPayload(formValues))

      if (!response.success) {
        setFeedbackMessage(response.message)
        setFeedbackTone('error')
        return
      }

      navigate(
        getAuthRedirectPath({
          location,
          searchParams,
          user: response.data?.user,
        }),
        { replace: true },
      )
    } catch (error) {
      const apiFieldErrors = mapApiValidationErrors(error?.details)

      if (Object.keys(apiFieldErrors).length > 0) {
        setErrors(apiFieldErrors)
      }

      setFeedbackMessage(error?.message ?? 'Không thể đăng nhập lúc này.')
      setFeedbackTone('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSocialLogin(providerKey) {
    const providerLabel = AUTH_SOCIAL_PROVIDERS[providerKey] ?? 'Mạng xã hội'
    setFeedbackMessage(
      `Đăng nhập bằng ${providerLabel} đang ở chế độ mock và sẽ được tích hợp ở phase API.`,
    )
    setFeedbackTone('info')
  }

  return {
    errors,
    feedbackMessage,
    feedbackTone,
    formValues,
    handleFieldChange,
    handleSocialLogin,
    handleSubmit,
    isSubmitting,
  }
}
