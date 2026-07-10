import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import LoginRequiredModal from '../components/auth/LoginRequiredModal.jsx'
import { ROLES } from '../constants/roles.js'
import usePublicSession from '../hooks/usePublicSession.js'
import {
  buildLoginRedirectPath,
  getReturnPath,
} from '../utils/loginRedirect.js'

const ADMIN_LIKE_ROLES = new Set([
  ROLES.staff,
  ROLES.admin,
  ROLES.systemAdmin,
])

function CustomerOnlyRoute({
  children,
  description,
  eyebrow,
  fallbackPath = '/',
  title,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentRole, isAuthenticated, isCustomerPreview } = usePublicSession()
  const [placeholderHeight, setPlaceholderHeight] = useState(() => {
    if (typeof window === 'undefined') {
      return 0
    }

    return window.scrollY + window.innerHeight
  })

  const returnPath = getReturnPath(location)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const nextHeight = window.scrollY + window.innerHeight
    setPlaceholderHeight(nextHeight)

    return undefined
  }, [location.key, returnPath])

  if (isCustomerPreview) {
    return children
  }

  if (isAuthenticated) {
    const authenticatedFallbackPath = ADMIN_LIKE_ROLES.has(currentRole)
      ? '/admin'
      : fallbackPath

    return <Navigate replace to={authenticatedFallbackPath} />
  }

  function handleClose() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate(fallbackPath, { replace: true })
  }

  function handleLogin() {
    navigate(buildLoginRedirectPath(returnPath), {
      state: { from: returnPath },
    })
  }

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          minHeight: placeholderHeight > 0 ? `${placeholderHeight}px` : '100vh',
        }}
      />
      <LoginRequiredModal
        description={description}
        eyebrow={eyebrow}
        isOpen
        title={title}
        onClose={handleClose}
        onLogin={handleLogin}
      />
    </>
  )
}

export default CustomerOnlyRoute
