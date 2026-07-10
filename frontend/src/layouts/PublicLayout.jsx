import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import PublicHeader from '../components/layout/PublicHeader.jsx'
import PublicFooter from '../components/layout/PublicFooter.jsx'
import { createPublicSessionState } from '../hooks/usePublicSession.js'
import { getCurrentProfile } from '../repositories/profileRepository.js'
import { subscribeAuthEvents } from '../services/apiClient.js'
import '../components/public/ui/publicUiKit.css'

function PublicLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [_sessionVersion, setSessionVersion] = useState(0)
  const [profileHydration, setProfileHydration] = useState({
    requestedUserId: '',
    status: 'idle',
  })
  const basePublicSession = createPublicSessionState()
  const currentUserId = basePublicSession.currentUser?.id ?? ''
  const currentAvatarUrl = String(basePublicSession.currentUser?.avatar_url ?? '').trim()
  const isProfileHydrating =
    profileHydration.status === 'loading' &&
    profileHydration.requestedUserId === currentUserId
  const publicSession = useMemo(
    () => ({
      ...basePublicSession,
      isProfileHydrating,
    }),
    [basePublicSession, isProfileHydrating],
  )
  const outletContext = useMemo(() => ({ publicSession }), [publicSession])

  useEffect(() => {
    const unsubscribe = subscribeAuthEvents(() => {
      setSessionVersion((currentVersion) => currentVersion + 1)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!basePublicSession.isCustomer) {
      setProfileHydration((currentHydration) =>
        currentHydration.requestedUserId || currentHydration.status !== 'idle'
          ? {
              requestedUserId: '',
              status: 'idle',
            }
          : currentHydration,
      )
      return
    }

    if (
      !currentUserId ||
      currentAvatarUrl ||
      profileHydration.requestedUserId === currentUserId
    ) {
      return
    }

    let isActive = true

    setProfileHydration({
      requestedUserId: currentUserId,
      status: 'loading',
    })

    getCurrentProfile()
      .catch(() => null)
      .finally(() => {
        if (!isActive) {
          return
        }

        setProfileHydration((currentHydration) =>
          currentHydration.requestedUserId === currentUserId
            ? {
                ...currentHydration,
                status: 'resolved',
              }
            : currentHydration,
        )
      })

    return () => {
      isActive = false
    }
  }, [
    basePublicSession.isCustomer,
    currentAvatarUrl,
    currentUserId,
    profileHydration.requestedUserId,
  ])

  useEffect(() => {
    const nextSearchParams = new URLSearchParams(location.search)

    if (!nextSearchParams.has('auth')) {
      return
    }

    nextSearchParams.delete('auth')
    const nextSearch = nextSearchParams.toString()

    navigate({
      hash: location.hash,
      pathname: location.pathname,
      search: nextSearch ? `?${nextSearch}` : '',
    }, { replace: true })
  }, [location.hash, location.pathname, location.search, navigate])

  return (
    <div className="public-layout">
      <PublicHeader publicSession={publicSession} />
      <main className="public-layout__main">
        <div className="public-layout__content-shell">
          <span aria-hidden="true" className="public-layout__content-orb public-layout__content-orb--warm" />
          <span aria-hidden="true" className="public-layout__content-orb public-layout__content-orb--cool" />
          <div className="public-layout__content">
            <Outlet context={outletContext} />
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}

export default PublicLayout
