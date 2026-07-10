import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ProfileGuestGate from '../../components/profile/ProfileGuestGate.jsx'
import { applyVoucher } from '../../repositories/checkoutRepository.js'
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
    description: 'Gợi ý phù hợp cho các tour khởi hành gần ngày và có tổng đơn từ 6.000.000đ.',
    status: 'active',
    status_label: 'Sẵn sàng dùng',
    discount_label: '500.000đ',
    discount_value: 500000,
    min_spend_label: 'Đơn từ 6.000.000đ',
    validity_label: 'Hết hạn ngày 25/07/2026',
    expires_at: '2026-07-25',
    service_tags: ['Tour', 'Nội địa', 'Gia đình'],
    route: '/services',
  },
  {
    id: 'voucher-002',
    code: 'BAYHEM1200',
    title: 'Giảm 12% vé máy bay khứ hồi',
    description: 'Phù hợp cho các chặng nội địa thanh toán online, tối đa 1.200.000đ.',
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
    description: 'Nhóm ưu đãi thường được dùng với khách sạn 4-5 sao và kỳ nghỉ cuối tuần.',
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
    description: 'Ví dụ về mã đã áp dụng thành công trong các booking đi theo nhóm gia đình.',
    status: 'used',
    status_label: 'Đã dùng',
    discount_label: '350.000đ',
    discount_value: 350000,
    min_spend_label: 'Đã dùng ngày 02/07/2026',
    validity_label: 'Lưu trong lịch sử ưu đãi',
    expires_at: '2026-07-02',
    service_tags: ['Tour', 'Gia đình', 'Lịch sử'],
    route: '/profile',
  },
  {
    id: 'voucher-005',
    code: 'FLASHTRAIN',
    title: 'Giảm 250.000đ vé tàu cuối tuần',
    description: 'Mã mẫu cho các đợt flash sale thường xuất hiện theo mùa trên tuyến tàu du lịch.',
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
    title: 'Thêm dịch vụ vào giỏ',
    description: 'Backend hiện kiểm tra mã ưu đãi theo giỏ hàng đang có, nên bạn hãy chọn dịch vụ trước.',
  },
  {
    id: 'step-002',
    title: 'Kiểm tra điều kiện',
    description: 'Một số mã chỉ áp dụng cho đúng loại dịch vụ, hạn mức đơn hàng hoặc hạng thành viên cụ thể.',
  },
  {
    id: 'step-003',
    title: 'Dán mã ở checkout',
    description: 'Sau khi mã hợp lệ, bạn có thể dùng lại ngay ở luồng giỏ hàng hoặc bước thanh toán.',
  },
])

const SUPPORT_NOTES = Object.freeze([
  'Danh sách bên trái hiện là các mã gợi ý và mã đã lưu thường dùng để bạn tra cứu nhanh.',
  'Kiểm tra hợp lệ thực tế sẽ dựa trên giỏ hàng hiện tại của tài khoản và quy tắc voucher ở backend.',
  'Nếu mã đúng nhưng chưa áp dụng được, hãy kiểm tra lại loại dịch vụ, thời hạn và giá trị đơn hàng.',
])

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    currency: 'VND',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number(amount || 0))
}

function matchesVoucherFilter(voucher, selectedFilter) {
  return voucher.status === selectedFilter
}

function getVoucherSearchText(voucher) {
  return `${voucher.code} ${voucher.title} ${voucher.description} ${voucher.service_tags.join(' ')}`
}

function mapVoucherMessage(message = '') {
  if (message === 'Cart is empty') {
    return 'Bạn cần thêm ít nhất một dịch vụ vào giỏ hàng trước khi kiểm tra mã ưu đãi.'
  }

  if (message === 'Voucher is invalid') {
    return 'Mã ưu đãi không hợp lệ hoặc hiện chưa khả dụng với giỏ hàng của bạn.'
  }

  if (message === 'Voucher is expired') {
    return 'Mã ưu đãi này đã hết hạn sử dụng.'
  }

  if (message === 'Voucher does not apply to the current cart items') {
    return 'Mã ưu đãi không áp dụng cho các dịch vụ đang có trong giỏ hàng.'
  }

  if (message === 'Cart subtotal does not meet the voucher minimum order amount') {
    return 'Giỏ hàng hiện chưa đạt giá trị tối thiểu để dùng mã ưu đãi này.'
  }

  if (message === 'User has reached the voucher usage limit') {
    return 'Tài khoản của bạn đã dùng hết số lượt cho mã ưu đãi này.'
  }

  if (message === 'Voucher has reached the total usage limit') {
    return 'Mã ưu đãi này đã hết lượt sử dụng trên hệ thống.'
  }

  return message || 'Không thể kiểm tra mã ưu đãi lúc này.'
}

function formatTargetServiceType(serviceType) {
  if (serviceType === 'flight') {
    return 'Vé máy bay'
  }

  if (serviceType === 'train') {
    return 'Vé tàu'
  }

  if (serviceType === 'hotel' || serviceType === 'room') {
    return 'Khách sạn'
  }

  if (serviceType === 'tour') {
    return 'Tour'
  }

  return 'Nhiều loại dịch vụ'
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
  const navigate = useNavigate()
  const { authState, isCustomer, isCustomerPreview } = usePublicSession()
  const [copiedVoucherId, setCopiedVoucherId] = useState(null)
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherCheckFeedback, setVoucherCheckFeedback] = useState('')
  const [voucherCheckLoading, setVoucherCheckLoading] = useState(false)
  const [voucherCheckResult, setVoucherCheckResult] = useState(null)
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
  const cartPath = buildPublicAuthPath('/cart', isCustomer)

  async function handleCopyVoucher(code, voucherId) {
    if (!navigator?.clipboard?.writeText) {
      return
    }

    try {
      await navigator.clipboard.writeText(code)
      setCopiedVoucherId(voucherId)
    } catch {
      // Ignore clipboard issues in restricted browser contexts.
    }
  }

  async function handleValidateVoucher() {
    const normalizedCode = voucherCode.trim().toUpperCase()

    if (!normalizedCode) {
      setVoucherCheckResult(null)
      setVoucherCheckFeedback('Vui lòng nhập mã ưu đãi để kiểm tra.')
      return
    }

    setVoucherCheckLoading(true)
    setVoucherCheckFeedback('')

    try {
      const response = await applyVoucher(
        normalizedCode,
        {
          service_fee_amount: 0,
          subtotal_amount: 0,
        },
        {
          authState,
        },
      )

      if (!response?.success || !response?.data?.valid) {
        setVoucherCheckResult(null)
        setVoucherCheckFeedback(mapVoucherMessage(response?.message))
        return
      }

      setVoucherCheckResult({
        code: response.data.voucher_code ?? normalizedCode,
        discountAmount: response.data.discount_amount,
        eligibleSubtotalAmount: response.data.eligible_subtotal_amount,
        finalTotalAmount:
          response.data.summary?.total_amount ?? response.data.final_total_amount ?? 0,
        targetServiceType: response.data.target_service_type,
      })
      setVoucherCheckFeedback('Mã ưu đãi hợp lệ với giỏ hàng hiện tại của bạn.')
    } catch (error) {
      setVoucherCheckResult(null)
      setVoucherCheckFeedback(mapVoucherMessage(error?.message))
    } finally {
      setVoucherCheckLoading(false)
    }
  }

  if (!isCustomerPreview) {
    return (
      <div className="my-vouchers-page">
        <ProfileGuestGate
          message="Đăng nhập để kiểm tra mã ưu đãi theo giỏ hàng hiện tại và lưu lại lịch sử sử dụng."
          onGoHome={() => navigate(buildPublicAuthPath('/', isCustomer))}
          onGoLogin={() => navigate('/login')}
        />
      </div>
    )
  }

  return (
    <div className="my-vouchers-page">
      <section className="my-vouchers-hero">
        <div className="my-vouchers-hero__copy">
          <p className="my-vouchers-hero__eyebrow">Tài khoản cá nhân</p>
          <h1>Mã ưu đãi của tôi</h1>
          <p>
            Tra cứu nhanh các mã thường dùng, lưu ý điều kiện áp dụng và kiểm tra ngay độ hợp lệ
            của voucher trên giỏ hàng hiện tại của bạn.
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
          <span className="my-vouchers-hero__badge">Gợi ý sắp hết hạn</span>
          <strong>{nextExpiringVoucher?.code}</strong>
          <p>{nextExpiringVoucher?.title}</p>
          <small>{nextExpiringVoucher?.validity_label}</small>
        </div>
      </section>

      <section className="my-vouchers-stats" aria-label="Tổng quan ưu đãi">
        <article className="my-vouchers-stat-card">
          <span>Mã gợi ý khả dụng</span>
          <strong>{activeVouchers.length}</strong>
          <p>Những mã nổi bật bạn có thể cân nhắc dùng trong các luồng đặt dịch vụ hiện tại.</p>
        </article>

        <article className="my-vouchers-stat-card">
          <span>Giá trị nổi bật</span>
          <strong>{formatCurrency(totalReadyValue)}</strong>
          <p>Tổng mức giảm tham khảo từ nhóm mã đang được gợi ý trên màn hình này.</p>
        </article>

        <article className="my-vouchers-stat-card">
          <span>Đã dùng gần đây</span>
          <strong>{MY_VOUCHERS.filter((voucher) => voucher.status === 'used').length}</strong>
          <p>Ví dụ về lịch sử mã đã áp dụng để bạn dễ hình dung cách tận dụng ưu đãi.</p>
        </article>
      </section>

      <div className="my-vouchers-layout">
        <section className="my-vouchers-main">
          <header className="my-vouchers-toolbar">
            <div>
              <p className="my-vouchers-toolbar__eyebrow">Tra cứu nhanh</p>
              <h2>Mã đã lưu và gợi ý nhanh</h2>
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
                      {voucher.status === 'active' ? 'Xem dịch vụ' : 'Mở liên quan'}
                    </Link>
                    <button
                      className="my-voucher-card__button my-voucher-card__button--secondary"
                      type="button"
                      onClick={() => {
                        setVoucherCode(voucher.code)
                        setVoucherCheckResult(null)
                        setVoucherCheckFeedback('Đã điền sẵn mã. Bạn có thể kiểm tra ngay ở khối bên phải.')
                      }}
                    >
                      Điền vào kiểm tra
                    </button>
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
              <p className="my-vouchers-panel__eyebrow">Kiểm tra mã thật</p>
              <h2>Xác thực voucher theo giỏ hàng hiện tại</h2>
            </header>

            <label className="my-vouchers-search">
              <span className="my-vouchers-search__label">Nhập mã ưu đãi</span>
              <input
                className="my-vouchers-search__input"
                type="text"
                value={voucherCode}
                onChange={(event) => setVoucherCode(event.target.value.toUpperCase())}
                placeholder="Ví dụ: NETVIET500"
              />
            </label>

            <div className="my-vouchers-validator__actions">
              <button
                className="my-vouchers-hero__button"
                type="button"
                onClick={handleValidateVoucher}
                disabled={voucherCheckLoading}
              >
                {voucherCheckLoading ? 'Đang kiểm tra...' : 'Kiểm tra mã'}
              </button>
              <Link className="my-vouchers-hero__button my-vouchers-hero__button--secondary" to={cartPath}>
                Mở giỏ hàng
              </Link>
            </div>

            {voucherCheckFeedback ? (
              <p className="my-vouchers-validator__feedback" role="status">
                {voucherCheckFeedback}
              </p>
            ) : null}

            {voucherCheckResult ? (
              <div className="my-vouchers-validator__result">
                <strong>{voucherCheckResult.code}</strong>
                <div className="my-vouchers-validator__result-row">
                  <span>Mức giảm</span>
                  <strong>{formatCurrency(voucherCheckResult.discountAmount)}</strong>
                </div>
                <div className="my-vouchers-validator__result-row">
                  <span>Tạm tính đủ điều kiện</span>
                  <strong>{formatCurrency(voucherCheckResult.eligibleSubtotalAmount)}</strong>
                </div>
                <div className="my-vouchers-validator__result-row">
                  <span>Tổng sau giảm</span>
                  <strong>{formatCurrency(voucherCheckResult.finalTotalAmount)}</strong>
                </div>
                <div className="my-vouchers-validator__result-row">
                  <span>Nhóm dịch vụ</span>
                  <strong>{formatTargetServiceType(voucherCheckResult.targetServiceType)}</strong>
                </div>
              </div>
            ) : null}
          </section>

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
