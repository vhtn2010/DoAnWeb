import {
  login as loginWithApiAdapter,
  logout as logoutWithApiAdapter,
  refreshSession as refreshSessionWithApiAdapter,
  register as registerWithApiAdapter,
  requestPasswordReset as requestPasswordResetWithApiAdapter,
  resendVerification as resendVerificationWithApiAdapter,
  resetPassword as resetPasswordWithApiAdapter,
  verifyEmail as verifyEmailWithApiAdapter,
  verifyResetCode as verifyResetCodeWithApiAdapter,
} from '../adapters/api/authApiAdapter.js'

const authAdapter = {
  login: loginWithApiAdapter,
  logout: logoutWithApiAdapter,
  refreshSession: refreshSessionWithApiAdapter,
  register: registerWithApiAdapter,
  requestPasswordReset: requestPasswordResetWithApiAdapter,
  resendVerification: resendVerificationWithApiAdapter,
  resetPassword: resetPasswordWithApiAdapter,
  verifyEmail: verifyEmailWithApiAdapter,
  verifyResetCode: verifyResetCodeWithApiAdapter,
}

export function login(payload) {
  return authAdapter.login(payload)
}

export function register(payload) {
  return authAdapter.register(payload)
}

export function requestPasswordReset(payload) {
  return authAdapter.requestPasswordReset(payload)
}

export function verifyResetCode(payload) {
  return authAdapter.verifyResetCode(payload)
}

export function resetPassword(payload) {
  return authAdapter.resetPassword(payload)
}

export function refreshSession(payload) {
  return authAdapter.refreshSession(payload)
}

export function logout(payload) {
  return authAdapter.logout(payload)
}

export function verifyEmail(payload) {
  return authAdapter.verifyEmail(payload)
}

export function resendVerification(payload) {
  return authAdapter.resendVerification(payload)
}
