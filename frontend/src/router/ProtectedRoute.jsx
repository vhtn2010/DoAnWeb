import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { subscribeAuthEvents } from '../services/apiClient.js'
import { getAuthSession } from '../services/authSession.js'
import { buildLoginRedirectPath, getReturnPath } from '../utils/loginRedirect.js'

function ProtectedRoute({ children }) {
  const location = useLocation()
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    getAuthSession().isAuthenticated,
  )

  useEffect(() => {
    const unsubscribe = subscribeAuthEvents(() => {
      setIsAuthenticated(getAuthSession().isAuthenticated)
    })

    return unsubscribe
  }, [])

  if (!isAuthenticated) {
    const returnPath = getReturnPath(location)

    return (
      <Navigate
        replace
        state={{ from: returnPath }}
        to={buildLoginRedirectPath(returnPath)}
      />
    )
  }

  return children ?? <Outlet />
}

export default ProtectedRoute
