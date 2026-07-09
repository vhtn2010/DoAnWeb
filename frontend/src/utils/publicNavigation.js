import { ROLES } from '../constants/roles.js'

export function getPublicAuthQueryValue(isCustomer) {
  return isCustomer ? ROLES.customer : ''
}

export function buildPublicAuthPath(path, _isCustomer) {
  const [pathname, queryString = ''] = String(path ?? '').split('?')
  const nextSearchParams = new URLSearchParams(queryString)
  nextSearchParams.delete('auth')

  const nextQueryString = nextSearchParams.toString()

  return nextQueryString ? `${pathname}?${nextQueryString}` : pathname
}

export function buildPublicAuthSearchParams(params = {}, _isCustomer) {
  const nextSearchParams = new URLSearchParams(params)
  nextSearchParams.delete('auth')

  return nextSearchParams
}
