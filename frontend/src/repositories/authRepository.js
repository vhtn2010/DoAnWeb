import {
  login as loginWithMockAdapter,
  register as registerWithMockAdapter,
  requestPasswordReset as requestPasswordResetWithMockAdapter,
  resetPassword as resetPasswordWithMockAdapter,
  verifyResetCode as verifyResetCodeWithMockAdapter,
} from '../adapters/mock/authMockAdapter.js'

const authAdapter = {
  login: loginWithMockAdapter,
  register: registerWithMockAdapter,
  requestPasswordReset: requestPasswordResetWithMockAdapter,
  resetPassword: resetPasswordWithMockAdapter,
  verifyResetCode: verifyResetCodeWithMockAdapter,
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
