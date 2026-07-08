import { useDeferredValue, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

const HANDBOOK_FILTERS = Object.freeze([
  { id: 'all', label: 'Tất cả' },
  { id: 'tour', label: 'Tour' },
  { id: 'flight', label: 'Vé máy bay' },
  { id: 'hotel', label: 'Khách sạn' },
  { id: 'train', label: 'Vé tàu' },
])

const HANDBOOK_GUIDES = Object.freeze([
  {
    id: 'guide-001',
    type: 'tour',
    type_label: 'Tour',
    title: 'Checklist tour di sản miền Trung',
    summary: 'Chuẩn bị gọn trước ngày đi với giấy tờ, quần áo và đồ dùng cần mang theo cho hành trình Huế - Hội An.',
    note: 'Ưu tiên quần áo gọn nhẹ, giày dễ di chuyển và pin dự phòng cho lịch trình đi bộ nhiều.',
    route: '/services',
    items: [
      'CCCD hoặc hộ chiếu còn hiệu lực',
      'Trang phục thoải mái, mũ và kem chống nắng',
      'Thuốc cá nhân và bình nước nhỏ',
      'Kiểm tra giờ tập trung và điểm đón trước 12 giờ',
    ],
  },
  {
    id: 'guide-002',
    type: 'flight',
    type_label: 'Vé máy bay',
    title: 'Sẵn sàng trước giờ bay',
    summary: 'Các bước nhanh để không trễ check-in, thiếu hành lý hoặc quên giấy tờ khi ra sân bay.',
    note: 'Chặng nội địa nên có mặt trước 2 giờ; nếu có hành lý ký gửi hoặc đi dịp cao điểm, nên ra sớm hơn.',
    route: '/flights',
    items: [
      'Check-in online trước 24 giờ nếu hãng hỗ trợ',
      'Đối chiếu mã đặt chỗ, terminal và quy định hành lý',
      'Mang CCCD hoặc hộ chiếu đúng tên trên vé',
      'Chuẩn bị sạc dự phòng, tai nghe và nước uống sau khi qua kiểm tra an ninh',
    ],
  },
  {
    id: 'guide-003',
    type: 'hotel',
    type_label: 'Khách sạn',
    title: 'Nhận phòng nhanh và đúng chuẩn',
    summary: 'Giữ đủ giấy tờ và yêu cầu đặc biệt để nhận phòng thuận lợi, hạn chế chờ tại quầy lễ tân.',
    note: 'Nếu nhận phòng muộn hoặc có yêu cầu giường, nên nhắn trước với cơ sở lưu trú để tránh phát sinh.',
    route: '/hotels',
    items: [
      'Mang giấy tờ tùy thân của người đứng tên đặt phòng',
      'Lưu mã đặt phòng và giờ check-in/check-out',
      'Xác nhận phụ thu trẻ em, giường phụ hoặc ăn sáng',
      'Kiểm tra chính sách cọc và phương thức thanh toán tại quầy',
    ],
  },
  {
    id: 'guide-004',
    type: 'train',
    type_label: 'Vé tàu',
    title: 'Lên tàu đúng giờ, hành lý đúng quy định',
    summary: 'Mẹo chuẩn bị cho hành trình tàu hỏa dài giờ, đặc biệt khi đi cùng gia đình hoặc mang nhiều hành lý.',
    note: 'Nên có mặt trước 45 - 60 phút để tìm đúng ga, toa và vị trí lên tàu trong khung giờ đông khách.',
    route: '/trains',
    items: [
      'Lưu mã vé, số tàu, số toa và số ghế',
      'Gắn thẻ nhận biết cho vali và balo',
      'Mang áo khoác mỏng, dép đi trong toa và khăn giấy',
      'Kiểm tra quy định đổi trả nếu lịch trình có thể thay đổi',
    ],
  },
])

const COMMON_DOCUMENTS = Object.freeze([
  'CCCD, hộ chiếu hoặc giấy tờ tùy thân hợp lệ',
  'Mã đặt dịch vụ, mã vé hoặc xác nhận thanh toán',
  'Thông tin liên hệ khẩn cấp và địa chỉ lưu trú',
  'Bản mềm giấy tờ lưu trong điện thoại hoặc email',
])

const QUICK_TIPS = Object.freeze([
  {
    id: 'tip-001',
    title: 'Soạn vali theo nhóm',
    description: 'Tách đồ dùng theo nhóm giấy tờ, điện tử, quần áo và chăm sóc cá nhân để dễ kiểm tra lần cuối.',
  },
  {
    id: 'tip-002',
    title: 'Kiểm tra thời tiết điểm đến',
    description: 'Xem dự báo 48 giờ trước chuyến đi để chọn trang phục và phụ kiện phù hợp hơn.',
  },
  {
    id: 'tip-003',
    title: 'Giữ một bộ đồ dự phòng',
    description: 'Với chuyến bay hoặc tàu dài giờ, nên để sẵn một bộ đồ mỏng cùng vật dụng thiết yếu trong hành lý xách tay.',
  },
])

function preserveAuthPath(pathname, isCustomer) {
  if (!isCustomer) {
    return pathname
  }

  return pathname.includes('?') ? `${pathname}&auth=customer` : `${pathname}?auth=customer`
}

function GuideIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M6.5 5.5h8a2 2 0 0 1 2 2v10a1.5 1.5 0 0 0-1.5-1.5h-8a2 2 0 0 0-2 2v-10a2.5 2.5 0 0 1 2.5-2.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8.5 9h5m-5 3h5m-5 3h3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function TravelHandbookPage() {
  const [searchParams] = useSearchParams()
  const isCustomer = searchParams.get('auth') === 'customer'
  const [query, setQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())

  const filteredGuides = useMemo(() => {
    return HANDBOOK_GUIDES.filter((guide) => {
      const matchesFilter = selectedFilter === 'all' ? true : guide.type === selectedFilter
      const haystack =
        `${guide.title} ${guide.summary} ${guide.note} ${guide.items.join(' ')}`.toLowerCase()
      const matchesQuery = deferredQuery ? haystack.includes(deferredQuery) : true

      return matchesFilter && matchesQuery
    })
  }, [deferredQuery, selectedFilter])

  const totalChecklistItems = HANDBOOK_GUIDES.reduce(
    (totalCount, guide) => totalCount + guide.items.length,
    0,
  )
  const profilePath = preserveAuthPath('/profile', isCustomer)
  const customerCarePath = preserveAuthPath('/customer-care', isCustomer)
  const helpCenterPath = preserveAuthPath('/help-center', isCustomer)

  return (
    <div className="travel-handbook-page">
      <section className="travel-handbook-hero">
        <div className="travel-handbook-hero__copy">
          <p className="travel-handbook-hero__eyebrow">Tài khoản cá nhân</p>
          <h1>Sổ tay du lịch</h1>
          <p>
            Tổng hợp checklist hành lý, giấy tờ và mẹo di chuyển theo từng loại hành trình để bạn
            chuẩn bị nhanh hơn trước khi khởi hành.
          </p>

          <div className="travel-handbook-hero__actions">
            <Link className="travel-handbook-hero__button" to={profilePath}>
              Quay về tài khoản
            </Link>
            <Link
              className="travel-handbook-hero__button travel-handbook-hero__button--secondary"
              to={customerCarePath}
            >
              Hỏi thêm với hỗ trợ
            </Link>
          </div>
        </div>

        <div className="travel-handbook-hero__spotlight">
          <span className="travel-handbook-hero__badge">Chuẩn bị nhanh</span>
          <strong>{HANDBOOK_GUIDES[0].title}</strong>
          <p>{HANDBOOK_GUIDES[0].summary}</p>
          <small>{HANDBOOK_GUIDES[0].note}</small>
        </div>
      </section>

      <section className="travel-handbook-stats" aria-label="Tổng quan sổ tay">
        <article className="travel-handbook-stat-card">
          <span>Mẫu checklist</span>
          <strong>{HANDBOOK_GUIDES.length}</strong>
          <p>Các mẫu chuẩn bị theo tour, vé máy bay, khách sạn và vé tàu.</p>
        </article>

        <article className="travel-handbook-stat-card">
          <span>Hạng mục cần nhớ</span>
          <strong>{totalChecklistItems}</strong>
          <p>Tổng số đầu việc gợi ý để bạn rà soát trước khi đi.</p>
        </article>

        <article className="travel-handbook-stat-card">
          <span>Giấy tờ chung</span>
          <strong>{COMMON_DOCUMENTS.length}</strong>
          <p>Những mục gần như luôn cần trong mọi hành trình.</p>
        </article>
      </section>

      <div className="travel-handbook-layout">
        <section className="travel-handbook-main">
          <header className="travel-handbook-toolbar">
            <div>
              <p className="travel-handbook-toolbar__eyebrow">Tra cứu nhanh</p>
              <h2>Chọn loại hành trình bạn đang chuẩn bị</h2>
            </div>

            <label className="travel-handbook-search">
              <span className="travel-handbook-search__label">Tìm theo hành lý, giấy tờ hoặc dịch vụ</span>
              <input
                className="travel-handbook-search__input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ví dụ: CCCD, check-in online, vali, khách sạn..."
              />
            </label>
          </header>

          <div className="travel-handbook-filter-list" role="tablist" aria-label="Lọc sổ tay">
            {HANDBOOK_FILTERS.map((filter) => (
              <button
                key={filter.id}
                className={
                  selectedFilter === filter.id
                    ? 'travel-handbook-filter travel-handbook-filter--active'
                    : 'travel-handbook-filter'
                }
                type="button"
                onClick={() => setSelectedFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {filteredGuides.length ? (
            <div className="travel-handbook-guide-list">
              {filteredGuides.map((guide) => (
                <article className="travel-guide-card" key={guide.id}>
                  <div className="travel-guide-card__header">
                    <span className="travel-guide-card__icon">
                      <GuideIcon />
                    </span>

                    <div className="travel-guide-card__heading">
                      <span className="travel-guide-card__type">{guide.type_label}</span>
                      <strong>{guide.title}</strong>
                      <p>{guide.summary}</p>
                    </div>
                  </div>

                  <div className="travel-guide-card__content">
                    <ul className="travel-guide-card__checklist">
                      {guide.items.map((item) => (
                        <li key={`${guide.id}-${item}`}>{item}</li>
                      ))}
                    </ul>

                    <div className="travel-guide-card__note">
                      <strong>Lưu ý</strong>
                      <p>{guide.note}</p>
                    </div>
                  </div>

                  <div className="travel-guide-card__actions">
                    <Link
                      className="travel-guide-card__button"
                      to={preserveAuthPath(guide.route, isCustomer)}
                    >
                      Mở dịch vụ liên quan
                    </Link>
                    <Link
                      className="travel-guide-card__button travel-guide-card__button--secondary"
                      to={helpCenterPath}
                    >
                      Xem thêm hướng dẫn
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="travel-handbook-empty" role="status">
              <strong>Chưa tìm thấy checklist phù hợp</strong>
              <p>
                Thử đổi từ khóa tìm kiếm hoặc quay về bộ lọc tổng quát để xem lại các sổ tay đang
                có sẵn.
              </p>
              <button
                className="travel-handbook-empty__button"
                type="button"
                onClick={() => {
                  setQuery('')
                  setSelectedFilter('all')
                }}
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </section>

        <aside className="travel-handbook-sidebar">
          <section className="travel-handbook-panel">
            <header className="travel-handbook-panel__header">
              <p className="travel-handbook-panel__eyebrow">Giấy tờ quan trọng</p>
              <h2>Những mục nên kiểm tra trước khi rời nhà</h2>
            </header>

            <ul className="travel-handbook-doc-list">
              {COMMON_DOCUMENTS.map((documentItem) => (
                <li key={documentItem}>{documentItem}</li>
              ))}
            </ul>
          </section>

          <section className="travel-handbook-panel travel-handbook-panel--tips">
            <header className="travel-handbook-panel__header">
              <p className="travel-handbook-panel__eyebrow">Mẹo di chuyển</p>
              <h2>Chuẩn bị gọn hơn cho từng chuyến đi</h2>
            </header>

            <div className="travel-handbook-tip-list">
              {QUICK_TIPS.map((tip) => (
                <article className="travel-handbook-tip" key={tip.id}>
                  <strong>{tip.title}</strong>
                  <p>{tip.description}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default TravelHandbookPage
