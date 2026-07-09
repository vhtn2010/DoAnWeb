import { useOutletContext } from 'react-router-dom'
import { ROLES } from '../constants/roles.js'
import { getAuthSession } from '../services/authSession.js'
import { normalizeRole } from '../utils/rolePermissions.js'

export function createPublicSessionState() {
  const session = getAuthSession()
  const currentRole = normalizeRole(
    session.user?.role_code ?? session.user?.role,
    ROLES.guest,
  )
  const isAuthenticatedCustomer = session.isAuthenticated && currentRole === ROLES.customer
  const authState = isAuthenticatedCustomer ? ROLES.customer : ROLES.guest

  return {
    authState,
    currentRole,
    currentUser: session.user,
    isAuthenticated: session.isAuthenticated,
    isAuthenticatedCustomer,
    isCustomer: authState === ROLES.customer,
    isCustomerPreview: isAuthenticatedCustomer,
  }
}

export default function usePublicSession() {
  const outletContext = useOutletContext()

  return outletContext?.publicSession ?? createPublicSessionState()
}
