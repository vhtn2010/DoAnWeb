import { useMemo, useState } from 'react'
import {
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminPageHeader,
  AdminPagination,
  AdminSearchInput,
  AdminSelect,
} from '../../components/admin/ui/index.js'
import {
  ADMIN_PROMOTION_STATUSES,
  ADMIN_PROMOTIONS,
} from '../../fixtures/adminOperations.fixtures.js'

const dateFormatter = new Intl.DateTimeFormat('vi-VN')

const PROMOTION_STATUS_OPTIONS = Object.freeze([
  { value: 'all', label: 'Lọc' },
  { value: ADMIN_PROMOTION_STATUSES.active, label: 'Đang hoạt động' },
  { value: ADMIN_PROMOTION_STATUSES.scheduled, label: 'Sắp tới' },
  { value: ADMIN_PROMOTION_STATUSES.ended, label: 'Đã kết thúc' },
])

const PROMOTION_SORT_OPTIONS = Object.freeze([
  { value: 'default', label: 'Sắp xếp' },
  { value: 'newest', label: 'Mới nhất' },
  { value: 'ending', label: 'Sắp kết thúc' },
])

const PROMOTION_STATUS_VIEW_META = Object.freeze({
  [ADMIN_PROMOTION_STATUSES.active]: {
    actionLabel: 'Kết thúc',
    label: 'Đang hoạt động',
  },
  [ADMIN_PROMOTION_STATUSES.ended]: {
    actionLabel: 'Kết thúc',
    label: 'Đã kết thúc',
  },
  [ADMIN_PROMOTION_STATUSES.scheduled]: {
    actionLabel: 'Hủy',
    label: 'Sắp tới',
  },
})

const PROMOTION_OVERVIEW = Object.freeze([
  { label: 'Đang hoạt động', value: '12', tone: 'brand' },
  { label: 'Sắp tới', value: '8', tone: 'info' },
  { label: 'Đã kết thúc (Tháng này)', value: '9', tone: 'neutral' },
])

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M4 6h16M7 12h10M10 18h4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M8 4v14m0 0 3-3m-3 3-3-3m8-9h6m-6 6h4m-4 6h2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="m5 19 4.2-1 9.3-9.3a2.1 2.1 0 0 0-3-3L6.2 15 5 19Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M7.8 4h8.4L20 7.8v8.4L16.2 20H7.8L4 16.2V7.8L7.8 4Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path d="M8 12h8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M4 11.4V5h6.4l8.9 8.9a2.4 2.4 0 0 1 0 3.4l-2 2a2.4 2.4 0 0 1-3.4 0L4 11.4Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path d="M8 8h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
    </svg>
  )
}

function formatDate(value) {
  return dateFormatter.format(new Date(`${value}T00:00:00+07:00`))
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function sortPromotions(promotions, sortOrder) {
  if (sortOrder === 'default') {
    return promotions
  }

  return [...promotions].sort((firstPromotion, secondPromotion) => {
    const firstDate = new Date(`${firstPromotion[sortOrder === 'ending' ? 'endDate' : 'startDate']}T00:00:00+07:00`)
    const secondDate = new Date(`${secondPromotion[sortOrder === 'ending' ? 'endDate' : 'startDate']}T00:00:00+07:00`)

    return sortOrder === 'ending'
      ? firstDate - secondDate
      : secondDate - firstDate
  })
}

function PromotionSelect({ ariaLabel, icon, onChange, options, value }) {
  return (
    <label className="admin-promotions-page__select-shell">
      <span aria-hidden="true" className="admin-promotions-page__select-icon">
        {icon}
      </span>
      <AdminSelect
        aria-label={ariaLabel}
        className="admin-promotions-page__select"
        options={options}
        value={value}
        onChange={onChange}
      />
    </label>
  )
}

function AdminPromotionsPage() {
  const [promotionItems, setPromotionItems] = useState(ADMIN_PROMOTIONS)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('default')
  const [feedback, setFeedback] = useState('')

  const promotions = useMemo(() => {
    const query = normalizeText(searchQuery.trim())
    const filteredPromotions = promotionItems.filter((promotion) => {
      const matchesStatus = statusFilter === 'all' || promotion.status === statusFilter
      const matchesSearch =
        query.length === 0 ||
        normalizeText(`${promotion.code} ${promotion.name} ${promotion.description}`).includes(query)

      return matchesStatus && matchesSearch
    })

    return sortPromotions(filteredPromotions, sortOrder)
  }, [promotionItems, searchQuery, sortOrder, statusFilter])

  function resetFilters() {
    setSearchQuery('')
    setStatusFilter('all')
    setSortOrder('default')
  }

  function updatePromotionStatus(promotion, status) {
    setPromotionItems((currentPromotions) =>
      currentPromotions.map((currentPromotion) =>
        currentPromotion.id === promotion.id
          ? { ...currentPromotion, status }
          : currentPromotion,
      ),
    )
    setFeedback(`Đã cập nhật trạng thái mã ${promotion.code}.`)
  }

  return (
    <main className="admin-ops-page admin-promotions-page">
      <AdminPageHeader
        className="admin-promotions-page__header"
        title="Quản lý Khuyến mãi"
        subtitle="Quản lý các chương trình khuyến mãi hiện hành và đã lên lịch."
        actions={
          <AdminButton
            className="admin-promotions-page__create"
            icon={<PlusIcon />}
            variant="primary"
            onClick={() => setFeedback('Luồng tạo khuyến mãi mới sẽ được nối với form ở bước backend.')}
          >
            Thêm Khuyến mãi Mới
          </AdminButton>
        }
      />

      <section className="admin-promotions-page__workspace" aria-label="Không gian quản lý khuyến mãi">
        <div className="admin-promotions-page__main">
          <div className="admin-promotions-page__toolbar" aria-label="Bộ lọc khuyến mãi">
            <AdminSearchInput
              className="admin-promotions-page__search"
              placeholder="Tìm kiếm mã khuyến mãi..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <PromotionSelect
              ariaLabel="Lọc mã khuyến mãi"
              icon={<FilterIcon />}
              options={PROMOTION_STATUS_OPTIONS}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            />
            <PromotionSelect
              ariaLabel="Sắp xếp mã khuyến mãi"
              icon={<SortIcon />}
              options={PROMOTION_SORT_OPTIONS}
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />
          </div>

          {feedback ? (
            <p className="admin-promotions-page__feedback" role="status">
              {feedback}
            </p>
          ) : null}

          {promotions.length > 0 ? (
            <div className="admin-promotions-page__list" aria-label="Danh sách mã khuyến mãi">
              {promotions.map((promotion) => {
                const status = PROMOTION_STATUS_VIEW_META[promotion.status]
                const isScheduled = promotion.status === ADMIN_PROMOTION_STATUSES.scheduled

                return (
                  <AdminCard
                    className={`admin-promotion-card admin-promotion-card--${promotion.status}`}
                    key={promotion.id}
                    padding="lg"
                  >
                    <div className="admin-promotion-card__voucher">
                      <strong>{promotion.code}</strong>
                      <span>Mã Khuyến Mãi</span>
                    </div>
                    <div className="admin-promotion-card__content">
                      <span className={`admin-promotion-card__status admin-promotion-card__status--${promotion.status}`}>
                        {status.label}
                      </span>
                      <h2>{promotion.name}</h2>
                      <p className="admin-promotion-card__description">{promotion.description}</p>
                      <p className="admin-promotion-card__date">
                        <span>Thời hạn:</span> {formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}
                      </p>
                    </div>
                    <div className="admin-promotion-card__actions">
                      <AdminButton
                        className="admin-promotion-card__edit"
                        icon={<EditIcon />}
                        size="sm"
                        variant={isScheduled ? 'secondary' : 'primary'}
                        onClick={() => setFeedback(`Đã chọn chỉnh sửa mã ${promotion.code}.`)}
                      >
                        Sửa
                      </AdminButton>
                      <AdminButton
                        className="admin-promotion-card__end"
                        icon={<StopIcon />}
                        size="sm"
                        variant="secondary"
                        onClick={() => updatePromotionStatus(promotion, ADMIN_PROMOTION_STATUSES.ended)}
                      >
                        {status.actionLabel}
                      </AdminButton>
                    </div>
                  </AdminCard>
                )
              })}
            </div>
          ) : (
            <AdminEmptyState
              className="admin-promotions-page__empty"
              title="Không có mã khuyến mãi phù hợp"
              description="Thử đổi trạng thái, từ khóa hoặc cách sắp xếp."
              action={
                <AdminButton variant="secondary" onClick={resetFilters}>
                  Đặt lại bộ lọc
                </AdminButton>
              }
            />
          )}

          <div className="admin-promotions-page__footer">
            <p>Hiển thị {promotions.length} trong số 29 mã khuyến mãi</p>
            <AdminPagination
              className="admin-promotions-page__pagination"
              currentPage={1}
              labels={{ previous: '‹', next: '›' }}
              pages={[1, 2, 3]}
              totalPages={3}
            />
          </div>
        </div>

        <aside className="admin-promotions-page__overview" aria-label="Tổng quan Khuyến mãi">
          <h2>
            <span aria-hidden="true">
              <TagIcon />
            </span>
            Tổng quan Khuyến mãi
          </h2>
          <div className="admin-promotions-page__stats">
            {PROMOTION_OVERVIEW.map((stat) => (
              <article className="admin-promotions-page__stat" key={stat.label}>
                <span>{stat.label}</span>
                <strong className={`admin-promotions-page__stat-value admin-promotions-page__stat-value--${stat.tone}`}>
                  {stat.value}
                </strong>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  )
}

export default AdminPromotionsPage
