import { useEffect, useId, useState } from 'react'
import AdminServiceTypeFields from './AdminServiceTypeFields.jsx'
import {
  ADMIN_SERVICE_FORM_STATUS_OPTIONS,
  ADMIN_SERVICE_FORM_TYPE_OPTIONS,
} from '../../../constants/adminServices.js'
import { SERVICE_STATUSES } from '../../../constants/serviceStatuses.js'
import {
  createServiceDetailDefaults,
  getAdminRoleLabel,
  getAdminServiceStatusLabel,
  getAdminServiceTypeLabel,
  getInitialServiceFormValues,
  slugifyServiceTitle,
} from '../../../mappers/adminServiceMappers.js'

const requiredFieldNames = new Set([
  'service_type',
  'title',
  'slug',
  'location_text',
  'base_price',
  'status',
])

const fieldLabels = {
  base_price: 'Giá (đ)',
  cancellation_policy: 'Chính sách hủy',
  currency: 'Tiền tệ',
  description: 'Mô tả dịch vụ',
  image_url: 'Đường dẫn hình ảnh',
  location_text: 'Điểm đến',
  provider_name: 'Nhà cung cấp',
  sale_price: 'Giá ưu đãi',
  service_type: 'Loại hình dịch vụ',
  short_description: 'Mô tả ngắn',
  slug: 'Slug',
  status: 'Trạng thái',
  title: 'Tên dịch vụ',
}

const sampleAmenities = ['Khách sạn 5*', 'Vé máy bay']

const serviceTypeLabels = Object.freeze({
  combo: 'Combo',
  flight: 'Vé máy bay',
  hotel: 'Khách sạn',
  room: 'Phòng',
  tour: 'Tour Du lịch',
  train: 'Vé tàu',
})

const serviceStatusLabels = Object.freeze({
  active: 'Đang bán',
  archived: 'Lưu trữ',
  deleted: 'Đã xóa',
  draft: 'Bản nháp',
  expired: 'Hết hạn',
  hidden: 'Tạm ẩn',
  pending_review: 'Chờ duyệt',
  sold_out: 'Hết chỗ',
})

const roleLabels = Object.freeze({
  admin: 'Quản trị viên',
  staff: 'Nhân viên điều hành',
  system_admin: 'System Admin',
})

function validateServiceForm(values) {
  const errors = {}
  const basePrice = Number(values.base_price)
  const salePrice = values.sale_price === '' ? null : Number(values.sale_price)

  if (!values.service_type) {
    errors.service_type = 'Vui lòng chọn loại dịch vụ.'
  }

  if (!values.title.trim()) {
    errors.title = 'Vui lòng nhập tên dịch vụ.'
  }

  if (!values.slug.trim()) {
    errors.slug = 'Vui lòng nhập slug.'
  }

  if (!values.location_text.trim()) {
    errors.location_text = 'Vui lòng nhập điểm đến.'
  }

  if (values.base_price === '') {
    errors.base_price = 'Vui lòng nhập giá gốc.'
  } else if (Number.isNaN(basePrice) || basePrice < 0) {
    errors.base_price = 'Giá gốc phải là số không âm.'
  }

  if (values.sale_price !== '' && (Number.isNaN(salePrice) || salePrice < 0)) {
    errors.sale_price = 'Giá ưu đãi phải là số không âm.'
  }

  if (values.sale_price !== '' && !Number.isNaN(salePrice) && salePrice > basePrice) {
    errors.sale_price = 'Giá ưu đãi không được lớn hơn giá gốc.'
  }

  if (!values.status) {
    errors.status = 'Vui lòng chọn trạng thái.'
  }

  return errors
}

function cx(...classNames) {
  return classNames.filter(Boolean).join(' ')
}

function formatFieldLabel(fieldName) {
  return fieldLabels[fieldName] ?? fieldName
}

function getStatusTone(status) {
  if (status === 'active') {
    return 'active'
  }

  if (status === 'pending_review' || status === 'expired') {
    return 'pending'
  }

  if (status === 'hidden' || status === 'sold_out') {
    return 'hidden'
  }

  if (status === 'deleted') {
    return 'deleted'
  }

  return 'draft'
}

function ModalIcon({ children }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      {children}
    </svg>
  )
}

function InfoIcon() {
  return (
    <ModalIcon>
      <path d="M12 4.5v15M4.5 12h15" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </ModalIcon>
  )
}

function ImageIcon() {
  return (
    <ModalIcon>
      <path d="M4.5 6h15v12h-15V6Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="m6.5 15.5 3.3-3.1 2.2 2 2.8-3.2 3.2 4.3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M9 9.4h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
    </ModalIcon>
  )
}

function CalendarIcon() {
  return (
    <ModalIcon>
      <path d="M6.5 4.5v3M17.5 4.5v3M4.5 9h15M5 6.5h14v13H5v-13Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </ModalIcon>
  )
}

function UploadIcon() {
  return (
    <ModalIcon>
      <path d="M12 16V5m0 0 4 4m-4-4-4 4M5 18.5h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </ModalIcon>
  )
}

function FieldShell({ children, error, help, label, required = false }) {
  return (
    <label className="admin-service-modal__field">
      <span className="admin-service-modal__field-label">
        {label}
        {required ? <span className="admin-service-modal__field-required"> *</span> : null}
      </span>
      {children}
      {help ? <span className="admin-service-modal__field-help">{help}</span> : null}
      {error ? <span className="admin-service-modal__field-error">{error}</span> : null}
    </label>
  )
}

function SectionTitle({ children, icon }) {
  return (
    <div className="admin-service-modal__figma-section-title">
      <span className="admin-service-modal__figma-section-icon">{icon}</span>
      <h3>{children}</h3>
    </div>
  )
}

function TimelinePreview() {
  return (
    <section className="admin-service-modal__section admin-service-modal__timeline-section">
      <div className="admin-service-modal__timeline-header">
        <SectionTitle icon={<CalendarIcon />}>Lịch trình chi tiết (Đối với tour du lịch)</SectionTitle>
        <button className="admin-service-modal__add-day" type="button">
          <span aria-hidden="true">+</span>
          Thêm ngày
        </button>
      </div>

      <div className="admin-service-modal__timeline">
        <span className="admin-service-modal__timeline-line" aria-hidden="true" />

        <article className="admin-service-modal__day admin-service-modal__day--active">
          <span className="admin-service-modal__day-number">1</span>
          <div className="admin-service-modal__day-card">
            <div className="admin-service-modal__day-row">
              <input
                aria-label="Tiêu đề ngày 1"
                className="admin-service-modal__day-input"
                defaultValue="Khởi hành và Thăm quan Đại Nội"
                type="text"
              />
              <input
                aria-label="Thời gian ngày 1"
                className="admin-service-modal__day-time"
                defaultValue="08:00 AM"
                type="text"
              />
            </div>
            <textarea
              aria-label="Nội dung ngày 1"
              className="admin-service-modal__day-textarea"
              defaultValue="Hướng dẫn viên đón khách tại điểm hẹn. Khởi hành tham quan Đại Nội - Hoàng cung của 13 vị vua triều Nguyễn với Ngọ Môn, Điện Thái Hòa..."
              rows="3"
            />
          </div>
        </article>

        <article className="admin-service-modal__day">
          <span className="admin-service-modal__day-number">2</span>
          <div className="admin-service-modal__day-card admin-service-modal__day-card--empty">
            <div className="admin-service-modal__day-row">
              <input
                aria-label="Tiêu đề ngày 2"
                className="admin-service-modal__day-input"
                placeholder="Tiêu đề ngày 2"
                type="text"
              />
              <input
                aria-label="Thời gian ngày 2"
                className="admin-service-modal__day-time"
                placeholder="Thời gian"
                type="text"
              />
            </div>
            <p>Nhấp để thêm chi tiết lịch trình ngày tiếp theo...</p>
          </div>
        </article>
      </div>
    </section>
  )
}

function AdminServiceFormFigmaModal({ currentRole, mode, onClose, onSave, service }) {
  const [formValues, setFormValues] = useState(() => getInitialServiceFormValues(service))
  const [errors, setErrors] = useState({})
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    setFormValues(getInitialServiceFormValues(service))
    setErrors({})
    setSlugTouched(mode === 'edit')
  }, [mode, service])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const isEditMode = mode === 'edit'
  const submitLabel = isEditMode ? 'Cập nhật Dịch vụ' : 'Tạo Dịch vụ'
  const errorList = Object.values(errors)
  const currentStatusLabel = serviceStatusLabels[formValues.status] ?? getAdminServiceStatusLabel(formValues.status)
  const currentStatusTone = getStatusTone(formValues.status)
  const serviceTypeLabel = serviceTypeLabels[formValues.service_type] ?? getAdminServiceTypeLabel(formValues.service_type)
  const roleLabel = roleLabels[currentRole] ?? getAdminRoleLabel(currentRole)
  const headerStatusOptions = ADMIN_SERVICE_FORM_STATUS_OPTIONS.filter((option) =>
    [SERVICE_STATUSES.active, SERVICE_STATUSES.hidden].includes(option.value),
  )

  const handleCommonChange = (event) => {
    const { name, value } = event.target

    setFormValues((currentValues) => {
      if (name === 'service_type') {
        return {
          ...currentValues,
          service_type: value,
          details: createServiceDetailDefaults(value),
        }
      }

      if (name === 'title') {
        const nextValues = {
          ...currentValues,
          title: value,
        }

        if (!slugTouched) {
          nextValues.slug = slugifyServiceTitle(value)
        }

        return nextValues
      }

      if (name === 'slug') {
        setSlugTouched(true)
      }

      return {
        ...currentValues,
        [name]: value,
      }
    })
  }

  const handleDetailChange = (event) => {
    const { name, value } = event.target

    setFormValues((currentValues) => ({
      ...currentValues,
      details: {
        ...currentValues.details,
        [name]: value,
      },
    }))
  }

  const handleStatusShortcut = (status) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      status,
    }))
  }

  const handleSubmit = (submitIntent) => {
    const nextErrors = validateServiceForm(formValues)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    onSave(formValues, submitIntent)
  }

  return (
    <div
      aria-modal="true"
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className="admin-service-modal admin-service-modal--figma-create"
      role="dialog"
      onClick={onClose}
    >
      <div className="admin-service-modal__dialog" onClick={(event) => event.stopPropagation()}>
        <div className="admin-service-modal__header">
          <div className="admin-service-modal__header-copy">
            <h2 className="admin-service-modal__title" id={titleId}>
              Thông tin chi tiết
            </h2>
            <p className="admin-service-modal__subtitle" id={descriptionId}>
              {isEditMode ? 'Cập nhật dịch vụ trong hệ thống.' : 'Thêm dịch vụ mới vào hệ thống quản trị.'}
            </p>
          </div>

          <div className="admin-service-modal__header-meta">
            <div className="admin-service-modal__status-toggle" role="group" aria-label="Trạng thái dịch vụ">
              <span className="admin-service-modal__status-label">Trạng thái:</span>
              <span className="admin-service-modal__status-options">
                {headerStatusOptions.map((option) => (
                  <button
                    className={cx(
                      'admin-service-modal__status-option',
                      formValues.status === option.value && 'admin-service-modal__status-option--active',
                    )}
                    key={option.value}
                    type="button"
                    aria-pressed={formValues.status === option.value}
                    onClick={() => handleStatusShortcut(option.value)}
                  >
                    {option.value === SERVICE_STATUSES.active ? 'Đang bán' : 'Tạm ẩn'}
                  </button>
                ))}
              </span>
            </div>

            <div className="admin-service-modal__status-row" aria-label="Thông tin trạng thái hiện tại">
              <span
                className={`admin-service-modal__status-badge admin-service-modal__status-badge--${currentStatusTone}`}
              >
                {currentStatusLabel}
              </span>
              <span className="admin-service-modal__role-chip">{roleLabel}</span>
              <span className="admin-service-modal__service-type-chip">{serviceTypeLabel}</span>
            </div>
          </div>

          <button
            aria-label="Đóng modal dịch vụ"
            className="admin-service-modal__close"
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="admin-service-modal__body">
          <div className="admin-service-modal__layout">
            <div className="admin-service-modal__main-column">
              {errorList.length > 0 ? (
                <div className="admin-service-modal__error-summary" role="alert">
                  <strong>Vui lòng kiểm tra lại thông tin bắt buộc.</strong>
                  <p>Form hiện còn {errorList.length} trường cần xử lý trước khi lưu.</p>
                </div>
              ) : null}

              <section className="admin-service-modal__section admin-service-modal__section--basic">
                <SectionTitle icon={<InfoIcon />}>Thông tin cơ bản</SectionTitle>

                <div className="admin-service-modal__grid admin-service-modal__grid--figma-basic">
                  <FieldShell error={errors.title} label={formatFieldLabel('title')} required={requiredFieldNames.has('title')}>
                    <input
                      className={cx('admin-service-modal__input', errors.title && 'admin-service-modal__input--error')}
                      name="title"
                      placeholder="Ví dụ: Khám phá Vẻ đẹp Tiềm ẩn Cố đô Huế"
                      type="text"
                      value={formValues.title}
                      onChange={handleCommonChange}
                    />
                  </FieldShell>

                  <FieldShell error={errors.location_text} label={formatFieldLabel('location_text')} required={requiredFieldNames.has('location_text')}>
                    <input
                      className={cx('admin-service-modal__input', errors.location_text && 'admin-service-modal__input--error')}
                      name="location_text"
                      placeholder="Thành phố, Tỉnh thành"
                      type="text"
                      value={formValues.location_text}
                      onChange={handleCommonChange}
                    />
                  </FieldShell>

                  <FieldShell error={errors.base_price} label={formatFieldLabel('base_price')} required={requiredFieldNames.has('base_price')}>
                    <div className="admin-service-modal__price-control">
                      <input
                        className={cx('admin-service-modal__input', errors.base_price && 'admin-service-modal__input--error')}
                        name="base_price"
                        placeholder="0"
                        type="number"
                        value={formValues.base_price}
                        onChange={handleCommonChange}
                      />
                      <span>VNĐ</span>
                    </div>
                  </FieldShell>

                  <FieldShell error={errors.service_type} label={formatFieldLabel('service_type')} required={requiredFieldNames.has('service_type')}>
                    <select
                      className={cx('admin-service-modal__select', errors.service_type && 'admin-service-modal__input--error')}
                      name="service_type"
                      value={formValues.service_type}
                      onChange={handleCommonChange}
                    >
                      {ADMIN_SERVICE_FORM_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {serviceTypeLabels[option.value] ?? option.label}
                        </option>
                      ))}
                    </select>
                  </FieldShell>

                  <div className="admin-service-modal__tag-field">
                    <span className="admin-service-modal__field-label">Tiện ích bao gồm</span>
                    <div className="admin-service-modal__tag-list" aria-label="Tiện ích mẫu">
                      {sampleAmenities.map((item) => (
                        <span className="admin-service-modal__tag" key={item}>
                          {item}
                          <button type="button" aria-label={`Xóa ${item}`}>×</button>
                        </span>
                      ))}
                      <button className="admin-service-modal__tag admin-service-modal__tag--add" type="button">
                        Thêm tiện ích +
                      </button>
                    </div>
                  </div>

                  <FieldShell error={errors.short_description} label={formatFieldLabel('short_description')}>
                    <textarea
                      className="admin-service-modal__textarea admin-service-modal__textarea--compact"
                      name="short_description"
                      placeholder="Mô tả tóm tắt về chuyến đi, các điểm đặc sắc và trải nghiệm khách hàng sẽ có được..."
                      rows="3"
                      value={formValues.short_description}
                      onChange={handleCommonChange}
                    />
                  </FieldShell>
                </div>
              </section>

              {formValues.service_type === 'tour' ? <TimelinePreview /> : null}

              <section className="admin-service-modal__section">
                <div className="admin-service-modal__section-heading">
                  <h3>Thông tin vận hành</h3>
                  <p>Nhóm trường nâng cao vẫn được giữ để sẵn sàng nối API POST/PATCH.</p>
                </div>

                <div className="admin-service-modal__grid">
                  <FieldShell error={errors.sale_price} help="Giá ưu đãi không được lớn hơn giá gốc." label={formatFieldLabel('sale_price')}>
                    <input
                      className={cx('admin-service-modal__input', errors.sale_price && 'admin-service-modal__input--error')}
                      name="sale_price"
                      type="number"
                      value={formValues.sale_price}
                      onChange={handleCommonChange}
                    />
                  </FieldShell>

                  <FieldShell error={errors.currency} label={formatFieldLabel('currency')}>
                    <input className="admin-service-modal__input" name="currency" type="text" value={formValues.currency} onChange={handleCommonChange} />
                  </FieldShell>

                  <FieldShell error={errors.slug} help="Slug có thể tự sinh từ tên dịch vụ." label={formatFieldLabel('slug')} required={requiredFieldNames.has('slug')}>
                    <input
                      className={cx('admin-service-modal__input', errors.slug && 'admin-service-modal__input--error')}
                      name="slug"
                      type="text"
                      value={formValues.slug}
                      onChange={handleCommonChange}
                    />
                  </FieldShell>

                  <FieldShell error={errors.status} label={formatFieldLabel('status')} required={requiredFieldNames.has('status')}>
                    <select
                      className={cx('admin-service-modal__select', errors.status && 'admin-service-modal__input--error')}
                      name="status"
                      value={formValues.status}
                      onChange={handleCommonChange}
                    >
                      {ADMIN_SERVICE_FORM_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {serviceStatusLabels[option.value] ?? option.label}
                        </option>
                      ))}
                    </select>
                  </FieldShell>

                  <FieldShell error={errors.provider_name} label={formatFieldLabel('provider_name')}>
                    <input className="admin-service-modal__input" name="provider_name" type="text" value={formValues.provider_name} onChange={handleCommonChange} />
                  </FieldShell>
                </div>
              </section>

              <section className="admin-service-modal__section">
                <div className="admin-service-modal__section-heading">
                  <h3>Thông tin chi tiết theo loại dịch vụ</h3>
                  <p>Render động theo loại dịch vụ đã chọn.</p>
                </div>

                <AdminServiceTypeFields
                  details={formValues.details}
                  errors={errors}
                  serviceType={formValues.service_type}
                  onDetailChange={handleDetailChange}
                />
              </section>

              <section className="admin-service-modal__section">
                <div className="admin-service-modal__section-heading">
                  <h3>Mô tả & chính sách</h3>
                  <p>Nội dung dài và quy định vận hành của dịch vụ.</p>
                </div>

                <div className="admin-service-modal__grid admin-service-modal__grid--full">
                  <FieldShell error={errors.description} label={formatFieldLabel('description')}>
                    <textarea
                      className="admin-service-modal__textarea"
                      name="description"
                      rows="5"
                      value={formValues.description}
                      onChange={handleCommonChange}
                    />
                  </FieldShell>

                  <FieldShell error={errors.cancellation_policy} label={formatFieldLabel('cancellation_policy')}>
                    <textarea
                      className="admin-service-modal__textarea"
                      name="cancellation_policy"
                      rows="4"
                      value={formValues.cancellation_policy}
                      onChange={handleCommonChange}
                    />
                  </FieldShell>
                </div>
              </section>
            </div>

            <aside className="admin-service-modal__side-column">
              <section className="admin-service-modal__media-card" aria-label="Hình ảnh dịch vụ">
                <SectionTitle icon={<ImageIcon />}>Hình ảnh Dịch vụ</SectionTitle>

                <div className="admin-service-modal__media-preview">
                  {formValues.image_url ? (
                    <img
                      alt={formValues.title || 'Ảnh bìa dịch vụ'}
                      className="admin-service-modal__preview-image"
                      src={formValues.image_url}
                    />
                  ) : (
                    <span className="admin-service-modal__upload-placeholder">
                      <UploadIcon />
                      Tải ảnh bìa chính
                    </span>
                  )}
                </div>

                <div className="admin-service-modal__thumb-grid" aria-hidden="true">
                  <div className="admin-service-modal__thumb-placeholder">+</div>
                  <div className="admin-service-modal__thumb-placeholder">+</div>
                </div>

                <p className="admin-service-modal__media-note">
                  Khuyến nghị: Sử dụng ảnh có độ phân giải tối thiểu 1200x800px. Hỗ trợ định dạng JPG, PNG, WEBP.
                </p>

                <FieldShell error={errors.image_url} label={formatFieldLabel('image_url')}>
                  <input
                    className="admin-service-modal__input"
                    name="image_url"
                    placeholder="https://..."
                    type="text"
                    value={formValues.image_url}
                    onChange={handleCommonChange}
                  />
                </FieldShell>
              </section>

              <div className="admin-service-modal__side-actions">
                <button className="admin-service-modal__button admin-service-modal__button--primary" type="button" onClick={() => handleSubmit('save')}>
                  {submitLabel}
                </button>
                <button className="admin-service-modal__button admin-service-modal__button--secondary" type="button" onClick={() => handleSubmit('draft')}>
                  Lưu bản nháp
                </button>
              </div>
            </aside>
          </div>
        </div>

        <div className="admin-service-modal__footer">
          <button className="admin-service-modal__button admin-service-modal__button--ghost" type="button" onClick={onClose}>
            Hủy
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminServiceFormFigmaModal
