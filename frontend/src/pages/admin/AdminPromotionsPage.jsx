import {
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminErrorState,
  AdminField,
  AdminFormPanel,
  AdminInput,
  AdminLoadingBlock,
  AdminPageHeader,
  AdminPagination,
  AdminSearchInput,
  AdminSelect,
  AdminTextarea,
} from '../../components/admin/ui/index.js'
import {
  ADMIN_PROMOTION_FORM_STATUS_OPTIONS,
  ADMIN_PROMOTION_SORT_OPTIONS,
  ADMIN_PROMOTION_STATUS_OPTIONS,
  ADMIN_PROMOTION_STATUSES,
  ADMIN_PROMOTION_TARGET_SERVICE_OPTIONS,
} from '../../constants/adminPromotions.js'
import useAdminPromotions from '../../hooks/useAdminPromotions.js'
import {
  getAdminPromotionStatusAction,
  getAdminPromotionStatusMeta,
} from '../../mappers/adminPromotionMappers.js'

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

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
  if (!value) {
    return 'Chưa cập nhật'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Chưa cập nhật'
  }

  return dateFormatter.format(date)
}

function getFooterText({ pagination, promotions, resultRange, searchQuery }) {
  if (!pagination.total) {
    return 'Chưa có chương trình khuyến mãi để hiển thị'
  }

  if (searchQuery.trim()) {
    return `Tìm thấy ${promotions.length} trong trang ${pagination.page}; tổng ${pagination.total} chương trình`
  }

  return `Hiển thị ${resultRange.start}-${resultRange.end} trong tổng ${pagination.total} chương trình`
}

function PromotionSelect({ ariaLabel, disabled = false, icon, onChange, options, value }) {
  return (
    <label className="admin-promotions-page__select-shell">
      <span aria-hidden="true" className="admin-promotions-page__select-icon">
        {icon}
      </span>
      <AdminSelect
        aria-label={ariaLabel}
        className="admin-promotions-page__select"
        disabled={disabled}
        options={options}
        value={value}
        onChange={onChange}
      />
    </label>
  )
}

function PromotionForm({
  actionLoading,
  closeForm,
  formErrors,
  formState,
  formValues,
  submitPromotionForm,
  updateFormField,
}) {
  const isEditMode = formState.mode === 'edit'
  const statusMeta = getAdminPromotionStatusMeta(formValues.status)

  return (
    <form
      className="admin-promotions-page__form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        submitPromotionForm()
      }}
    >
      <AdminFormPanel
        className="admin-promotions-page__form-card"
        title={isEditMode ? 'Chỉnh sửa khuyến mãi' : 'Thêm khuyến mãi mới'}
        subtitle="Dữ liệu sẽ được gửi trực tiếp đến API /admin/promotions."
        actions={
          <AdminButton disabled={actionLoading} type="button" variant="ghost" onClick={closeForm}>
            Đóng
          </AdminButton>
        }
      >
        <div className="admin-promotions-page__form-grid">
          <AdminField error={formErrors.name} htmlFor="promotion-name" label="Tên chương trình" required>
            <AdminInput
              id="promotion-name"
              invalid={Boolean(formErrors.name)}
              value={formValues.name}
              onChange={(event) => updateFormField('name', event.target.value)}
            />
          </AdminField>

          <AdminField error={formErrors.status} htmlFor="promotion-status" label="Trạng thái" required>
            {isEditMode ? (
              <AdminInput id="promotion-status" readOnly value={statusMeta.label} />
            ) : (
              <AdminSelect
                id="promotion-status"
                invalid={Boolean(formErrors.status)}
                options={ADMIN_PROMOTION_FORM_STATUS_OPTIONS}
                value={formValues.status}
                onChange={(event) => updateFormField('status', event.target.value)}
              />
            )}
          </AdminField>

          <AdminField
            error={formErrors.validFrom}
            htmlFor="promotion-valid-from"
            label="Bắt đầu"
            required
          >
            <AdminInput
              id="promotion-valid-from"
              invalid={Boolean(formErrors.validFrom)}
              type="datetime-local"
              value={formValues.validFrom}
              onChange={(event) => updateFormField('validFrom', event.target.value)}
            />
          </AdminField>

          <AdminField
            error={formErrors.validTo}
            htmlFor="promotion-valid-to"
            label="Kết thúc"
            required
          >
            <AdminInput
              id="promotion-valid-to"
              invalid={Boolean(formErrors.validTo)}
              type="datetime-local"
              value={formValues.validTo}
              onChange={(event) => updateFormField('validTo', event.target.value)}
            />
          </AdminField>

          <AdminField htmlFor="promotion-target" label="Phạm vi dịch vụ">
            <AdminSelect
              id="promotion-target"
              options={ADMIN_PROMOTION_TARGET_SERVICE_OPTIONS}
              value={formValues.targetServiceType}
              onChange={(event) => updateFormField('targetServiceType', event.target.value)}
            />
          </AdminField>
        </div>

        <AdminField htmlFor="promotion-description" label="Mô tả">
          <AdminTextarea
            id="promotion-description"
            placeholder="Nhập mô tả ngắn về ưu đãi, điều kiện áp dụng hoặc ghi chú vận hành..."
            value={formValues.description}
            onChange={(event) => updateFormField('description', event.target.value)}
          />
        </AdminField>

        <div className="admin-promotions-page__form-actions">
          <AdminButton disabled={actionLoading} type="button" variant="secondary" onClick={closeForm}>
            Hủy
          </AdminButton>
          <AdminButton loading={actionLoading} type="submit" variant="primary">
            {isEditMode ? 'Lưu thay đổi' : 'Tạo khuyến mãi'}
          </AdminButton>
        </div>
      </AdminFormPanel>
    </form>
  )
}

function AdminPromotionsPage() {
  const {
    actionLoading,
    closeForm,
    error,
    feedback,
    formErrors,
    formState,
    formValues,
    loading,
    openCreateForm,
    openEditForm,
    overview,
    pageNumbers,
    pagination,
    promotions,
    reloadPromotions,
    resetFilters,
    resultRange,
    runStatusAction,
    searchQuery,
    setCurrentPage,
    setSearchQuery,
    setSortOrder,
    setStatusFilter,
    sortOrder,
    statusFilter,
    submitPromotionForm,
    updateFormField,
  } = useAdminPromotions()

  return (
    <main className="admin-ops-page admin-promotions-page">
      <AdminPageHeader
        className="admin-promotions-page__header"
        title="Quản lý Khuyến mãi"
        subtitle="Quản lý các chương trình khuyến mãi hiện hành và đã lên lịch."
      />

      <div className="admin-promotions-page__top-row">
        <aside className="admin-promotions-page__overview" aria-label="Tổng quan Khuyến mãi">
          <h2>
            <span aria-hidden="true">
              <TagIcon />
            </span>
            Tổng quan Khuyến mãi
          </h2>
          <div className="admin-promotions-page__stats">
            {overview.map((stat) => (
              <article className="admin-promotions-page__stat" key={stat.label}>
                <span>{stat.label}</span>
                <strong className={`admin-promotions-page__stat-value admin-promotions-page__stat-value--${stat.tone}`}>
                  {stat.value}
                </strong>
              </article>
            ))}
          </div>
        </aside>

        <AdminButton
          className="admin-promotions-page__create"
          disabled={loading || actionLoading}
          icon={<PlusIcon />}
          variant="primary"
          onClick={openCreateForm}
        >
          Thêm Khuyến mãi Mới
        </AdminButton>
      </div>

      {formState.isOpen ? (
        <PromotionForm
          actionLoading={actionLoading}
          closeForm={closeForm}
          formErrors={formErrors}
          formState={formState}
          formValues={formValues}
          submitPromotionForm={submitPromotionForm}
          updateFormField={updateFormField}
        />
      ) : null}

      {error ? (
        <AdminErrorState
          title="Không thể tải dữ liệu khuyến mãi"
          description={error}
          action={
            <AdminButton loading={loading} variant="secondary" onClick={reloadPromotions}>
              Thử lại
            </AdminButton>
          }
        />
      ) : null}

      <section className="admin-promotions-page__workspace" aria-label="Không gian quản lý khuyến mãi">
        <div className="admin-promotions-page__main">
          <div className="admin-promotions-page__toolbar" aria-label="Bộ lọc khuyến mãi">
            <AdminSearchInput
              className="admin-promotions-page__search"
              disabled={loading}
              placeholder="Tìm kiếm chương trình khuyến mãi..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <PromotionSelect
              ariaLabel="Lọc khuyến mãi"
              disabled={loading}
              icon={<FilterIcon />}
              options={ADMIN_PROMOTION_STATUS_OPTIONS}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            />
            <PromotionSelect
              ariaLabel="Sắp xếp khuyến mãi"
              disabled={loading}
              icon={<SortIcon />}
              options={ADMIN_PROMOTION_SORT_OPTIONS}
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />
          </div>

          {feedback.message ? (
            <p className={`admin-promotions-page__feedback admin-promotions-page__feedback--${feedback.tone}`} role="status">
              {feedback.message}
            </p>
          ) : null}

          {loading ? (
            <AdminCard className="admin-promotions-page__loading" padding="lg">
              <AdminLoadingBlock rows={4} />
            </AdminCard>
          ) : promotions.length > 0 ? (
            <div className="admin-promotions-page__list" aria-label="Danh sách khuyến mãi">
              {promotions.map((promotion) => {
                const status = getAdminPromotionStatusMeta(promotion.status)
                const statusAction = getAdminPromotionStatusAction(promotion)
                const isTerminal = [
                  ADMIN_PROMOTION_STATUSES.cancelled,
                  ADMIN_PROMOTION_STATUSES.expired,
                ].includes(promotion.status)

                return (
                  <AdminCard
                    className={`admin-promotion-card admin-promotion-card--${status.className}`}
                    key={promotion.id}
                    padding="lg"
                  >
                    <div className="admin-promotion-card__voucher">
                      <strong>{promotion.code}</strong>
                      <span>Mã chương trình</span>
                    </div>
                    <div className="admin-promotion-card__content">
                      <span className={`admin-promotion-card__status admin-promotion-card__status--${status.className}`}>
                        {status.label}
                      </span>
                      <h2>{promotion.name}</h2>
                      <p className="admin-promotion-card__description">{promotion.description}</p>
                      <p className="admin-promotion-card__date">
                        <span>Phạm vi:</span> {promotion.targetServiceLabel}
                      </p>
                      <p className="admin-promotion-card__date">
                        <span>Thời hạn:</span> {formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}
                      </p>
                    </div>
                    <div className="admin-promotion-card__actions">
                      <AdminButton
                        className="admin-promotion-card__edit"
                        disabled={actionLoading || isTerminal}
                        icon={<EditIcon />}
                        size="sm"
                        variant={promotion.status === ADMIN_PROMOTION_STATUSES.draft ? 'secondary' : 'primary'}
                        onClick={() => openEditForm(promotion)}
                      >
                        Sửa
                      </AdminButton>
                      {statusAction ? (
                        <AdminButton
                          className="admin-promotion-card__end"
                          disabled={actionLoading}
                          icon={<StopIcon />}
                          loading={actionLoading}
                          size="sm"
                          variant="secondary"
                          onClick={() => runStatusAction(promotion, statusAction.nextStatus)}
                        >
                          {statusAction.label}
                        </AdminButton>
                      ) : null}
                    </div>
                  </AdminCard>
                )
              })}
            </div>
          ) : (
            <AdminEmptyState
              className="admin-promotions-page__empty"
              title="Không có khuyến mãi phù hợp"
              description="Thử đổi trạng thái, từ khóa hoặc cách sắp xếp."
              action={
                <AdminButton variant="secondary" onClick={resetFilters}>
                  Đặt lại bộ lọc
                </AdminButton>
              }
            />
          )}

          <div className="admin-promotions-page__footer">
            <p>
              {getFooterText({
                pagination,
                promotions,
                resultRange,
                searchQuery,
              })}
            </p>
            <AdminPagination
              className="admin-promotions-page__pagination"
              currentPage={pagination.page}
              labels={{ previous: '‹', next: '›' }}
              pages={pageNumbers}
              totalPages={pagination.total_pages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </section>
    </main>
  )
}

export default AdminPromotionsPage
