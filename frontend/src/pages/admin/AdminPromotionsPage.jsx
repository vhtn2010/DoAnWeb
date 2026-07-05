import { useMemo, useState } from 'react'
import {
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminField,
  AdminFilterBar,
  AdminKpiCard,
  AdminPageHeader,
  AdminPagination,
  AdminSearchInput,
  AdminSectionHeader,
  AdminSelect,
  AdminStatusBadge,
} from '../../components/admin/ui/index.js'
import {
  ADMIN_PROMOTION_STATUS_META,
  ADMIN_PROMOTION_STATUSES,
  ADMIN_PROMOTIONS,
} from '../../fixtures/adminOperations.fixtures.js'

const dateFormatter = new Intl.DateTimeFormat('vi-VN')

const PROMOTION_STATUS_OPTIONS = Object.freeze([
  { value: 'all', label: 'Tất cả' },
  { value: ADMIN_PROMOTION_STATUSES.active, label: 'Đang hoạt động' },
  { value: ADMIN_PROMOTION_STATUSES.scheduled, label: 'Sắp tới' },
  { value: ADMIN_PROMOTION_STATUSES.ended, label: 'Đã kết thúc' },
])

const PROMOTION_SORT_OPTIONS = Object.freeze([
  { value: 'newest', label: 'Mới nhất' },
  { value: 'ending', label: 'Sắp kết thúc' },
])

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
  return [...promotions].sort((firstPromotion, secondPromotion) => {
    const firstDate = new Date(`${firstPromotion[sortOrder === 'ending' ? 'endDate' : 'startDate']}T00:00:00+07:00`)
    const secondDate = new Date(`${secondPromotion[sortOrder === 'ending' ? 'endDate' : 'startDate']}T00:00:00+07:00`)

    return sortOrder === 'ending'
      ? firstDate - secondDate
      : secondDate - firstDate
  })
}

function AdminPromotionsPage() {
  const [promotionItems, setPromotionItems] = useState(ADMIN_PROMOTIONS)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('newest')
  const [feedback, setFeedback] = useState('')

  const promotionCounts = useMemo(() => ({
    active: promotionItems.filter((promotion) => promotion.status === ADMIN_PROMOTION_STATUSES.active).length,
    ended: promotionItems.filter((promotion) => promotion.status === ADMIN_PROMOTION_STATUSES.ended).length,
    scheduled: promotionItems.filter((promotion) => promotion.status === ADMIN_PROMOTION_STATUSES.scheduled).length,
  }), [promotionItems])

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
    setSortOrder('newest')
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
        eyebrow="Marketing"
        title="Quản lý Khuyến mãi"
        subtitle="Quản lý các chương trình khuyến mãi hiện hành và đã lên lịch."
        actions={
          <AdminButton
            variant="primary"
            onClick={() => setFeedback('Luồng tạo khuyến mãi mới sẽ được nối với form ở bước backend.')}
          >
            Thêm Khuyến mãi Mới
          </AdminButton>
        }
      />

      <AdminFilterBar
        aria-label="Bộ lọc khuyến mãi"
        actions={
          <AdminButton variant="secondary" onClick={resetFilters}>
            Đặt lại
          </AdminButton>
        }
      >
        <AdminField className="admin-ops-page__search" label="Tìm kiếm">
          <AdminSearchInput
            placeholder="Tìm mã, tên chương trình, mô tả..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </AdminField>
        <AdminField label="Lọc">
          <AdminSelect
            options={PROMOTION_STATUS_OPTIONS}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          />
        </AdminField>
        <AdminField label="Sắp xếp">
          <AdminSelect
            options={PROMOTION_SORT_OPTIONS}
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          />
        </AdminField>
      </AdminFilterBar>

      {feedback ? (
        <p className="admin-ops-page__result-note" role="status">
          {feedback}
        </p>
      ) : null}

      <section className="admin-promotions-page__summary" aria-label="Tổng quan khuyến mãi">
        <AdminKpiCard
          label="Đang hoạt động"
          value={promotionCounts.active}
          helper="Mã có thể áp dụng ngay"
          tone="success"
        />
        <AdminKpiCard
          label="Sắp tới"
          value={promotionCounts.scheduled}
          helper="Đã lên lịch trong quý này"
          tone="info"
        />
        <AdminKpiCard
          label="Đã kết thúc"
          value={promotionCounts.ended}
          helper="Tính trong danh sách hiện tại"
          tone="neutral"
        />
      </section>

      <section className="admin-promotions-page__list" aria-label="Danh sách mã khuyến mãi">
        <AdminSectionHeader
          title="Danh sách Khuyến mãi"
          subtitle={`Hiển thị ${promotions.length} trong số ${promotionItems.length} mã khuyến mãi`}
        />

        {promotions.length > 0 ? (
          <div className="admin-promotions-page__grid">
            {promotions.map((promotion) => {
              const status = ADMIN_PROMOTION_STATUS_META[promotion.status]
              const isEnded = promotion.status === ADMIN_PROMOTION_STATUSES.ended

              return (
                <AdminCard className="admin-promotion-card" key={promotion.id} padding="lg">
                  <div className="admin-promotion-card__header">
                    <AdminStatusBadge tone={status.tone}>{status.label}</AdminStatusBadge>
                    <strong>{promotion.code}</strong>
                  </div>
                  <div className="admin-promotion-card__body">
                    <p>Mã Khuyến mãi</p>
                    <h2>{promotion.name}</h2>
                    <span>
                      Thời hạn: {formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}
                    </span>
                    <p>{promotion.description}</p>
                  </div>
                  <div className="admin-promotion-card__actions">
                    <AdminButton
                      size="sm"
                      variant="secondary"
                      onClick={() => setFeedback(`Đã chọn chỉnh sửa mã ${promotion.code}.`)}
                    >
                      Sửa
                    </AdminButton>
                    <AdminButton
                      disabled={isEnded}
                      size="sm"
                      variant={promotion.status === ADMIN_PROMOTION_STATUSES.scheduled ? 'danger' : 'warning'}
                      onClick={() => updatePromotionStatus(promotion, ADMIN_PROMOTION_STATUSES.ended)}
                    >
                      {isEnded
                        ? 'Đã kết thúc'
                        : promotion.status === ADMIN_PROMOTION_STATUSES.scheduled
                          ? 'Hủy'
                          : 'Kết thúc'}
                    </AdminButton>
                  </div>
                </AdminCard>
              )
            })}
          </div>
        ) : (
          <AdminEmptyState
            title="Không có mã khuyến mãi phù hợp"
            description="Thử đổi trạng thái, từ khóa hoặc cách sắp xếp."
            action={
              <AdminButton variant="secondary" onClick={resetFilters}>
                Đặt lại bộ lọc
              </AdminButton>
            }
          />
        )}
      </section>

      <div className="admin-ops-page__pagination-row">
        <p>Hiển thị {promotions.length} trong số {promotionItems.length} mã khuyến mãi</p>
        <AdminPagination currentPage={1} pages={[1, 2, 3]} totalPages={3} />
      </div>
    </main>
  )
}

export default AdminPromotionsPage
