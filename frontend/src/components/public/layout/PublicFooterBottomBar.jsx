import { Link } from 'react-router-dom'

function PublicFooterBottomBar({ siteName = 'Nét Việt' }) {
  const currentYear = new Date().getFullYear()

  return (
    <>
      <div aria-hidden="true" className="public-footer__divider" />

      <div className="public-footer__bottom">
        <span>© {currentYear} {siteName}.</span>
        <div className="public-footer__bottom-links">
          <Link to="/help-center">Trợ giúp</Link>
          <Link to="/customer-care">Chăm sóc khách hàng</Link>
        </div>
      </div>
    </>
  )
}

export default PublicFooterBottomBar
