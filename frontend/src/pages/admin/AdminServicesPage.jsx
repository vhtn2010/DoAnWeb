import AdminServiceFormModal from '../../components/admin/services/AdminServiceFormFigmaModal.jsx'
import AdminServiceStatusActionModal from '../../components/admin/services/AdminServiceStatusActionModal.jsx'
import { AdminEmptyState, AdminErrorState } from '../../components/admin/ui/index.js'
import { SERVICE_TYPES } from '../../constants/serviceTypes.js'
import useAdminServices from '../../hooks/useAdminServices.js'

const servicePriceFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})
const serviceDateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const visibleTypeTabs = new Set([
  'all',
  SERVICE_TYPES.tour,
  SERVICE_TYPES.hotel,
  SERVICE_TYPES.flight,
  SERVICE_TYPES.train,
])
const figmaRowActions = ['view', 'edit', 'delete']

function AdminActionSvgIcon({ children }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      {children}
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <AdminActionSvgIcon>
      <path
        d="m7 10 5 5 5-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </AdminActionSvgIcon>
  )
}

function ChevronLeftIcon() {
  return (
    <AdminActionSvgIcon>
      <path
        d="m15 18-6-6 6-6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </AdminActionSvgIcon>
  )
}

function ChevronRightIcon() {
  return (
    <AdminActionSvgIcon>
      <path
        d="m9 18 6-6-6-6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </AdminActionSvgIcon>
  )
}

function PlusCircleIcon() {
  return (
    <AdminActionSvgIcon>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 8v8M8 12h8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </AdminActionSvgIcon>
  )
}

function SearchIcon() {
  return (
    <AdminActionSvgIcon>
      <path
        d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </AdminActionSvgIcon>
  )
}

function ViewIcon() {
  return (
    <AdminActionSvgIcon>
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="2" />
    </AdminActionSvgIcon>
  )
}

function EditIcon() {
  return (
    <AdminActionSvgIcon>
      <path d="M12 20h9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path
        d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </AdminActionSvgIcon>
  )
}

function TrashIcon() {
  return (
    <AdminActionSvgIcon>
      <path
        d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </AdminActionSvgIcon>
  )
}

const serviceActionIcons = Object.freeze({
  delete: <TrashIcon />,
  edit: <EditIcon />,
  view: <ViewIcon />,
})

const serviceTableColumns = Object.freeze([
  { key: 'service', label: 'Thông tin dịch vụ' },
  { key: 'type', label: 'Danh mục' },
  { key: 'location', label: 'Điểm đến' },
  { key: 'price', label: 'Giá (đ)' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'updated', label: 'Cập nhật' },
  { key: 'actions', label: 'Thao tác' },
])

function formatServicePrice(value) {
  return servicePriceFormatter.format(value ?? 0)
}

function formatServiceDate(value) {
  if (!value) {
    return 'Chưa cập nhật'
  }

  return serviceDateFormatter.format(new Date(value))
}

function getSelectedRowClassName(service, { formModalState, selectedService, statusActionModalState }) {
  const isSelected =
    service.id === statusActionModalState.service?.id ||
    service.id === formModalState.service?.id ||
    service.id === selectedService?.id

  return isSelected
    ? 'admin-services-table__row admin-services-table__row--selected'
    : 'admin-services-table__row'
}

function getVisibleRowActions(actions) {
  return figmaRowActions.filter((actionKey) => actions.includes(actionKey))
}

function getStatusToneClassName(statusMetaItem) {
  return `admin-services-status admin-services-status--${statusMetaItem?.tone ?? 'neutral'}`
}

function getTypeSelectOptions(typeOptions) {
  return typeOptions.map((option) => ({
    ...option,
    label: option.value === 'all' ? 'Tất cả danh mục' : option.label,
  }))
}

function getStatusSelectOptions(statusOptions) {
  return statusOptions.map((option) => ({
    ...option,
    label: option.value === 'all' ? 'Trạng thái:' : option.label,
  }))
}

function AdminServicesPage() {
  const {
    actionMeta,
    closeModal,
    confirmStatusAction,
    currentRole,
    destinationOptions,
    error,
    feedback,
    filters,
    formModalState,
    getAllowedActions,
    getServiceTypeLabel,
    handleRowAction,
    loading,
    openCreateForm,
    pageNumbers,
    pagination,
    reloadServices,
    resetFilters,
    resultRange,
    selectedService,
    services,
    setCurrentPage,
    setDestinationFilter,
    setSearch,
    setStatusFilter,
    setTypeFilter,
    statusActionModalState,
    statusMeta,
    statusOptions,
    submitServiceForm,
    typeOptions,
  } = useAdminServices()
  const typeTabs = typeOptions.filter((option) => visibleTypeTabs.has(option.value))
  const typeSelectOptions = getTypeSelectOptions(typeOptions)
  const statusSelectOptions = getStatusSelectOptions(statusOptions)

  return (
    <main className="admin-services-page admin-services-page--figma">
      <header className="admin-services-page__figma-header">
        <div className="admin-services-page__figma-copy">
          <h1>Quản lý Dịch vụ</h1>
          <p>Quản lý các tour, khách sạn và dịch vụ vận chuyển trong hệ thống.</p>
        </div>

        <button className="admin-services-page__add-button" type="button" onClick={openCreateForm}>
          <PlusCircleIcon />
          <span>Thêm dịch vụ mới</span>
        </button>
      </header>

      {error ? (
        <AdminErrorState
          description={error}
          title="Không thể tải dữ liệu dịch vụ"
          action={
            <button
              className="admin-services-page__empty-action"
              disabled={loading}
              type="button"
              onClick={() => reloadServices()}
            >
              Thử lại
            </button>
          }
        />
      ) : null}

      {feedback?.message ? (
        <p
          className={`admin-services-page__feedback admin-services-page__feedback--${feedback.tone}`}
          role="status"
        >
          {feedback.message}
        </p>
      ) : null}

      <section className="admin-services-page__filter-card" aria-label="Bộ lọc dịch vụ">
        <div className="admin-services-page__tabs" role="group" aria-label="Lọc theo loại dịch vụ">
          {typeTabs.map((option) => (
            <button
              className={
                option.value === filters.type
                  ? 'admin-services-page__tab admin-services-page__tab--active'
                  : 'admin-services-page__tab'
              }
              key={option.value}
              type="button"
              aria-pressed={option.value === filters.type}
              onClick={() => setTypeFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="admin-services-page__filter-row">
          <label className="admin-services-page__search-control">
            <SearchIcon />
            <input
              aria-label="Tìm kiếm tên dịch vụ hoặc mã ID"
              placeholder="Tên dịch vụ, mã ID..."
              type="search"
              value={filters.search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="admin-services-page__select-control">
            <select
              aria-label="Danh mục dịch vụ"
              value={filters.type}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              {typeSelectOptions.map((option) => (
                <option disabled={option.disabled} key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon />
          </label>

          <label className="admin-services-page__select-control">
            <select
              aria-label="Trạng thái dịch vụ"
              value={filters.status}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {statusSelectOptions.map((option) => (
                <option disabled={option.disabled} key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon />
          </label>

          <label className="admin-services-page__select-control">
            <select
              aria-label="Điểm đến"
              value={filters.destination}
              onChange={(event) => setDestinationFilter(event.target.value)}
            >
              {destinationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon />
          </label>
        </div>
      </section>

      <section className="admin-services-table-card" aria-label="Danh sách dịch vụ">
        <div className="admin-services-table-card__scroller">
          <table className="admin-services-table">
            <thead>
              <tr>
                {serviceTableColumns.map((column) => (
                  <th key={column.key} scope="col">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }, (_, index) => (
                  <tr className="admin-services-table__row" key={index}>
                    <td colSpan={serviceTableColumns.length}>
                      <span className="admin-services-table__loading-line" />
                    </td>
                  </tr>
                ))
              ) : services.length > 0 ? (
                services.map((service) => {
                  const status = statusMeta[service.status]
                  const actions = getVisibleRowActions(getAllowedActions(service))

                  return (
                    <tr
                      className={getSelectedRowClassName(service, {
                        formModalState,
                        selectedService,
                        statusActionModalState,
                      })}
                      key={service.id}
                    >
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
                            <span className="admin-services-table__service-meta">
                              ID: {service.service_code}
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
                        <strong className="admin-services-table__price-value">
                          {formatServicePrice(service.base_price)}
                        </strong>
                      </td>
                      <td>
                        <span className={getStatusToneClassName(status)}>
                          {status?.label ?? service.status}
                        </span>
                      </td>
                      <td>
                        <span className="admin-services-table__date">
                          {formatServiceDate(service.updated_at)}
                        </span>
                      </td>
                      <td>
                        <div className="admin-services-table__actions" role="group" aria-label="Thao tác">
                          {actions.map((actionKey) => (
                            <button
                              aria-label={actionMeta[actionKey]?.label ?? actionKey}
                              className={`admin-services-table__action-button admin-services-table__action-button--${actionKey}`}
                              key={actionKey}
                              title={actionMeta[actionKey]?.label ?? actionKey}
                              type="button"
                              onClick={() => handleRowAction(service, actionKey)}
                            >
                              {serviceActionIcons[actionKey] ?? <ViewIcon />}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={serviceTableColumns.length}>
                    <AdminEmptyState
                      title="Không có dịch vụ phù hợp"
                      description="Thử đổi từ khóa, trạng thái, điểm đến hoặc loại dịch vụ để xem thêm dữ liệu."
                      action={
                        <button
                          className="admin-services-page__empty-action"
                          type="button"
                          onClick={resetFilters}
                        >
                          Đặt lại bộ lọc
                        </button>
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="admin-services-table-card__footer">
          <p className="admin-services-table-card__result">
            {pagination.total > 0
              ? `Đang hiển thị ${resultRange.start} - ${resultRange.end} trên ${pagination.total} dịch vụ`
              : 'Hiện không có kết quả để hiển thị'}
          </p>

          <nav className="admin-services-pagination" aria-label="Phân trang dịch vụ">
            <button
              aria-label="Trang trước"
              className="admin-services-pagination__button admin-services-pagination__button--arrow"
              disabled={pagination.page <= 1}
              type="button"
              onClick={() => setCurrentPage(Math.max(1, pagination.page - 1))}
            >
              <ChevronLeftIcon />
            </button>

            {pageNumbers.map((pageNumber) => (
              <button
                aria-current={pagination.page === pageNumber ? 'page' : undefined}
                className={
                  pagination.page === pageNumber
                    ? 'admin-services-pagination__button admin-services-pagination__button--active'
                    : 'admin-services-pagination__button'
                }
                key={pageNumber}
                type="button"
                onClick={() => setCurrentPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}

            <button
              aria-label="Trang sau"
              className="admin-services-pagination__button admin-services-pagination__button--arrow"
              disabled={pagination.page >= pagination.total_pages}
              type="button"
              onClick={() => setCurrentPage(Math.min(pagination.total_pages, pagination.page + 1))}
            >
              <ChevronRightIcon />
            </button>
          </nav>
        </footer>
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
