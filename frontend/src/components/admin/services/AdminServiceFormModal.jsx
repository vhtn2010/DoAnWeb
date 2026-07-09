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
    errors.location_text = 'Vui lòng nhập địa điểm.'
  }

  if (values.base_price === '') {
    errors.base_price = 'Vui lòng nhập giá gốc.'
  } else if (Number.isNaN(basePrice) || basePrice < 0) {
    errors.base_price = 'Giá gốc phải là số không âm.'
  }

  if (values.sale_price !== '' && (Number.isNaN(salePrice) || salePrice < 0)) {
    errors.sale_price = 'Giá khuyến mãi phải là số không âm.'
  }

  if (values.sale_price !== '' && !Number.isNaN(salePrice) && salePrice > basePrice) {
    errors.sale_price = 'Giá khuyến mãi không được lớn hơn giá gốc.'
  }

  if (!values.status) {
    errors.status = 'Vui lòng chọn trạng thái.'
  }

  return errors
}

const requiredFieldNames = new Set([
  'service_type',
  'title',
  'slug',
  'location_text',
  'base_price',
  'status',
])

const fieldLabels = {
  service_type: 'Loại dịch vụ',
  title: 'Tên dịch vụ',
  slug: 'Slug',
  short_description: 'Mô tả ngắn',
  description: 'Mô tả dịch vụ',
  provider_name: 'Nhà cung cấp',
  location_text: 'Địa điểm',
  base_price: 'Giá gốc',
  sale_price: 'Giá ưu đãi',
  currency: 'Tiền tệ',
  status: 'Trạng thái',
  cancellation_policy: 'Chính sách hủy',
  image_url: 'Đường dẫn hình ảnh',
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

function AdminServiceFormModal({ currentRole, mode, onClose, onSave, service }) {
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
  const modalTitle = isEditMode ? 'Cập nhật dịch vụ' : 'Thêm dịch vụ'
  const submitLabel = isEditMode ? 'Lưu thay đổi' : 'Tạo dịch vụ'
  const errorList = Object.values(errors)
  const currentStatusLabel = getAdminServiceStatusLabel(formValues.status)
  const currentStatusTone = getStatusTone(formValues.status)
  const serviceTypeLabel = getAdminServiceTypeLabel(formValues.service_type)
  const roleLabel = getAdminRoleLabel(currentRole)
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

  const handleStatusShortcut = (status) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      status,
    }))
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
      className="admin-service-modal"
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
              {modalTitle} trong bố cục quản trị dịch vụ, giữ toàn bộ thao tác ở local state để sẵn sàng nối POST/PATCH `/admin/services`.
            </p>
          </div>

          <div className="admin-service-modal__header-meta">
            <div className="admin-service-modal__status-toggle" role="group" aria-label="Trạng thái dịch vụ">
              <span className="admin-service-modal__status-label">Trạng thái:</span>
              <span className="admin-service-modal__status-options">
                {headerStatusOptions.map((option) => (
                  <button
                    className={
                      formValues.status === option.value
                        ? 'admin-service-modal__status-option admin-service-modal__status-option--active'
                        : 'admin-service-modal__status-option'
                    }
                    key={option.value}
                    type="button"
                    aria-pressed={formValues.status === option.value}
                    onClick={() => handleStatusShortcut(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </span>
            </div>
            <div className="admin-service-modal__status-row">
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
                <div className="admin-service-modal__section-heading">
                  <h3>Thông tin cơ bản</h3>
                  <p>{service?.service_code ?? 'Tạo mới trên local state'} · {serviceTypeLabel}</p>
                </div>

                <div className="admin-service-modal__grid">
                  <FieldShell error={errors.title} label={formatFieldLabel('title')} required={requiredFieldNames.has('title')}>
                    <input className={`admin-service-modal__input${errors.title ? ' admin-service-modal__input--error' : ''}`} name="title" type="text" value={formValues.title} onChange={handleCommonChange} />
                  </FieldShell>

                  <FieldShell error={errors.location_text} label={formatFieldLabel('location_text')} required={requiredFieldNames.has('location_text')}>
                    <input className={`admin-service-modal__input${errors.location_text ? ' admin-service-modal__input--error' : ''}`} name="location_text" type="text" value={formValues.location_text} onChange={handleCommonChange} />
                  </FieldShell>

                  <FieldShell error={errors.base_price} label={formatFieldLabel('base_price')} required={requiredFieldNames.has('base_price')}>
                    <input className={`admin-service-modal__input${errors.base_price ? ' admin-service-modal__input--error' : ''}`} name="base_price" type="number" value={formValues.base_price} onChange={handleCommonChange} />
                  </FieldShell>

                  <FieldShell error={errors.service_type} label={formatFieldLabel('service_type')} required={requiredFieldNames.has('service_type')}>
                    <select className={`admin-service-modal__select${errors.service_type ? ' admin-service-modal__input--error' : ''}`} name="service_type" value={formValues.service_type} onChange={handleCommonChange}>
                      {ADMIN_SERVICE_FORM_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FieldShell>

                  <FieldShell error={errors.sale_price} help="Giá ưu đãi không được lớn hơn giá gốc." label={formatFieldLabel('sale_price')}>
                    <input className={`admin-service-modal__input${errors.sale_price ? ' admin-service-modal__input--error' : ''}`} name="sale_price" type="number" value={formValues.sale_price} onChange={handleCommonChange} />
                  </FieldShell>

                  <FieldShell error={errors.currency} label={formatFieldLabel('currency')}>
                    <input className="admin-service-modal__input" name="currency" type="text" value={formValues.currency} onChange={handleCommonChange} />
                  </FieldShell>

                  <FieldShell error={errors.slug} help="Slug có thể tự sinh từ tên dịch vụ." label={formatFieldLabel('slug')} required={requiredFieldNames.has('slug')}>
                    <input className={`admin-service-modal__input${errors.slug ? ' admin-service-modal__input--error' : ''}`} name="slug" type="text" value={formValues.slug} onChange={handleCommonChange} />
                  </FieldShell>

                  <FieldShell error={errors.status} label={formatFieldLabel('status')} required={requiredFieldNames.has('status')}>
                    <select className={`admin-service-modal__select${errors.status ? ' admin-service-modal__input--error' : ''}`} name="status" value={formValues.status} onChange={handleCommonChange}>
                      {ADMIN_SERVICE_FORM_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FieldShell>

                  <FieldShell error={errors.short_description} label={formatFieldLabel('short_description')}>
                    <textarea className="admin-service-modal__textarea admin-service-modal__textarea--compact" name="short_description" rows="3" value={formValues.short_description} onChange={handleCommonChange} />
                  </FieldShell>

                  <FieldShell error={errors.provider_name} label={formatFieldLabel('provider_name')}>
                    <input className="admin-service-modal__input" name="provider_name" type="text" value={formValues.provider_name} onChange={handleCommonChange} />
                  </FieldShell>
                </div>
              </section>

              <section className="admin-service-modal__section">
                <div className="admin-service-modal__section-heading">
                  <h3>Thông tin chi tiết theo loại dịch vụ</h3>
                  <p>Render động theo `service_type`, giữ nguyên dữ liệu chi tiết hiện có.</p>
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
                  <p>Nhóm nội dung dài và quy định vận hành của dịch vụ.</p>
                </div>

                <div className="admin-service-modal__grid admin-service-modal__grid--full">
                  <FieldShell error={errors.description} label={formatFieldLabel('description')}>
                    <textarea className="admin-service-modal__textarea" name="description" rows="5" value={formValues.description} onChange={handleCommonChange} />
                  </FieldShell>

                  <FieldShell error={errors.cancellation_policy} label={formatFieldLabel('cancellation_policy')}>
                    <textarea className="admin-service-modal__textarea" name="cancellation_policy" rows="4" value={formValues.cancellation_policy} onChange={handleCommonChange} />
                  </FieldShell>
                </div>
              </section>
            </div>

            <aside className="admin-service-modal__side-column">
              <section className="admin-service-modal__media-card" aria-label="Hình ảnh dịch vụ">
                <div className="admin-service-modal__media-heading">
                  <h3>Hình ảnh Dịch vụ</h3>
                  <p>Ảnh chính hiển thị trong danh sách và trang chi tiết.</p>
                </div>

                <div className="admin-service-modal__media-preview">
                  {formValues.image_url ? (
                    <img
                      alt={formValues.title || 'Service preview'}
                      className="admin-service-modal__preview-image"
                      src={formValues.image_url}
                    />
                  ) : (
                    <span>Chưa có ảnh</span>
                  )}
                </div>

                <div className="admin-service-modal__thumb-grid" aria-hidden="true">
                  <div className="admin-service-modal__thumb-preview">
                    {formValues.image_url ? (
                      <img
                        alt=""
                        className="admin-service-modal__preview-image"
                        src={formValues.image_url}
                      />
                    ) : null}
                  </div>
                  <div className="admin-service-modal__thumb-placeholder">+</div>
                </div>

                <FieldShell error={errors.image_url} help="Dán URL ảnh tối thiểu 1200x800px để xem preview." label={formatFieldLabel('image_url')}>
                  <input className="admin-service-modal__input" name="image_url" type="text" value={formValues.image_url} onChange={handleCommonChange} />
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

export default AdminServiceFormModal
