import { apiPost } from '../../services/apiClient.js'
import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
} from '../../services/authSession.js'

function persistAuthResponse(response) {
  if (response?.success && response.data?.access_token) {
    setAuthSession(response.data)
  }

  return response
}

function getResetToken(payload = {}) {
  return String(payload.token ?? payload.otp_code ?? '').trim()
}

export async function login(payload = {}) {
  const response = await apiPost('/auth/login', payload)

  return persistAuthResponse(response)
}

export async function register(payload = {}) {
  return apiPost('/auth/register', payload)
}

export async function requestPasswordReset(payload = {}) {
  return apiPost('/auth/forgot-password', payload)
}

export async function verifyResetCode(payload = {}) {
  const token = getResetToken(payload)

  return {
    data: {
      token,
    },
    message: token
      ? 'Reset token is ready.'
      : 'Reset token is required.',
    success: Boolean(token),
  }
}

export async function resetPassword(payload = {}) {
  return apiPost('/auth/reset-password', {
    new_password: payload.new_password,
    token: getResetToken(payload),
  })
}

export async function refreshSession(payload = {}) {
  const refreshToken = payload.refresh_token || getAuthSession().refresh_token
  const response = await apiPost('/auth/refresh-token', {
    refresh_token: refreshToken,
  })

  return persistAuthResponse(response)
}

export async function logout(payload = {}) {
  const refreshToken = payload.refresh_token || getAuthSession().refresh_token

  try {
    return await apiPost('/auth/logout', refreshToken ? {
      refresh_token: refreshToken,
    } : {})
  } finally {
    clearAuthSession()
  }
}

export async function verifyEmail(payload = {}) {
  return apiPost('/auth/verify-email', payload)
}

export async function resendVerification(payload = {}) {
  return apiPost('/auth/resend-verification', payload)
}

export async function requestChangeEmail(payload = {}) {
  return apiPost('/auth/change-email/request', payload)
}

export async function confirmChangeEmail(payload = {}) {
  return apiPost('/auth/change-email/confirm', {
    token: String(payload.token ?? '').trim(),
  })
}
