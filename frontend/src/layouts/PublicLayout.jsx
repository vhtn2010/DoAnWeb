import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import PublicHeader from '../components/layout/PublicHeader.jsx'
import PublicFooter from '../components/layout/PublicFooter.jsx'
import { createPublicSessionState } from '../hooks/usePublicSession.js'
import { subscribeAuthEvents } from '../services/apiClient.js'
import '../components/public/ui/publicUiKit.css'

function PublicLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [sessionVersion, setSessionVersion] = useState(0)
  const publicSession = useMemo(
    () => createPublicSessionState(sessionVersion),
    [sessionVersion],
  )
  const outletContext = useMemo(() => ({ publicSession }), [publicSession])

  useEffect(() => {
    const unsubscribe = subscribeAuthEvents(() => {
      setSessionVersion((currentVersion) => currentVersion + 1)
    })

    return unsubscribe
  }, [])

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
