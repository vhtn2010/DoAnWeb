import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ProfileGuestGate from '../../components/profile/ProfileGuestGate.jsx'
import { applyVoucher } from '../../repositories/checkoutRepository.js'
import { getCurrentUserVouchers } from '../../repositories/profileRepository.js'
import usePublicCollectionPage from '../../hooks/usePublicCollectionPage.js'
import usePublicSession from '../../hooks/usePublicSession.js'
import { buildPublicAuthPath } from '../../utils/publicNavigation.js'

const VOUCHER_FILTERS = Object.freeze([
  { id: 'all', label: 'Tất cả' },
  { id: 'active', label: 'Sẵn sàng sử dụng' },
  { id: 'used', label: 'Đã sử dụng' },
  { id: 'expired', label: 'Hết hiệu lực' },
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

const VOUCHERS_PAGE_SIZE = 3

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

function PlusIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="M10 4.2v11.6M4.2 10h11.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
    </svg>
  )
}

function PageArrowIcon({ direction }) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 16 16">
      <path
        d={direction === 'left' ? 'm9.5 4-4 4 4 4' : 'm6.5 4 4 4-4 4'}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function getVoucherActionLabel(voucher) {
  if (voucher.status === 'active') {
    return 'Dùng sau'
  }

  if (voucher.status === 'used') {
    return 'Đã sử dụng'
  }

  return 'Hết hiệu lực'
}

function getVoucherCardTone(voucher) {
  if (voucher.status === 'active') {
    return 'active'
  }

  if (voucher.status === 'used') {
    return 'used'
  }

  return 'expired'
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
    resetFilters,
    selectedFilter,
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

  const [currentPage, setCurrentPage] = useState(1)
  const hasAnyVouchers = vouchers.length > 0
  const totalPages = Math.max(1, Math.ceil(filteredVouchers.length / VOUCHERS_PAGE_SIZE))
  const visibleVouchers = useMemo(() => {
    const startIndex = (currentPage - 1) * VOUCHERS_PAGE_SIZE

    return filteredVouchers.slice(startIndex, startIndex + VOUCHERS_PAGE_SIZE)
  }, [currentPage, filteredVouchers])
  const resultsStart = filteredVouchers.length
    ? (currentPage - 1) * VOUCHERS_PAGE_SIZE + 1
    : 0
  const resultsEnd = Math.min(currentPage * VOUCHERS_PAGE_SIZE, filteredVouchers.length)
  const cartPath = buildPublicAuthPath('/cart', isCustomer)
  const serviceListPath = buildPublicAuthPath('/services', isCustomer)

  useEffect(() => {
    setCurrentPage(1)
  }, [filteredVouchers.length, selectedFilter])

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
    <div className="my-vouchers-page voucher-wallet-page">
      <div className="voucher-wallet-layout">
        <main className="voucher-wallet-main" aria-labelledby="voucher-wallet-title">
          <section className="voucher-wallet-banner">
            <div className="voucher-wallet-banner__copy">
              <p className="voucher-wallet-eyebrow">Tài khoản cá nhân</p>
              <h1 id="voucher-wallet-title">Mã ưu đãi của tôi</h1>
              <p>Quản lý và sử dụng các voucher đã lưu trong tài khoản.</p>
            </div>

            <Link className="voucher-wallet-find-button" to={serviceListPath}>
              <PlusIcon />
              <span>Tìm thêm voucher</span>
            </Link>
          </section>

          <div className="voucher-wallet-tabs" role="tablist" aria-label="Lọc voucher">
            {VOUCHER_FILTERS.map((filter) => (
              <button
                aria-selected={selectedFilter === filter.id}
                className={
                  selectedFilter === filter.id
                    ? 'voucher-wallet-tab voucher-wallet-tab--active'
                    : 'voucher-wallet-tab'
                }
                key={filter.id}
                role="tab"
                type="button"
                onClick={() => setSelectedFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {error ? (
            <section className="voucher-wallet-state" role="alert">
              <VoucherTicketIcon />
              <strong>Không thể tải voucher lúc này</strong>
              <p>{error}</p>
              <button
                className="voucher-wallet-primary-button"
                type="button"
                onClick={() => setReloadToken((currentValue) => currentValue + 1)}
              >
                Tải lại
              </button>
            </section>
          ) : null}

          {loading ? (
            <section className="voucher-wallet-state" role="status">
              <VoucherTicketIcon />
              <strong>Đang tải mã khuyến mãi</strong>
              <p>Hệ thống đang đồng bộ các voucher đã lưu trong tài khoản của bạn.</p>
            </section>
          ) : null}

          {!loading && !error && visibleVouchers.length ? (
            <div className="voucher-wallet-list">
              {visibleVouchers.map((voucher, index) => {
                const tone = getVoucherCardTone(voucher)
                const isHotVoucher =
                  tone === 'active' && currentPage === 1 && index === 0

                return (
                  <article
                    className={`voucher-wallet-card voucher-wallet-card--${tone}`}
                    key={voucher.id || voucher.code}
                  >
                    {isHotVoucher ? (
                      <span className="voucher-wallet-card__badge">Hot</span>
                    ) : null}

                    <div className="voucher-wallet-card__code-panel">
                      <strong>{voucher.code}</strong>
                      <span>Mã Khuyến Mãi</span>
                    </div>

                    <div className="voucher-wallet-card__body">
                      <h2>{voucher.title}</h2>
                      <p>{voucher.description}</p>
                      <dl className="voucher-wallet-card__meta">
                        <div>
                          <dt>Hạn sử dụng:</dt>
                          <dd>
                            {voucher.expires_at
                              ? formatVoucherDate(voucher.expires_at)
                              : voucher.validity_label}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <button
                      className="voucher-wallet-card__action"
                      disabled={voucher.status !== 'active'}
                      type="button"
                      onClick={() => {
                        handleCopyVoucher(voucher.code, voucher.id)
                        setVoucherCode(voucher.code)
                        setVoucherCheckResult(null)
                        setVoucherCheckFeedback(
                          'Đã điền sẵn mã. Bạn có thể lưu hoặc kiểm tra với giỏ hàng hiện tại.',
                        )
                      }}
                    >
                      {copiedVoucherId === voucher.id && voucher.status === 'active'
                        ? 'Đã lưu'
                        : getVoucherActionLabel(voucher)}
                    </button>
                  </article>
                )
              })}
            </div>
          ) : null}

          {!loading && !error && !visibleVouchers.length ? (
            <section className="voucher-wallet-state" role="status">
              <VoucherTicketIcon />
              <strong>
                {hasAnyVouchers
                  ? 'Không có voucher trong nhóm này'
                  : 'Bạn chưa có mã khuyến mãi nào'}
              </strong>
              <p>
                {hasAnyVouchers
                  ? 'Chọn nhóm khác để xem lại mã còn hạn, đã sử dụng hoặc đã hết hiệu lực.'
                  : 'Khi bạn lưu voucher hoặc dùng mã trong đơn hàng, danh sách sẽ xuất hiện tại đây.'}
              </p>
              {hasAnyVouchers ? (
                <button
                  className="voucher-wallet-primary-button"
                  type="button"
                  onClick={resetFilters}
                >
                  Xem tất cả
                </button>
              ) : null}
            </section>
          ) : null}

          <footer className="voucher-wallet-pagination">
            <p>
              {filteredVouchers.length
                ? `Hiển thị ${resultsEnd - resultsStart + 1} trong số ${filteredVouchers.length} mã khuyến mãi`
                : 'Hiển thị 0 mã khuyến mãi'}
            </p>

            {totalPages > 1 ? (
              <nav aria-label="Phân trang mã khuyến mãi">
                <button
                  aria-label="Quay về trước 1 trang"
                  className="voucher-wallet-page-button voucher-wallet-page-button--arrow"
                  disabled={currentPage === 1}
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  <PageArrowIcon direction="left" />
                </button>

                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    aria-current={currentPage === page ? 'page' : undefined}
                    className={
                      currentPage === page
                        ? 'voucher-wallet-page-button voucher-wallet-page-button--active'
                        : 'voucher-wallet-page-button'
                    }
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}

                <button
                  aria-label="Về sau 1 trang"
                  className="voucher-wallet-page-button voucher-wallet-page-button--arrow"
                  disabled={currentPage === totalPages}
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                >
                  <PageArrowIcon direction="right" />
                </button>
              </nav>
            ) : null}
          </footer>
        </main>

        <aside className="voucher-wallet-sidebar">
          <section className="voucher-wallet-side-card voucher-wallet-apply-card">
            <p className="voucher-wallet-eyebrow">Nhập mã voucher</p>
            <h2>Nhập mã để lưu thêm voucher vào ví của bạn</h2>

            <label className="voucher-wallet-sr-only" htmlFor="voucher-wallet-code">
              Mã voucher
            </label>
            <input
              id="voucher-wallet-code"
              className="voucher-wallet-input"
              placeholder="Ví dụ: NETVIET500"
              type="text"
              value={voucherCode}
              onChange={(event) => setVoucherCode(event.target.value.toUpperCase())}
            />

            <button
              className="voucher-wallet-save-button"
              disabled={voucherCheckLoading}
              type="button"
              onClick={handleValidateVoucher}
            >
              {voucherCheckLoading ? 'Đang lưu...' : 'Lưu mã'}
            </button>

            {voucherCheckFeedback ? (
              <p className="voucher-wallet-feedback" role="status">
                {voucherCheckFeedback}
              </p>
            ) : null}

            {voucherCheckResult ? (
              <div className="voucher-wallet-result">
                <strong>{voucherCheckResult.code}</strong>
                <span>{formatTargetServiceType(voucherCheckResult.targetServiceType)}</span>
                <dl>
                  <div>
                    <dt>Mức giảm</dt>
                    <dd>{formatCurrency(voucherCheckResult.discountAmount)}</dd>
                  </div>
                  <div>
                    <dt>Tổng sau giảm</dt>
                    <dd>{formatCurrency(voucherCheckResult.finalTotalAmount)}</dd>
                  </div>
                </dl>
                <Link to={cartPath}>Mở giỏ hàng</Link>
              </div>
            ) : null}
          </section>

          <section className="voucher-wallet-side-card voucher-wallet-guide-card">
            <p className="voucher-wallet-eyebrow">Cách dùng nhanh</p>
            <h2>Tối ưu ưu đãi trước khi thanh toán</h2>

            <div className="voucher-wallet-guide-list">
              {USAGE_STEPS.map((step, index) => (
                <article className="voucher-wallet-guide-item" key={step.id}>
                  <span>0{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default MyVouchersPage
