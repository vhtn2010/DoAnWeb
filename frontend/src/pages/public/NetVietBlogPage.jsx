import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import usePublicSession from '../../hooks/usePublicSession.js'
import { buildPublicAuthPath } from '../../utils/publicNavigation.js'

const BLOG_ASSET_PATH = '/assets/template/blog'

const FEATURED_STORIES = Object.freeze([
  {
    id: 'featured-ha-long',
    title: 'Vẻ đẹp vĩnh hằng của Vịnh Hạ Long',
    image: `${BLOG_ASSET_PATH}/featured-ha-long.png`,
    route: '/services',
  },
  {
    id: 'featured-hoi-an-food',
    title: 'Tinh hoa ẩm thực phố cổ Hội An',
    image: `${BLOG_ASSET_PATH}/featured-hoi-an-food.png`,
    route: '/services',
  },
  {
    id: 'featured-mu-cang-chai',
    title: 'Mùa vàng trên rẻo cao Mù Cang Chải',
    image: `${BLOG_ASSET_PATH}/featured-mu-cang-chai.png`,
    route: '/services',
  },
  {
    id: 'featured-dong-ba',
    title: 'Ký ức chợ Đông Ba sớm mai',
    image: `${BLOG_ASSET_PATH}/featured-dong-ba.png`,
    route: '/services',
  },
])

const LATEST_POSTS = Object.freeze([
  {
    id: 'latest-dong-ba',
    category: 'DI SẢN KIẾN TRÚC',
    title: 'Nét cổ kính thầm lặng của chợ Đông Ba sớm mai',
    excerpt:
      'Tìm về những giá trị nguyên bản giữa lòng cố đô, nơi thời gian dường như ngưng đọng bên những gian hàng nhuốm màu lịch sử...',
    author: 'Minh Khôi',
    date: '8 tháng 7, 2024',
    image: `${BLOG_ASSET_PATH}/latest-dong-ba.png`,
    route: '/services',
  },
  {
    id: 'latest-da-lat-rain',
    category: 'LỐI SỐNG',
    title: 'Đà Lạt và những ngày mưa không vội vã',
    excerpt:
      'Khám phá góc nhỏ bình yên giữa lòng phố núi, nơi ly cà phê nóng và tiếng nhạc Trịnh đưa bạn về những miền ký ức xa xăm...',
    author: 'Linh Lan',
    date: '7 tháng 7, 2024',
    image: `${BLOG_ASSET_PATH}/latest-da-lat-rain.png`,
    route: '/hotels',
  },
  {
    id: 'latest-mui-ne',
    category: 'HÀNH TRÌNH',
    title: 'Bình minh đỏ trên những đồi cát Mũi Né',
    excerpt:
      'Chuyến đi săn mặt trời tại tiểu sa mạc của Việt Nam, một trải nghiệm đánh thức mọi giác quan giữa nắng, gió và cát...',
    author: 'Hoàng Nam',
    date: '6 tháng 7, 2024',
    image: `${BLOG_ASSET_PATH}/latest-mui-ne.png`,
    route: '/services',
  },
])

const GUIDE_POSTS = Object.freeze([
  {
    id: 'guide-visa',
    title: 'Quy định visa mới nhất 2024 dành cho du khách quốc tế',
    excerpt:
      'Tổng hợp thông tin chi tiết về chính sách thị thực mới, giúp hành trình khám phá Việt Nam trở nên dễ dàng hơn bao giờ hết.',
    image: `${BLOG_ASSET_PATH}/guide-visa.png`,
    route: '/help-center',
  },
  {
    id: 'guide-trekking',
    title: '7 vật dụng không thể thiếu khi trekking vùng cao Bắc Bộ',
    excerpt:
      'Chuẩn bị kỹ lưỡng cho những chuyến phiêu lưu băng rừng vượt thác tại Hà Giang, Sapa hay Cao Bằng.',
    image: `${BLOG_ASSET_PATH}/guide-trekking.png`,
    route: '/travel-handbook',
  },
])

const LOCAL_NEWS = Object.freeze([
  {
    id: 'local-hue-balloon',
    title: 'Lễ hội khinh khí cầu tại Huế sắp khai mạc',
    meta: 'Diễn ra từ 12-15/08/2024',
    tone: 'red',
  },
  {
    id: 'local-saigon-cafe',
    title: 'Top 5 quán cà phê "chữa lành" tại trung tâm Sài Gòn',
    meta: 'Cập nhật bởi Food Reviewer',
    tone: 'gold',
  },
  {
    id: 'local-flight',
    title: 'Khai trương đường bay mới Đà Lạt - Phuket',
    meta: 'Bắt đầu từ tháng 9 năm nay',
    tone: 'red',
  },
])

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M7 3v3m10-3v3M4.5 9.5h15M6 5.5h12A1.5 1.5 0 0 1 19.5 7v11A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18V7A1.5 1.5 0 0 1 6 5.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function PenIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="m4 20 4.3-1 10.9-10.9a2.1 2.1 0 0 0-3-3L5.3 16 4 20Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="m20 20-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 7a7 7 0 0 0-14 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function normalizeSearchText(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function storyMatchesQuery(story, query) {
  if (!query.trim()) {
    return true
  }

  return normalizeSearchText(`${story.title} ${story.excerpt ?? ''} ${story.category ?? ''}`)
    .includes(normalizeSearchText(query))
}

function SectionTitle({ action, children }) {
  return (
    <header className="netviet-blog-section-title">
      <h2>{children}</h2>
      {action}
    </header>
  )
}

function NetVietBlogPage() {
  const { isCustomer } = usePublicSession()
  const [query, setQuery] = useState('')
  const filteredLatestPosts = useMemo(
    () => LATEST_POSTS.filter((post) => storyMatchesQuery(post, query)),
    [query],
  )
  const filteredGuidePosts = useMemo(
    () => GUIDE_POSTS.filter((post) => storyMatchesQuery(post, query)),
    [query],
  )
  const profilePath = buildPublicAuthPath('/profile', isCustomer)

  function handleSearchSubmit(event) {
    event.preventDefault()
  }

  return (
    <main className="netviet-blog-page">
      <section className="netviet-blog-hero" aria-label="Tiêu điểm blog">
        <img
          alt="Cố đô Huế nhìn từ trên cao"
          className="netviet-blog-hero__image"
          src={`${BLOG_ASSET_PATH}/blog-hero-hue.png`}
        />
        <div className="netviet-blog-hero__overlay" />

        <form className="netviet-blog-search" role="search" onSubmit={handleSearchSubmit}>
          <label className="netviet-blog-search__label" htmlFor="netviet-blog-search">
            Tìm kiếm cảm hứng, điểm đến
          </label>
          <input
            id="netviet-blog-search"
            className="netviet-blog-search__input"
            type="search"
            value={query}
            placeholder="Tìm kiếm cảm hứng, điểm đến..."
            onChange={(event) => setQuery(event.target.value)}
          />
          <button className="netviet-blog-search__button" type="submit">
            <SearchIcon />
            <span>TÌM KIẾM</span>
          </button>
        </form>

        <div className="netviet-blog-hero__content">
          <span className="netviet-blog-hero__badge">TIÊU ĐIỂM DI SẢN</span>
          <h1>
            Kinh nghiệm du lịch Cố đô
            <br />
            Huế tự túc chi tiết nhất 2024
          </h1>
          <div className="netviet-blog-hero__meta">
            <strong>Traveloka VN</strong>
            <span aria-hidden="true" />
            <time dateTime="2024-07-15">15 tháng 7, 2024</time>
          </div>
        </div>

        <div className="netviet-blog-slider" aria-hidden="true">
          <button type="button" tabIndex={-1}>‹</button>
          <span className="netviet-blog-slider__dots">
            <i />
            <i />
            <i />
          </span>
          <button type="button" tabIndex={-1}>›</button>
        </div>
      </section>

      <section className="netviet-blog-share">
        <div>
          <h2>Chia sẻ hành trình của bạn</h2>
          <p>Góp phần lưu giữ vẻ đẹp di sản Việt qua những câu chuyện và góc nhìn riêng của bạn.</p>
        </div>
        <Link className="netviet-blog-share__button" to={profilePath}>
          <PenIcon />
          <span>BẮT ĐẦU VIẾT BÀI</span>
        </Link>
      </section>

      <section className="netviet-blog-featured" aria-labelledby="netviet-blog-featured-title">
        <SectionTitle
          action={
            <Link className="netviet-blog-section-title__link" to={buildPublicAuthPath('/services', isCustomer)}>
              XEM THÊM
              <ArrowRightIcon />
            </Link>
          }
        >
          <span id="netviet-blog-featured-title">Bài viết nổi bật</span>
        </SectionTitle>

        <div className="netviet-blog-featured__grid">
          {FEATURED_STORIES.map((story) => (
            <Link
              className="netviet-blog-featured-card"
              key={story.id}
              to={buildPublicAuthPath(story.route, isCustomer)}
            >
              <img alt={story.title} src={story.image} />
              <strong>{story.title}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="netviet-blog-latest" aria-labelledby="netviet-blog-latest-title">
        <SectionTitle>
          <span id="netviet-blog-latest-title">Các bài viết mới nhất</span>
        </SectionTitle>

        {filteredLatestPosts.length ? (
          <div className="netviet-blog-latest__grid">
            {filteredLatestPosts.map((post) => (
              <article className="netviet-blog-article-card" key={post.id}>
                <Link to={buildPublicAuthPath(post.route, isCustomer)}>
                  <img alt={post.title} src={post.image} />
                </Link>
                <div className="netviet-blog-article-card__body">
                  <span className="netviet-blog-article-card__category">{post.category}</span>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                  <div className="netviet-blog-article-card__footer">
                    <span className="netviet-blog-author">
                      <i>
                        <UserIcon />
                      </i>
                      {post.author}
                    </span>
                    <time dateTime="2024-07-08">{post.date}</time>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="netviet-blog-empty" role="status">
            <strong>Chưa có bài viết phù hợp</strong>
            <p>Thử tìm bằng từ khóa khác để xem thêm cảm hứng du lịch Nét Việt.</p>
            <button type="button" onClick={() => setQuery('')}>
              XÓA TỪ KHÓA
            </button>
          </div>
        )}
      </section>

      <section className="netviet-blog-guides" aria-label="Cẩm nang và tin tức local">
        <div className="netviet-blog-guides__main">
          <SectionTitle>
            <span>Cẩm nang du lịch</span>
          </SectionTitle>

          <div className="netviet-blog-guide-list">
            {filteredGuidePosts.map((guide) => (
              <Link
                className="netviet-blog-guide-card"
                key={guide.id}
                to={buildPublicAuthPath(guide.route, isCustomer)}
              >
                <img alt={guide.title} src={guide.image} />
                <span>
                  <strong>{guide.title}</strong>
                  <em>{guide.excerpt}</em>
                  <b>ĐỌC TIẾP</b>
                </span>
              </Link>
            ))}
          </div>
        </div>

        <aside className="netviet-blog-local">
          <h2>TIN TỨC LOCAL</h2>
          <div className="netviet-blog-local__list">
            {LOCAL_NEWS.map((news) => (
              <article className="netviet-blog-local-item" key={news.id}>
                <span className={`netviet-blog-local-item__icon netviet-blog-local-item__icon--${news.tone}`}>
                  <CalendarIcon />
                </span>
                <div>
                  <h3>{news.title}</h3>
                  <p>{news.meta}</p>
                </div>
              </article>
            ))}
          </div>
          <Link className="netviet-blog-local__button" to={profilePath}>
            THAM GIA CỘNG ĐỒNG NÉT VIỆT
          </Link>
        </aside>
      </section>
    </main>
  )
}

export default NetVietBlogPage
