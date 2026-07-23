import { useCallback, useEffect, useId, useState } from 'react'
import AdminTourItinerarySection from './AdminTourItinerarySection.jsx'
import AdminServiceTypeFields from './AdminServiceTypeFields.jsx'
import { uploadServiceImageAsset } from '../../../adapters/api/uploadApiAdapter.js'
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

const ADMIN_SERVICE_TOAST_DURATION_MS = 3500
const SECONDARY_SERVICE_IMAGE_SLOT_COUNT = 4

const requiredFieldNames = new Set([
  'service_type',
  'title',
  'slug',
  'location_text',
  'base_price',
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

const acceptedServiceImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

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

  return errors
}

function cx(...classNames) {
  return classNames.filter(Boolean).join(' ')
}

function formatFieldLabel(fieldName) {
  return fieldLabels[fieldName] ?? fieldName
}

function getSecondaryServiceImages(service) {
  const emptySlots = Array.from({ length: SECONDARY_SERVICE_IMAGE_SLOT_COUNT }, () => '')

  if (!Array.isArray(service?.images)) {
    return emptySlots
  }

  const secondaryImageUrls = service.images
    .filter((image) => image && !image.is_primary)
    .map((image) => image.image_url)
    .filter(Boolean)
    .slice(0, SECONDARY_SERVICE_IMAGE_SLOT_COUNT)

  return emptySlots.map((_, index) => secondaryImageUrls[index] ?? '')
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

function AdminServiceFormFigmaModal({ currentRole, mode, onClose, onSave, service }) {
  const [formValues, setFormValues] = useState(() => getInitialServiceFormValues(service))
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mediaFeedback, setMediaFeedback] = useState('')
  const [mediaFeedbackTone, setMediaFeedbackTone] = useState('success')
  const [thumbImageUrls, setThumbImageUrls] = useState(() => getSecondaryServiceImages(service))
  const [uploadingSlot, setUploadingSlot] = useState('')
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')
  const [submitTone, setSubmitTone] = useState('error')
  const [submitMessage, setSubmitMessage] = useState('')
  const titleId = useId()
  const descriptionId = useId()
  const coverImageInputId = useId()
  const thumbInputIdBase = useId()

  const handleRequestClose = () => {
    if (isSubmitting) {
      return
    }

    onClose()
  }

  const handleDismissToast = useCallback(() => {
    setSubmitMessage('')
  }, [])

  useEffect(() => {
    setFormValues(getInitialServiceFormValues(service))
    setErrors({})
    setIsSubmitting(false)
    setMediaFeedback('')
    setMediaFeedbackTone('success')
    setThumbImageUrls(getSecondaryServiceImages(service))
    setUploadingSlot('')
    setSlugTouched(mode === 'edit')
    setSubmitTone('error')
    setSubmitMessage('')
  }, [mode, service])

  useEffect(() => {
    if (!submitMessage) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      handleDismissToast()
    }, ADMIN_SERVICE_TOAST_DURATION_MS)

    return () => window.clearTimeout(timeoutId)
  }, [handleDismissToast, submitMessage])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const handleEscape = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isSubmitting, onClose])

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
  const formStatusOptions = ADMIN_SERVICE_FORM_STATUS_OPTIONS
  const statusHelp = 'Chọn trạng thái hiển thị cho dịch vụ.'
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
    if (isSubmitting) {
      return
    }

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

  const handleDetailValueChange = (name, value) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      details: {
        ...currentValues.details,
        [name]: value,
      },
    }))
  }

  const handleImageFileChange = async (event, slot) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!acceptedServiceImageTypes.has(file.type)) {
      setMediaFeedback('Vui lòng chọn ảnh JPG, PNG hoặc WEBP.')
      setMediaFeedbackTone('error')
      return
    }

    setMediaFeedback('')
    setMediaFeedbackTone('success')
    setUploadingSlot(slot)

    try {
      const response = await uploadServiceImageAsset(file)
      const nextImageUrl = response?.data?.asset_url

      if (!nextImageUrl) {
        throw new Error('Không nhận được đường dẫn ảnh sau khi tải lên.')
      }

      if (slot === 'cover') {
        setFormValues((currentValues) => ({
          ...currentValues,
          image_url: nextImageUrl,
        }))
      } else {
        const thumbIndex = Number(slot.replace('thumb-', ''))

        setThumbImageUrls((currentImageUrls) =>
          currentImageUrls.map((imageUrl, index) =>
            index === thumbIndex ? nextImageUrl : imageUrl,
          ),
        )
      }

      setMediaFeedback(`Đã tải ảnh "${file.name}" lên thành công.`)
      setMediaFeedbackTone('success')
    } catch (error) {
      setMediaFeedback(error?.message || 'Không thể tải ảnh lên lúc này.')
      setMediaFeedbackTone('error')
    } finally {
      setUploadingSlot('')
    }
  }

  const handleSubmit = async (submitIntent) => {
    if (isSubmitting) {
      return
    }

    const nextErrors = validateServiceForm(formValues)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setSubmitTone('error')
      setSubmitMessage('Vui lòng kiểm tra lại các trường bắt buộc trước khi lưu.')
      return
    }

    setErrors({})
    setSubmitTone('error')
    setSubmitMessage('')
    setIsSubmitting(true)

    try {
      const result = await onSave(
        {
          ...formValues,
          gallery_image_urls: thumbImageUrls.filter(Boolean),
        },
        submitIntent,
      )

      if (result?.success) {
        if (result?.data) {
          setFormValues(getInitialServiceFormValues(result.data))
          setSlugTouched(true)
        }

        setErrors({})
        setSubmitTone('success')
        setSubmitMessage(result?.message || 'Đã lưu dịch vụ thành công.')
        return
      }

      if (!result?.success) {
        if (result?.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
          setErrors(result.fieldErrors)
        }

        setSubmitTone('error')
        setSubmitMessage(result?.message || 'Chưa thể lưu dịch vụ. Vui lòng thử lại.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      aria-modal="true"
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className="admin-service-modal admin-service-modal--figma-create"
      role="dialog"
      onClick={handleRequestClose}
    >
      <div
        aria-busy={isSubmitting}
        className="admin-service-modal__dialog"
        onClick={(event) => event.stopPropagation()}
      >
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
                    disabled={isSubmitting}
                    key={option.value}
                    type="button"
                    aria-pressed={formValues.status === option.value}
                    title={statusHelp}
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
            disabled={isSubmitting}
            type="button"
            onClick={handleRequestClose}
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

              {formValues.service_type === 'tour' ? (
                <AdminTourItinerarySection
                  error={errors['details.itinerary']}
                  itinerary={formValues.details.itinerary}
                  onChange={(nextItinerary) => handleDetailValueChange('itinerary', nextItinerary)}
                />
              ) : null}

              <section className="admin-service-modal__section">
                <div className="admin-service-modal__section-heading">
                  <h3>Thông tin vận hành</h3>
                  <p>Cấu hình giá ưu đãi, nhà cung cấp và thông tin nhận diện dịch vụ.</p>
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

                  <FieldShell error={errors.status} help={statusHelp} label={formatFieldLabel('status')}>
                    <select
                      className={cx('admin-service-modal__select', errors.status && 'admin-service-modal__input--error')}
                      disabled={isSubmitting}
                      name="status"
                      value={formValues.status}
                      onChange={handleCommonChange}
                    >
                      {formStatusOptions.map((option) => (
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
                  <p>Các trường bên dưới thay đổi theo loại dịch vụ đã chọn.</p>
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

                <label
                  className={cx(
                    'admin-service-modal__media-preview',
                    uploadingSlot && 'admin-service-modal__media-upload--disabled',
                  )}
                  htmlFor={coverImageInputId}
                >
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
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    className="admin-service-modal__file-input"
                    disabled={isSubmitting || Boolean(uploadingSlot)}
                    id={coverImageInputId}
                    type="file"
                    onChange={(event) => handleImageFileChange(event, 'cover')}
                  />
                  {uploadingSlot === 'cover' ? (
                    <span className="admin-service-modal__uploading" role="status">
                      Đang tải ảnh...
                    </span>
                  ) : null}
                </label>

                <div className="admin-service-modal__thumb-grid">
                  {thumbImageUrls.map((imageUrl, index) => {
                    const thumb = {
                      id: `${thumbInputIdBase}-thumb-${index}`,
                      slot: `thumb-${index}`,
                    }

                    return (
                      <label
                      className={cx(
                        imageUrl
                          ? 'admin-service-modal__thumb-preview'
                          : 'admin-service-modal__thumb-placeholder',
                        uploadingSlot && 'admin-service-modal__media-upload--disabled',
                      )}
                      htmlFor={thumb.id}
                      key={thumb.slot}
                    >
                      {imageUrl ? (
                        <img
                          alt={`Ảnh phụ dịch vụ ${index + 1}`}
                          className="admin-service-modal__preview-image"
                          src={imageUrl}
                        />
                      ) : (
                        '+'
                      )}
                      <input
                        accept="image/jpeg,image/png,image/webp"
                        className="admin-service-modal__file-input"
                        disabled={isSubmitting || Boolean(uploadingSlot)}
                        id={thumb.id}
                        type="file"
                        onChange={(event) => handleImageFileChange(event, thumb.slot)}
                      />
                      {uploadingSlot === thumb.slot ? (
                        <span className="admin-service-modal__uploading admin-service-modal__uploading--thumb" role="status">
                          Đang tải...
                        </span>
                      ) : null}
                      </label>
                    )
                  })}
                </div>

                <p className="admin-service-modal__media-note">
                  Khuyến nghị: Sử dụng ảnh có độ phân giải tối thiểu 1200x800px. Hỗ trợ định dạng JPG, PNG, WEBP.
                </p>

                {mediaFeedback ? (
                  <p
                    className={`admin-service-modal__media-feedback admin-service-modal__media-feedback--${mediaFeedbackTone}`}
                    role={mediaFeedbackTone === 'error' ? 'alert' : 'status'}
                  >
                    {mediaFeedback}
                  </p>
                ) : null}

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
            </aside>
          </div>
        </div>

        <div className="admin-service-modal__footer">
          <div className="admin-service-modal__side-actions admin-service-modal__side-actions--footer">
            <button
              className="admin-service-modal__button admin-service-modal__button--secondary"
              disabled={isSubmitting}
              type="button"
              onClick={() => handleSubmit('draft')}
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu bản nháp'}
            </button>
            <button
              className="admin-service-modal__button admin-service-modal__button--primary"
              disabled={isSubmitting}
              type="button"
              onClick={() => handleSubmit('save')}
            >
              {isSubmitting ? 'Đang lưu...' : submitLabel}
            </button>
          </div>
        </div>
      </div>

        {submitMessage ? (
          <div
            aria-live="polite"
            className={cx(
              'admin-service-modal__toast',
              submitTone === 'success'
                ? 'admin-service-modal__toast--success'
                : 'admin-service-modal__toast--error',
            )}
            role={submitTone === 'success' ? 'status' : 'alert'}
          >
            <button
              aria-label="Đóng thông báo"
              className="admin-service-modal__toast-close"
              type="button"
              onClick={handleDismissToast}
            >
              <svg aria-hidden="true" viewBox="0 0 16 16">
                <path
                  d="m4 4 8 8M12 4 4 12"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </button>
            <strong>
              {submitTone === 'success'
                ? 'Đã lưu thành công.'
                : 'Chưa thể hoàn tất thao tác lưu.'}
            </strong>
            <p>{submitMessage}</p>
            <div className="admin-service-modal__toast-progress" aria-hidden="true">
              <span className="admin-service-modal__toast-progress-bar" />
            </div>
          </div>
        ) : null}
    </div>
  )
}

export default AdminServiceFormFigmaModal
