import { Link } from 'react-router-dom'
import usePublicSession from '../../hooks/usePublicSession.js'
import { buildPublicAuthPath } from '../../utils/publicNavigation.js'

const BLOG_DETAIL_ASSET_PATH = '/assets/template/blog/detail'

const ARTICLE_TAGS = Object.freeze([
  'du lịch huế',
  'kinh nghiệm du lịch',
  'di sản',
])

const FEATURED_HOTELS = Object.freeze([
  {
    id: 'azerai-la-residence',
    image: `${BLOG_DETAIL_ASSET_PATH}/azerai-la-residence.png`,
    location: 'Trung tâm Huế',
    name: 'Azerai La Residence',
    price: '3.500.000 VNĐ',
    rating: '9.2/10',
    route: '/hotels',
  },
  {
    id: 'pilgrimage-village',
    image: `${BLOG_DETAIL_ASSET_PATH}/pilgrimage-village.png`,
    location: 'Thủy Xuân, Huế',
    name: 'Pilgrimage Village',
    price: '2.100.000 VNĐ',
    rating: '8.8/10',
    route: '/hotels',
  },
])

const RELATED_POSTS = Object.freeze([
  {
    id: 'bun-bo-hue',
    image: `${BLOG_DETAIL_ASSET_PATH}/bun-bo-hue.png`,
    meta: '20 Oct 2024 • 5 phút đọc',
    title: 'Hương vị Bún Bò Huế chính gốc',
  },
  {
    id: 'hoa-giay-thanh-tien',
    image: `${BLOG_DETAIL_ASSET_PATH}/hoa-giay-thanh-tien.png`,
    meta: '18 Oct 2024 • 4 phút đọc',
    title: 'Làng nghề hoa giấy Thanh Tiên',
  },
  {
    id: 'song-huong',
    image: `${BLOG_DETAIL_ASSET_PATH}/song-huong.png`,
    meta: '15 Oct 2024 • 6 phút đọc',
    title: 'Nghe ca Huế trên sông Hương',
  },
])

function ChevronIcon({ direction = 'right' }) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d={direction === 'left' ? 'M15 6 9 12l6 6' : 'm9 6 6 6-6 6'}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M8.5 12.5h7m-5 3 6-6a3 3 0 0 0-4.24-4.24l-1.1 1.1m2.34 5.14-6 6a3 3 0 0 1-4.24-4.24l1.1-1.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M13.5 21v-7.2h2.4l.46-3h-2.86V8.86c0-.82.4-1.62 1.7-1.62h1.3V4.68S15.32 4.5 14.2 4.5c-2.34 0-3.86 1.42-3.86 3.98v2.32H7.75v3h2.59V21h3.16Z"
        fill="currentColor"
      />
    </svg>
  )
}

function TwitterIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M17.74 4.75h2.82l-6.16 7.04 7.25 9.46h-5.68l-4.45-5.74-5.08 5.74H3.62l6.58-7.46-6.95-9.04h5.82l4.01 5.26 4.66-5.26Zm-.99 14.84h1.56L8.21 6.33H6.53l10.22 13.26Z"
        fill="currentColor"
      />
    </svg>
  )
}

function BulletIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path
        d="M7.25 12.25 3 8l1.25-1.25 3 3 4.5-6L13.25 5l-6 7.25Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ShareActions() {
  return (
    <div className="netviet-blog-detail-share" aria-label="Chia sẻ bài viết">
      <button type="button" aria-label="Chia sẻ lên Facebook">
        <FacebookIcon />
      </button>
      <button type="button" aria-label="Chia sẻ lên Twitter">
        <TwitterIcon />
      </button>
      <button type="button" aria-label="Sao chép liên kết">
        <CopyIcon />
      </button>
    </div>
  )
}

function HotelWidget({ isCustomer }) {
  return (
    <section className="netviet-blog-detail-hotels" aria-labelledby="blog-detail-hotels-title">
      <header className="netviet-blog-detail-widget-heading">
        <h2 id="blog-detail-hotels-title">Khách sạn được ưa chuộng</h2>
        <div aria-hidden="true">
          <button type="button" tabIndex={-1}>
            <ChevronIcon direction="left" />
          </button>
          <button type="button" tabIndex={-1}>
            <ChevronIcon />
          </button>
        </div>
      </header>

      <div className="netviet-blog-detail-hotel-list">
        {FEATURED_HOTELS.map((hotel) => (
          <Link
            className="netviet-blog-detail-hotel"
            key={hotel.id}
            to={buildPublicAuthPath(hotel.route, isCustomer)}
          >
            <img alt={hotel.name} src={hotel.image} />
            <span>
              <strong>{hotel.name}</strong>
              <small>
                <b aria-label="5 sao">★★★★★</b>
                <em>{hotel.rating}</em>
              </small>
              <i>{hotel.location}</i>
              <mark>{hotel.price}</mark>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function RelatedPosts() {
  return (
    <section className="netviet-blog-detail-related" aria-labelledby="blog-detail-related-title">
      <h2 id="blog-detail-related-title">Bài viết đề xuất</h2>
      <div className="netviet-blog-detail-related-list">
        {RELATED_POSTS.map((post) => (
          <Link className="netviet-blog-detail-related-link" key={post.id} to="/blog/kinh-nghiem-du-lich-co-do-hue-2026">
            <img alt={post.title} src={post.image} />
            <span>
              <strong>{post.title}</strong>
              <small>{post.meta}</small>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function NetVietBlogDetailPage() {
  const { isCustomer } = usePublicSession()

  return (
    <main className="netviet-blog-detail-page">
      <div className="netviet-blog-detail-shell">
        <article className="netviet-blog-detail-article">
          <header className="netviet-blog-detail-header">
            <h1>
              Kinh nghiệm du lịch Cố đô Huế tự túc chi tiết nhất 2026
            </h1>
            <div className="netviet-blog-detail-meta-row">
              <div className="netviet-blog-detail-meta">
                <time dateTime="2026-01-24">24 Tháng 1, 2026</time>
                <span aria-hidden="true">•</span>
                <span>Đọc trong khoảng 8 phút</span>
              </div>
              <ShareActions />
            </div>
          </header>

          <figure className="netviet-blog-detail-figure netviet-blog-detail-figure--hero">
            <img alt="Đại Nội Huế lúc hoàng hôn" src={`${BLOG_DETAIL_ASSET_PATH}/hue-hero.png`} />
            <figcaption>Cố đô Huế mang vẻ đẹp thâm trầm, cổ kính.</figcaption>
          </figure>

          <div className="netviet-blog-detail-content">
            <p className="netviet-blog-detail-lead">
              Cố đô Huế không chỉ là một điểm đến, mà là một hành trình trở về với những giá
              trị vàng son của dân tộc. Bài viết này sẽ cung cấp cho bạn những kinh nghiệm
              thực tế nhất để khám phá trọn vẹn vẻ đẹp thâm trầm của miền đất thần kinh.
            </p>

            <h2>1. Thời điểm lý tưởng để đến Huế</h2>
            <p>
              Huế có hai mùa rõ rệt: mùa khô và mùa mưa. Mùa khô kéo dài từ tháng 3 đến
              tháng 8, thời tiết khá nóng nực nhưng lại là lúc lý tưởng nhất để tham quan các
              lăng tẩm và Đại Nội. Đặc biệt, nếu đến vào thời điểm diễn ra Festival Huế, bạn sẽ
              được đắm chìm trong không khí lễ hội rực rỡ sắc màu văn hóa.
            </p>

            <figure className="netviet-blog-detail-figure">
              <img
                alt="Vẻ đẹp cổ kính của Đại Nội dưới ánh nắng chiều"
                src={`${BLOG_DETAIL_ASSET_PATH}/hue-imperial-city.png`}
              />
              <figcaption>Vẻ đẹp cổ kính của Đại Nội dưới ánh nắng chiều.</figcaption>
            </figure>

            <h2>2. Những điểm đến không thể bỏ qua</h2>
            <ul className="netviet-blog-detail-list">
              <li>
                <BulletIcon />
                <span>
                  <strong>Đại Nội Huế:</strong> Trái tim của cố đô, nơi lưu giữ những dấu tích cuối cùng của
                  triều đại phong kiến Việt Nam.
                </span>
              </li>
              <li>
                <BulletIcon />
                <span>
                  <strong>Hệ thống Lăng tẩm:</strong> Lăng Tự Đức thơ mộng, Lăng Khải Định tinh xảo, Lăng
                  Minh Mạng uy nghi.
                </span>
              </li>
              <li>
                <BulletIcon />
                <span>
                  <strong>Chùa Thiên Mụ:</strong> Ngôi chùa cổ kính nằm trên đồi Hà Khê, biểu tượng tâm linh
                  của người dân Huế.
                </span>
              </li>
            </ul>

            <h2>Lời kết</h2>
            <p>
              Hy vọng với những thông tin về kinh nghiệm du lịch Cố đô Huế trên sẽ giúp bạn
              có thêm hành trang hữu ích cho chuyến khám phá hòn đảo xinh đẹp của mình.
              Với vẻ đẹp đến nao lòng của thiên nhiên, không khí dễ chịu, Cố đô Huế chắc
              chắn sẽ mang đến một kỳ nghỉ trọn vẹn và những trải nghiệm vô cùng độc đáo
              cho bạn. Đừng quên chia sẻ những khoảnh khắc tuyệt vời của mình với Nét Việt
              nhé!
            </p>
          </div>

          <footer className="netviet-blog-detail-tags">
            <strong>TAGS:</strong>
            <div>
              {ARTICLE_TAGS.map((tag) => (
                <Link key={tag} to="/blog">
                  {tag}
                </Link>
              ))}
            </div>
          </footer>
        </article>

        <aside className="netviet-blog-detail-sidebar">
          <HotelWidget isCustomer={isCustomer} />
          <RelatedPosts />
          <Link
            aria-label="Xem bài viết tiếp theo"
            className="netviet-blog-detail-next"
            to="/blog/kinh-nghiem-du-lich-co-do-hue-2026"
          >
            <ChevronIcon />
          </Link>
        </aside>
      </div>
    </main>
  )
}

export default NetVietBlogDetailPage
