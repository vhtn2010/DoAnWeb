import { useState } from 'react'
import {
  buildRegisterPayload,
  createRegisterFormValues,
  mapApiValidationErrors,
  validateRegisterPayload,
} from '../mappers/authMappers.js'
import { register } from '../repositories/authRepository.js'

export default function useRegisterForm() {
  const [formValues, setFormValues] = useState(() => createRegisterFormValues())
  const [errors, setErrors] = useState({})
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackTone, setFeedbackTone] = useState('info')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validateRegisterPayload(formValues)
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
      const response = await register(buildRegisterPayload(formValues))

      setFeedbackMessage(response.message)
      setFeedbackTone(response.success ? 'success' : 'error')

      if (response.success) {
        setFormValues(createRegisterFormValues())
      }
    } catch (error) {
      const apiFieldErrors = mapApiValidationErrors(error?.details)

      if (Object.keys(apiFieldErrors).length > 0) {
        setErrors(apiFieldErrors)
      }

      setFeedbackMessage(error?.message ?? 'Không thể đăng ký tài khoản lúc này.')
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
    handleSubmit,
    isSubmitting,
  }
}
