import { Link } from 'react-router-dom'
import usePublicCollectionPage from '../../hooks/usePublicCollectionPage.js'
import usePublicSession from '../../hooks/usePublicSession.js'
import { buildPublicAuthPath } from '../../utils/publicNavigation.js'

const BLOG_CATEGORIES = Object.freeze([
  { id: 'all', label: 'Tất cả' },
  { id: 'destination', label: 'Điểm đến' },
  { id: 'guide', label: 'Kinh nghiệm' },
  { id: 'food', label: 'Ăn gì' },
  { id: 'itinerary', label: 'Lịch trình' },
])

const BLOG_POSTS = Object.freeze([
  {
    id: 'blog-001',
    category: 'destination',
    category_label: 'Điểm đến',
    title: '48 giờ ở Hội An: đi đâu để vừa đẹp ảnh vừa không mệt',
    excerpt:
      'Một lịch trình gọn cho cuối tuần với phố cổ, cà phê sớm, biển An Bàng và những khung giờ lên ảnh đẹp nhất.',
    author: 'Ban biên tập Nét Việt',
    reading_time: '6 phút đọc',
    published_at: '08/07/2026',
    destination_label: 'Hội An, Quảng Nam',
    image_url: '/assets/template/service/list/tour-mien-trung.png',
    route: '/services',
    featured: true,
    highlights: [
      'Khung giờ dạo phố cổ ít đông',
      'Quán cà phê có ban công đẹp để ngắm phố',
      'Mẹo di chuyển từ Đà Nẵng đến Hội An gọn và tiết kiệm',
    ],
  },
  {
    id: 'blog-002',
    category: 'guide',
    category_label: 'Kinh nghiệm',
    title: 'Checklist đi máy bay mùa cao điểm để không bị cuống ở sân bay',
    excerpt:
      'Từ check-in online, xếp hành lý đến canh giờ ra sân bay, đây là những bước nên xử lý trước khi khởi hành.',
    author: 'Hà Linh',
    reading_time: '5 phút đọc',
    published_at: '06/07/2026',
    destination_label: 'Di chuyển nội địa',
    image_url: '/assets/template/service/detail/recommendation-da-lat.png',
    route: '/flights',
    featured: false,
    highlights: [
      'Các mốc giờ nên nhớ trước chuyến bay',
      'Những lỗi hành lý xách tay thường gặp',
      'Khi nào nên ra sân bay sớm hơn 2 tiếng',
    ],
  },
  {
    id: 'blog-003',
    category: 'food',
    category_label: 'Ăn gì',
    title: 'Một ngày ăn ở Hạ Long: từ bữa sáng đến hải sản tối',
    excerpt:
      'Gợi ý nhịp ăn uống hợp lý cho khách đi vịnh ngắn ngày, ưu tiên món địa phương dễ thử và dễ chia sẻ.',
    author: 'Minh Khuê',
    reading_time: '4 phút đọc',
    published_at: '04/07/2026',
    destination_label: 'Hạ Long, Quảng Ninh',
    image_url: '/assets/template/service/list/tour-ha-long.png',
    route: '/services',
    featured: false,
    highlights: [
      'Món sáng nhanh trước giờ lên tàu',
      'Các món hải sản dễ ăn với nhóm đông',
      'Khung giờ nên đặt bàn để tránh đông khách',
    ],
  },
  {
    id: 'blog-004',
    category: 'itinerary',
    category_label: 'Lịch trình',
    title: '3 ngày ở Đà Nẵng cho người thích biển, cà phê và điểm ngắm hoàng hôn',
    excerpt:
      'Lịch trình thiên về trải nghiệm nhẹ, ít di chuyển gấp nhưng vẫn đủ biển, ẩm thực và những điểm ngắm chiều đẹp.',
    author: 'Nét Việt Team',
    reading_time: '7 phút đọc',
    published_at: '02/07/2026',
    destination_label: 'Đà Nẵng',
    image_url: '/assets/template/service/detail/recommendation-mien-trung.png',
    route: '/hotels',
    featured: false,
    highlights: [
      'Chọn khu lưu trú tiện đi biển',
      'Lịch đi Bán đảo Sơn Trà không quá mệt',
      'Gợi ý quán cà phê ngắm thành phố về chiều',
    ],
  },
  {
    id: 'blog-005',
    category: 'destination',
    category_label: 'Điểm đến',
    title: 'Phú Quốc cuối năm: nên ở khu nào nếu muốn vừa nghỉ vừa tiện đi chơi',
    excerpt:
      'Tóm tắt nhanh từng khu lưu trú phổ biến để bạn chọn nơi ở phù hợp với ngân sách và lịch nghỉ ngắn ngày.',
    author: 'Thảo Vy',
    reading_time: '5 phút đọc',
    published_at: '30/06/2026',
    destination_label: 'Phú Quốc, Kiên Giang',
    image_url: '/assets/template/service/detail/ha-long-gallery-main.png',
    route: '/hotels',
    featured: false,
    highlights: [
      'Khu trung tâm tiện ăn uống',
      'Khu yên tĩnh hợp nghỉ dưỡng',
      'Mẹo chọn chỗ ở nếu cần di chuyển ra sân bay sớm',
    ],
  },
  {
    id: 'blog-006',
    category: 'guide',
    category_label: 'Kinh nghiệm',
    title: 'Đi tàu đêm thoải mái hơn với 7 món đồ nhỏ nhưng rất đáng mang',
    excerpt:
      'Một vài món đồ gọn, nhẹ nhưng giúp chuyến tàu đêm đỡ mệt hơn đáng kể, nhất là khi đi cùng gia đình.',
    author: 'Phương Nam',
    reading_time: '4 phút đọc',
    published_at: '28/06/2026',
    destination_label: 'Hành trình đường sắt',
    image_url: '/assets/template/home/v1_137.png',
    route: '/trains',
    featured: false,
    highlights: [
      'Đồ dùng nên để ở hành lý xách tay',
      'Cách sắp xếp đồ dễ lấy khi lên tàu',
      'Mẹo ngủ tàu đêm dễ chịu hơn',
    ],
  },
])

const QUICK_NOTES = Object.freeze([
  {
    id: 'note-001',
    title: 'Khung giờ vàng để chụp ảnh',
    description: 'Sáng sớm từ 5:30 - 7:00 và chiều từ 16:30 - 18:00 thường cho ánh sáng đẹp, ít gắt.',
  },
  {
    id: 'note-002',
    title: 'Mang ít nhưng đúng',
    description: 'Mỗi chuyến đi ngắn chỉ nên chuẩn bị một bảng checklist 6 - 8 món thiết yếu để tránh quá tải hành lý.',
  },
  {
    id: 'note-003',
    title: 'Đặt chỗ ăn trước cuối tuần',
    description: 'Các điểm ăn nổi tiếng ở khu du lịch đông thường kín bàn nhanh sau 18:30, nhất là dịp hè.',
  },
])

const TRENDING_TOPICS = Object.freeze([
  'Cuối tuần gần Hà Nội',
  'Du lịch biển mùa hè',
  'Quán cà phê view đẹp',
  'Check-in sân bay gọn',
  'Lịch trình 3 ngày 2 đêm',
])

function BlogCompassIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m14.8 9.2-1.9 4.6-4.6 1.9 1.9-4.6 4.6-1.9Z"
        stroke="currentColor"
        strokeJoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function matchesBlogCategory(post, selectedCategory) {
  return post.category === selectedCategory
}

function getBlogSearchText(post) {
  return `${post.title} ${post.excerpt} ${post.destination_label} ${post.highlights.join(' ')}`
}

function NetVietBlogPage() {
  const { isCustomer } = usePublicSession()
  const featuredPost = BLOG_POSTS.find((post) => post.featured) ?? BLOG_POSTS[0]
  const {
    filteredItems: filteredPosts,
    query,
    resetFilters,
    selectedFilter: selectedCategory,
    setQuery,
    setSelectedFilter: setSelectedCategory,
  } = usePublicCollectionPage({
    filterItem: matchesBlogCategory,
    getSearchText: getBlogSearchText,
    items: BLOG_POSTS,
  })
  const profilePath = buildPublicAuthPath('/profile', isCustomer)

  return (
    <div className="netviet-blog-page">
      <section className="netviet-blog-hero">
        <div className="netviet-blog-hero__copy">
          <p className="netviet-blog-hero__eyebrow">Nét Việt Blog</p>
          <h1>Cảm hứng dịch chuyển, kinh nghiệm gọn và lịch trình dễ áp dụng</h1>
          <p>
            Một góc blog du lịch theo đúng tinh thần Nét Việt: điểm đến đẹp, mẹo đi gọn, lịch
            trình thực tế và đủ cảm hứng để bạn muốn lên kế hoạch ngay.
          </p>

          <div className="netviet-blog-hero__actions">
            <Link className="netviet-blog-hero__button" to={buildPublicAuthPath(featuredPost.route, isCustomer)}>
              Xem dịch vụ liên quan
            </Link>
            <Link
              className="netviet-blog-hero__button netviet-blog-hero__button--secondary"
              to={profilePath}
            >
              Quay về tài khoản
            </Link>
          </div>
        </div>

        <article className="netviet-blog-hero__feature">
          <img alt={featuredPost.title} src={featuredPost.image_url} />
          <div className="netviet-blog-hero__feature-copy">
            <span>{featuredPost.category_label}</span>
            <strong>{featuredPost.title}</strong>
            <p>{featuredPost.excerpt}</p>
            <small>
              {featuredPost.published_at} · {featuredPost.reading_time}
            </small>
          </div>
        </article>
      </section>

      <section className="netviet-blog-highlights" aria-label="Tổng quan blog">
        <article className="netviet-blog-highlight-card">
          <span>Bài viết nổi bật</span>
          <strong>{BLOG_POSTS.length}</strong>
          <p>Tổng hợp các bài viết ngắn, dễ đọc và sẵn sàng cho người đang lên kế hoạch đi.</p>
        </article>

        <article className="netviet-blog-highlight-card">
          <span>Chủ đề nổi bật</span>
          <strong>{BLOG_CATEGORIES.length - 1}</strong>
          <p>Gồm điểm đến, kinh nghiệm, ăn gì và các lịch trình dễ áp dụng.</p>
        </article>

        <article className="netviet-blog-highlight-card">
          <span>Ghi chú nhanh</span>
          <strong>{QUICK_NOTES.length}</strong>
          <p>Các mẹo ngắn để người đọc lấy được giá trị ngay từ lần lướt đầu.</p>
        </article>
      </section>

      <div className="netviet-blog-layout">
        <section className="netviet-blog-main">
          <header className="netviet-blog-toolbar">
            <div>
              <p className="netviet-blog-toolbar__eyebrow">Khám phá bài viết</p>
              <h2>Đọc theo điều bạn đang chuẩn bị cho chuyến đi</h2>
            </div>

            <label className="netviet-blog-search">
              <span className="netviet-blog-search__label">Tìm bài theo chủ đề, điểm đến hoặc mẹo</span>
              <input
                className="netviet-blog-search__input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ví dụ: Hội An, check-in online, Phú Quốc..."
              />
            </label>
          </header>

          <div className="netviet-blog-filter-list" role="tablist" aria-label="Danh mục blog">
            {BLOG_CATEGORIES.map((category) => (
              <button
                key={category.id}
                className={
                  selectedCategory === category.id
                    ? 'netviet-blog-filter netviet-blog-filter--active'
                    : 'netviet-blog-filter'
                }
                type="button"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>

          {filteredPosts.length ? (
            <div className="netviet-blog-post-grid">
              {filteredPosts.map((post) => (
                <article className="netviet-blog-card" key={post.id}>
                  <div className="netviet-blog-card__media">
                    <img alt={post.title} src={post.image_url} />
                    <span>{post.category_label}</span>
                  </div>

                  <div className="netviet-blog-card__content">
                    <div className="netviet-blog-card__meta">
                      <small>{post.destination_label}</small>
                      <small>
                        {post.published_at} · {post.reading_time}
                      </small>
                    </div>

                    <strong>{post.title}</strong>
                    <p>{post.excerpt}</p>

                    <ul className="netviet-blog-card__bullets">
                      {post.highlights.map((highlight) => (
                        <li key={`${post.id}-${highlight}`}>{highlight}</li>
                      ))}
                    </ul>

                    <div className="netviet-blog-card__footer">
                      <span>{post.author}</span>
                      <Link to={buildPublicAuthPath(post.route, isCustomer)}>Mở liên quan</Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="netviet-blog-empty" role="status">
              <strong>Chưa có bài viết phù hợp với bộ lọc hiện tại</strong>
              <p>Thử đổi danh mục hoặc từ khóa để xem lại các bài viết du lịch đang có sẵn.</p>
              <button
                className="netviet-blog-empty__button"
                type="button"
                onClick={() => {
                  resetFilters()
                }}
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </section>

        <aside className="netviet-blog-sidebar">
          <section className="netviet-blog-panel">
            <header className="netviet-blog-panel__header">
              <p className="netviet-blog-panel__eyebrow">Ghi chú nhanh</p>
              <h2>Những mẩu tip nhỏ nhưng dùng được ngay</h2>
            </header>

            <div className="netviet-blog-note-list">
              {QUICK_NOTES.map((note) => (
                <article className="netviet-blog-note" key={note.id}>
                  <strong>{note.title}</strong>
                  <p>{note.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="netviet-blog-panel netviet-blog-panel--trending">
            <header className="netviet-blog-panel__header">
              <p className="netviet-blog-panel__eyebrow">Chủ đề đang quan tâm</p>
              <h2>Những keyword du lịch được đọc nhiều</h2>
            </header>

            <div className="netviet-blog-trending-list">
              {TRENDING_TOPICS.map((topic) => (
                <button
                  key={topic}
                  className="netviet-blog-trending-chip"
                  type="button"
                  onClick={() => setQuery(topic)}
                >
                  <span className="netviet-blog-trending-chip__icon">
                    <BlogCompassIcon />
                  </span>
                  <span>{topic}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default NetVietBlogPage
