import { Outlet } from 'react-router-dom'
import PublicHeader from '../components/layout/PublicHeader.jsx'
import PublicFooter from '../components/layout/PublicFooter.jsx'
import '../components/public/ui/publicUiKit.css'

function PublicLayout() {
  return (
    <div className="public-layout">
      <PublicHeader />
      <main className="public-layout__main">
        <div className="public-layout__content-shell">
          <span aria-hidden="true" className="public-layout__content-orb public-layout__content-orb--warm" />
          <span aria-hidden="true" className="public-layout__content-orb public-layout__content-orb--cool" />
          <div className="public-layout__content">
            <Outlet />
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}

export default PublicLayout
