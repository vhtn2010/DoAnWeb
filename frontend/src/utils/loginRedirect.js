import { getAdminDefaultPath } from '../constants/adminRoutes.js'
import { ROLES } from '../constants/roles.js'
import { buildPublicAuthPath } from './publicNavigation.js'

const AUTH_ROUTE_PREFIXES = Object.freeze([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
])

const ADMIN_AUTH_ROLES = Object.freeze([
  ROLES.staff,
  ROLES.admin,
  ROLES.systemAdmin,
])

export function getReturnPath(locationLike) {
  if (typeof locationLike === 'string') {
    return locationLike || '/'
  }

  const pathname = locationLike?.pathname || '/'
  const search = locationLike?.search || ''
  const hash = locationLike?.hash || ''

  return `${pathname}${search}${hash}` || '/'
}

export function buildLoginRedirectPath(returnPath = '/') {
  const normalizedReturnPath = getReturnPath(returnPath)

  if (!normalizedReturnPath || normalizedReturnPath === '/') {
    return '/login'
  }

  return `/login?redirect=${encodeURIComponent(normalizedReturnPath)}`
}

export function isSafeRedirectPath(value) {
  const path = typeof value === 'string' ? value.trim() : ''

  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\')
}

export function getPostLoginPath(user) {
  if (ADMIN_AUTH_ROLES.includes(user?.role ?? user?.role_code)) {
    return getAdminDefaultPath(user.role ?? user.role_code)
  }

  return '/'
}

export function getAuthRedirectPath({
  location,
  searchParams,
  user,
} = {}) {
  const stateRedirectPath = location?.state?.from
  const queryRedirectPath = typeof searchParams?.get === 'function'
    ? searchParams.get('redirect')
    : ''

  const normalizedRedirectPath = isSafeRedirectPath(stateRedirectPath)
    ? stateRedirectPath
    : isSafeRedirectPath(queryRedirectPath)
      ? queryRedirectPath
      : ''

  if (
    normalizedRedirectPath &&
    !AUTH_ROUTE_PREFIXES.some((prefix) => normalizedRedirectPath.startsWith(prefix))
  ) {
    return buildPublicAuthPath(normalizedRedirectPath)
  }

  return getPostLoginPath(user)
}
