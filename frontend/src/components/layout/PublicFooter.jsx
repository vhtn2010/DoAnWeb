import {
  PublicFooterBottomBar,
  PublicFooterBrandColumn,
  PublicFooterContactList,
  PublicFooterLinkGroup,
  PUBLIC_FOOTER_COMPANY_LINKS,
  PUBLIC_FOOTER_SUPPORT_LINKS,
} from '../public/layout/index.js'

function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer__shell">
        <div className="public-footer__grid">
          <PublicFooterBrandColumn />
          <PublicFooterLinkGroup heading="VỀ CÔNG TY" items={PUBLIC_FOOTER_COMPANY_LINKS} />
          <PublicFooterLinkGroup
            heading="HỖ TRỢ KHÁCH HÀNG"
            items={PUBLIC_FOOTER_SUPPORT_LINKS}
          />
          <PublicFooterContactList />
        </div>
        <PublicFooterBottomBar />
      </div>
    </footer>
  )
}

export default PublicFooter
