import { Link } from 'react-router-dom'
import { PublicPageHeader } from '../public/ui/index.js'

export default function ServiceListHero({ breadcrumbHomePath }) {
  return (
    <section className="service-list-page__hero">
      <div className="service-list-page__hero-overlay" />
      <img
        alt="Ruộng bậc thang vùng núi"
        className="service-list-page__hero-image"
        src="/assets/template/service/list/hero-terrace.png"
      />

      <div className="service-list-page__hero-content">
        <PublicPageHeader
          className="service-list-page__hero-header"
          eyebrow="Du lịch công khai"
          subtitle={
            <div className="service-list-page__breadcrumb">
              <Link className="service-list-page__breadcrumb-link" to={breadcrumbHomePath}>
                Trang chủ
              </Link>
              <span aria-hidden="true">›</span>
              <span>Danh sách Tour</span>
            </div>
          }
          title="Khám phá Tour"
        />
      </div>
    </section>
  )
}
