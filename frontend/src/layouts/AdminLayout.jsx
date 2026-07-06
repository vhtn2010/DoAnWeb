import { useEffect, useMemo, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AdminButton, AdminErrorState, AdminLoadingBlock } from '../components/admin/ui/index.js'
import AdminSidebar from '../components/layout/AdminSidebar.jsx'
import AdminTopbar from '../components/layout/AdminTopbar.jsx'
import { logout } from '../repositories/authRepository.js'
import { getCurrentProfile } from '../repositories/profileRepository.js'
import { subscribeAuthEvents } from '../services/apiClient.js'
import { getAuthSession } from '../services/authSession.js'
import { isAdminRole, normalizeAdminRole } from '../utils/rolePermissions.js'

function createAdminSessionState() {
  const session = getAuthSession()
  const currentRole = normalizeAdminRole(
    session.user?.role_code ?? session.user?.role,
    'guest',
  )

  return {
    currentPermissions: Array.isArray(session.permissions) ? session.permissions : [],
    currentRole,
    isAuthenticated: session.isAuthenticated,
    user: session.user,
  }
}

function getReturnPath(location) {
  return `${location.pathname}${location.search}${location.hash}`
}

function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [adminSession, setAdminSession] = useState(() => createAdminSessionState())
  const [profileStatus, setProfileStatus] = useState('loading')
  const [profileError, setProfileError] = useState('')
  const [profileReloadKey, setProfileReloadKey] = useState(0)
  const [loggingOut, setLoggingOut] = useState(false)
  const [authNotice, setAuthNotice] = useState('')
  const outletContext = useMemo(() => ({
    currentPermissions: adminSession.currentPermissions,
    currentRole: adminSession.currentRole,
    currentUser: adminSession.user,
  }), [adminSession])

  useEffect(() => {
    const unsubscribe = subscribeAuthEvents(({ payload, type }) => {
      if (type === 'session-cleared' || type === 'unauthorized') {
        setAdminSession(createAdminSessionState())
        setProfileStatus('unauthenticated')
        return
      }

      if (type === 'forbidden') {
        setAuthNotice(payload?.message || 'Tài khoản hiện tại chưa có quyền thực hiện thao tác này.')
        return
      }

      if (type === 'session-refreshed') {
        setAuthNotice('')
        setProfileReloadKey((currentValue) => currentValue + 1)
      }
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    setAuthNotice('')
  }, [location.pathname])

  useEffect(() => {
    let isActive = true

    async function loadProfile() {
      const session = getAuthSession()

      if (!session.isAuthenticated) {
        if (isActive) {
          setAdminSession(createAdminSessionState())
          setProfileStatus('unauthenticated')
        }
        return
      }

      setProfileStatus('loading')
      setProfileError('')

      try {
        const response = await getCurrentProfile()

        if (!isActive) {
          return
        }

        if (!response?.success || !response.data?.user) {
          throw new Error(response?.message || 'Không thể tải thông tin phiên quản trị.')
        }

        setAdminSession(createAdminSessionState())
        setProfileStatus('ready')
      } catch (error) {
        if (!isActive) {
          return
        }

        if (error?.status === 401) {
          setAdminSession(createAdminSessionState())
          setProfileStatus('unauthenticated')
          return
        }

        setProfileError(error?.message || 'Không thể xác thực quyền quản trị lúc này.')
        setProfileStatus('error')
      }
    }

    loadProfile()

    return () => {
      isActive = false
    }
  }, [profileReloadKey])

  async function handleLogout() {
    setLoggingOut(true)

    try {
      await logout()
    } catch {
      // Local session is cleared by the auth adapter even if the API logout fails.
    } finally {
      setLoggingOut(false)
      navigate('/login', { replace: true })
    }
  }

  if (profileStatus === 'unauthenticated') {
    const returnPath = getReturnPath(location)

    return (
      <Navigate
        replace
        state={{ from: returnPath }}
        to={`/login?redirect=${encodeURIComponent(returnPath)}`}
      />
    )
  }

  if (profileStatus === 'loading') {
    return (
      <main className="admin-layout__session-state">
        <AdminLoadingBlock rows={3} />
      </main>
    )
  }

  if (profileStatus === 'error') {
    return (
      <main className="admin-layout__session-state">
        <AdminErrorState
          description={profileError}
          title="Không thể xác thực quyền quản trị"
          action={
            <AdminButton variant="secondary" onClick={() => setProfileReloadKey((value) => value + 1)}>
              Thử lại
            </AdminButton>
          }
        />
      </main>
    )
  }

  if (!isAdminRole(adminSession.currentRole)) {
    return <Navigate replace to="/" />
  }

  return (
    <div className="admin-layout">
      <AdminSidebar
        currentPermissions={adminSession.currentPermissions}
        currentRole={adminSession.currentRole}
        loggingOut={loggingOut}
        onLogout={handleLogout}
      />

      <div className="admin-layout__main">
        <AdminTopbar
          currentPermissions={adminSession.currentPermissions}
          currentRole={adminSession.currentRole}
          currentUser={adminSession.user}
        />

        <div className="admin-layout__body">
          {authNotice ? (
            <p className="admin-layout__auth-notice" role="alert">
              {authNotice}
            </p>
          ) : null}

          <section className="admin-layout__surface">
            <Outlet context={outletContext} />
          </section>
        </div>
      </div>
    </div>
  )
}

export default AdminLayout
