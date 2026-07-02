import { useState } from 'react'
import AdminServiceFormModal from '../../components/admin/services/AdminServiceFormModal.jsx'
import {
  adminServiceStatusOptions,
  adminServiceTypeOptions,
  mockAdminServices,
} from '../../data/mockAdminServices.js'

const currentRole = 'admin' // staff | admin | system_admin
const pageSize = 4

const sortOptions = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'price_low', label: 'Giá thấp nhất' },
  { value: 'price_high', label: 'Giá cao nhất' },
]

const serviceTypeLabels = {
  tour: 'Tour',
  hotel: 'Khách sạn',
  room: 'Phòng',
  flight: 'Chuyến bay',
  train: 'Tàu hỏa',
  combo: 'Combo',
}

const statusMeta = {
  draft: { label: 'Bản nháp', tone: 'draft' },
  pending_review: { label: 'Chờ duyệt', tone: 'pending' },
  active: { label: 'Đang bán', tone: 'active' },
  hidden: { label: 'Tạm ẩn', tone: 'hidden' },
  sold_out: { label: 'Hết chỗ', tone: 'sold-out' },
  expired: { label: 'Hết hạn', tone: 'expired' },
  archived: { label: 'Lưu trữ', tone: 'archived' },
  deleted: { label: 'Đã xóa', tone: 'deleted' },
}

const summaryCardConfig = [
  {
    key: 'total',
    label: 'Tổng dịch vụ',
    tone: 'primary',
    getValue: (services) => services.length,
    getHelper: () => 'Toàn bộ dữ liệu mock sẵn sàng nối API',
  },
  {
    key: 'active',
    label: 'Đang hiển thị',
    tone: 'success',
    getValue: (services) => services.filter((service) => service.status === 'active').length,
    getHelper: () => 'Dịch vụ có thể hiển thị ở public /services',
  },
  {
    key: 'pending_review',
    label: 'Chờ duyệt',
    tone: 'warning',
    getValue: (services) =>
      services.filter((service) => service.status === 'pending_review').length,
    getHelper: () => 'Sẵn sàng cho action duyệt hoặc từ chối',
  },
  {
    key: 'limited',
    label: 'Tạm ẩn / hết chỗ',
    tone: 'neutral',
    getValue: (services) =>
      services.filter((service) => ['hidden', 'sold_out'].includes(service.status)).length,
    getHelper: () => 'Theo dõi nhóm cần mở bán lại',
  },
]

const actionMeta = {
  view: { label: 'Xem', variant: 'ghost', message: 'Mở chi tiết dịch vụ' },
  edit: { label: 'Sửa', variant: 'ghost', message: 'Mở form chỉnh sửa' },
  submit_review: {
    label: 'Gửi duyệt',
    variant: 'primary',
    message: 'Gửi dịch vụ lên trạng thái chờ duyệt',
  },
  approve: { label: 'Duyệt', variant: 'success', message: 'Duyệt dịch vụ' },
  reject: { label: 'Từ chối', variant: 'danger', message: 'Từ chối yêu cầu duyệt' },
  hide: { label: 'Ẩn', variant: 'warning', message: 'Chuyển dịch vụ sang trạng thái hidden' },
  restore: { label: 'Khôi phục', variant: 'secondary', message: 'Khôi phục về trạng thái phù hợp' },
}

const numberFormatter = new Intl.NumberFormat('vi-VN')

function formatCurrency(amount, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDateTime(value) {
  if (!value) {
    return 'Chưa cập nhật'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getCurrentPrice(service) {
  return service.sale_price ?? service.base_price
}

function getActionKeys(service, role) {
  const actions = ['view', 'edit']

  if (role === 'staff') {
    if (service.status === 'draft') {
      actions.push('submit_review')
    }

    return actions
  }

  if (role === 'admin') {
    if (service.status === 'pending_review') {
      actions.push('approve', 'reject')
    }

    if (service.status === 'active') {
      actions.push('hide')
    }

    if (['hidden', 'archived'].includes(service.status)) {
      actions.push('restore')
    }

    return actions
  }

  if (service.status === 'draft') {
    actions.push('submit_review')
  }

  if (service.status === 'pending_review') {
    actions.push('approve', 'reject')
  }

  if (service.status === 'active') {
    actions.push('hide')
  }

  if (['hidden', 'archived'].includes(service.status)) {
    actions.push('restore')
  }

  return actions
}

function getServiceDetailSummary(service) {
  if (service.service_type === 'tour') {
    return `${service.details.duration_days ?? '-'}N${service.details.duration_nights ?? '-'}Đ • ${service.details.transport_type ?? 'n/a'}`
  }

  if (service.service_type === 'hotel') {
    return `${service.details.star_rating ?? '-'} sao • ${service.details.address ?? service.provider_name}`
  }

  if (service.service_type === 'flight') {
    return `${service.details.airline_name ?? service.provider_name} • ${service.details.flight_number ?? 'n/a'}`
  }

  if (service.service_type === 'train') {
    return `Số tàu ${service.details.train_number ?? 'n/a'}`
  }

  if (service.service_type === 'combo') {
    return `${Array.isArray(service.details.combo_items) ? service.details.combo_items.length : 0} hạng mục trong combo`
  }

  return service.provider_name
}

function AdminServicesPage() {
  const [services, setServices] = useState(mockAdminServices)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedSort, setSelectedSort] = useState('newest')
  const [selectedServiceId, setSelectedServiceId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'add',
    service: null,
  })
  const [feedbackMessage, setFeedbackMessage] = useState(
    'Các thao tác trên màn hình này hiện là UI mock, sẵn sàng thay bằng tích hợp Admin Service API.'
  )

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const filteredServices = [...services]
    .filter((service) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [service.service_code, service.title, service.location_text].some((value) =>
          value.toLowerCase().includes(normalizedQuery)
        )

      const matchesType = selectedType === 'all' || service.service_type === selectedType
      const matchesStatus = selectedStatus === 'all' || service.status === selectedStatus

      return matchesQuery && matchesType && matchesStatus
    })
    .sort((serviceA, serviceB) => {
      if (selectedSort === 'oldest') {
        return new Date(serviceA.updated_at) - new Date(serviceB.updated_at)
      }

      if (selectedSort === 'price_low') {
        return getCurrentPrice(serviceA) - getCurrentPrice(serviceB)
      }

      if (selectedSort === 'price_high') {
        return getCurrentPrice(serviceB) - getCurrentPrice(serviceA)
      }

      return new Date(serviceB.updated_at) - new Date(serviceA.updated_at)
    })

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStart = (safeCurrentPage - 1) * pageSize
  const visibleServices = filteredServices.slice(pageStart, pageStart + pageSize)
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)
  const summaryCards = summaryCardConfig.map((card) => ({
    ...card,
    value: card.getValue(services),
    helper: card.getHelper(services),
  }))

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedType('all')
    setSelectedStatus('all')
    setSelectedSort('newest')
    setCurrentPage(1)
  }

  const handleMockAction = (service, actionKey) => {
    if (actionKey === 'edit') {
      setSelectedServiceId(service.id)
      setModalState({
        isOpen: true,
        mode: 'edit',
        service,
      })
      return
    }

    setSelectedServiceId(service.id)
    setFeedbackMessage(
      `${actionMeta[actionKey].message} cho ${service.service_code} chỉ là thao tác mô phỏng, chưa gọi API.`
    )
  }

  const handleAddService = () => {
    setSelectedServiceId(null)
    setModalState({
      isOpen: true,
      mode: 'add',
      service: null,
    })
  }

  const handleCloseModal = () => {
    setModalState((currentState) => ({
      ...currentState,
      isOpen: false,
    }))
  }

  const handleSaveService = (nextService, submitIntent) => {
    if (modalState.mode === 'edit') {
      setServices((currentServices) =>
        currentServices.map((service) => (service.id === nextService.id ? nextService : service))
      )
      setSelectedServiceId(nextService.id)
      setFeedbackMessage('Đã cập nhật dịch vụ.')
    } else {
      setServices((currentServices) => [nextService, ...currentServices])
      setSelectedServiceId(nextService.id)
      setCurrentPage(1)
      setFeedbackMessage(
        submitIntent === 'draft' || nextService.status === 'draft'
          ? 'Đã tạo bản nháp dịch vụ.'
          : 'Đã tạo dịch vụ.'
      )
    }

    setModalState({
      isOpen: false,
      mode: 'add',
      service: null,
    })
  }

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

        <button className="admin-services-page__add-button" type="button" onClick={handleAddService}>
          Thêm dịch vụ
        </button>
      </section>

      <section className="admin-services-page__meta-bar" aria-label="Trạng thái mock">
        <div className="admin-services-page__role-pill">
          Role mock: <strong>{currentRole}</strong>
        </div>
        <p className="admin-services-page__feedback" role="status">
          {feedbackMessage}
        </p>
      </section>

      <section className="admin-services-page__filters admin-services-card" aria-label="Bộ lọc dịch vụ">
        <div className="admin-services-page__filter-header">
          <div>
            <h2 className="admin-services-page__section-title">Bộ lọc danh sách</h2>
            <p className="admin-services-page__section-copy">
              Lọc trên frontend state theo dữ liệu mock, sẵn sàng nối query `type`, `status`, `q`
              và `sort`.
            </p>
          </div>

          <button className="admin-services-page__reset-button" type="button" onClick={handleResetFilters}>
            Đặt lại
          </button>
        </div>

        <div className="admin-services-page__type-chips" role="group" aria-label="Lọc theo loại dịch vụ">
          {adminServiceTypeOptions.map((option) => (
            <button
              key={option.value}
              className={`admin-services-page__type-chip ${
                selectedType === option.value ? 'admin-services-page__type-chip--active' : ''
              }`}
              type="button"
              onClick={() => {
                setSelectedType(option.value)
                setCurrentPage(1)
              }}
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
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                  setCurrentPage(1)
                }}
              />

              {searchQuery ? (
                <button
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="admin-services-page__clear-search"
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setCurrentPage(1)
                  }}
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
              value={selectedStatus}
              onChange={(event) => {
                setSelectedStatus(event.target.value)
                setCurrentPage(1)
              }}
            >
              {adminServiceStatusOptions.map((option) => (
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
              value={selectedSort}
              onChange={(event) => {
                setSelectedSort(event.target.value)
                setCurrentPage(1)
              }}
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
              Hiển thị {numberFormatter.format(filteredServices.length)} kết quả phù hợp sau khi lọc.
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
              {visibleServices.length > 0 ? (
                visibleServices.map((service) => {
                  const status = statusMeta[service.status]

                  return (
                    <tr
                      className={
                        selectedServiceId === service.id
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
                          {serviceTypeLabels[service.service_type]}
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
                          className={`admin-services-status admin-services-status--${status.tone}`}
                        >
                          <span aria-hidden="true" className="admin-services-status__dot" />
                          {status.label}
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
                          {getActionKeys(service, currentRole).map((actionKey) => (
                            <button
                              key={actionKey}
                              className={`admin-services-table__action admin-services-table__action--${actionMeta[actionKey].variant}`}
                              type="button"
                              onClick={() => handleMockAction(service, actionKey)}
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
                        onClick={handleResetFilters}
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
            {filteredServices.length > 0
              ? `Hiển thị ${pageStart + 1} - ${Math.min(pageStart + pageSize, filteredServices.length)} trên ${numberFormatter.format(filteredServices.length)} dịch vụ`
              : 'Hiện không có kết quả để hiển thị'}
          </p>

          {filteredServices.length > 0 ? (
            <div className="admin-services-pagination" aria-label="Phân trang dịch vụ">
              <button
                className="admin-services-pagination__button"
                disabled={safeCurrentPage === 1}
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Trước
              </button>

              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  className={`admin-services-pagination__button ${
                    safeCurrentPage === pageNumber
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
                disabled={safeCurrentPage === totalPages}
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                Sau
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {modalState.isOpen ? (
        <AdminServiceFormModal
          currentRole={currentRole}
          mode={modalState.mode}
          service={modalState.service}
          onClose={handleCloseModal}
          onSave={handleSaveService}
        />
      ) : null}
    </main>
  )
}

export default AdminServicesPage
