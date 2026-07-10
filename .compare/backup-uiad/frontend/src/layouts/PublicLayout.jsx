import { Outlet } from 'react-router-dom'
import PublicHeader from '../components/layout/PublicHeader.jsx'
import PublicFooter from '../components/layout/PublicFooter.jsx'

function PublicLayout() {
  return (
    <div className="public-layout">
      <PublicHeader />
      <main className="public-layout__main">
        <div className="public-layout__content">
          <Outlet />
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}

export default PublicLayout
