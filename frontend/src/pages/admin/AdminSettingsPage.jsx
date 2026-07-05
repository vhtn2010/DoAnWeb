import { useMemo, useState } from 'react'
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminFilterBar,
  AdminInput,
  AdminPageHeader,
  AdminSectionHeader,
  AdminSegmentedControl,
  AdminStatusBadge,
} from '../../components/admin/ui/index.js'
import { ADMIN_SETTINGS_GROUPS } from '../../fixtures/adminSystem.fixtures.js'

function buildInitialValues() {
  return ADMIN_SETTINGS_GROUPS.reduce((values, group) => {
    group.fields.forEach((field) => {
      values[field.name] = field.value
    })

    return values
  }, {})
}

function validateSettings(values) {
  const errors = {}

  if (!values.brandName?.trim()) {
    errors.brandName = 'Nhập tên thương hiệu.'
  }

  if (values.supportEmail && !values.supportEmail.includes('@')) {
    errors.supportEmail = 'Email hỗ trợ chưa hợp lệ.'
  }

  if (!values.hotline?.trim()) {
    errors.hotline = 'Nhập hotline.'
  }

  return errors
}

function AdminSettingsPage() {
  const [activeGroupId, setActiveGroupId] = useState(ADMIN_SETTINGS_GROUPS[0]?.id ?? '')
  const [feedback, setFeedback] = useState('')
  const [values, setValues] = useState(buildInitialValues)
  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const initialValues = useMemo(() => buildInitialValues(), [])
  const activeGroup = ADMIN_SETTINGS_GROUPS.find((group) => group.id === activeGroupId) ?? ADMIN_SETTINGS_GROUPS[0]
  const hasChanges = Object.keys(initialValues).some((key) => initialValues[key] !== values[key])

  function updateValue(fieldName, value) {
    setValues((currentValues) => ({
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
    const nextErrors = validateSettings(values)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setFeedback('')
      return
    }

    setIsSaving(true)
    window.setTimeout(() => {
      setIsSaving(false)
      setFeedback('Cấu hình hệ thống đã được lưu trong mock frontend.')
    }, 350)
  }

  function handleReset() {
    setValues(initialValues)
    setErrors({})
    setFeedback('Đã khôi phục cấu hình mặc định trong mock frontend.')
  }

  return (
    <main className="admin-system-page admin-settings-page">
      <AdminPageHeader
        eyebrow="Thiết lập"
        title="Cấu hình hệ thống"
        subtitle="Quản lý thông tin công ty, thanh toán và trạng thái vận hành hệ thống."
        actions={
          <AdminStatusBadge tone={hasChanges ? 'warning' : 'success'}>
            {hasChanges ? 'Có thay đổi chưa lưu' : 'Đã đồng bộ'}
          </AdminStatusBadge>
        }
      />

      <AdminFilterBar aria-label="Tabs cấu hình hệ thống">
        <AdminSegmentedControl
          ariaLabel="Chọn nhóm cấu hình"
          options={ADMIN_SETTINGS_GROUPS.map((group) => ({
            label: group.title,
            value: group.id,
          }))}
          value={activeGroupId}
          onChange={setActiveGroupId}
        />
      </AdminFilterBar>

      <form className="admin-system-settings" noValidate onSubmit={handleSubmit}>
        <div className="admin-settings-page__workspace">
          <AdminCard className="admin-settings-page__form-card" padding="lg">
            <AdminSectionHeader
              title={activeGroup.title}
              subtitle={activeGroup.description}
            />
            <div className="admin-system-settings__grid">
              {activeGroup.fields.map((field) => (
                <AdminField
                  error={errors[field.name]}
                  htmlFor={`setting-${field.name}`}
                  key={field.name}
                  label={field.label}
                >
                  <AdminInput
                    id={`setting-${field.name}`}
                    invalid={Boolean(errors[field.name])}
                    value={values[field.name]}
                    onChange={(event) => updateValue(field.name, event.target.value)}
                  />
                </AdminField>
              ))}
            </div>
          </AdminCard>

          <AdminCard className="admin-settings-page__status-card" padding="lg">
            <AdminSectionHeader
              title="Trạng thái hệ thống"
              subtitle="Tín hiệu cấu hình đang áp dụng"
            />
            <div className="admin-access-control-page__audit-list">
              <span>Bảo trì <strong>{values.maintenance ?? 'Tắt'}</strong></span>
              <span>Email tự động <strong>{values.emailAutomation ?? 'Bật'}</strong></span>
              <span>Cảnh báo vận hành <strong>{values.opsAlert ?? 'Bật'}</strong></span>
            </div>
          </AdminCard>
        </div>

        <AdminCard className="admin-settings-page__region-card" padding="lg">
          <AdminSectionHeader
            title="Cấu hình khu vực"
            subtitle="Thiết lập mặc định cho giao diện quản trị Việt Nam"
          />
          <div className="admin-access-control-page__audit-list admin-settings-page__region-list">
            <span>Múi giờ <strong>Asia/Bangkok</strong></span>
            <span>Tiền tệ <strong>VND</strong></span>
            <span>Ngôn ngữ <strong>Tiếng Việt</strong></span>
          </div>
        </AdminCard>

        {feedback ? <p className="admin-system-settings__feedback" role="status">{feedback}</p> : null}

        <div className="admin-system-settings__actions">
          <AdminButton disabled={isSaving} loading={isSaving} type="submit" variant="primary">
            Lưu cấu hình
          </AdminButton>
          <AdminButton disabled={isSaving} type="button" variant="secondary" onClick={handleReset}>
            Khôi phục mặc định
          </AdminButton>
        </div>
      </form>
    </main>
  )
}

export default AdminSettingsPage
