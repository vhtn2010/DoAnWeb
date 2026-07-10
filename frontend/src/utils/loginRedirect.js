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
