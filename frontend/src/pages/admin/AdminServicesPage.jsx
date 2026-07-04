import AdminServiceFormModal from '../../components/admin/services/AdminServiceFormModal.jsx'
import AdminServiceStatusActionModal from '../../components/admin/services/AdminServiceStatusActionModal.jsx'
import useAdminServices from '../../hooks/useAdminServices.js'

const numberFormatter = new Intl.NumberFormat('vi-VN')

function AdminServicesPage() {
  const {
    actionMeta,
    closeModal,
    confirmStatusAction,
    currentRole,
    currentRoleLabel,
    error,
    feedback,
    filters,
    formModalState,
    formatCurrency,
    formatDateTime,
    getAllowedActions,
    getServiceDetailSummary,
    getServiceTypeLabel,
    handleRowAction,
    loading,
    openCreateForm,
    pageNumbers,
    pagination,
    resetFilters,
    resultRange,
    selectedService,
    services,
    setCurrentPage,
    setSearch,
    setSort,
    setStatusFilter,
    setTypeFilter,
    sort,
    sortOptions,
    statusActionModalState,
    statusMeta,
    statusOptions,
    submitServiceForm,
    summaryCards,
    typeOptions,
  } = useAdminServices()

  return (
    <main className="admin-services-page">
      <section className="admin-services-page__hero">
        <div className="admin-services-page__hero-copy">
          <p className="admin-services-page__eyebrow">Admin services</p>
          <h1 className="admin-services-page__title">Quản lý dịch vụ</h1>
          <p className="admin-services-page__subtitle">
            Theo dõi, lọc và quản lý kho dịch vụ du lịch
          </p>
        </div>

        <button className="admin-services-page__add-button" type="button" onClick={openCreateForm}>
          Thêm dịch vụ
        </button>
      </section>

      <section className="admin-services-page__meta-bar" aria-label="Trạng thái mock">
        <div className="admin-services-page__role-pill">
          Role mock: <strong>{currentRoleLabel}</strong>
        </div>
        <p
          className={`admin-services-page__feedback admin-services-page__feedback--${feedback.tone}`}
          role="status"
        >
          {feedback.message}
        </p>
      </section>

      {error ? (
        <p className="admin-services-page__feedback admin-services-page__feedback--error" role="status">
          {error}
        </p>
      ) : null}

      <section className="admin-services-page__filters admin-services-card" aria-label="Bộ lọc dịch vụ">
        <div className="admin-services-page__filter-header">
          <div>
            <h2 className="admin-services-page__section-title">Bộ lọc danh sách</h2>
            <p className="admin-services-page__section-copy">
              Lọc theo query `q`, `type`, `status`, `sort` và `page` qua mock admin service repository.
            </p>
          </div>

          <button className="admin-services-page__reset-button" type="button" onClick={resetFilters}>
            Đặt lại
          </button>
        </div>

        <div className="admin-services-page__type-chips" role="group" aria-label="Lọc theo loại dịch vụ">
          {typeOptions.map((option) => (
            <button
              key={option.value}
              className={`admin-services-page__type-chip ${
                filters.type === option.value ? 'admin-services-page__type-chip--active' : ''
              }`}
              type="button"
              onClick={() => setTypeFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="admin-services-page__filter-grid">
          <label className="admin-services-page__field">
            <span className="admin-services-page__field-label">Tìm kiếm</span>
            <div className="admin-services-page__search-shell">
              <input
                className="admin-services-page__input"
                placeholder="Tìm theo tên, mã dịch vụ, địa điểm..."
                type="search"
                value={filters.search}
                onChange={(event) => setSearch(event.target.value)}
              />

              {filters.search ? (
                <button
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="admin-services-page__clear-search"
                  type="button"
                  onClick={() => setSearch('')}
                >
                  Xóa
                </button>
              ) : null}
            </div>
          </label>

          <label className="admin-services-page__field">
            <span className="admin-services-page__field-label">Trạng thái</span>
            <select
              className="admin-services-page__select"
              value={filters.status}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-services-page__field">
            <span className="admin-services-page__field-label">Sắp xếp</span>
            <select
              className="admin-services-page__select"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="admin-services-page__summary-grid" aria-label="Tóm tắt dịch vụ">
        {summaryCards.map((card) => (
          <article
            className={`admin-services-summary-card admin-services-summary-card--${card.tone}`}
            key={card.key}
          >
            <p className="admin-services-summary-card__label">{card.label}</p>
            <strong className="admin-services-summary-card__value">
              {numberFormatter.format(card.value)}
            </strong>
            <p className="admin-services-summary-card__helper">{card.helper}</p>
          </article>
        ))}
      </section>

      <section className="admin-services-card admin-services-table-card">
        <div className="admin-services-table-card__header">
          <div>
            <h2 className="admin-services-page__section-title">Danh sách dịch vụ</h2>
            <p className="admin-services-page__section-copy">
              {loading
                ? 'Đang tải danh sách dịch vụ từ mock admin service adapter...'
                : `Hiển thị ${numberFormatter.format(pagination.total)} kết quả phù hợp sau khi lọc.`}
            </p>
          </div>
        </div>

        <div className="admin-services-table-card__scroller">
          <table className="admin-services-table">
            <thead>
              <tr>
                <th scope="col">Mã dịch vụ</th>
                <th scope="col">Dịch vụ</th>
                <th scope="col">Loại</th>
                <th scope="col">Địa điểm</th>
                <th scope="col">Giá</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Cập nhật</th>
                <th scope="col">Người tạo</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9">
                    <div className="admin-services-table__empty" role="status">
                      <h3>Đang tải dữ liệu dịch vụ</h3>
                      <p>Mock adapter đang giả lập response list admin services theo API contract.</p>
                    </div>
                  </td>
                </tr>
              ) : services.length > 0 ? (
                services.map((service) => {
                  const status = statusMeta[service.status]
                  const actions = getAllowedActions(service)

                  return (
                    <tr
                      className={
                        service.id === statusActionModalState.service?.id ||
                        service.id === formModalState.service?.id ||
                        service.id === selectedService?.id
                          ? 'admin-services-table__row admin-services-table__row--selected'
                          : 'admin-services-table__row'
                      }
                      key={service.id}
                    >
                      <td>
                        <span className="admin-services-table__code">{service.service_code}</span>
                      </td>
                      <td>
                        <div className="admin-services-table__service-cell">
                          <img
                            alt={service.title}
                            className="admin-services-table__thumb"
                            src={service.image_url || '/assets/template/brand/logo.png'}
                          />
                          <div className="admin-services-table__service-copy">
                            <strong className="admin-services-table__service-title">
                              {service.title}
                            </strong>
                            <span className="admin-services-table__service-description">
                              {service.short_description}
                            </span>
                            <span className="admin-services-table__service-meta">
                              {getServiceDetailSummary(service)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="admin-services-table__text">
                          {getServiceTypeLabel(service.service_type)}
                        </span>
                      </td>
                      <td>
                        <span className="admin-services-table__text">{service.location_text}</span>
                      </td>
                      <td>
                        <div className="admin-services-table__price">
                          {service.sale_price ? (
                            <>
                              <strong>{formatCurrency(service.sale_price, service.currency)}</strong>
                              <span>{formatCurrency(service.base_price, service.currency)}</span>
                            </>
                          ) : (
                            <strong>{formatCurrency(service.base_price, service.currency)}</strong>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`admin-services-status admin-services-status--${status?.tone ?? 'draft'}`}
                        >
                          <span aria-hidden="true" className="admin-services-status__dot" />
                          {status?.label ?? service.status}
                        </span>
                      </td>
                      <td>
                        <div className="admin-services-table__timestamp">
                          <strong>{formatDateTime(service.updated_at)}</strong>
                          <span>{service.updated_by_name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="admin-services-table__timestamp">
                          <strong>{service.created_by_name}</strong>
                          <span>{formatDateTime(service.created_at)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="admin-services-table__actions">
                          {actions.map((actionKey) => (
                            <button
                              key={actionKey}
                              className={`admin-services-table__action admin-services-table__action--${actionMeta[actionKey].variant}`}
                              type="button"
                              onClick={() => handleRowAction(service, actionKey)}
                            >
                              {actionMeta[actionKey].label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="9">
                    <div className="admin-services-table__empty" role="status">
                      <h3>Không có dịch vụ phù hợp</h3>
                      <p>Thử đổi từ khóa, trạng thái hoặc loại dịch vụ để xem thêm dữ liệu mock.</p>
                      <button
                        className="admin-services-page__reset-button"
                        type="button"
                        onClick={resetFilters}
                      >
                        Đặt lại bộ lọc
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-services-table-card__footer">
          <p className="admin-services-table-card__result">
            {pagination.total > 0
              ? `Hiển thị ${resultRange.start} - ${resultRange.end} trên ${numberFormatter.format(pagination.total)} dịch vụ`
              : 'Hiện không có kết quả để hiển thị'}
          </p>

          {pagination.total > 0 ? (
            <div className="admin-services-pagination" aria-label="Phân trang dịch vụ">
              <button
                className="admin-services-pagination__button"
                disabled={pagination.page === 1}
                type="button"
                onClick={() => setCurrentPage(Math.max(1, pagination.page - 1))}
              >
                Trước
              </button>

              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  className={`admin-services-pagination__button ${
                    pagination.page === pageNumber
                      ? 'admin-services-pagination__button--active'
                      : ''
                  }`}
                  type="button"
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                className="admin-services-pagination__button"
                disabled={pagination.page === pagination.total_pages}
                type="button"
                onClick={() => setCurrentPage(Math.min(pagination.total_pages, pagination.page + 1))}
              >
                Sau
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {formModalState.isOpen ? (
        <AdminServiceFormModal
          currentRole={currentRole}
          mode={formModalState.mode}
          service={formModalState.service}
          onClose={() => closeModal('form')}
          onSave={submitServiceForm}
        />
      ) : null}

      {statusActionModalState.isOpen ? (
        <AdminServiceStatusActionModal
          actionKey={statusActionModalState.actionKey}
          currentRole={currentRole}
          service={statusActionModalState.service}
          onClose={() => closeModal('status')}
          onConfirm={confirmStatusAction}
        />
      ) : null}
    </main>
  )
}

export default AdminServicesPage
