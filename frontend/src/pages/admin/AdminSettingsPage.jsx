import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  getAdminBusinessSettings,
  getAdminDirectPaymentSettings,
  getAdminPublicSettings,
  updateAdminBusinessSettings,
  updateAdminPublicSettings,
} from '../../repositories/adminSettingsRepository.js'
import { ADMIN_PERMISSIONS, hasPermission } from '../../utils/rolePermissions.js'

const SETTINGS_TABS = Object.freeze([
  'Thiết lập chung',
  'Thông tin doanh nghiệp',
  'Thanh toán trực tiếp',
])

function createEmptyForm() {
  return {
    address: '',
    company_name: '',
    hotline: '',
    logo_url: '',
    site_name: '',
    support_email: '',
    tax_code: '',
  }
}

function getErrorMessage(error, fallback) {
  return error?.message || fallback
}

function mapValidationDetails(details = []) {
  if (!Array.isArray(details)) {
    return {}
  }

  return details.reduce((result, detail) => {
    if (detail?.field && detail?.message) {
      result[detail.field] = detail.message
    }

    return result
  }, {})
}

function SettingIcon({ type }) {
  if (type === 'region') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path d="M12 21s7-5.2 7-11.2A7 7 0 0 0 5 9.8C5 15.8 12 21 12 21Z" />
        <path d="M12 12.3a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M4.5 20V8.8L12 4l7.5 4.8V20" />
      <path d="M8.2 20v-7.3h7.6V20" />
      <path d="M9.1 10h.01M14.9 10h.01" />
    </svg>
  )
}

function PaymentMethodList({ methods = [] }) {
  if (methods.length === 0) {
    return <p className="admin-settings-page__hint">Chưa có cấu hình phương thức thanh toán trực tiếp.</p>
  }

  return (
    <div className="admin-settings-page__status-list">
      {methods.map((method) => (
        <div className="admin-settings-page__status-item" key={method.code}>
          <span>{method.display_name || method.code}</span>
          <strong>{method.enabled ? 'Đang bật' : 'Đang tắt'}</strong>
        </div>
      ))}
    </div>
  )
}

function AdminSettingsPage() {
  const { currentPermissions, currentRole } = useOutletContext()
  const canWriteSettings = hasPermission(
    currentRole,
    ADMIN_PERMISSIONS.settingsWrite,
    currentPermissions,
  )
  const [activeTab, setActiveTab] = useState(SETTINGS_TABS[0])
  const [formValues, setFormValues] = useState(() => createEmptyForm())
  const [paymentMethods, setPaymentMethods] = useState([])
  const [metadata, setMetadata] = useState({
    businessUpdatedAt: '',
    publicUpdatedAt: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const enabledPaymentCount = useMemo(
    () => paymentMethods.filter((method) => method.enabled).length,
    [paymentMethods],
  )

  useEffect(() => {
    let isActive = true

    async function loadSettings() {
      setLoading(true)
      setError('')

      try {
        const [publicResponse, businessResponse, directPaymentResponse] = await Promise.all([
          getAdminPublicSettings(),
          getAdminBusinessSettings(),
          getAdminDirectPaymentSettings(),
        ])

        if (!isActive) {
          return
        }

        if (!publicResponse?.success || !businessResponse?.success || !directPaymentResponse?.success) {
          throw new Error('Không thể tải cấu hình admin.')
        }

        const publicSettings = publicResponse.data || {}
        const businessSettings = businessResponse.data || {}

        setFormValues({
          address: businessSettings.address || publicSettings.address || '',
          company_name: businessSettings.company_name || publicSettings.site_name || '',
          hotline: publicSettings.hotline || businessSettings.invoice_phone || '',
          logo_url: publicSettings.logo_url || '',
          site_name: publicSettings.site_name || businessSettings.company_name || '',
          support_email: publicSettings.support_email || businessSettings.invoice_email || '',
          tax_code: businessSettings.tax_code || '',
        })
        setPaymentMethods(Array.isArray(directPaymentResponse.data?.methods)
          ? directPaymentResponse.data.methods
          : [])
        setMetadata({
          businessUpdatedAt: businessSettings.updated_at || '',
          publicUpdatedAt: publicSettings.updated_at || '',
        })
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setError(getErrorMessage(loadError, 'Không thể tải cấu hình hệ thống.'))
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadSettings()

    return () => {
      isActive = false
    }
  }, [])

  function updateField(field, value) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }))
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [field]: '',
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!canWriteSettings) {
      setFeedback('Tài khoản hiện tại chưa có quyền cập nhật cấu hình.')
      return
    }

    setSaving(true)
    setError('')
    setFeedback('')
    setFieldErrors({})

    try {
      const publicPayload = {
        address: formValues.address,
        hotline: formValues.hotline,
        logo_url: formValues.logo_url || null,
        site_name: formValues.site_name || formValues.company_name,
        support_email: formValues.support_email,
      }
      const businessPayload = {
        address: formValues.address,
        company_name: formValues.company_name || formValues.site_name,
        invoice_email: formValues.support_email,
        invoice_phone: formValues.hotline,
        tax_code: formValues.tax_code || null,
      }
      const [publicResponse, businessResponse] = await Promise.all([
        updateAdminPublicSettings(publicPayload),
        updateAdminBusinessSettings(businessPayload),
      ])

      setMetadata({
        businessUpdatedAt: businessResponse.data?.updated_at || metadata.businessUpdatedAt,
        publicUpdatedAt: publicResponse.data?.updated_at || metadata.publicUpdatedAt,
      })
      setFeedback('Cấu hình hệ thống đã được cập nhật từ API backend.')
    } catch (saveError) {
      setFieldErrors(mapValidationDetails(saveError?.details))
      setError(getErrorMessage(saveError, 'Không thể lưu cấu hình hệ thống.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="admin-settings-page">
      <header className="admin-settings-page__header">
        <h1>Cấu hình hệ thống</h1>
        <p>Quản lý thông tin public, doanh nghiệp và trạng thái thanh toán trực tiếp từ backend API.</p>
      </header>

      <nav className="admin-settings-page__tabs" aria-label="Nhóm cấu hình hệ thống">
        {SETTINGS_TABS.map((tab) => (
          <button
            aria-current={activeTab === tab ? 'page' : undefined}
            className={activeTab === tab ? 'is-active' : ''}
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {error ? <p className="admin-settings-page__feedback admin-settings-page__feedback--error" role="alert">{error}</p> : null}
      {feedback ? <p className="admin-settings-page__feedback" role="status">{feedback}</p> : null}

      <form className="admin-settings-page__workspace" onSubmit={handleSubmit}>
        <div className="admin-settings-page__main-column">
          <section className="admin-settings-page__panel admin-settings-page__panel--company" aria-labelledby="settings-company-title">
            <div className="admin-settings-page__section-title">
              <span className="admin-settings-page__section-icon">
                <SettingIcon />
              </span>
              <h2 id="settings-company-title">Thông tin công ty</h2>
            </div>

            <div className="admin-settings-page__form-grid">
              <label className="admin-settings-page__field" htmlFor="settings-site-name">
                <span>Tên website</span>
                <input
                  disabled={loading || saving || !canWriteSettings}
                  id="settings-site-name"
                  value={formValues.site_name}
                  onChange={(event) => updateField('site_name', event.target.value)}
                />
                {fieldErrors.site_name ? <small>{fieldErrors.site_name}</small> : null}
              </label>
              <label className="admin-settings-page__field" htmlFor="settings-company-name">
                <span>Tên công ty</span>
                <input
                  disabled={loading || saving || !canWriteSettings}
                  id="settings-company-name"
                  value={formValues.company_name}
                  onChange={(event) => updateField('company_name', event.target.value)}
                />
                {fieldErrors.company_name ? <small>{fieldErrors.company_name}</small> : null}
              </label>
              <label className="admin-settings-page__field" htmlFor="settings-tax-code">
                <span>Mã số thuế</span>
                <input
                  disabled={loading || saving || !canWriteSettings}
                  id="settings-tax-code"
                  value={formValues.tax_code}
                  onChange={(event) => updateField('tax_code', event.target.value)}
                />
                {fieldErrors.tax_code ? <small>{fieldErrors.tax_code}</small> : null}
              </label>
              <label className="admin-settings-page__field admin-settings-page__field--wide" htmlFor="settings-address">
                <span>Địa chỉ trụ sở</span>
                <input
                  disabled={loading || saving || !canWriteSettings}
                  id="settings-address"
                  value={formValues.address}
                  onChange={(event) => updateField('address', event.target.value)}
                />
                {fieldErrors.address ? <small>{fieldErrors.address}</small> : null}
              </label>
              <label className="admin-settings-page__field" htmlFor="settings-email">
                <span>Email liên hệ</span>
                <input
                  disabled={loading || saving || !canWriteSettings}
                  id="settings-email"
                  type="email"
                  value={formValues.support_email}
                  onChange={(event) => updateField('support_email', event.target.value)}
                />
                {fieldErrors.support_email || fieldErrors.invoice_email ? <small>{fieldErrors.support_email || fieldErrors.invoice_email}</small> : null}
              </label>
              <label className="admin-settings-page__field" htmlFor="settings-hotline">
                <span>Hotline</span>
                <input
                  disabled={loading || saving || !canWriteSettings}
                  id="settings-hotline"
                  value={formValues.hotline}
                  onChange={(event) => updateField('hotline', event.target.value)}
                />
                {fieldErrors.hotline || fieldErrors.invoice_phone ? <small>{fieldErrors.hotline || fieldErrors.invoice_phone}</small> : null}
              </label>
              <label className="admin-settings-page__field admin-settings-page__field--wide" htmlFor="settings-logo-url">
                <span>Logo URL public</span>
                <input
                  disabled={loading || saving || !canWriteSettings}
                  id="settings-logo-url"
                  value={formValues.logo_url}
                  onChange={(event) => updateField('logo_url', event.target.value)}
                />
                {fieldErrors.logo_url ? <small>{fieldErrors.logo_url}</small> : null}
              </label>
            </div>
          </section>

          <section className="admin-settings-page__panel admin-settings-page__panel--region" aria-labelledby="settings-payment-title">
            <div className="admin-settings-page__section-title">
              <span className="admin-settings-page__section-icon">
                <SettingIcon type="region" />
              </span>
              <h2 id="settings-payment-title">Thanh toán trực tiếp</h2>
            </div>
            <PaymentMethodList methods={paymentMethods} />
          </section>
        </div>

        <aside className="admin-settings-page__panel admin-settings-page__status-panel" aria-labelledby="settings-status-title">
          <h2 id="settings-status-title">Trạng thái cấu hình</h2>
          <div className="admin-settings-page__status-list">
            <div className="admin-settings-page__status-item">
              <span>Public settings</span>
              <strong>{metadata.publicUpdatedAt ? 'Đã đồng bộ' : 'Chưa cập nhật'}</strong>
            </div>
            <div className="admin-settings-page__status-item">
              <span>Business settings</span>
              <strong>{metadata.businessUpdatedAt ? 'Đã đồng bộ' : 'Chưa cập nhật'}</strong>
            </div>
            <div className="admin-settings-page__status-item">
              <span>Thanh toán bật</span>
              <strong>{enabledPaymentCount}/{paymentMethods.length}</strong>
            </div>
          </div>

          <button
            className="admin-settings-page__save"
            disabled={loading || saving || !canWriteSettings}
            type="submit"
          >
            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </aside>

        {loading ? <p className="admin-settings-page__feedback" role="status">Đang tải cấu hình từ API...</p> : null}
      </form>
    </main>
  )
}

export default AdminSettingsPage
