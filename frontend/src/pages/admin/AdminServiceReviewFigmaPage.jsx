import {
  AdminButton,
  AdminEmptyState,
  AdminErrorState,
  AdminField,
  AdminLoadingBlock,
  AdminTextarea,
} from '../../components/admin/ui/index.js'
import useAdminServiceReview from '../../hooks/useAdminServiceReview.js'

const currencyFormatter = new Intl.NumberFormat('vi-VN')

function formatCurrency(value) {
  return `${currencyFormatter.format(value)} Đ`
}

function ReviewIcon({ children }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      {children}
    </svg>
  )
}

function ServiceTypeIcon({ type }) {
  if (type === 'hotel' || type === 'room') {
    return (
      <ReviewIcon>
        <path d="M3 11h18v8h-2v-3H5v3H3V11Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 11V7a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v4M12 11V8h5a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </ReviewIcon>
    )
  }

  if (type === 'flight') {
    return (
      <ReviewIcon>
        <path d="m3 14 18-8-5 15-4-6-6-1Z" fill="currentColor" />
      </ReviewIcon>
    )
  }

  if (type === 'train') {
    return (
      <ReviewIcon>
        <rect x="6" y="3" width="12" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.5 8h7M9 17l-2 3M15 17l2 3" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <circle cx="9.5" cy="13" r="1" fill="currentColor" />
        <circle cx="14.5" cy="13" r="1" fill="currentColor" />
      </ReviewIcon>
    )
  }

  return (
    <ReviewIcon>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" fill="currentColor" />
    </ReviewIcon>
  )
}

function LocationIcon() {
  return (
    <ReviewIcon>
      <path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="10" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </ReviewIcon>
  )
}

function UsersIcon() {
  return (
    <ReviewIcon>
      <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.5 19a5.5 5.5 0 0 1 11 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M16 11.5a2.5 2.5 0 1 0-.7-4.9M16.5 15a4.5 4.5 0 0 1 4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </ReviewIcon>
  )
}

function PriceIcon() {
  return (
    <ReviewIcon>
      <path d="M4 7h16v10H4V7Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12h8M8 15h5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </ReviewIcon>
  )
}

function RejectIcon() {
  return (
    <ReviewIcon>
      <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
    </ReviewIcon>
  )
}

function ApproveIcon() {
  return (
    <ReviewIcon>
      <path d="m5 12 4 4 10-10" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </ReviewIcon>
  )
}

function AdminServiceReviewFigmaPage() {
  const {
    activeType,
    activeTypeLabel,
    approveReviewItem,
    error,
    errors,
    feedback,
    isActionLoading,
    isMutating,
    loading,
    notes,
    rejectReviewItem,
    reloadReviewItems,
    resetFilters,
    reviewItems,
    reviewTypeOptions,
    setActiveType,
    updateNote,
    visibleItems,
  } = useAdminServiceReview()

  return (
    <main className="admin-ops-page admin-service-review-page">
      <header className="admin-service-review-page__header">
        <h1>Phê duyệt Dịch vụ</h1>
        <p>Quản lý và phê duyệt dịch vụ mới từ đối tác</p>
      </header>

      <nav className="admin-review-tabs" aria-label="Lọc loại dịch vụ cần phê duyệt">
        {reviewTypeOptions.map((type) => (
          <button
            aria-current={activeType === type.value ? 'page' : undefined}
            className={`admin-review-tabs__item${activeType === type.value ? ' admin-review-tabs__item--active' : ''}`}
            disabled={loading || isMutating}
            key={type.value}
            type="button"
            onClick={() => setActiveType(type.value)}
          >
            <span className="admin-review-tabs__icon">
              <ServiceTypeIcon type={type.value} />
            </span>
            <span>{type.label}</span>
          </button>
        ))}
      </nav>

      {feedback.message ? (
        <p
          className={`admin-service-review-page__feedback admin-service-review-page__feedback--${feedback.tone}`}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      ) : null}

      <section className="admin-service-review-page__list" aria-label="Danh sách dịch vụ chờ duyệt">
        {loading ? <AdminLoadingBlock rows={3} /> : null}

        {!loading && error ? (
          <AdminErrorState
            title="Không thể tải dịch vụ chờ duyệt"
            description={error}
            action={
              <AdminButton variant="secondary" onClick={reloadReviewItems}>
                Thử lại
              </AdminButton>
            }
          />
        ) : null}

        {!loading && !error && visibleItems.length > 0 ? (
          visibleItems.map((item) => (
            <article className="admin-review-card" key={item.id}>
              <div className="admin-review-card__media">
                <img alt={item.title} src={item.imageUrl} />
                <div className="admin-review-card__badges" aria-label={`${item.tag}, ${item.duration}`}>
                  <span className="admin-review-card__badge admin-review-card__badge--hot">{item.tag}</span>
                  <span className="admin-review-card__badge admin-review-card__badge--duration">
                    {item.duration.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="admin-review-card__content">
                <div className="admin-review-card__body">
                  <h2>{item.title}</h2>
                  <p className="admin-review-card__partner">Đối tác: {item.partnerName}</p>

                  <dl className="admin-review-card__meta" aria-label="Thông tin dịch vụ">
                    <div>
                      <dt>Địa điểm</dt>
                      <dd>
                        <LocationIcon />
                        {item.location}
                      </dd>
                    </div>
                    <div>
                      <dt>Sức chứa</dt>
                      <dd>
                        <UsersIcon />
                        {item.capacity}
                      </dd>
                    </div>
                    <div>
                      <dt>Giá</dt>
                      <dd>
                        <PriceIcon />
                        {formatCurrency(item.price)}
                      </dd>
                    </div>
                  </dl>

                  <p className="admin-review-card__description">{item.description}</p>
                </div>

                <div className="admin-review-card__actions-panel">
                  <AdminField
                    className="admin-review-card__note"
                    error={errors[item.id]}
                    label="Ghi chú (Bắt buộc nếu Từ chối)"
                  >
                    <AdminTextarea
                      className="admin-review-card__textarea"
                      disabled={isMutating}
                      invalid={Boolean(errors[item.id])}
                      placeholder="Nhập lý do hoặc ghi chú kiểm duyệt..."
                      rows={1}
                      value={notes[item.id] ?? ''}
                      onChange={(event) => updateNote(item.id, event.target.value)}
                    />
                  </AdminField>

                  <div className="admin-review-card__actions">
                    <AdminButton
                      className="admin-review-card__button admin-review-card__button--reject"
                      disabled={isMutating}
                      icon={<RejectIcon />}
                      loading={isActionLoading(item.id, 'reject')}
                      variant="danger"
                      onClick={() => rejectReviewItem(item)}
                    >
                      Từ chối
                    </AdminButton>
                    <AdminButton
                      className="admin-review-card__button admin-review-card__button--approve"
                      disabled={isMutating}
                      icon={<ApproveIcon />}
                      loading={isActionLoading(item.id, 'approve')}
                      variant="success"
                      onClick={() => approveReviewItem(item)}
                    >
                      Phê duyệt
                    </AdminButton>
                  </div>
                </div>
              </div>
            </article>
          ))
        ) : null}

        {!loading && !error && visibleItems.length === 0 ? (
          <AdminEmptyState
            title="Không có dịch vụ chờ duyệt phù hợp"
            description="Thử đổi loại dịch vụ hoặc quay lại sau khi nhân viên gửi dịch vụ lên hàng chờ."
            action={
              <AdminButton variant="secondary" onClick={resetFilters}>
                Đặt lại bộ lọc
              </AdminButton>
            }
          />
        ) : null}
      </section>

      <p className="admin-service-review-page__summary">
        Hiển thị {visibleItems.length} trong số {reviewItems.length} {activeTypeLabel}
      </p>
    </main>
  )
}

export default AdminServiceReviewFigmaPage
