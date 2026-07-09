import { useState } from 'react'
import { Link } from 'react-router-dom'
import usePublicCollectionPage from '../../hooks/usePublicCollectionPage.js'
import usePublicSession from '../../hooks/usePublicSession.js'
import { buildPublicAuthPath } from '../../utils/publicNavigation.js'

const VOUCHER_FILTERS = Object.freeze([
  { id: 'all', label: 'Tất cả' },
  { id: 'active', label: 'Sẵn sàng dùng' },
  { id: 'used', label: 'Đã dùng' },
  { id: 'expired', label: 'Hết hạn' },
])

const MY_VOUCHERS = Object.freeze([
  {
    id: 'voucher-001',
    code: 'NETVIET500',
    title: 'Giảm 500.000đ cho tour nội địa',
    description: 'Áp dụng cho các tour có thời gian khởi hành trong 45 ngày tới.',
    status: 'active',
    status_label: 'Sẵn sàng dùng',
    discount_label: '500.000đ',
    discount_value: 500000,
    min_spend_label: 'Đơn từ 6.000.000đ',
    validity_label: 'Hết hạn ngày 25/07/2026',
    expires_at: '2026-07-25',
    service_tags: ['Tour', 'Du lịch hè', 'Nội địa'],
    route: '/services',
  },
  {
    id: 'voucher-002',
    code: 'BAYHEM1200',
    title: 'Giảm 12% vé máy bay khứ hồi',
    description: 'Tối đa 1.200.000đ cho các chặng nội địa thanh toán online.',
    status: 'active',
    status_label: 'Sẵn sàng dùng',
    discount_label: '12%',
    discount_value: 1200000,
    min_spend_label: 'Không áp dụng ngày cao điểm',
    validity_label: 'Hết hạn ngày 18/07/2026',
    expires_at: '2026-07-18',
    service_tags: ['Vé máy bay', 'Khứ hồi', 'Thanh toán online'],
    route: '/flights',
  },
  {
    id: 'voucher-003',
    code: 'STAYGOLD15',
    title: 'Giảm 15% khách sạn hạng sang',
    description: 'Ưu đãi riêng cho thành viên Di sản Vàng tại nhóm khách sạn 4-5 sao.',
    status: 'active',
    status_label: 'Sẵn sàng dùng',
    discount_label: '15%',
    discount_value: 1500000,
    min_spend_label: 'Tối đa 1.500.000đ',
    validity_label: 'Hết hạn ngày 31/07/2026',
    expires_at: '2026-07-31',
    service_tags: ['Khách sạn', '4-5 sao', 'Thành viên'],
    route: '/hotels',
  },
  {
    id: 'voucher-004',
    code: 'FAMILY350',
    title: 'Combo gia đình tiết kiệm 350.000đ',
    description: 'Đã áp dụng thành công cho đơn tour Hạ Long Signature 2N1Đ.',
    status: 'used',
    status_label: 'Đã dùng',
    discount_label: '350.000đ',
    discount_value: 350000,
    min_spend_label: 'Đã dùng ngày 02/07/2026',
    validity_label: 'Lưu trong lịch sử ưu đãi',
    expires_at: '2026-07-02',
    service_tags: ['Tour', 'Gia đình', 'Đã áp dụng'],
    route: '/profile',
  },
  {
    id: 'voucher-005',
    code: 'FLASHTRAIN',
    title: 'Giảm 250.000đ vé tàu cuối tuần',
    description: 'Ưu đãi flash sale cho đặt vé tàu trước tối thiểu 5 ngày.',
    status: 'expired',
    status_label: 'Hết hạn',
    discount_label: '250.000đ',
    discount_value: 250000,
    min_spend_label: 'Đã hết hạn ngày 05/07/2026',
    validity_label: 'Có thể quay lại ở các đợt sale mới',
    expires_at: '2026-07-05',
    service_tags: ['Vé tàu', 'Cuối tuần', 'Flash sale'],
    route: '/trains',
  },
])

const USAGE_STEPS = Object.freeze([
  {
    id: 'step-001',
    title: 'Chọn đúng dịch vụ',
    description: 'Mỗi mã chỉ áp dụng cho nhóm tour, vé hoặc khách sạn phù hợp với điều kiện hiển thị trên thẻ.',
  },
  {
    id: 'step-002',
    title: 'Kiểm tra hạn dùng',
    description: 'Ưu tiên dùng các mã sắp hết hạn để tránh bỏ lỡ khuyến mãi đang khả dụng cho tài khoản.',
  },
  {
    id: 'step-003',
    title: 'Dán mã ở bước thanh toán',
    description: 'Bạn có thể sao chép mã trực tiếp tại đây rồi dán vào luồng checkout hoặc payment confirmation.',
  },
])

const SUPPORT_NOTES = Object.freeze([
  'Một số mã được áp dụng tự động theo hạng thành viên, không cần nhập tay.',
  'Mỗi đơn hàng chỉ dùng được một voucher chính, trừ khi chiến dịch cho phép cộng dồn.',
  'Nếu mã hợp lệ nhưng chưa áp dụng được, bạn có thể chuyển sang chat hỗ trợ để kiểm tra điều kiện đơn hàng.',
])

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

function matchesVoucherFilter(voucher, selectedFilter) {
  return voucher.status === selectedFilter
}

function getVoucherSearchText(voucher) {
  return `${voucher.code} ${voucher.title} ${voucher.description} ${voucher.service_tags.join(' ')}`
}

function VoucherTicketIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M7 6.5h10a2 2 0 0 1 2 2v1.25a1.75 1.75 0 0 0 0 3.5v1.25a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-1.25a1.75 1.75 0 0 0 0-3.5V8.5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9 9.5h6M9 14.5h3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function MyVouchersPage() {
  const { isCustomer } = usePublicSession()
  const [copiedVoucherId, setCopiedVoucherId] = useState(null)
  const {
    filteredItems: filteredVouchers,
    query,
    resetFilters,
    selectedFilter,
    setQuery,
    setSelectedFilter,
  } = usePublicCollectionPage({
    filterItem: matchesVoucherFilter,
    getSearchText: getVoucherSearchText,
    items: MY_VOUCHERS,
  })

  const activeVouchers = MY_VOUCHERS.filter((voucher) => voucher.status === 'active')
  const totalReadyValue = activeVouchers.reduce(
    (totalAmount, voucher) => totalAmount + voucher.discount_value,
    0,
  )
  const nextExpiringVoucher = [...activeVouchers].sort((leftVoucher, rightVoucher) =>
    leftVoucher.expires_at.localeCompare(rightVoucher.expires_at),
  )[0]

  const profilePath = buildPublicAuthPath('/profile', isCustomer)
  const customerCarePath = buildPublicAuthPath('/customer-care', isCustomer)

  async function handleCopyVoucher(code, voucherId) {
    if (!navigator?.clipboard?.writeText) {
      return
    }

    await navigator.clipboard.writeText(code)
    setCopiedVoucherId(voucherId)
  }

  return (
    <div className="my-vouchers-page">
      <section className="my-vouchers-hero">
        <div className="my-vouchers-hero__copy">
          <p className="my-vouchers-hero__eyebrow">Tài khoản cá nhân</p>
          <h1>Mã ưu đãi của tôi</h1>
          <p>
            Tổng hợp các voucher đang khả dụng, lịch sử đã dùng và những mã vừa hết hạn để bạn
            không bỏ lỡ ưu đãi phù hợp cho tour, vé và khách sạn.
          </p>

          <div className="my-vouchers-hero__actions">
            <Link className="my-vouchers-hero__button" to={profilePath}>
              Quay về tài khoản
            </Link>
            <Link
              className="my-vouchers-hero__button my-vouchers-hero__button--secondary"
              to={customerCarePath}
            >
              Hỏi điều kiện áp dụng
            </Link>
          </div>
        </div>

        <div className="my-vouchers-hero__spotlight">
          <span className="my-vouchers-hero__badge">Ưu đãi sắp hết hạn</span>
          <strong>{nextExpiringVoucher?.code}</strong>
          <p>{nextExpiringVoucher?.title}</p>
          <small>{nextExpiringVoucher?.validity_label}</small>
        </div>
      </section>

      <section className="my-vouchers-stats" aria-label="Tổng quan ưu đãi">
        <article className="my-vouchers-stat-card">
          <span>Voucher sẵn sàng</span>
          <strong>{activeVouchers.length}</strong>
          <p>Có thể dùng ngay trong các luồng đặt dịch vụ hiện tại.</p>
        </article>

        <article className="my-vouchers-stat-card">
          <span>Giá trị nổi bật</span>
          <strong>{formatCurrency(totalReadyValue)}</strong>
          <p>Tổng giá trị quy đổi từ các mã còn hiệu lực trong dữ liệu mock.</p>
        </article>

        <article className="my-vouchers-stat-card">
          <span>Đã dùng gần đây</span>
          <strong>{MY_VOUCHERS.filter((voucher) => voucher.status === 'used').length}</strong>
          <p>Ưu đãi đã áp dụng thành công để bạn tiện tra cứu lại lịch sử.</p>
        </article>
      </section>

      <div className="my-vouchers-layout">
        <section className="my-vouchers-main">
          <header className="my-vouchers-toolbar">
            <div>
              <p className="my-vouchers-toolbar__eyebrow">Tra cứu nhanh</p>
              <h2>Danh sách voucher của bạn</h2>
            </div>

            <label className="my-vouchers-search">
              <span className="my-vouchers-search__label">Tìm theo mã hoặc dịch vụ</span>
              <input
                className="my-vouchers-search__input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ví dụ: NETVIET500, vé máy bay, khách sạn..."
              />
            </label>
          </header>

          <div className="my-vouchers-filter-list" role="tablist" aria-label="Lọc voucher">
            {VOUCHER_FILTERS.map((filter) => (
              <button
                key={filter.id}
                className={
                  selectedFilter === filter.id
                    ? 'my-vouchers-filter my-vouchers-filter--active'
                    : 'my-vouchers-filter'
                }
                type="button"
                onClick={() => setSelectedFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {filteredVouchers.length ? (
            <div className="my-vouchers-grid">
              {filteredVouchers.map((voucher) => (
                <article
                  className={`my-voucher-card my-voucher-card--${voucher.status}`}
                  key={voucher.id}
                >
                  <div className="my-voucher-card__top">
                    <span className="my-voucher-card__icon">
                      <VoucherTicketIcon />
                    </span>

                    <div className="my-voucher-card__heading">
                      <span className="my-voucher-card__status">{voucher.status_label}</span>
                      <strong>{voucher.title}</strong>
                    </div>

                    <div className="my-voucher-card__discount">{voucher.discount_label}</div>
                  </div>

                  <div className="my-voucher-card__code-row">
                    <span className="my-voucher-card__code">{voucher.code}</span>
                    <button
                      className="my-voucher-card__copy"
                      type="button"
                      onClick={() => handleCopyVoucher(voucher.code, voucher.id)}
                      disabled={voucher.status !== 'active'}
                    >
                      {copiedVoucherId === voucher.id ? 'Đã sao chép' : 'Sao chép mã'}
                    </button>
                  </div>

                  <p className="my-voucher-card__description">{voucher.description}</p>

                  <div className="my-voucher-card__meta">
                    <span>{voucher.min_spend_label}</span>
                    <span>{voucher.validity_label}</span>
                  </div>

                  <div className="my-voucher-card__tags">
                    {voucher.service_tags.map((tag) => (
                      <span className="my-voucher-card__tag" key={`${voucher.id}-${tag}`}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="my-voucher-card__actions">
                    <Link
                      className="my-voucher-card__button"
                      to={buildPublicAuthPath(voucher.route, isCustomer)}
                    >
                      {voucher.status === 'active' ? 'Dùng ngay' : 'Mở liên quan'}
                    </Link>
                    <Link
                      className="my-voucher-card__button my-voucher-card__button--secondary"
                      to={customerCarePath}
                    >
                      Cần hỗ trợ
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="my-vouchers-empty" role="status">
              <strong>Không có voucher khớp với bộ lọc hiện tại</strong>
              <p>
                Thử đổi từ khóa tìm kiếm hoặc chọn nhóm khác để xem lại các mã đã dùng, còn hạn
                hoặc hết hạn gần đây.
              </p>
              <button
                className="my-vouchers-empty__button"
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

        <aside className="my-vouchers-sidebar">
          <section className="my-vouchers-panel">
            <header className="my-vouchers-panel__header">
              <p className="my-vouchers-panel__eyebrow">Cách dùng nhanh</p>
              <h2>Tối ưu ưu đãi trước khi thanh toán</h2>
            </header>

            <div className="my-vouchers-step-list">
              {USAGE_STEPS.map((step, index) => (
                <article className="my-vouchers-step" key={step.id}>
                  <span className="my-vouchers-step__index">0{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="my-vouchers-panel my-vouchers-panel--notes">
            <header className="my-vouchers-panel__header">
              <p className="my-vouchers-panel__eyebrow">Lưu ý quan trọng</p>
              <h2>Những điều thường làm mã chưa áp dụng được</h2>
            </header>

            <ul className="my-vouchers-note-list">
              {SUPPORT_NOTES.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>

            <Link className="my-vouchers-panel__link" to={customerCarePath}>
              Mở chat chăm sóc khách hàng
            </Link>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default MyVouchersPage
