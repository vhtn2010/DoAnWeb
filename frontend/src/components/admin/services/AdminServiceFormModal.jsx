import { useEffect, useState } from 'react'
import AdminServiceTypeFields from './AdminServiceTypeFields.jsx'
import {
  adminServiceFormStatusOptions,
  adminServiceFormTypeOptions,
  buildServicePayloadFromForm,
  createServiceDetailDefaults,
  getInitialServiceFormValues,
  slugifyServiceTitle,
} from '../../../data/mockAdminServices.js'

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

  if (!values.status) {
    errors.status = 'Vui lòng chọn trạng thái.'
  }

  return errors
}

function FieldShell({ children, error, label }) {
  return (
    <label className="admin-service-modal__field">
      <span className="admin-service-modal__field-label">{label}</span>
      {children}
      {error ? <span className="admin-service-modal__field-error">{error}</span> : null}
    </label>
  )
}

function AdminServiceFormModal({ currentRole, mode, onClose, onSave, service }) {
  const [formValues, setFormValues] = useState(() => getInitialServiceFormValues(service))
  const [errors, setErrors] = useState({})
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')

  useEffect(() => {
    setFormValues(getInitialServiceFormValues(service))
    setErrors({})
    setSlugTouched(mode === 'edit')
  }, [mode, service])

  const isEditMode = mode === 'edit'
  const modalTitle = isEditMode ? 'Cập nhật dịch vụ' : 'Thêm dịch vụ'
  const submitLabel = isEditMode ? 'Lưu thay đổi' : 'Tạo dịch vụ'
  const errorList = Object.values(errors)

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

  const handleSubmit = (submitIntent) => {
    const nextErrors = validateServiceForm(formValues)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})

    const payload = buildServicePayloadFromForm(formValues, {
      currentRole,
      existingService: service,
      mode,
      submitIntent,
    })

    // TODO: replace local state update with POST/PATCH /admin/services in API integration phase.
    onSave(payload, submitIntent)
  }

  return (
    <div
      aria-modal="true"
      className="admin-service-modal"
      role="dialog"
      onClick={onClose}
    >
      <div className="admin-service-modal__dialog" onClick={(event) => event.stopPropagation()}>
        <div className="admin-service-modal__header">
          <div>
            <p className="admin-service-modal__eyebrow">Service form mock</p>
            <h2 className="admin-service-modal__title">{modalTitle}</h2>
            <p className="admin-service-modal__subtitle">
              Chuẩn bị payload cho POST/PATCH `/admin/services` và giữ toàn bộ thao tác ở local state.
            </p>
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
          {errorList.length > 0 ? (
            <div className="admin-service-modal__error-summary" role="alert">
              <strong>Vui lòng kiểm tra lại thông tin bắt buộc.</strong>
              <p>Form hiện còn {errorList.length} trường cần xử lý trước khi lưu.</p>
            </div>
          ) : null}

          <section className="admin-service-modal__section">
            <div className="admin-service-modal__section-heading">
              <h3>Thông tin chung</h3>
              <p>Các trường bám theo bảng `services` và API admin service.</p>
            </div>

            <div className="admin-service-modal__grid">
              <FieldShell error={errors.service_type} label="service_type">
                <select
                  className={`admin-service-modal__select${
                    errors.service_type ? ' admin-service-modal__input--error' : ''
                  }`}
                  name="service_type"
                  value={formValues.service_type}
                  onChange={handleCommonChange}
                >
                  {adminServiceFormTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FieldShell>

              <FieldShell error={errors.status} label="status">
                <select
                  className={`admin-service-modal__select${
                    errors.status ? ' admin-service-modal__input--error' : ''
                  }`}
                  name="status"
                  value={formValues.status}
                  onChange={handleCommonChange}
                >
                  {adminServiceFormStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FieldShell>

              <FieldShell error={errors.title} label="title">
                <input
                  className={`admin-service-modal__input${
                    errors.title ? ' admin-service-modal__input--error' : ''
                  }`}
                  name="title"
                  type="text"
                  value={formValues.title}
                  onChange={handleCommonChange}
                />
              </FieldShell>

              <FieldShell error={errors.slug} label="slug">
                <input
                  className={`admin-service-modal__input${
                    errors.slug ? ' admin-service-modal__input--error' : ''
                  }`}
                  name="slug"
                  type="text"
                  value={formValues.slug}
                  onChange={handleCommonChange}
                />
              </FieldShell>

              <FieldShell error={errors.provider_name} label="provider_name">
                <input
                  className="admin-service-modal__input"
                  name="provider_name"
                  type="text"
                  value={formValues.provider_name}
                  onChange={handleCommonChange}
                />
              </FieldShell>

              <FieldShell error={errors.location_text} label="location_text">
                <input
                  className={`admin-service-modal__input${
                    errors.location_text ? ' admin-service-modal__input--error' : ''
                  }`}
                  name="location_text"
                  type="text"
                  value={formValues.location_text}
                  onChange={handleCommonChange}
                />
              </FieldShell>

              <FieldShell error={errors.base_price} label="base_price">
                <input
                  className={`admin-service-modal__input${
                    errors.base_price ? ' admin-service-modal__input--error' : ''
                  }`}
                  name="base_price"
                  type="number"
                  value={formValues.base_price}
                  onChange={handleCommonChange}
                />
              </FieldShell>

              <FieldShell error={errors.sale_price} label="sale_price">
                <input
                  className={`admin-service-modal__input${
                    errors.sale_price ? ' admin-service-modal__input--error' : ''
                  }`}
                  name="sale_price"
                  type="number"
                  value={formValues.sale_price}
                  onChange={handleCommonChange}
                />
              </FieldShell>

              <FieldShell error={errors.currency} label="currency">
                <input
                  className="admin-service-modal__input"
                  name="currency"
                  type="text"
                  value={formValues.currency}
                  onChange={handleCommonChange}
                />
              </FieldShell>

              <FieldShell error={errors.image_url} label="image_url">
                <input
                  className="admin-service-modal__input"
                  name="image_url"
                  type="text"
                  value={formValues.image_url}
                  onChange={handleCommonChange}
                />
              </FieldShell>
            </div>

            <div className="admin-service-modal__grid admin-service-modal__grid--full">
              <FieldShell error={errors.short_description} label="short_description">
                <textarea
                  className="admin-service-modal__textarea"
                  name="short_description"
                  rows="3"
                  value={formValues.short_description}
                  onChange={handleCommonChange}
                />
              </FieldShell>

              <FieldShell error={errors.description} label="description">
                <textarea
                  className="admin-service-modal__textarea"
                  name="description"
                  rows="5"
                  value={formValues.description}
                  onChange={handleCommonChange}
                />
              </FieldShell>

              <FieldShell error={errors.cancellation_policy} label="cancellation_policy">
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

          <section className="admin-service-modal__section">
            <div className="admin-service-modal__section-heading">
              <h3>Chi tiết theo loại dịch vụ</h3>
              <p>
                Render động theo `service_type`. Với `room`, modal chỉ hiển thị note định hướng sang
                luồng quản lý phòng khách sạn.
              </p>
            </div>

            <AdminServiceTypeFields
              details={formValues.details}
              errors={errors}
              serviceType={formValues.service_type}
              onDetailChange={handleDetailChange}
            />
          </section>
        </div>

        <div className="admin-service-modal__footer">
          <button className="admin-service-modal__button admin-service-modal__button--ghost" type="button" onClick={onClose}>
            Hủy
          </button>
          <button
            className="admin-service-modal__button admin-service-modal__button--secondary"
            type="button"
            onClick={() => handleSubmit('draft')}
          >
            Lưu bản nháp
          </button>
          <button
            className="admin-service-modal__button admin-service-modal__button--primary"
            type="button"
            onClick={() => handleSubmit('save')}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminServiceFormModal
