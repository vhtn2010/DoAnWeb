import { AUTH_RESET_CODE_EXPIRES_IN_SECONDS } from '../../constants/auth.js'
import { authResetFixtures, authUserFixtures } from '../../fixtures/auth.fixtures.js'

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
}

const authStore = {
  users: cloneValue(authUserFixtures),
  resetRequests: cloneValue(authResetFixtures),
}

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase()
}

function sanitizeUser(user) {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
  }
}

function createUserId() {
  return `auth-user-${Date.now()}`
}

export async function login(payload = {}) {
  // TODO: replace mock login with POST /auth/login in API integration phase.
  const user = authStore.users.find(
    (currentUser) =>
      normalizeEmail(currentUser.email) === normalizeEmail(payload.email) &&
      currentUser.password === payload.password,
  )

  if (!user) {
    return {
      success: false,
      message: 'Email hoặc mật khẩu không đúng.',
      data: null,
    }
  }

  return {
    success: true,
    message: 'Đăng nhập thành công.',
    data: {
      user: sanitizeUser(user),
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
    },
  }
}

export async function register(payload = {}) {
  // TODO: replace mock register with POST /auth/register in API integration phase.
  const existingUser = authStore.users.find(
    (currentUser) => normalizeEmail(currentUser.email) === normalizeEmail(payload.email),
  )

  if (existingUser) {
    return {
      success: false,
      message: 'Email này đã được sử dụng.',
      data: null,
    }
  }

  const nextUser = {
    id: createUserId(),
    full_name: payload.full_name,
    email: normalizeEmail(payload.email),
    phone: payload.phone ?? '',
    password: payload.password,
    role: 'customer',
    status: 'active',
  }

  authStore.users.push(nextUser)

  return {
    success: true,
    message: 'Đăng ký tài khoản thành công.',
    data: {
      user: sanitizeUser(nextUser),
    },
  }
}

export async function requestPasswordReset(payload = {}) {
  // TODO: replace mock forgot password flow with /auth/forgot-password and /auth/reset-password in API integration phase.
  const normalizedEmail = normalizeEmail(payload.email)
  const existingRequestIndex = authStore.resetRequests.findIndex(
    (request) => normalizeEmail(request.email) === normalizedEmail,
  )
  const nextResetRequest = {
    email: normalizedEmail,
    otp_code: existingRequestIndex >= 0
      ? authStore.resetRequests[existingRequestIndex].otp_code
      : '1234',
    expires_in_seconds: AUTH_RESET_CODE_EXPIRES_IN_SECONDS,
  }

  if (existingRequestIndex >= 0) {
    authStore.resetRequests.splice(existingRequestIndex, 1, nextResetRequest)
  } else {
    authStore.resetRequests.push(nextResetRequest)
  }

  return {
    success: true,
    message: 'Mã xác nhận đã được gửi đến email của bạn.',
    data: {
      email: normalizedEmail,
      expires_in_seconds: AUTH_RESET_CODE_EXPIRES_IN_SECONDS,
    },
  }
}

export async function verifyResetCode(payload = {}) {
  const resetRequest = authStore.resetRequests.find(
    (request) =>
      normalizeEmail(request.email) === normalizeEmail(payload.email) &&
      String(request.otp_code) === String(payload.otp_code ?? ''),
  )

  if (!resetRequest) {
    return {
      success: false,
      message: 'Mã xác nhận không hợp lệ hoặc đã hết hạn.',
      data: null,
    }
  }

  return {
    success: true,
    message: 'Mã xác nhận hợp lệ.',
    data: {
      email: resetRequest.email,
    },
  }
}

export async function resetPassword(payload = {}) {
  // TODO: replace mock forgot password flow with /auth/forgot-password and /auth/reset-password in API integration phase.
  const verifyResponse = await verifyResetCode(payload)

  if (!verifyResponse.success) {
    return verifyResponse
  }

  const userIndex = authStore.users.findIndex(
    (currentUser) => normalizeEmail(currentUser.email) === normalizeEmail(payload.email),
  )

  if (userIndex >= 0) {
    authStore.users[userIndex] = {
      ...authStore.users[userIndex],
      password: payload.new_password,
    }
  }

  return {
    success: true,
    message: 'Đổi mật khẩu thành công.',
    data: null,
  }
}
