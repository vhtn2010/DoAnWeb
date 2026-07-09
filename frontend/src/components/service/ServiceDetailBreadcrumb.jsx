import { Link } from 'react-router-dom'

export default function ServiceDetailBreadcrumb({
  homePath,
  leadLocation = '',
  listPath,
}) {
  return (
    <nav aria-label="Breadcrumb" className="service-detail-page__breadcrumb">
      <Link className="service-detail-page__breadcrumb-link" to={homePath}>
        Trang chủ
      </Link>
      <span aria-hidden="true">›</span>
      <Link className="service-detail-page__breadcrumb-link" to={listPath}>
        Danh sách Tour
      </Link>
      {leadLocation ? (
        <>
          <span aria-hidden="true">›</span>
          <span className="service-detail-page__breadcrumb-current">{leadLocation}</span>
        </>
      ) : null}
    </nav>
  )
}
