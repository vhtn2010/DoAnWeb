import { Link } from 'react-router-dom'

export default function HotelListHero({ breadcrumbHomePath }) {
  return (
    <section className="hotel-list-page__hero">
      <img
        alt="Không gian thiên nhiên và núi đồi"
        className="hotel-list-page__hero-image"
        src="/assets/template/service/list/hero-terrace.png"
      />
      <div className="hotel-list-page__hero-overlay" />
      <div className="hotel-list-page__hero-content">
        <div className="hotel-list-page__breadcrumb">
          <Link className="hotel-list-page__breadcrumb-link" to={breadcrumbHomePath}>
            Trang chủ
          </Link>
          <span aria-hidden="true">›</span>
          <span>Danh sách Khách sạn</span>
        </div>
        <h1 className="hotel-list-page__hero-title">Khách sạn</h1>
      </div>
    </section>
  )
}
