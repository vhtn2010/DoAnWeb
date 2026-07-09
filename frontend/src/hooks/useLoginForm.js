import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AUTH_SOCIAL_PROVIDERS } from '../constants/auth.js'
import { getAdminDefaultPath } from '../constants/adminRoutes.js'
import { ROLES } from '../constants/roles.js'
import {
  buildLoginPayload,
  createLoginFormValues,
  mapApiValidationErrors,
  validateLoginPayload,
} from '../mappers/authMappers.js'
import { login } from '../repositories/authRepository.js'
import { buildPublicAuthPath } from '../utils/publicNavigation.js'

const ADMIN_AUTH_ROLES = Object.freeze([
  ROLES.staff,
  ROLES.admin,
  ROLES.systemAdmin,
])

function getPostLoginPath(user) {
  if (ADMIN_AUTH_ROLES.includes(user?.role)) {
    return getAdminDefaultPath(user.role)
  }

  return '/'
}

function isSafeRedirectPath(value) {
  const path = typeof value === 'string' ? value.trim() : ''

  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\')
}

function getProtectedRedirectPath(location, searchParams) {
  const stateRedirectPath = location.state?.from
  const queryRedirectPath = searchParams.get('redirect')

  if (isSafeRedirectPath(stateRedirectPath)) {
    return buildPublicAuthPath(stateRedirectPath)
  }

  if (isSafeRedirectPath(queryRedirectPath)) {
    return buildPublicAuthPath(queryRedirectPath)
  }

  return ''
}

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
        getProtectedRedirectPath(location, searchParams) ||
          getPostLoginPath(response.data?.user),
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
