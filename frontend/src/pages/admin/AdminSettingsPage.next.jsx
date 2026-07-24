import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { LocalLoading } from '../../components/loading/Loading.jsx'
import {
  getAdminBusinessSettings,
  getAdminDirectPaymentSettings,
  getAdminPublicSettings,
  updateAdminBusinessSettings,
  updateAdminDirectPaymentSettings,
  updateAdminPublicSettings,
} from '../../repositories/adminSettingsRepository.js'
import { ADMIN_PERMISSIONS, hasPermission } from '../../utils/rolePermissions.js'

const SETTINGS_TABS = Object.freeze([
  {
    description: 'Qu?n l? ph?n hi?n th? c?ng khai c?a th??ng hi?u, h? tr? kh?ch h?ng v? SEO c? b?n.',
    id: 'general',
    label: 'Thiet lap chung',
    summaryTitle: 'Thiet lap hien thi cong khai',
  },
  {
    description: 'T?p trung v?o h? s? ph?p l?, th?ng tin xu?t h?a ??n v? li?n h? doanh nghi?p n?i b?.',
    id: 'business',
    label: 'Th?ng tin doanh nghi?p',
    summaryTitle: 'Ho so doanh nghiep',
  },
  {
    description: 'Bat hoac tat tung phuong thuc thu tien truc tiep va cau hinh noi dung huong dan cong khai.',
    id: 'direct-payment',
    label: 'Thanh to?n tr?c ti?p',
    summaryTitle: 'Phuong thuc thu tien truc tiep',
  },
])

const SOCIAL_PLATFORM_FIELDS = Object.freeze([
  { field: 'social_facebook', label: 'Facebook' },
  { field: 'social_instagram', label: 'Instagram' },
  { field: 'social_tiktok', label: 'TikTok' },
  { field: 'social_youtube', label: 'YouTube' },
])

const DIRECT_PAYMENT_METHOD_LABELS = Object.freeze({
  cash_at_office: 'Thanh to?n t?i v?n ph?ng',
  manual_bank_transfer: 'Chuy?n kho?n th? c?ng',
  staff_collect: 'Nh?n vi?n thu h?',
})

const DIRECT_PAYMENT_METHOD_DESCRIPTIONS = Object.freeze({
  cash_at_office: 'D?nh cho kh?ch gh? v?n ph?ng ho?c ?i?m giao d?ch ?? thanh to?n tr?c ti?p.',
  manual_bank_transfer: 'Hi?n th? th?ng tin ng?n h?ng v? n?i dung chuy?n kho?n ?? kh?ch t? th?c hi?n.',
  staff_collect: '?p d?ng khi nh?n vi?n ???c ph?n c?ng thu ti?n theo booking ho?c ?o?n kh?ch.',
})

function createEmptyForm() {
  return {
    business_address: '',
    business_company_name: '',
    business_license_no: '',
    business_tax_code: '',
    business_hours: '',
    footer_text: '',
    invoice_email: '',
    invoice_note: '',
    invoice_phone: '',
    legal_representative: '',
    public_address: '',
    public_hotline: '',
    public_logo_url: '',
    public_site_name: '',
    public_support_email: '',
    seo_description: '',
    seo_title: '',
    social_facebook: '',
    social_instagram: '',
    social_tiktok: '',
    social_youtube: '',
  }
}

function getErrorMessage(error, fallback) {
  return error?.message || fallback
}

function formatDateTime(value) {
  if (!value) {
    return 'Ch?a c?p nh?t'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Ch?a c?p nh?t'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatStructuredValue(value) {
  if (value == null) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ''
  }
}

function parseStructuredValue(value) {
  const trimmedValue = String(value ?? '').trim()

  if (!trimmedValue) {
    return null
  }

  const looksLikeJson =
    (trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) ||
    (trimmedValue.startsWith('[') && trimmedValue.endsWith(']'))

  if (!looksLikeJson) {
    return trimmedValue
  }

  try {
    return JSON.parse(trimmedValue)
  } catch {
    return trimmedValue
  }
}

function extractSocialLinkUrl(value) {
  if (!value) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'object') {
    return value.url || value.href || value.link || ''
  }

  return ''
}

function buildSocialLinks(formValues) {
  return SOCIAL_PLATFORM_FIELDS.reduce((result, platform) => {
    const url = formValues[platform.field]?.trim()

    if (url) {
      result[platform.field.replace('social_', '')] = url
    }

    return result
  }, {})
}

function buildPublicPayload(formValues) {
  return {
    address: formValues.public_address.trim() || null,
    business_hours: parseStructuredValue(formValues.business_hours),
    footer_text: formValues.footer_text.trim() || null,
    hotline: formValues.public_hotline.trim() || null,
    logo_url: formValues.public_logo_url.trim() || null,
    seo_description: formValues.seo_description.trim() || null,
    seo_title: formValues.seo_title.trim() || null,
    site_name: formValues.public_site_name.trim(),
    social_links: buildSocialLinks(formValues),
    support_email: formValues.public_support_email.trim() || null,
  }
}

function buildBusinessPayload(formValues) {
  return {
    address: formValues.business_address.trim() || null,
    business_license_no: formValues.business_license_no.trim() || null,
    company_name: formValues.business_company_name.trim(),
    invoice_email: formValues.invoice_email.trim() || null,
    invoice_note: formValues.invoice_note.trim() || null,
    invoice_phone: formValues.invoice_phone.trim() || null,
    legal_representative: formValues.legal_representative.trim() || null,
    tax_code: formValues.business_tax_code.trim() || null,
  }
}

function buildDirectPaymentPayload(paymentMethods = []) {
  return {
    methods: paymentMethods.map((method) => ({
      account_holder: method.account_holder?.trim() || null,
      account_number: method.account_number?.trim() || null,
      bank_name: method.bank_name?.trim() || null,
      branch: method.branch?.trim() || null,
      code: method.code,
      conditions: method.conditions?.trim() || null,
      display_name: method.display_name?.trim() || null,
      enabled: Boolean(method.enabled),
      hotline: method.hotline?.trim() || null,
      instructions: method.instructions?.trim() || null,
      office_address: method.office_address?.trim() || null,
      qr_code_url: method.qr_code_url?.trim() || null,
      sort_order: Number.isFinite(Number(method.sort_order)) ? Number(method.sort_order) : 0,
      transfer_content_template: method.transfer_content_template?.trim() || null,
      working_hours: method.working_hours?.trim() || null,
    })),
  }
}

function mapValidationDetails(details = [], activeTabId = 'general') {
  if (!Array.isArray(details)) {
    return {}
  }

  return details.reduce((result, detail) => {
    if (!detail?.field || !detail?.message) {
      return result
    }

    let field = detail.field

    if (activeTabId === 'general' && field === 'address') {
      field = 'public_address'
    }

    if (activeTabId === 'business' && field === 'address') {
      field = 'business_address'
    }

    result[field] = detail.message
    return result
  }, {})
}

function SettingIcon({ type = 'general' }) {
  if (type === 'payment') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
        <path d="M3.5 10.5h17" />
        <path d="M7.5 15h3M14.5 15h2" />
      </svg>
    )
  }

  if (type === 'business') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path d="M4 20V8.5L12 4l8 4.5V20" />
        <path d="M8 20v-6h8v6" />
        <path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" />
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

function AdminSettingsPage() {
  const { currentPermissions, currentRole } = useOutletContext()
  const canWriteSettings = hasPermission(
    currentRole,
    ADMIN_PERMISSIONS.settingsWrite,
    currentPermissions,
  )
  const [activeTabId, setActiveTabId] = useState(SETTINGS_TABS[0].id)
  const [formValues, setFormValues] = useState(() => createEmptyForm())
  const [paymentMethods, setPaymentMethods] = useState([])
  const [metadata, setMetadata] = useState({
    businessUpdatedAt: '',
    directPaymentUpdatedAt: '',
    publicUpdatedAt: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  const activeTab = useMemo(
    () => SETTINGS_TABS.find((tab) => tab.id === activeTabId) ?? SETTINGS_TABS[0],
    [activeTabId],
  )
  const enabledPaymentCount = useMemo(
    () => paymentMethods.filter((method) => method.enabled).length,
    [paymentMethods],
  )
  const configuredSocialCount = useMemo(
    () => SOCIAL_PLATFORM_FIELDS.filter((platform) => formValues[platform.field]?.trim()).length,
    [formValues],
  )
  const activeTabUpdatedAt = useMemo(() => {
    if (activeTabId === 'business') {
      return metadata.businessUpdatedAt
    }

    if (activeTabId === 'direct-payment') {
      return metadata.directPaymentUpdatedAt
    }

    return metadata.publicUpdatedAt
  }, [activeTabId, metadata])

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
          throw new Error('Không thể tải cấu hình hệ thống.')
        }

        const publicSettings = publicResponse.data || {}
        const businessSettings = businessResponse.data || {}
        const socialLinks = publicSettings.social_links || {}

        setFormValues({
          business_address: businessSettings.address || '',
          business_company_name: businessSettings.company_name || '',
          business_hours: formatStructuredValue(publicSettings.business_hours),
          business_license_no: businessSettings.business_license_no || '',
          business_tax_code: businessSettings.tax_code || '',
          footer_text: publicSettings.footer_text || '',
          invoice_email: businessSettings.invoice_email || '',
          invoice_note: businessSettings.invoice_note || '',
          invoice_phone: businessSettings.invoice_phone || '',
          legal_representative: businessSettings.legal_representative || '',
          public_address: publicSettings.address || '',
          public_hotline: publicSettings.hotline || '',
          public_logo_url: publicSettings.logo_url || '',
          public_site_name: publicSettings.site_name || '',
          public_support_email: publicSettings.support_email || '',
          seo_description: publicSettings.seo_description || '',
          seo_title: publicSettings.seo_title || '',
          social_facebook: extractSocialLinkUrl(socialLinks.facebook),
          social_instagram: extractSocialLinkUrl(socialLinks.instagram),
          social_tiktok: extractSocialLinkUrl(socialLinks.tiktok),
          social_youtube: extractSocialLinkUrl(socialLinks.youtube),
        })
        setPaymentMethods(Array.isArray(directPaymentResponse.data?.methods) ? directPaymentResponse.data.methods : [])
        setMetadata({
          businessUpdatedAt: businessSettings.updated_at || '',
          directPaymentUpdatedAt: directPaymentResponse.data?.updated_at || '',
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

  function updatePaymentMethod(index, field, value) {
    setPaymentMethods((currentMethods) =>
      currentMethods.map((method, methodIndex) => (
        methodIndex === index
          ? {
              ...method,
              [field]: value,
            }
          : method
      )),
    )
    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors[`methods[${index}]`]
      delete nextErrors[`methods[${index}].${field}`]
      return nextErrors
    })
  }

  function getMethodFieldError(index, field) {
    return fieldErrors[`methods[${index}].${field}`] || fieldErrors[`methods[${index}]`] || ''
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!canWriteSettings) {
      setFeedback('T?i kho?n hi?n t?i ch?a c? quy?n c?p nh?t c?u h?nh.')
      return
    }

    setSaving(true)
    setError('')
    setFeedback('')
    setFieldErrors({})

    try {
      if (activeTabId === 'general') {
        const response = await updateAdminPublicSettings(buildPublicPayload(formValues))

        setMetadata((currentMetadata) => ({
          ...currentMetadata,
          publicUpdatedAt: response.data?.updated_at || currentMetadata.publicUpdatedAt,
        }))
        setFeedback('?? c?p nh?t thi?t l?p chung t? backend API.')
      }

      if (activeTabId === 'business') {
        const response = await updateAdminBusinessSettings(buildBusinessPayload(formValues))

        setMetadata((currentMetadata) => ({
          ...currentMetadata,
          businessUpdatedAt: response.data?.updated_at || currentMetadata.businessUpdatedAt,
        }))
        setFeedback('?? c?p nh?t th?ng tin doanh nghi?p t? backend API.')
      }

      if (activeTabId === 'direct-payment') {
        const response = await updateAdminDirectPaymentSettings(buildDirectPaymentPayload(paymentMethods))

        setPaymentMethods(Array.isArray(response.data?.methods) ? response.data.methods : paymentMethods)
        setMetadata((currentMetadata) => ({
          ...currentMetadata,
          directPaymentUpdatedAt: response.data?.updated_at || currentMetadata.directPaymentUpdatedAt,
        }))
        setFeedback('?? c?p nh?t c?u h?nh thanh to?n tr?c ti?p t? backend API.')
      }
    } catch (saveError) {
      setFieldErrors(mapValidationDetails(saveError?.details, activeTabId))
      setError(getErrorMessage(saveError, 'Không thể lưu cấu hình hệ thống.'))
    } finally {
      setSaving(false)
    }
  }

  function renderGeneralTab() {
    return (
      <div className="admin-settings-page__tab-panel">
        <section className="admin-settings-page__panel admin-settings-page__panel--company" aria-labelledby="settings-general-title">
          <div className="admin-settings-page__section-title">
            <span className="admin-settings-page__section-icon">
              <SettingIcon type="general" />
            </span>
            <div className="admin-settings-page__section-copy">
              <h2 id="settings-general-title">Th?ng tin public v? li?n h? kh?ch h?ng</h2>
              <p className="admin-settings-page__panel-description">
                ??y l? nh?m n?i dung xu?t hi?n ? website public v? c?c ?i?m ch?m h? tr? kh?ch h?ng.
              </p>
            </div>
          </div>

          <div className="admin-settings-page__form-grid">
            <label className="admin-settings-page__field" htmlFor="settings-public-site-name">
              <span>T?n website</span>
              <input
                disabled={loading || saving || !canWriteSettings}
                id="settings-public-site-name"
                value={formValues.public_site_name}
                onChange={(event) => updateField('public_site_name', event.target.value)}
              />
              {fieldErrors.public_site_name || fieldErrors.site_name ? <small>{fieldErrors.public_site_name || fieldErrors.site_name}</small> : null}
            </label>
            <label className="admin-settings-page__field" htmlFor="settings-public-logo-url">
              <span>Logo URL public</span>
              <input
                disabled={loading || saving || !canWriteSettings}
                id="settings-public-logo-url"
                placeholder="https://..."
                type="url"
                value={formValues.public_logo_url}
                onChange={(event) => updateField('public_logo_url', event.target.value)}
              />
              {fieldErrors.public_logo_url || fieldErrors.logo_url ? <small>{fieldErrors.public_logo_url || fieldErrors.logo_url}</small> : null}
            </label>
            <label className="admin-settings-page__field" htmlFor="settings-public-hotline">
              <span>Hotline c?ng khai</span>
              <input
                disabled={loading || saving || !canWriteSettings}
                id="settings-public-hotline"
                value={formValues.public_hotline}
                onChange={(event) => updateField('public_hotline', event.target.value)}
              />
              {fieldErrors.public_hotline || fieldErrors.hotline ? <small>{fieldErrors.public_hotline || fieldErrors.hotline}</small> : null}
            </label>
            <label className="admin-settings-page__field" htmlFor="settings-public-support-email">
              <span>Email h? tr?</span>
              <input
                disabled={loading || saving || !canWriteSettings}
                id="settings-public-support-email"
                type="email"
                value={formValues.public_support_email}
                onChange={(event) => updateField('public_support_email', event.target.value)}
              />
              {fieldErrors.public_support_email || fieldErrors.support_email ? <small>{fieldErrors.public_support_email || fieldErrors.support_email}</small> : null}
            </label>
            <label className="admin-settings-page__field admin-settings-page__field--wide" htmlFor="settings-public-address">
              <span>Dia chi hien thi</span>
              <input
                disabled={loading || saving || !canWriteSettings}
                id="settings-public-address"
                value={formValues.public_address}
                onChange={(event) => updateField('public_address', event.target.value)}
              />
              {fieldErrors.public_address ? <small>{fieldErrors.public_address}</small> : null}
            </label>
          </div>
        </section>

        <section className="admin-settings-page__panel admin-settings-page__panel--region" aria-labelledby="settings-branding-title">
          <div className="admin-settings-page__section-title">
            <span className="admin-settings-page__section-icon">
              <SettingIcon type="business" />
            </span>
            <div className="admin-settings-page__section-copy">
              <h2 id="settings-branding-title">Thuong hieu, SEO va mang xa hoi</h2>
              <p className="admin-settings-page__panel-description">
                C?c tr??ng b?n d??i ?? ???c backend h? tr? ?? qu?n l? footer, metadata v? social links.
              </p>
            </div>
          </div>

          <div className="admin-settings-page__form-grid">
            <label className="admin-settings-page__field" htmlFor="settings-seo-title">
              <span>SEO title</span>
              <input
                disabled={loading || saving || !canWriteSettings}
                id="settings-seo-title"
                value={formValues.seo_title}
                onChange={(event) => updateField('seo_title', event.target.value)}
              />
              {fieldErrors.seo_title ? <small>{fieldErrors.seo_title}</small> : null}
            </label>
            <label className="admin-settings-page__field" htmlFor="settings-business-hours">
              <span>Gi? ho?t ??ng / l?ch h? tr?</span>
              <textarea
                disabled={loading || saving || !canWriteSettings}
                id="settings-business-hours"
                rows={4}
                value={formValues.business_hours}
                onChange={(event) => updateField('business_hours', event.target.value)}
              />
              <small className="admin-settings-page__field-help">C? th? nh?p v?n b?n th??ng ho?c JSON n?u c?n c?u tr?c.</small>
              {fieldErrors.business_hours ? <small>{fieldErrors.business_hours}</small> : null}
            </label>
            <label className="admin-settings-page__field admin-settings-page__field--wide" htmlFor="settings-seo-description">
              <span>SEO description</span>
              <textarea
                disabled={loading || saving || !canWriteSettings}
                id="settings-seo-description"
                rows={4}
                value={formValues.seo_description}
                onChange={(event) => updateField('seo_description', event.target.value)}
              />
              {fieldErrors.seo_description ? <small>{fieldErrors.seo_description}</small> : null}
            </label>
            {SOCIAL_PLATFORM_FIELDS.map((platform) => (
              <label className="admin-settings-page__field" htmlFor={`settings-${platform.field}`} key={platform.field}>
                <span>{platform.label}</span>
                <input
                  disabled={loading || saving || !canWriteSettings}
                  id={`settings-${platform.field}`}
                  placeholder="https://..."
                  type="url"
                  value={formValues[platform.field]}
                  onChange={(event) => updateField(platform.field, event.target.value)}
                />
                {fieldErrors[platform.field] ? <small>{fieldErrors[platform.field]}</small> : null}
              </label>
            ))}
            <label className="admin-settings-page__field admin-settings-page__field--wide" htmlFor="settings-footer-text">
              <span>Footer text</span>
              <textarea
                disabled={loading || saving || !canWriteSettings}
                id="settings-footer-text"
                rows={4}
                value={formValues.footer_text}
                onChange={(event) => updateField('footer_text', event.target.value)}
              />
              {fieldErrors.footer_text ? <small>{fieldErrors.footer_text}</small> : null}
            </label>
          </div>
        </section>
      </div>
    )
  }

  function renderBusinessTab() {
    return (
      <div className="admin-settings-page__tab-panel">
        <section className="admin-settings-page__panel admin-settings-page__panel--company" aria-labelledby="settings-business-title">
          <div className="admin-settings-page__section-title">
            <span className="admin-settings-page__section-icon">
              <SettingIcon type="business" />
            </span>
            <div className="admin-settings-page__section-copy">
              <h2 id="settings-business-title">Th?ng tin ph?p l? v? xu?t h?a ??n</h2>
              <p className="admin-settings-page__panel-description">
                D?a tr?n business settings API, ph?n n?y h? tr? th?m ng??i ??i di?n, gi?y ph?p v? ghi ch? h?a ??n.
              </p>
            </div>
          </div>

          <div className="admin-settings-page__form-grid">
            <label className="admin-settings-page__field" htmlFor="settings-business-company-name">
              <span>Ten doanh nghiep</span>
              <input
                disabled={loading || saving || !canWriteSettings}
                id="settings-business-company-name"
                value={formValues.business_company_name}
                onChange={(event) => updateField('business_company_name', event.target.value)}
              />
              {fieldErrors.business_company_name || fieldErrors.company_name ? <small>{fieldErrors.business_company_name || fieldErrors.company_name}</small> : null}
            </label>
            <label className="admin-settings-page__field" htmlFor="settings-business-tax-code">
              <span>M? s? thu?</span>
              <input
                disabled={loading || saving || !canWriteSettings}
                id="settings-business-tax-code"
                value={formValues.business_tax_code}
                onChange={(event) => updateField('business_tax_code', event.target.value)}
              />
              {fieldErrors.business_tax_code || fieldErrors.tax_code ? <small>{fieldErrors.business_tax_code || fieldErrors.tax_code}</small> : null}
            </label>
            <label className="admin-settings-page__field" htmlFor="settings-business-legal-representative">
              <span>Nguoi dai dien phap luat</span>
              <input
                disabled={loading || saving || !canWriteSettings}
                id="settings-business-legal-representative"
                value={formValues.legal_representative}
                onChange={(event) => updateField('legal_representative', event.target.value)}
              />
              {fieldErrors.legal_representative ? <small>{fieldErrors.legal_representative}</small> : null}
            </label>
            <label className="admin-settings-page__field" htmlFor="settings-business-license-no">
              <span>S? gi?y ph?p kinh doanh</span>
              <input
                disabled={loading || saving || !canWriteSettings}
                id="settings-business-license-no"
                value={formValues.business_license_no}
                onChange={(event) => updateField('business_license_no', event.target.value)}
              />
              {fieldErrors.business_license_no ? <small>{fieldErrors.business_license_no}</small> : null}
            </label>
            <label className="admin-settings-page__field admin-settings-page__field--wide" htmlFor="settings-business-address">
              <span>Dia chi doanh nghiep / xuat hoa don</span>
              <input
                disabled={loading || saving || !canWriteSettings}
                id="settings-business-address"
                value={formValues.business_address}
                onChange={(event) => updateField('business_address', event.target.value)}
              />
              {fieldErrors.business_address ? <small>{fieldErrors.business_address}</small> : null}
            </label>
            <label className="admin-settings-page__field" htmlFor="settings-invoice-email">
              <span>Email nh?n h?a ??n</span>
              <input
                disabled={loading || saving || !canWriteSettings}
                id="settings-invoice-email"
                type="email"
                value={formValues.invoice_email}
                onChange={(event) => updateField('invoice_email', event.target.value)}
              />
              {fieldErrors.invoice_email ? <small>{fieldErrors.invoice_email}</small> : null}
            </label>
            <label className="admin-settings-page__field" htmlFor="settings-invoice-phone">
              <span>So dien thoai xuat hoa don</span>
              <input
                disabled={loading || saving || !canWriteSettings}
                id="settings-invoice-phone"
                value={formValues.invoice_phone}
                onChange={(event) => updateField('invoice_phone', event.target.value)}
              />
              {fieldErrors.invoice_phone ? <small>{fieldErrors.invoice_phone}</small> : null}
            </label>
            <label className="admin-settings-page__field admin-settings-page__field--wide" htmlFor="settings-invoice-note">
              <span>Ghi chu hoa don</span>
              <textarea
                disabled={loading || saving || !canWriteSettings}
                id="settings-invoice-note"
                rows={4}
                value={formValues.invoice_note}
                onChange={(event) => updateField('invoice_note', event.target.value)}
              />
              {fieldErrors.invoice_note ? <small>{fieldErrors.invoice_note}</small> : null}
            </label>
          </div>
        </section>
      </div>
    )
  }

  function renderDirectPaymentFields(method, index) {
    if (method.code === 'manual_bank_transfer') {
      return (
        <div className="admin-settings-page__form-grid admin-settings-page__form-grid--method">
          <label className="admin-settings-page__field" htmlFor={`payment-${method.code}-bank-name`}>
            <span>T?n ng?n h?ng</span>
            <input
              disabled={loading || saving || !canWriteSettings}
              id={`payment-${method.code}-bank-name`}
              value={method.bank_name || ''}
              onChange={(event) => updatePaymentMethod(index, 'bank_name', event.target.value)}
            />
            {getMethodFieldError(index, 'bank_name') ? <small>{getMethodFieldError(index, 'bank_name')}</small> : null}
          </label>
          <label className="admin-settings-page__field" htmlFor={`payment-${method.code}-account-holder`}>
            <span>Chu tai khoan</span>
            <input
              disabled={loading || saving || !canWriteSettings}
              id={`payment-${method.code}-account-holder`}
              value={method.account_holder || ''}
              onChange={(event) => updatePaymentMethod(index, 'account_holder', event.target.value)}
            />
            {getMethodFieldError(index, 'account_holder') ? <small>{getMethodFieldError(index, 'account_holder')}</small> : null}
          </label>
          <label className="admin-settings-page__field" htmlFor={`payment-${method.code}-account-number`}>
            <span>So tai khoan</span>
            <input
              disabled={loading || saving || !canWriteSettings}
              id={`payment-${method.code}-account-number`}
              value={method.account_number || ''}
              onChange={(event) => updatePaymentMethod(index, 'account_number', event.target.value)}
            />
            {getMethodFieldError(index, 'account_number') ? <small>{getMethodFieldError(index, 'account_number')}</small> : null}
          </label>
          <label className="admin-settings-page__field" htmlFor={`payment-${method.code}-branch`}>
            <span>Chi nh?nh</span>
            <input
              disabled={loading || saving || !canWriteSettings}
              id={`payment-${method.code}-branch`}
              value={method.branch || ''}
              onChange={(event) => updatePaymentMethod(index, 'branch', event.target.value)}
            />
            {getMethodFieldError(index, 'branch') ? <small>{getMethodFieldError(index, 'branch')}</small> : null}
          </label>
          <label className="admin-settings-page__field admin-settings-page__field--wide" htmlFor={`payment-${method.code}-template`}>
            <span>M?u n?i dung chuy?n kho?n</span>
            <input
              disabled={loading || saving || !canWriteSettings}
              id={`payment-${method.code}-template`}
              placeholder="Vi du: NVT {booking_code}"
              value={method.transfer_content_template || ''}
              onChange={(event) => updatePaymentMethod(index, 'transfer_content_template', event.target.value)}
            />
            {getMethodFieldError(index, 'transfer_content_template') ? <small>{getMethodFieldError(index, 'transfer_content_template')}</small> : null}
          </label>
          <label className="admin-settings-page__field admin-settings-page__field--wide" htmlFor={`payment-${method.code}-qr-code`}>
            <span>QR code URL</span>
            <input
              disabled={loading || saving || !canWriteSettings}
              id={`payment-${method.code}-qr-code`}
              placeholder="https://..."
              type="url"
              value={method.qr_code_url || ''}
              onChange={(event) => updatePaymentMethod(index, 'qr_code_url', event.target.value)}
            />
            {getMethodFieldError(index, 'qr_code_url') ? <small>{getMethodFieldError(index, 'qr_code_url')}</small> : null}
          </label>
          <label className="admin-settings-page__field admin-settings-page__field--wide" htmlFor={`payment-${method.code}-instructions`}>
            <span>H??ng d?n thanh to?n</span>
            <textarea
              disabled={loading || saving || !canWriteSettings}
              id={`payment-${method.code}-instructions`}
              rows={4}
              value={method.instructions || ''}
              onChange={(event) => updatePaymentMethod(index, 'instructions', event.target.value)}
            />
            {getMethodFieldError(index, 'instructions') ? <small>{getMethodFieldError(index, 'instructions')}</small> : null}
          </label>
        </div>
      )
    }

    if (method.code === 'cash_at_office') {
      return (
        <div className="admin-settings-page__form-grid admin-settings-page__form-grid--method">
          <label className="admin-settings-page__field admin-settings-page__field--wide" htmlFor={`payment-${method.code}-office-address`}>
            <span>Dia chi van phong</span>
            <input
              disabled={loading || saving || !canWriteSettings}
              id={`payment-${method.code}-office-address`}
              value={method.office_address || ''}
              onChange={(event) => updatePaymentMethod(index, 'office_address', event.target.value)}
            />
            {getMethodFieldError(index, 'office_address') ? <small>{getMethodFieldError(index, 'office_address')}</small> : null}
          </label>
          <label className="admin-settings-page__field" htmlFor={`payment-${method.code}-working-hours`}>
            <span>Khung gio lam viec</span>
            <input
              disabled={loading || saving || !canWriteSettings}
              id={`payment-${method.code}-working-hours`}
              value={method.working_hours || ''}
              onChange={(event) => updatePaymentMethod(index, 'working_hours', event.target.value)}
            />
            {getMethodFieldError(index, 'working_hours') ? <small>{getMethodFieldError(index, 'working_hours')}</small> : null}
          </label>
          <label className="admin-settings-page__field" htmlFor={`payment-${method.code}-hotline`}>
            <span>Hotline h? tr?</span>
            <input
              disabled={loading || saving || !canWriteSettings}
              id={`payment-${method.code}-hotline`}
              value={method.hotline || ''}
              onChange={(event) => updatePaymentMethod(index, 'hotline', event.target.value)}
            />
            {getMethodFieldError(index, 'hotline') ? <small>{getMethodFieldError(index, 'hotline')}</small> : null}
          </label>
          <label className="admin-settings-page__field admin-settings-page__field--wide" htmlFor={`payment-${method.code}-instructions`}>
            <span>H??ng d?n nh?n ti?n</span>
            <textarea
              disabled={loading || saving || !canWriteSettings}
              id={`payment-${method.code}-instructions`}
              rows={4}
              value={method.instructions || ''}
              onChange={(event) => updatePaymentMethod(index, 'instructions', event.target.value)}
            />
            {getMethodFieldError(index, 'instructions') ? <small>{getMethodFieldError(index, 'instructions')}</small> : null}
          </label>
        </div>
      )
    }

    return (
      <div className="admin-settings-page__form-grid admin-settings-page__form-grid--method">
        <label className="admin-settings-page__field" htmlFor={`payment-${method.code}-hotline`}>
          <span>Hotline dieu phoi</span>
          <input
            disabled={loading || saving || !canWriteSettings}
            id={`payment-${method.code}-hotline`}
            value={method.hotline || ''}
            onChange={(event) => updatePaymentMethod(index, 'hotline', event.target.value)}
          />
          {getMethodFieldError(index, 'hotline') ? <small>{getMethodFieldError(index, 'hotline')}</small> : null}
        </label>
        <label className="admin-settings-page__field admin-settings-page__field--wide" htmlFor={`payment-${method.code}-conditions`}>
          <span>Dieu kien ap dung</span>
          <textarea
            disabled={loading || saving || !canWriteSettings}
            id={`payment-${method.code}-conditions`}
            rows={3}
            value={method.conditions || ''}
            onChange={(event) => updatePaymentMethod(index, 'conditions', event.target.value)}
          />
          {getMethodFieldError(index, 'conditions') ? <small>{getMethodFieldError(index, 'conditions')}</small> : null}
        </label>
        <label className="admin-settings-page__field admin-settings-page__field--wide" htmlFor={`payment-${method.code}-instructions`}>
          <span>Huong dan thuc hien</span>
          <textarea
            disabled={loading || saving || !canWriteSettings}
            id={`payment-${method.code}-instructions`}
            rows={4}
            value={method.instructions || ''}
            onChange={(event) => updatePaymentMethod(index, 'instructions', event.target.value)}
          />
          {getMethodFieldError(index, 'instructions') ? <small>{getMethodFieldError(index, 'instructions')}</small> : null}
        </label>
      </div>
    )
  }

  function renderDirectPaymentTab() {
    return (
      <div className="admin-settings-page__tab-panel">
        <section className="admin-settings-page__panel admin-settings-page__panel--company" aria-labelledby="settings-direct-payment-title">
          <div className="admin-settings-page__section-title">
            <span className="admin-settings-page__section-icon">
              <SettingIcon type="payment" />
            </span>
            <div className="admin-settings-page__section-copy">
              <h2 id="settings-direct-payment-title">C?u h?nh ph??ng th?c thanh to?n tr?c ti?p</h2>
              <p className="admin-settings-page__panel-description">
                Backend hi?n h? tr? ba ph??ng th?c: t?i v?n ph?ng, chuy?n kho?n th? c?ng v? nh?n vi?n thu h?.
              </p>
            </div>
          </div>

          {paymentMethods.length === 0 ? (
            <p className="admin-settings-page__hint">Ch?a c? c?u h?nh ph??ng th?c thanh to?n tr?c ti?p.</p>
          ) : (
            <div className="admin-settings-page__method-list">
              {paymentMethods.map((method, index) => (
                <article className="admin-settings-page__method-card" key={method.code}>
                  <div className="admin-settings-page__method-header">
                    <div className="admin-settings-page__method-copy">
                      <span className="admin-settings-page__method-code">{method.code}</span>
                      <h3>{DIRECT_PAYMENT_METHOD_LABELS[method.code] || method.display_name || method.code}</h3>
                      <p>{DIRECT_PAYMENT_METHOD_DESCRIPTIONS[method.code] || 'Cau hinh hien thi va huong dan cong khai cho phuong thuc nay.'}</p>
                    </div>

                    <div className="admin-settings-page__method-actions">
                      <label className="admin-settings-page__field" htmlFor={`payment-${method.code}-display-name`}>
                        <span>Ten hien thi</span>
                        <input
                          disabled={loading || saving || !canWriteSettings}
                          id={`payment-${method.code}-display-name`}
                          value={method.display_name || ''}
                          onChange={(event) => updatePaymentMethod(index, 'display_name', event.target.value)}
                        />
                        {getMethodFieldError(index, 'display_name') ? <small>{getMethodFieldError(index, 'display_name')}</small> : null}
                      </label>

                      <div className="admin-settings-page__method-toggle">
                        <span className="admin-settings-page__method-state">{method.enabled ? '?ang b?t' : '?ang t?t'}</span>
                        <button
                          aria-checked={method.enabled}
                          className="admin-settings-page__switch"
                          disabled={loading || saving || !canWriteSettings}
                          role="switch"
                          type="button"
                          onClick={() => updatePaymentMethod(index, 'enabled', !method.enabled)}
                        >
                          <span />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="admin-settings-page__method-meta">
                    <label className="admin-settings-page__field" htmlFor={`payment-${method.code}-sort-order`}>
                      <span>Thu tu hien thi</span>
                      <input
                        disabled={loading || saving || !canWriteSettings}
                        id={`payment-${method.code}-sort-order`}
                        min="0"
                        type="number"
                        value={method.sort_order ?? 0}
                        onChange={(event) => updatePaymentMethod(index, 'sort_order', Number(event.target.value))}
                      />
                      {getMethodFieldError(index, 'sort_order') ? <small>{getMethodFieldError(index, 'sort_order')}</small> : null}
                    </label>
                  </div>

                  {renderDirectPaymentFields(method, index)}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    )
  }

  const summaryItems = useMemo(() => {
    if (activeTabId === 'business') {
      return [
        ['Doanh nghi?p', formValues.business_company_name || 'Ch?a c?p nh?t'],
        ['M? s? thu?', formValues.business_tax_code || 'Ch?a c?p nh?t'],
        ['Email h?a ??n', formValues.invoice_email || 'Ch?a c?p nh?t'],
      ]
    }

    if (activeTabId === 'direct-payment') {
      return [
        ['Ph??ng th?c ?ang b?t', `${enabledPaymentCount}/${paymentMethods.length}`],
        ['Chuy?n kho?n th? c?ng', paymentMethods.find((method) => method.code === 'manual_bank_transfer')?.enabled ? '?ang b?t' : '?ang t?t'],
        ['Thu t?i v?n ph?ng', paymentMethods.find((method) => method.code === 'cash_at_office')?.enabled ? '?ang b?t' : '?ang t?t'],
      ]
    }

    return [
      ['T?n website', formValues.public_site_name || 'Ch?a c?p nh?t'],
      ['Hotline c?ng khai', formValues.public_hotline || 'Ch?a c?p nh?t'],
      ['Mang xa hoi', `${configuredSocialCount} kenh`],
    ]
  }, [activeTabId, configuredSocialCount, enabledPaymentCount, formValues, paymentMethods])

  return (
    <main className="admin-settings-page">
      <header className="admin-settings-page__header">
        <h1>C?u h?nh h? th?ng</h1>
        <p>Qu?n l? th?ng tin public, doanh nghi?p v? tr?ng th?i thanh to?n tr?c ti?p t? backend API.</p>
      </header>

      <nav className="admin-settings-page__tabs" aria-label="Nh?m c?u h?nh h? th?ng">
        {SETTINGS_TABS.map((tab) => (
          <button
            aria-current={activeTabId === tab.id ? 'page' : undefined}
            className={activeTabId === tab.id ? 'is-active' : ''}
            key={tab.id}
            type="button"
            onClick={() => setActiveTabId(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {error ? <p className="admin-settings-page__feedback admin-settings-page__feedback--error" role="alert">{error}</p> : null}
      {feedback ? <p className="admin-settings-page__feedback" role="status">{feedback}</p> : null}

      <form className="admin-settings-page__workspace" onSubmit={handleSubmit}>
        <div className="admin-settings-page__main-column">
          {activeTabId === 'general' ? renderGeneralTab() : null}
          {activeTabId === 'business' ? renderBusinessTab() : null}
          {activeTabId === 'direct-payment' ? renderDirectPaymentTab() : null}
        </div>

        <aside className="admin-settings-page__panel admin-settings-page__status-panel" aria-labelledby="settings-status-title">
          <h2 id="settings-status-title">{activeTab.summaryTitle}</h2>
          <p className="admin-settings-page__panel-description">{activeTab.description}</p>

          <div className="admin-settings-page__status-list">
            <div className="admin-settings-page__status-item">
              <span>Tab ?ang m?</span>
              <strong>{activeTab.label}</strong>
            </div>
            <div className="admin-settings-page__status-item">
              <span>L?n c?p nh?t g?n nh?t</span>
              <strong>{formatDateTime(activeTabUpdatedAt)}</strong>
            </div>
            {summaryItems.map(([label, value]) => (
              <div className="admin-settings-page__status-item" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <button
            className="admin-settings-page__save"
            disabled={loading || saving || !canWriteSettings}
            type="submit"
          >
            {saving ? '?ang l?u...' : `L?u ${activeTab.label.toLowerCase()}`}
          </button>

          {!canWriteSettings ? (
            <p className="admin-settings-page__hint">T?i kho?n hi?n t?i ch? c? quy?n xem c?u h?nh, ch?a th? ch?nh s?a.</p>
          ) : null}
        </aside>

        {loading ? <LocalLoading className="admin-settings-page__feedback" minHeight="160px" /> : null}
      </form>
    </main>
  )
}

export default AdminSettingsPage
