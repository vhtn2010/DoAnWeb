import { Link } from 'react-router-dom'

const destinationServices = [
  {
    service_type: 'tour',
    title: 'Đà Nẵng',
    slug: 'da-nang',
    short_description: 'Thành phố của những cây cầu & bãi biển quyến rũ.',
    location_text: 'Đà Nẵng',
    base_price: 0,
    sale_price: 0,
    image_url: '/assets/template/home/v39_1669.png',
    badge_text: 'HOT DESTINATION',
    size: 'tall',
  },
  {
    service_type: 'tour',
    title: 'Sapa',
    slug: 'sapa',
    short_description: 'Sương mù & Ruộng bậc thang.',
    location_text: 'Sapa',
    base_price: 0,
    sale_price: 0,
    image_url: '/assets/template/home/v39_1679.png',
    size: 'small',
  },
  {
    service_type: 'tour',
    title: 'Ninh Bình',
    slug: 'ninh-binh',
    short_description: 'Hạ Long trên cạn.',
    location_text: 'Ninh Bình',
    base_price: 0,
    sale_price: 0,
    image_url: '/assets/template/home/v39_1685.png',
    size: 'small',
  },
  {
    service_type: 'resort',
    title: 'Phú Quốc',
    slug: 'phu-quoc',
    short_description: 'Thiên đường nghỉ dưỡng nhiệt đới.',
    location_text: 'Phú Quốc',
    base_price: 0,
    sale_price: 0,
    image_url: '/assets/template/home/v39_1693.png',
    size: 'wide',
  },
]

const flashSaleServices = [
  {
    service_type: 'hotel',
    title: 'Heritage Hotel Da Lat',
    slug: 'heritage-hotel-da-lat',
    short_description: 'Trải nghiệm không gian Đông Dương cổ điển giữa lòng Đà Lạt.',
    location_text: 'Đà Lạt',
    base_price: 4080000,
    sale_price: 2450000,
    image_url: '/assets/template/home/v39_1796.png',
    discount_percent: 40,
    price_unit: '/đêm',
  },
  {
    service_type: 'resort',
    title: 'Amanoi Resort Nha Trang',
    slug: 'amanoi-resort-nha-trang',
    short_description: 'Đỉnh cao của sự riêng tư và sang trọng bậc nhất Việt Nam.',
    location_text: 'Nha Trang',
    base_price: 18770000,
    sale_price: 12200000,
    image_url: '/assets/template/home/v39_1811.png',
    discount_percent: 35,
    price_unit: '/đêm',
  },
  {
    service_type: 'dining',
    title: 'Combo Gourmet Hoi An',
    slug: 'combo-gourmet-hoi-an',
    short_description: 'Thưởng thức tinh hoa ẩm thực phố Hội trên thuyền rồng.',
    location_text: 'Hội An',
    base_price: 2400000,
    sale_price: 1800000,
    image_url: '/assets/template/home/v39_1826.png',
    discount_percent: 25,
    price_unit: '/khách',
  },
]

const searchFields = [
  { label: 'điểm khởi hành', value: 'TP. Hồ Chí Minh (SGN)' },
  { label: 'điểm đến', value: 'Hà Nội (HAN)' },
  { label: 'ngày đi - về', value: '12 Th07 - 24 Th07' },
]

const filterLabels = ['Hãng hàng không', 'Tour', 'Khách sạn', 'Vé tàu']

const coreValues = [
  {
    title: 'Chất lượng 5 Sao',
    description:
      'Mọi dịch vụ từ khách sạn đến vận chuyển đều đạt tiêu chuẩn cao nhất.',
  },
  {
    title: 'Trải nghiệm độc bản',
    description:
      'Các hành trình được thiết kế riêng tư, mang đậm bản sắc văn hóa địa phương.',
  },
  {
    title: 'Hỗ trợ 24/7',
    description:
      'Đội ngũ chuyên gia luôn sẵn sàng đồng hành cùng bạn trên mọi nẻo đường.',
  },
]

function formatCurrency(value) {
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`
}

function DestinationCard({ service }) {
  const modifierClass = {
    tall: 'home-destination-card--tall',
    small: 'home-destination-card--small',
    wide: 'home-destination-card--wide',
  }[service.size]

  return (
    <article
      className={`home-destination-card ${modifierClass ?? ''}`}
      style={{ backgroundImage: `url(${service.image_url})` }}
    >
      <div className="home-destination-card__overlay" />
      <div className="home-destination-card__content">
        {service.badge_text ? (
          <span className="home-destination-card__badge">{service.badge_text}</span>
        ) : null}
        <h3 className="home-destination-card__title">{service.title}</h3>
        <p className="home-destination-card__description">{service.short_description}</p>
      </div>
    </article>
  )
}

function FlashSaleCard({ service }) {
  return (
    <article className="home-offer-card">
      <div
        aria-hidden="true"
        className="home-offer-card__media"
        style={{ backgroundImage: `url(${service.image_url})` }}
      />
      <div className="home-offer-card__body">
        <span className="home-offer-card__discount">GIẢM {service.discount_percent}%</span>
        <h3 className="home-offer-card__title">{service.title}</h3>
        <p className="home-offer-card__description">{service.short_description}</p>
        <div className="home-offer-card__footer">
          <div className="home-offer-card__price-group">
            <span className="home-offer-card__price-old">{formatCurrency(service.base_price)}</span>
            <span className="home-offer-card__price">
              {formatCurrency(service.sale_price)}
              <span className="home-offer-card__unit">{service.price_unit}</span>
            </span>
          </div>

          <Link className="home-offer-card__action" to="/services">
            Đặt Ngay
          </Link>
        </div>
      </div>
    </article>
  )
}

function HomePage() {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero__content">
          <div className="home-hero__copy">
            <div className="home-hero__title-group">
              <span className="home-hero__title-leading">Khám phá</span>
              <span className="home-hero__title-script">Việt Nam</span>
            </div>

            <p className="home-hero__description">
              Hành trình di sản cao cấp, kết nối tinh hoa văn hóa truyền thống với
              những trải nghiệm nghỉ dưỡng xa hoa nhất.
            </p>

            <Link className="home-hero__cta" to="/services">
              Bắt đầu hành trình
            </Link>
          </div>

          <div className="home-hero__art">
            <img
              alt="Nét Việt Travel collage"
              className="home-hero__art-image"
              src="/assets/template/home/v39_1982.png"
            />
          </div>
        </div>

        <div className="home-search-card">
          <div className="home-search-card__fields">
            {searchFields.map((field) => (
              <div className="home-search-card__field" key={field.label}>
                <span className="home-search-card__label">{field.label}</span>
                <span className="home-search-card__value">{field.value}</span>
              </div>
            ))}
          </div>

          <div className="home-search-card__filters">
            <span className="home-search-card__filters-title">Bộ lọc:</span>

            <div className="home-search-card__chips">
              {filterLabels.map((label) => (
                <button className="home-search-card__chip" key={label} type="button">
                  {label}
                </button>
              ))}
            </div>

            <button className="home-search-card__submit" type="button">
              Tìm kiếm
            </button>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__heading">
          <span className="home-section__spark" aria-hidden="true" />
          <h2 className="home-section__title">Điểm Đến Tuyệt Diệu</h2>
          <span className="home-section__underline" aria-hidden="true" />
          <p className="home-section__subtitle">
            Lựa chọn hàng đầu cho những tâm hồn xê dịch thượng lưu
          </p>
        </div>

        <div className="home-destinations-grid">
          {destinationServices.map((service) => (
            <DestinationCard key={service.slug} service={service} />
          ))}
        </div>
      </section>

      <section className="home-flash-sale">
        <div className="home-flash-sale__countdown">
          <div className="home-flash-sale__eyebrow">ƯU ĐÃI GIỚI HẠN</div>
          <h2 className="home-flash-sale__title">
            Flash Sale
            <br />
            Mùa Hội Ngộ
          </h2>

          <div className="home-flash-sale__timer">
            <div className="home-flash-sale__timer-unit">
              <span className="home-flash-sale__timer-value">02</span>
              <span className="home-flash-sale__timer-label">NGÀY</span>
            </div>
            <div className="home-flash-sale__timer-unit">
              <span className="home-flash-sale__timer-value">14</span>
              <span className="home-flash-sale__timer-label">GIỜ</span>
            </div>
            <div className="home-flash-sale__timer-unit">
              <span className="home-flash-sale__timer-value">45</span>
              <span className="home-flash-sale__timer-label">PHÚT</span>
            </div>
          </div>
        </div>

        <div className="home-flash-sale__offers">
          {flashSaleServices.map((service) => (
            <FlashSaleCard key={service.slug} service={service} />
          ))}
        </div>
      </section>

      <section className="home-values">
        <div className="home-values__image-wrap">
          <img
            alt="Nét Việt Travel core values"
            className="home-values__image"
            src="/assets/template/home/v184_150.png"
          />
        </div>

        <div className="home-values__content">
          <div className="home-values__heading">
            <span className="home-values__eyebrow">GIÁ TRỊ CỐT LÕI</span>
            <h2 className="home-values__title">Tại sao chọn Nét Việt Travel?</h2>
          </div>

          <div className="home-values__list">
            {coreValues.map((item) => (
              <article className="home-values__item" key={item.title}>
                <span className="home-values__icon" aria-hidden="true" />
                <div className="home-values__copy">
                  <h3 className="home-values__item-title">{item.title}</h3>
                  <p className="home-values__item-description">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
