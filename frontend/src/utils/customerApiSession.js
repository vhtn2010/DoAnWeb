import { ROLES } from '../constants/roles.js'
import { getAuthSession } from '../services/authSession.js'
import { normalizeRole } from './rolePermissions.js'

export function isCustomerApiRequested(authState = ROLES.guest) {
  return authState === ROLES.customer
}

export function shouldUseCustomerApi(authState = ROLES.guest) {
  const session = getAuthSession()
  const role = normalizeRole(
    session.user?.role_code ?? session.user?.role,
    ROLES.guest,
  )

  return isCustomerApiRequested(authState) && role === ROLES.customer && session.isAuthenticated
}

export function createCustomerAuthRequiredResponse() {
  return {
    success: false,
    message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.',
    data: null,
  }
}
