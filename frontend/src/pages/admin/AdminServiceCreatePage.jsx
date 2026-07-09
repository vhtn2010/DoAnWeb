import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  AdminButton,
  AdminField,
  AdminFormPanel,
  AdminInput,
  AdminPageHeader,
  AdminSelect,
  AdminStatusBadge,
  AdminTextarea,
} from '../../components/admin/ui/index.js'
import { buildAdminPath } from '../../constants/adminRoutes.js'
import { ADMIN_SERVICE_CREATE_INITIAL_FORM } from '../../fixtures/adminServiceWorkflow.fixtures.js'

function parsePrice(value) {
  return Number(String(value).replace(/[^\d]/g, ''))
}

function validateForm(values) {
  const errors = {}

  if (!values.title.trim()) {
    errors.title = 'Nhập tên dịch vụ.'
  }

  if (!values.destination.trim()) {
    errors.destination = 'Nhập điểm đến.'
  }

  if (parsePrice(values.price) <= 0) {
    errors.price = 'Giá phải lớn hơn 0.'
  }

  if (!values.description.trim()) {
    errors.description = 'Nhập mô tả dịch vụ.'
  }

  return errors
}

function AdminServiceCreatePage() {
  const navigate = useNavigate()
  const { currentRole } = useOutletContext()
  const [formValues, setFormValues] = useState(ADMIN_SERVICE_CREATE_INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [feedback, setFeedback] = useState('')
  const [coverFileName, setCoverFileName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const statusTone = formValues.status === 'active' ? 'success' : 'neutral'
  const statusLabel = formValues.status === 'active' ? 'Đang bán' : 'Tạm ẩn'

  function updateField(fieldName, value) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [fieldName]: value,
    }))
    setErrors((currentErrors) => {
      if (!currentErrors[fieldName]) {
        return currentErrors
      }

      const nextErrors = { ...currentErrors }
      delete nextErrors[fieldName]
      return nextErrors
    })
  }

  function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validateForm(formValues)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setFeedback('')
      return
    }

    setIsSaving(true)
    window.setTimeout(() => {
      setIsSaving(false)
      setFeedback('Bản nháp dịch vụ đã được lưu trong mock frontend. API tạo dịch vụ sẽ nối ở bước backend.')
    }, 350)
  }

  function handleReset() {
    setFormValues(ADMIN_SERVICE_CREATE_INITIAL_FORM)
    setErrors({})
    setFeedback('')
    setCoverFileName('')
  }

  return (
    <main className="admin-ops-page admin-service-create-page">
      <AdminPageHeader
        eyebrow="Quản lý Dịch vụ"
        title="Thêm Dịch vụ Mới"
        subtitle="Nhập thông tin cơ bản, hình ảnh, giá và lịch trình vận hành của dịch vụ."
        actions={<AdminStatusBadge tone={statusTone}>Trạng thái: {statusLabel}</AdminStatusBadge>}
      />

      <form className="admin-service-create-page__form" noValidate onSubmit={handleSubmit}>
        <AdminFormPanel
          title="Thông tin chi tiết"
          subtitle="Tải ảnh bìa chính và cấu hình trạng thái hiển thị."
        >
          <div className="admin-service-create-page__upload">
            <strong>Hình ảnh Dịch vụ</strong>
            <span>Tải ảnh bìa chính</span>
            <p>Khuyến nghị: sử dụng ảnh có độ phân giải tối thiểu 1200x800px. Hỗ trợ JPG, PNG, WEBP.</p>
            <div className="admin-service-create-page__upload-actions">
              <AdminButton
                type="button"
                variant="secondary"
                onClick={() => setCoverFileName('net-viet-service-cover.webp')}
              >
                Chọn ảnh
              </AdminButton>
              {coverFileName ? (
                <AdminButton type="button" variant="ghost" onClick={() => setCoverFileName('')}>
                  Gỡ ảnh
                </AdminButton>
              ) : null}
            </div>
            {coverFileName ? (
              <p className="admin-service-create-page__upload-preview" role="status">
                Đã chọn: <strong>{coverFileName}</strong>
              </p>
            ) : null}
          </div>

          <AdminField label="Trạng thái">
            <AdminSelect
              options={[
                { value: 'active', label: 'Đang bán' },
                { value: 'hidden', label: 'Tạm ẩn' },
              ]}
              value={formValues.status}
              onChange={(event) => updateField('status', event.target.value)}
            />
          </AdminField>
        </AdminFormPanel>

        <AdminFormPanel title="Thông tin cơ bản">
          <div className="admin-service-create-page__grid">
            <AdminField error={errors.title} htmlFor="service-title" label="Tên dịch vụ" required>
              <AdminInput
                id="service-title"
                invalid={Boolean(errors.title)}
                placeholder="Ví dụ: Khám phá Vẻ đẹp Tiềm ẩn Cố đô Huế"
                value={formValues.title}
                onChange={(event) => updateField('title', event.target.value)}
              />
            </AdminField>
            <AdminField error={errors.destination} htmlFor="service-destination" label="Điểm đến" required>
              <AdminInput
                id="service-destination"
                invalid={Boolean(errors.destination)}
                placeholder="Thành phố, Tỉnh thành"
                value={formValues.destination}
                onChange={(event) => updateField('destination', event.target.value)}
              />
            </AdminField>
            <AdminField error={errors.price} htmlFor="service-price" label="Giá (Đ)" required>
              <AdminInput
                id="service-price"
                inputMode="numeric"
                invalid={Boolean(errors.price)}
                value={formValues.price}
                onChange={(event) => updateField('price', event.target.value)}
              />
            </AdminField>
            <AdminField label="Loại hình dịch vụ">
              <AdminSelect
                options={[
                  { value: 'tour', label: 'Tour Du lịch' },
                  { value: 'hotel', label: 'Khách sạn' },
                  { value: 'flight', label: 'Vé máy bay' },
                  { value: 'train', label: 'Vé tàu' },
                ]}
                value={formValues.serviceType}
                onChange={(event) => updateField('serviceType', event.target.value)}
              />
            </AdminField>
          </div>

          <AdminField label="Tiện ích bao gồm">
            <AdminInput
              value={formValues.amenities}
              onChange={(event) => updateField('amenities', event.target.value)}
            />
          </AdminField>

          <AdminField error={errors.description} label="Mô tả dịch vụ" required>
            <AdminTextarea
              invalid={Boolean(errors.description)}
              placeholder="Mô tả tóm tắt về chuyến đi, các điểm đặc sắc và trải nghiệm khách hàng sẽ có được..."
              value={formValues.description}
              onChange={(event) => updateField('description', event.target.value)}
            />
          </AdminField>
        </AdminFormPanel>

        <AdminFormPanel title="Lịch trình chi tiết" subtitle="Đối với tour du lịch">
          <AdminField label="Ngày 1 - Khởi hành và Thăm quan Đại Nội">
            <AdminTextarea
              value={formValues.itineraryDayOne}
              onChange={(event) => updateField('itineraryDayOne', event.target.value)}
            />
          </AdminField>
          <AdminField label="Ngày 2">
            <AdminTextarea
              placeholder="Nhập để thêm chi tiết lịch trình ngày tiếp theo..."
              value={formValues.itineraryDayTwo}
              onChange={(event) => updateField('itineraryDayTwo', event.target.value)}
            />
          </AdminField>
        </AdminFormPanel>

        {feedback ? <p className="admin-service-create-page__feedback" role="status">{feedback}</p> : null}

        <div className="admin-service-create-page__actions">
          <AdminButton disabled={isSaving} loading={isSaving} type="submit" variant="primary">
            Lưu bản nháp
          </AdminButton>
          <AdminButton disabled={isSaving} type="button" variant="secondary" onClick={handleReset}>
            Đặt lại
          </AdminButton>
          <AdminButton
            disabled={isSaving}
            type="button"
            variant="ghost"
            onClick={() => navigate(buildAdminPath('/admin/services', currentRole))}
          >
            Hủy bỏ & Quay lại
          </AdminButton>
        </div>
      </form>
    </main>
  )
}

export default AdminServiceCreatePage
