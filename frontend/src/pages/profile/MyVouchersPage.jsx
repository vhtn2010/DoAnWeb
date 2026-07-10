import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ProfileGuestGate from '../../components/profile/ProfileGuestGate.jsx'
import { applyVoucher } from '../../repositories/checkoutRepository.js'
import { getCurrentUserVouchers } from '../../repositories/profileRepository.js'
import usePublicCollectionPage from '../../hooks/usePublicCollectionPage.js'
import usePublicSession from '../../hooks/usePublicSession.js'
import { buildPublicAuthPath } from '../../utils/publicNavigation.js'

const VOUCHER_FILTERS = Object.freeze([
  { id: 'all', label: 'Tất cả' },
  { id: 'active', label: 'Sẵn sàng dùng' },
  { id: 'used', label: 'Đã dùng' },
  { id: 'expired', label: 'Hết hạn' },
])

const USAGE_STEPS = Object.freeze([
  {
    id: 'step-001',
    title: 'Thêm dịch vụ vào giỏ',
    description:
      'Backend kiểm tra điều kiện theo giỏ hàng hiện tại, nên hãy chọn dịch vụ trước khi dùng mã.',
  },
  {
    id: 'step-002',
    title: 'Kiểm tra điều kiện',
    description:
      'Một số mã chỉ áp dụng cho đúng loại dịch vụ, giá trị đơn hàng hoặc giới hạn số lần dùng.',
  },
  {
    id: 'step-003',
    title: 'Dán mã ở checkout',
    description:
      'Sau khi mã hợp lệ, bạn có thể quay lại giỏ hàng hoặc thanh toán để dùng ngay.',
  },
])

const SUPPORT_NOTES = Object.freeze([
  'Màn này không hiển thị toàn bộ voucher đang tồn tại trong hệ thống, vì có nhiều mã chỉ dùng khi bạn tự biết hoặc tự săn được.',
  'Danh sách bên trái ưu tiên những mã đã từng gắn với lịch sử đặt dịch vụ của bạn, nhất là các mã còn có thể dùng lại.',
  'Nếu có mã riêng từ chiến dịch, email hoặc banner, hãy nhập trực tiếp ở khối bên phải để kiểm tra theo giỏ hàng hiện tại.',
])

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    currency: 'VND',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number(amount || 0))
}

function formatVoucherDate(value) {
  const parsedDate = value ? new Date(value) : null

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return ''
  }

  return dateFormatter.format(parsedDate)
}

function getTargetServiceLabel(serviceType) {
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

  if (serviceType === 'combo') {
    return 'Combo'
  }

  return 'Nhiều dịch vụ'
}

function getVoucherRoute(serviceType) {
  if (serviceType === 'flight') {
    return '/flights'
  }

  if (serviceType === 'train') {
    return '/trains'
  }

  if (serviceType === 'hotel' || serviceType === 'room') {
    return '/hotels'
  }

  return '/services'
}

function getVoucherStatusLabel(status, usageCount = 0) {
  if (status === 'active') {
    return 'Sẵn sàng dùng'
  }

  if (status === 'used') {
    return usageCount > 1 ? `Đã dùng ${usageCount} lần` : 'Đã dùng'
  }

  return 'Hết hạn'
}

function formatVoucherDiscountLabel(voucher = {}) {
  if (voucher.discount_type === 'percent') {
    const maxDiscountLabel = voucher.max_discount_amount
      ? `, tối đa ${formatCurrency(voucher.max_discount_amount)}`
      : ''

    return `${Number(voucher.discount_value || 0)}%${maxDiscountLabel}`
  }

  return formatCurrency(voucher.discount_value)
}

function formatVoucherMinSpendLabel(voucher = {}) {
  const minOrderAmount = Number(voucher.min_order_amount || 0)

  if (minOrderAmount <= 0) {
    return 'Không yêu cầu đơn tối thiểu'
  }

  return `Đơn từ ${formatCurrency(minOrderAmount)}`
}

function formatVoucherValidityLabel(voucher = {}) {
  if (voucher.status === 'used' && voucher.used_at) {
    return `Đã dùng ngày ${formatVoucherDate(voucher.used_at)}`
  }

  if (voucher.valid_to) {
    return `Hết hạn ngày ${formatVoucherDate(voucher.valid_to)}`
  }

  return 'Đang cập nhật thời hạn'
}

function mapVoucherItem(rawVoucher = {}) {
  const targetServiceLabel = getTargetServiceLabel(rawVoucher.target_service_type)

  return {
    code: rawVoucher.code || 'VOUCHER',
    description:
      rawVoucher.description ||
      'Ưu đãi đang được áp dụng cho các dịch vụ phù hợp trên hệ thống.',
    discount_label: formatVoucherDiscountLabel(rawVoucher),
    discount_value: Number(rawVoucher.discount_value || 0),
    expires_at: rawVoucher.valid_to || null,
    id: rawVoucher.id,
    min_spend_label: formatVoucherMinSpendLabel(rawVoucher),
    route: getVoucherRoute(rawVoucher.target_service_type),
    service_tags: [targetServiceLabel, rawVoucher.promotion?.name || ''].filter(Boolean),
    status: rawVoucher.status || 'expired',
    status_label: getVoucherStatusLabel(
      rawVoucher.status,
      rawVoucher.user_usage_count,
    ),
    title:
      rawVoucher.title ||
      rawVoucher.promotion?.name ||
      rawVoucher.code ||
      'Ưu đãi',
    usage_count: Number(rawVoucher.user_usage_count || 0),
    validity_label: formatVoucherValidityLabel(rawVoucher),
  }
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

  if (serviceType === 'combo') {
    return 'Combo'
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
  const [vouchers, setVouchers] = useState([])
  const [loading, setLoading] = useState(Boolean(isCustomerPreview))
  const [error, setError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
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
    items: vouchers,
  })

  useEffect(() => {
    if (!isCustomerPreview) {
      setLoading(false)
      setVouchers([])
      setError('')
      return
    }

    let isActive = true

    async function loadVouchers() {
      setLoading(true)
      setError('')

      try {
        const response = await getCurrentUserVouchers()

        if (!isActive) {
          return
        }

        if (!response?.success) {
          throw new Error(response?.message || 'Không thể tải lịch sử mã ưu đãi.')
        }

        setVouchers(
          Array.isArray(response.data)
            ? response.data.map((voucher) => mapVoucherItem(voucher))
            : [],
        )
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setVouchers([])
        setError(loadError?.message || 'Không thể tải lịch sử ưu đãi của bạn lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadVouchers()

    return () => {
      isActive = false
    }
  }, [isCustomerPreview, reloadToken])

  const activeVouchers = vouchers.filter((voucher) => voucher.status === 'active')
  const usedVouchers = vouchers.filter((voucher) => voucher.status === 'used')
  const hasAnyVouchers = vouchers.length > 0
  const distinctServiceGroups = new Set(
    activeVouchers.map((voucher) => voucher.service_tags[0]).filter(Boolean),
  )
  const nextExpiringVoucher =
    [...activeVouchers].sort((leftVoucher, rightVoucher) =>
      String(leftVoucher.expires_at || '').localeCompare(
        String(rightVoucher.expires_at || ''),
      ),
    )[0] || null

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
          response.data.summary?.total_amount ??
          response.data.final_total_amount ??
          0,
        targetServiceType: response.data.target_service_type,
      })
      setVoucherCheckFeedback(
        'Mã ưu đãi đã được áp dụng cho giỏ hàng hiện tại của bạn.',
      )
    } catch (validateError) {
      setVoucherCheckResult(null)
      setVoucherCheckFeedback(mapVoucherMessage(validateError?.message))
    } finally {
      setVoucherCheckLoading(false)
    }
  }

  if (!isCustomerPreview) {
    return (
      <div className="my-vouchers-page">
        <ProfileGuestGate
          message="Đăng nhập để nhập mã ưu đãi bạn đang có, kiểm tra theo giỏ hàng hiện tại và xem lại các mã từng dùng trên tài khoản của bạn."
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
            Xem lại các mã đã từng dùng trên tài khoản của bạn, nhận biết mã
            nào còn có thể dùng lại và chủ động nhập những mã bạn tự biết hoặc
            tự săn được để thử ngay trên giỏ hàng hiện tại.
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
          <span className="my-vouchers-hero__badge">Mã còn có thể dùng lại</span>
          <strong>{nextExpiringVoucher?.code || 'Chưa có mã nổi bật'}</strong>
          <p>
            {nextExpiringVoucher?.title ||
              'Khi bạn đã từng dùng một mã và nó còn hiệu lực, hệ thống sẽ gợi ý lại tại đây để bạn tái sử dụng nhanh hơn.'}
          </p>
          <small>
            {nextExpiringVoucher?.validity_label ||
              'Nếu bạn có mã mới từ chiến dịch riêng, hãy nhập trực tiếp ở khối kiểm tra bên phải.'}
          </small>
        </div>
      </section>

      <section className="my-vouchers-stats" aria-label="Tổng quan ưu đãi">
        <article className="my-vouchers-stat-card">
          <span>Còn có thể dùng lại</span>
          <strong>{activeVouchers.length}</strong>
          <p>
            Những mã trong lịch sử của bạn hiện vẫn còn hiệu lực và có thể thử
            lại với giỏ hàng mới.
          </p>
        </article>

        <article className="my-vouchers-stat-card">
          <span>Nhóm đã từng áp dụng</span>
          <strong>{distinctServiceGroups.size}</strong>
          <p>
            Các nhóm dịch vụ mà bạn đã từng dùng voucher, giúp tra lại thói
            quen áp dụng ưu đãi trước đây.
          </p>
        </article>

        <article className="my-vouchers-stat-card">
          <span>Mã trong lịch sử</span>
          <strong>{usedVouchers.length}</strong>
          <p>
            Những mã đã xuất hiện trong lịch sử đặt dịch vụ của bạn và được giữ
            lại để dễ tra cứu lại.
          </p>
        </article>
      </section>

      {error ? (
        <div className="my-vouchers-empty" role="alert">
          <strong>Không thể tải voucher lúc này</strong>
          <p>{error}</p>
          <button
            className="my-vouchers-empty__button"
            type="button"
            onClick={() => setReloadToken((currentValue) => currentValue + 1)}
          >
            Tải lại
          </button>
        </div>
      ) : null}

      <div className="my-vouchers-layout">
        <section className="my-vouchers-main">
          <header className="my-vouchers-toolbar">
            <div>
              <p className="my-vouchers-toolbar__eyebrow">Lịch sử cá nhân</p>
              <h2>Mã bạn đã từng dùng</h2>
            </div>

            <label className="my-vouchers-search">
              <span className="my-vouchers-search__label">
                Tìm trong lịch sử mã của bạn
              </span>
              <input
                className="my-vouchers-search__input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ví dụ: NETVIET500, vé máy bay, khách sạn..."
              />
            </label>
          </header>

          <div
            className="my-vouchers-filter-list"
            role="tablist"
            aria-label="Lọc voucher"
          >
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

          {loading ? (
            <div className="my-vouchers-empty" role="status">
              <strong>Đang tải lịch sử mã của bạn</strong>
              <p>
                Hệ thống đang đồng bộ các mã bạn đã từng dùng và nhận diện mã
                nào còn có thể áp dụng lại.
              </p>
            </div>
          ) : null}

          {!loading && filteredVouchers.length ? (
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
                      <span className="my-voucher-card__status">
                        {voucher.status_label}
                      </span>
                      <strong>{voucher.title}</strong>
                    </div>

                    <div className="my-voucher-card__discount">
                      {voucher.discount_label}
                    </div>
                  </div>

                  <div className="my-voucher-card__code-row">
                    <span className="my-voucher-card__code">{voucher.code}</span>
                    <button
                      className="my-voucher-card__copy"
                      type="button"
                      onClick={() => handleCopyVoucher(voucher.code, voucher.id)}
                      disabled={voucher.status !== 'active'}
                    >
                      {copiedVoucherId === voucher.id
                        ? 'Đã sao chép'
                        : 'Sao chép mã'}
                    </button>
                  </div>

                  <p className="my-voucher-card__description">
                    {voucher.description}
                  </p>

                  <div className="my-voucher-card__meta">
                    <span>{voucher.min_spend_label}</span>
                    <span>{voucher.validity_label}</span>
                  </div>

                  <div className="my-voucher-card__tags">
                    {voucher.service_tags.map((tag) => (
                      <span
                        className="my-voucher-card__tag"
                        key={`${voucher.id}-${tag}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="my-voucher-card__actions">
                    <Link
                      className="my-voucher-card__button"
                      to={buildPublicAuthPath(voucher.route, isCustomer)}
                    >
                      {voucher.status === 'active'
                        ? 'Xem dịch vụ'
                        : 'Mở liên quan'}
                    </Link>
                    <button
                      className="my-voucher-card__button my-voucher-card__button--secondary"
                      type="button"
                      onClick={() => {
                        setVoucherCode(voucher.code)
                        setVoucherCheckResult(null)
                        setVoucherCheckFeedback(
                          'Đã điền sẵn mã. Bạn có thể thử lại với giỏ hàng hiện tại ở khối bên phải.',
                        )
                      }}
                    >
                      Thử lại mã này
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!loading && !filteredVouchers.length ? (
            <div className="my-vouchers-empty" role="status">
              <strong>
                {hasAnyVouchers
                  ? 'Không có voucher khớp với bộ lọc hiện tại'
                  : 'Bạn chưa có mã nào trong lịch sử'}
              </strong>
              <p>
                {hasAnyVouchers
                  ? 'Thử đổi từ khóa tìm kiếm hoặc chọn nhóm khác để xem lại các mã còn hạn, đã dùng hoặc đã hết hạn gần đây.'
                  : 'Khi bạn từng áp dụng voucher trong booking, lịch sử sẽ xuất hiện ở đây. Nếu đang có mã từ chiến dịch riêng, hãy nhập trực tiếp ở khối bên phải để kiểm tra.'}
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
          ) : null}
        </section>

        <aside className="my-vouchers-sidebar">
          <section className="my-vouchers-panel">
            <header className="my-vouchers-panel__header">
              <p className="my-vouchers-panel__eyebrow">Nhập mã ưu đãi</p>
              <h2>Áp dụng vào giỏ hàng hiện tại</h2>
            </header>

            <label className="my-vouchers-search">
              <span className="my-vouchers-search__label">Mã ưu đãi</span>
              <input
                className="my-vouchers-search__input"
                type="text"
                value={voucherCode}
                onChange={(event) =>
                  setVoucherCode(event.target.value.toUpperCase())
                }
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
                {voucherCheckLoading ? 'Đang áp dụng...' : 'Áp dụng mã'}
              </button>
              <Link
                className="my-vouchers-hero__button my-vouchers-hero__button--secondary"
                to={cartPath}
              >
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
                  <strong>
                    {formatCurrency(voucherCheckResult.eligibleSubtotalAmount)}
                  </strong>
                </div>
                <div className="my-vouchers-validator__result-row">
                  <span>Tổng sau giảm</span>
                  <strong>{formatCurrency(voucherCheckResult.finalTotalAmount)}</strong>
                </div>
                <div className="my-vouchers-validator__result-row">
                  <span>Nhóm dịch vụ</span>
                  <strong>
                    {formatTargetServiceType(voucherCheckResult.targetServiceType)}
                  </strong>
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
