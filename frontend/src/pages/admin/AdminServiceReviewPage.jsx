import { useMemo, useState } from 'react'
import {
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminField,
  AdminFilterBar,
  AdminPageHeader,
  AdminSearchInput,
  AdminSectionHeader,
  AdminSegmentedControl,
  AdminStatusBadge,
  AdminTextarea,
} from '../../components/admin/ui/index.js'
import {
  ADMIN_SERVICE_REVIEW_ITEMS,
  ADMIN_SERVICE_REVIEW_TYPES,
} from '../../fixtures/adminServiceWorkflow.fixtures.js'

const currencyFormatter = new Intl.NumberFormat('vi-VN')

function formatCurrency(value) {
  return `${currencyFormatter.format(value)} Đ`
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function removeCount(label) {
  return label.replace(/\s*\(\d+\)$/, '')
}

function AdminServiceReviewPage() {
  const [activeType, setActiveType] = useState('tour')
  const [reviewItems, setReviewItems] = useState(ADMIN_SERVICE_REVIEW_ITEMS)
  const [notes, setNotes] = useState({})
  const [errors, setErrors] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [decisionFeedback, setDecisionFeedback] = useState('')

  const reviewTypeOptions = useMemo(
    () =>
      ADMIN_SERVICE_REVIEW_TYPES.map((type) => {
        const count = reviewItems.filter((item) => item.type === type.value).length

        return {
          ...type,
          label: `${removeCount(type.label)} (${count})`,
        }
      }),
    [reviewItems],
  )

  const itemsForActiveType = useMemo(
    () => reviewItems.filter((item) => item.type === activeType),
    [activeType, reviewItems],
  )

  const visibleItems = useMemo(() => {
    const query = normalizeText(searchQuery.trim())

    return itemsForActiveType.filter((item) => (
      query.length === 0 ||
      normalizeText(`${item.title} ${item.partnerName} ${item.location} ${item.description}`).includes(query)
    ))
  }, [itemsForActiveType, searchQuery])

  const activeTypeLabel =
    removeCount(ADMIN_SERVICE_REVIEW_TYPES.find((type) => type.value === activeType)?.label ?? 'dịch vụ')

  function resetFilters() {
    setActiveType('tour')
    setSearchQuery('')
  }

  function updateNote(itemId, value) {
    setNotes((currentNotes) => ({
      ...currentNotes,
      [itemId]: value,
    }))
    setErrors((currentErrors) => {
      if (!currentErrors[itemId]) {
        return currentErrors
      }

      const nextErrors = { ...currentErrors }
      delete nextErrors[itemId]
      return nextErrors
    })
  }

  function updateItemStatus(item, nextStatus) {
    const note = notes[item.id]?.trim() ?? ''

    if (nextStatus === 'rejected' && note.length === 0) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [item.id]: 'Nhập lý do trước khi từ chối.',
      }))
      return
    }

    setReviewItems((items) => items.filter((currentItem) => currentItem.id !== item.id))
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors[item.id]
      return nextErrors
    })
    setNotes((currentNotes) => {
      const nextNotes = { ...currentNotes }
      delete nextNotes[item.id]
      return nextNotes
    })
    setDecisionFeedback(
      nextStatus === 'approved'
        ? `Đã phê duyệt dịch vụ "${item.title}".`
        : `Đã từ chối dịch vụ "${item.title}".`,
    )
  }

  return (
    <main className="admin-ops-page admin-service-review-page">
      <AdminPageHeader
        eyebrow="Kiểm duyệt"
        title="Phê duyệt Dịch vụ"
        subtitle="Quản lý và phê duyệt dịch vụ mới từ đối tác."
        actions={<AdminStatusBadge tone="warning">{reviewItems.length} chờ duyệt</AdminStatusBadge>}
      />

      <AdminFilterBar
        aria-label="Bộ lọc dịch vụ cần phê duyệt"
        actions={
          <AdminButton variant="secondary" onClick={resetFilters}>
            Đặt lại
          </AdminButton>
        }
      >
        <AdminSegmentedControl
          ariaLabel="Lọc loại dịch vụ cần phê duyệt"
          options={reviewTypeOptions}
          value={activeType}
          onChange={setActiveType}
        />
        <AdminField className="admin-ops-page__search" label="Tìm kiếm">
          <AdminSearchInput
            placeholder="Tìm dịch vụ, đối tác, địa điểm..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </AdminField>
      </AdminFilterBar>

      {decisionFeedback ? (
        <p className="admin-ops-page__result-note" role="status">
          {decisionFeedback}
        </p>
      ) : null}

      <section className="admin-service-review-page__list" aria-label="Danh sách dịch vụ chờ duyệt">
        <AdminSectionHeader
          title="Danh sách Dịch vụ chờ duyệt"
          subtitle={`Hiển thị ${visibleItems.length} trong số ${itemsForActiveType.length} ${activeTypeLabel.toLowerCase()}`}
        />

        {visibleItems.length > 0 ? (
          visibleItems.map((item) => (
            <AdminCard className="admin-review-card" key={item.id} padding="lg">
              <div className="admin-review-card__media">
                <img alt={item.title} src={item.imageUrl} />
              </div>

              <div className="admin-review-card__header">
                <div>
                  <div className="admin-review-card__badges">
                    <AdminStatusBadge tone="brand">{item.tag}</AdminStatusBadge>
                    <AdminStatusBadge tone="info">{item.duration}</AdminStatusBadge>
                  </div>
                  <h2>{item.title}</h2>
                  <p>Đối tác: {item.partnerName}</p>
                </div>
                <strong>{formatCurrency(item.price)}</strong>
              </div>

              <div className="admin-review-card__meta">
                <span>{item.location}</span>
                <span>{item.capacity}</span>
              </div>

              <p className="admin-review-card__description">{item.description}</p>

              <AdminField error={errors[item.id]} label="Ghi chú (Bắt buộc nếu Từ chối)">
                <AdminTextarea
                  invalid={Boolean(errors[item.id])}
                  placeholder="Nhập lý do hoặc ghi chú kiểm duyệt..."
                  rows={2}
                  value={notes[item.id] ?? ''}
                  onChange={(event) => updateNote(item.id, event.target.value)}
                />
              </AdminField>

              <div className="admin-review-card__actions">
                <AdminButton
                  variant="danger"
                  onClick={() => updateItemStatus(item, 'rejected')}
                >
                  Từ chối
                </AdminButton>
                <AdminButton
                  variant="success"
                  onClick={() => updateItemStatus(item, 'approved')}
                >
                  Phê duyệt
                </AdminButton>
              </div>
            </AdminCard>
          ))
        ) : (
          <AdminEmptyState
            title="Không có dịch vụ chờ duyệt phù hợp"
            description="Thử đổi loại dịch vụ hoặc từ khóa tìm kiếm."
            action={
              <AdminButton variant="secondary" onClick={resetFilters}>
                Đặt lại bộ lọc
              </AdminButton>
            }
          />
        )}
      </section>

      <p className="admin-ops-page__result-note">
        Còn {reviewItems.length} dịch vụ trong hàng chờ kiểm duyệt.
      </p>
    </main>
  )
}

export default AdminServiceReviewPage
