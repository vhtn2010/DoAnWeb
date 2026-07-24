import { useEffect, useMemo, useState } from 'react'
import {
  PublicButton,
  PublicEmptyState,
  PublicLoadingBlock,
  PublicNotice,
  PublicPagination,
  PublicSectionHeader,
} from '../public/ui/index.js'
import {
  getCurrentProfileLogs,
  requestAccountDeactivation,
  updateCurrentPassword,
} from '../../repositories/profileRepository.js'
import './profileAccountCenter.css'

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatDateTime(value) {
  const parsedDate = value ? new Date(value) : null

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return 'Đang cập nhật'
  }

  return dateTimeFormatter.format(parsedDate)
}

function normalizeLogAction(action = '') {
  return String(action).trim().toLowerCase()
}

const DISPLAYABLE_LOG_ACTIONS = new Set([
  'account.deactivation_requested',
  'admin.booking.complete',
  'admin.booking.confirm',
  'admin.booking.status_override',
  'auth.change_email_confirmed',
  'auth.change_email_requested',
  'auth.reset_password',
  'auth.verify_email',
  'customer.booking.checkout',
  'customer.booking.contact_update',
  'payment.direct.confirm',
  'profile.avatar_update',
  'profile.change_password',
  'profile.update',
])

const DISPLAYABLE_BOOKING_STATUSES = new Set([
  'completed',
  'confirmed',
  'paid',
  'pending_payment',
])

const BOOKING_STATUS_LABELS = {
  completed: 'đã hoàn thành',
  confirmed: 'đã được xác nhận',
  paid: 'đã thanh toán',
  pending_payment: 'đã được đặt và đang chờ thanh toán',
}

function tokenizeLogAction(action = '') {
  return normalizeLogAction(action)
    .replace(/[._]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function getFriendlyFieldLabel(field = '') {
  const normalizedField = String(field).trim().toLowerCase()

  if (normalizedField === 'email') {
    return 'email liên hệ'
  }

  if (normalizedField === 'phone') {
    return 'số điện thoại'
  }

  if (normalizedField === 'full_name') {
    return 'tên hiển thị'
  }

  if (normalizedField === 'avatar_url') {
    return 'ảnh đại diện'
  }

  return ''
}

function getLogMetadata(logItem) {
  return logItem?.metadata && typeof logItem.metadata === 'object' ? logItem.metadata : {}
}

function getBookingCodeLabel(metadata = {}) {
  const bookingCode = String(metadata.booking_code ?? '').trim()

  return bookingCode ? ` ${bookingCode}` : ''
}

function getBookingStatusLabel(status = '') {
  const normalizedStatus = String(status).trim().toLowerCase()

  return BOOKING_STATUS_LABELS[normalizedStatus] || ''
}

function getBookingLogDescription(logItem) {
  const normalizedAction = normalizeLogAction(logItem?.action)
  const metadata = getLogMetadata(logItem)
  const bookingCodeLabel = getBookingCodeLabel(metadata)

  if (normalizedAction === 'customer.booking.checkout') {
    return `Đơn hàng${bookingCodeLabel} đã được tạo và đang chờ thanh toán.`
  }

  if (normalizedAction === 'customer.booking.contact_update') {
    return `Bạn đã cập nhật thông tin liên hệ cho đơn hàng${bookingCodeLabel}.`
  }

  if (normalizedAction === 'payment.direct.confirm') {
    return `Đơn hàng${bookingCodeLabel} đã thanh toán thành công.`
  }

  if (normalizedAction === 'admin.booking.confirm') {
    return `Đơn hàng${bookingCodeLabel} đã được xác nhận.`
  }

  if (normalizedAction === 'admin.booking.complete') {
    return `Đơn hàng${bookingCodeLabel} đã hoàn thành.`
  }

  if (normalizedAction === 'admin.booking.status_override') {
    const nextStatusLabel = getBookingStatusLabel(metadata.to_status)

    if (nextStatusLabel) {
      return `Đơn hàng${bookingCodeLabel} ${nextStatusLabel}.`
    }
  }

  return ''
}

function getFallbackLogDescription(action = '') {
  const tokens = tokenizeLogAction(action)

  if (!tokens.length) {
    return 'Tài khoản của bạn vừa có thay đổi mới.'
  }

  const filteredTokens = tokens.filter(
    (token) => token !== 'auth' && token !== 'profile' && token !== 'account',
  )

  if (!filteredTokens.length) {
    return 'Tài khoản của bạn vừa có thay đổi mới.'
  }

  return `Hệ thống vừa ghi nhận thao tác: ${filteredTokens.join(' ')}.`
}

function getLogDescription(logItem) {
  const normalizedAction = normalizeLogAction(logItem?.action)
  const metadata = getLogMetadata(logItem)
  const changedFields = Array.isArray(metadata?.changed_fields)
    ? metadata.changed_fields.map(getFriendlyFieldLabel).filter(Boolean)
    : []
  const bookingDescription = getBookingLogDescription(logItem)

  if (bookingDescription) {
    return bookingDescription
  }

  if (normalizedAction === 'profile.change_password') {
    return 'Bạn đã đổi mật khẩu tài khoản.'
  }

  if (normalizedAction === 'profile.avatar_update') {
    return 'Bạn đã cập nhật ảnh đại diện.'
  }

  if (normalizedAction === 'account.deactivation_requested') {
    return 'Bạn đã gửi yêu cầu vô hiệu hóa tài khoản.'
  }

  if (normalizedAction === 'profile.update') {
    if (changedFields.length === 1) {
      return `Bạn đã cập nhật ${changedFields[0]}.`
    }

    if (changedFields.length > 1) {
      return 'Bạn đã cập nhật thông tin hồ sơ.'
    }

    return 'Bạn đã cập nhật hồ sơ tài khoản.'
  }

  if (
    normalizedAction === 'auth.login.success' ||
    normalizedAction === 'auth login success' ||
    normalizedAction === 'auth.login_success'
  ) {
    return 'Bạn đã đăng nhập vào tài khoản.'
  }

  if (
    normalizedAction === 'auth.refresh_token' ||
    normalizedAction === 'auth refresh token'
  ) {
    return 'Phiên đăng nhập của bạn vừa được làm mới để tiếp tục an toàn.'
  }

  if (normalizedAction === 'auth.logout') {
    return 'Bạn đã đăng xuất khỏi tài khoản.'
  }

  if (normalizedAction === 'auth.register') {
    return 'Tài khoản của bạn đã được tạo thành công.'
  }

  if (normalizedAction === 'auth.change_email_requested') {
    return 'Bạn đã yêu cầu thay đổi email liên hệ.'
  }

  if (normalizedAction === 'auth.change_email_confirmed') {
    return 'Bạn đã xác nhận thay đổi email liên hệ.'
  }

  if (normalizedAction === 'auth.forgot_password_requested') {
    return 'Bạn đã yêu cầu đặt lại mật khẩu.'
  }

  if (normalizedAction === 'auth.reset_password') {
    return 'Bạn đã đặt lại mật khẩu tài khoản.'
  }

  if (normalizedAction === 'auth.verify_email') {
    return 'Bạn đã xác thực email tài khoản.'
  }

  if (normalizedAction === 'auth.resend_verification') {
    return 'Bạn đã yêu cầu gửi lại email xác thực.'
  }

  return getFallbackLogDescription(logItem?.action)
}

function shouldDisplayLog(logItem) {
  const normalizedAction = normalizeLogAction(logItem?.action)

  if (!DISPLAYABLE_LOG_ACTIONS.has(normalizedAction)) {
    return false
  }

  if (normalizedAction === 'admin.booking.status_override') {
    const metadata = getLogMetadata(logItem)
    return DISPLAYABLE_BOOKING_STATUSES.has(String(metadata.to_status ?? '').trim().toLowerCase())
  }

  return Boolean(getLogDescription(logItem))
}

function createPasswordState() {
  return {
    confirmPassword: '',
    currentPassword: '',
    newPassword: '',
  }
}

function getPasswordValidationMessage(passwordForm) {
  if (passwordForm.newPassword === passwordForm.currentPassword) {
    return 'Mật khẩu mới cần khác mật khẩu hiện tại.'
  }

  if (passwordForm.newPassword.length < 8) {
    return 'Mật khẩu mới cần có ít nhất 8 ký tự.'
  }

  if (!/[a-z]/.test(passwordForm.newPassword)) {
    return 'Mật khẩu mới cần có ít nhất 1 chữ thường.'
  }

  if (!/[A-Z]/.test(passwordForm.newPassword)) {
    return 'Mật khẩu mới cần có ít nhất 1 chữ hoa.'
  }

  if (!/\d/.test(passwordForm.newPassword)) {
    return 'Mật khẩu mới cần có ít nhất 1 chữ số.'
  }

  return ''
}

function getPasswordApiErrorMessage(error) {
  if (error?.code === 'AUTH_INVALID_CREDENTIALS') {
    return 'Mật khẩu hiện tại không đúng.'
  }

  const firstDetail = Array.isArray(error?.details) ? error.details[0] : null

  if (!firstDetail) {
    return error?.message || 'Không thể đổi mật khẩu lúc này.'
  }

  const messageMap = {
    'current_password is required': 'Vui lòng nhập mật khẩu hiện tại.',
    'new_password is required': 'Vui lòng nhập mật khẩu mới.',
    'new_password must be different from current_password': 'Mật khẩu mới cần khác mật khẩu hiện tại.',
    'new_password must include at least one lowercase letter': 'Mật khẩu mới cần có ít nhất 1 chữ thường.',
    'new_password must include at least one uppercase letter': 'Mật khẩu mới cần có ít nhất 1 chữ hoa.',
    'new_password must include at least one number': 'Mật khẩu mới cần có ít nhất 1 chữ số.',
  }

  if (firstDetail.message?.startsWith('new_password must be at least')) {
    return 'Mật khẩu mới cần có ít nhất 8 ký tự.'
  }

  return messageMap[firstDetail.message] || firstDetail.message || 'Không thể đổi mật khẩu lúc này.'
}

function EyeIcon({ visible }) {
  if (visible) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path
          d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M3 3 21 21M10.7 6A10.3 10.3 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15.7 15.7 0 0 1-4 4.7M14.5 14.7A3 3 0 0 1 9.3 9.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M6.8 6.8A15.9 15.9 0 0 0 2.5 12S6 18.5 12 18.5c1.8 0 3.3-.6 4.5-1.4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function PasswordInput({
  autoComplete,
  label,
  name,
  onChange,
  onToggleVisibility,
  value,
  visible,
}) {
  return (
    <label className="profile-account-center__field">
      <span>{label}</span>
      <div className="profile-account-center__password-control">
        <input
          autoComplete={autoComplete}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
        />
        <button
          aria-label={visible ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
          className="profile-account-center__password-toggle"
          type="button"
          onClick={() => onToggleVisibility(name)}
        >
          <EyeIcon visible={visible} />
        </button>
      </div>
    </label>
  )
}

function ChevronIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path
        d="M7.25 5.5 11.75 10l-4.5 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function AccountPanelIcon({ type }) {
  if (type === 'danger') {
    return (
      <svg fill="none" viewBox="0 0 20 20">
        <path
          d="M10 2.75 17.25 16H2.75L10 2.75Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="M10 7.25v3.8M10 14h.01"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  if (type === 'activity') {
    return (
      <svg fill="none" viewBox="0 0 20 20">
        <path
          d="M4 4.75h12M4 10h12M4 15.25h7"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.7"
        />
      </svg>
    )
  }

  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path
        d="M5.5 8.75V6.8a4.5 4.5 0 0 1 9 0v1.95"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
      <path
        d="M4.75 8.5h10.5a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H4.75a1.5 1.5 0 0 1-1.5-1.5v-5a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function AccountAccordionItem({
  children,
  description,
  id,
  isOpen,
  onToggle,
  title,
  type,
}) {
  return (
    <article
      className={`profile-account-center__accordion-item${
        isOpen ? ' profile-account-center__accordion-item--open' : ''
      }`}
    >
      <button
        aria-expanded={isOpen}
        className="profile-account-center__accordion-trigger"
        type="button"
        onClick={() => onToggle(id)}
      >
        <span className="profile-account-center__accordion-icon" aria-hidden="true">
          <AccountPanelIcon type={type} />
        </span>
        <span className="profile-account-center__accordion-copy">
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <span className="profile-account-center__accordion-arrow" aria-hidden="true">
          <ChevronIcon />
        </span>
      </button>

      {isOpen ? <div className="profile-account-center__accordion-body">{children}</div> : null}
    </article>
  )
}

export default function ProfileAccountCenter() {
  const [passwordForm, setPasswordForm] = useState(createPasswordState)
  const [openPanel, setOpenPanel] = useState('')
  const [visiblePasswords, setVisiblePasswords] = useState({
    confirmPassword: false,
    currentPassword: false,
    newPassword: false,
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState({
    message: '',
    tone: 'info',
  })
  const [deactivationReason, setDeactivationReason] = useState('')
  const [deactivationLoading, setDeactivationLoading] = useState(false)
  const [deactivationFeedback, setDeactivationFeedback] = useState({
    message: '',
    tone: 'info',
  })
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logsError, setLogsError] = useState('')
  const [logsMeta, setLogsMeta] = useState({
    page: 1,
    total: 0,
    total_pages: 0,
  })
  const [reloadToken, setReloadToken] = useState(0)


  useEffect(() => {
    let isActive = true

    async function loadLogs() {
      setLogsLoading(true)
      setLogsError('')

      try {
        const response = await getCurrentProfileLogs({
          limit: 4,
          page: logsMeta.page,
        })

        if (!isActive) {
          return
        }

        setLogs(Array.isArray(response.data) ? response.data : [])
        setLogsMeta((currentMeta) => ({
          ...currentMeta,
          ...(response.meta ?? {}),
        }))
      } catch (error) {
        if (!isActive) {
          return
        }

        setLogs([])
        setLogsError(error?.message || 'Không thể tải lịch sử hoạt động lúc này.')
      } finally {
        if (isActive) {
          setLogsLoading(false)
        }
      }
    }

    loadLogs()

    return () => {
      isActive = false
    }
  }, [logsMeta.page, reloadToken])

  const hasPendingDeactivationRequest = useMemo(
    () =>
      logs.some(
        (logItem) =>
          String(logItem.action).trim().toLowerCase() === 'account.deactivation_requested' &&
          logItem.metadata?.request_status === 'requested',
      ),
    [logs],
  )
  const visibleLogs = useMemo(() => logs.filter(shouldDisplayLog), [logs])

  function handlePasswordFieldChange(event) {
    const { name, value } = event.target

    setPasswordForm((currentState) => ({
      ...currentState,
      [name]: value,
    }))
    setPasswordFeedback({
      message: '',
      tone: 'info',
    })
  }

  function handleTogglePasswordVisibility(fieldName) {
    setVisiblePasswords((currentState) => ({
      ...currentState,
      [fieldName]: !currentState[fieldName],
    }))
  }

  function handleTogglePanel(panelId) {
    setOpenPanel((currentPanel) => (currentPanel === panelId ? '' : panelId))
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setPasswordFeedback({
        message: 'Vui lòng nhập đủ mật khẩu hiện tại, mật khẩu mới và phần xác nhận.',
        tone: 'error',
      })
      return
    }

    const passwordPolicyMessage = getPasswordValidationMessage(passwordForm)

    if (passwordPolicyMessage) {
      setPasswordFeedback({
        message: passwordPolicyMessage,
        tone: 'error',
      })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordFeedback({
        message: 'Xác nhận mật khẩu mới chưa khớp.',
        tone: 'error',
      })
      return
    }

    setPasswordLoading(true)

    try {
      const response = await updateCurrentPassword({
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
      })

      setPasswordForm(createPasswordState())
      setVisiblePasswords({
        confirmPassword: false,
        currentPassword: false,
        newPassword: false,
      })
      setPasswordFeedback({
        message: response?.message || 'Mật khẩu đã được cập nhật thành công.',
        tone: 'success',
      })
      setReloadToken((value) => value + 1)
    } catch (error) {
      setPasswordFeedback({
        message: getPasswordApiErrorMessage(error),
        tone: 'error',
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  async function handleDeactivationSubmit(event) {
    event.preventDefault()

    const trimmedReason = deactivationReason.trim()

    if (!trimmedReason) {
      setDeactivationFeedback({
        message: 'Vui lòng nhập lý do trước khi gửi yêu cầu.',
        tone: 'error',
      })
      return
    }

    setDeactivationLoading(true)

    try {
      const response = await requestAccountDeactivation({
        reason: trimmedReason,
      })

      setDeactivationReason('')
      setDeactivationFeedback({
        message:
          response?.message ||
          'Yêu cầu vô hiệu hóa tài khoản đã được gửi tới hệ thống.',
        tone: 'success',
      })
      setReloadToken((value) => value + 1)
    } catch (error) {
      setDeactivationFeedback({
        message: error?.message || 'Không thể gửi yêu cầu vô hiệu hóa tài khoản.',
        tone: 'error',
      })
    } finally {
      setDeactivationLoading(false)
    }
  }

  return (
    <section className="profile-account-center">
      <PublicSectionHeader
        eyebrow="Bảo mật & nhật ký"
        subtitle="Chọn từng mục bên dưới để cập nhật bảo mật hoặc xem các hoạt động quan trọng."
        title="Trung tâm tài khoản"
      />

      <div className="profile-account-center__accordion">
        <AccountAccordionItem
          description="Xác nhận mật khẩu hiện tại trước khi lưu mật khẩu mới."
          id="password"
          isOpen={openPanel === 'password'}
          title="Đổi mật khẩu"
          type="password"
          onToggle={handleTogglePanel}
        >
          {passwordFeedback.message ? (
            <PublicNotice
              className="profile-account-center__feedback"
              role="status"
              tone={passwordFeedback.tone === 'error' ? 'info' : passwordFeedback.tone}
            >
              {passwordFeedback.message}
            </PublicNotice>
          ) : null}

          <form className="profile-account-center__form" onSubmit={handlePasswordSubmit}>
            <PasswordInput
              autoComplete="current-password"
              label="Mật khẩu hiện tại"
              name="currentPassword"
              value={passwordForm.currentPassword}
              visible={visiblePasswords.currentPassword}
              onChange={handlePasswordFieldChange}
              onToggleVisibility={handleTogglePasswordVisibility}
            />

            <PasswordInput
              autoComplete="new-password"
              label="Mật khẩu mới"
              name="newPassword"
              value={passwordForm.newPassword}
              visible={visiblePasswords.newPassword}
              onChange={handlePasswordFieldChange}
              onToggleVisibility={handleTogglePasswordVisibility}
            />

            <PasswordInput
              autoComplete="new-password"
              label="Xác nhận mật khẩu mới"
              name="confirmPassword"
              value={passwordForm.confirmPassword}
              visible={visiblePasswords.confirmPassword}
              onChange={handlePasswordFieldChange}
              onToggleVisibility={handleTogglePasswordVisibility}
            />

            <div className="profile-account-center__actions">
              <PublicButton loading={passwordLoading} type="submit" variant="primary">
                Lưu mật khẩu mới
              </PublicButton>
            </div>

            <a className="profile-account-center__forgot-link" href="/forgot-password">
              Quên mật khẩu?
            </a>
          </form>
        </AccountAccordionItem>

        <AccountAccordionItem
          description="Gửi yêu cầu tạm ngưng tài khoản để đội ngũ hỗ trợ xử lý."
          id="deactivation"
          isOpen={openPanel === 'deactivation'}
          title="Yêu cầu vô hiệu hóa tài khoản"
          type="danger"
          onToggle={handleTogglePanel}
        >
          {deactivationFeedback.message ? (
            <PublicNotice
              className="profile-account-center__feedback"
              role="status"
              tone={deactivationFeedback.tone === 'error' ? 'info' : deactivationFeedback.tone}
            >
              {deactivationFeedback.message}
            </PublicNotice>
          ) : null}

          {hasPendingDeactivationRequest ? (
            <PublicNotice tone="info">
              Hệ thống đang ghi nhận một yêu cầu vô hiệu hóa tài khoản ở trạng thái chờ xử lý.
            </PublicNotice>
          ) : null}

          <form className="profile-account-center__form" onSubmit={handleDeactivationSubmit}>
            <label className="profile-account-center__field">
              <span>Lý do</span>
              <textarea
                name="reason"
                placeholder="Ví dụ: Tôi không còn nhu cầu sử dụng tài khoản này nữa."
                value={deactivationReason}
                onChange={(event) => {
                  setDeactivationReason(event.target.value)
                  setDeactivationFeedback({
                    message: '',
                    tone: 'info',
                  })
                }}
              />
            </label>

            <div className="profile-account-center__actions">
              <PublicButton
                disabled={hasPendingDeactivationRequest}
                loading={deactivationLoading}
                type="submit"
                variant="secondary"
              >
                Gửi yêu cầu
              </PublicButton>
            </div>
          </form>
        </AccountAccordionItem>

        <AccountAccordionItem
          description="Theo dõi các cập nhật quan trọng về đơn hàng và tài khoản."
          id="activity"
          isOpen={openPanel === 'activity'}
          title="Hoạt động gần đây"
          type="activity"
          onToggle={handleTogglePanel}
        >
          {logsLoading ? <PublicLoadingBlock rows={4} /> : null}

          {!logsLoading && logsError ? (
            <PublicNotice tone="info">{logsError}</PublicNotice>
          ) : null}

          {!logsLoading && !logsError && visibleLogs.length === 0 ? (
            <PublicEmptyState
              description="Khi có cập nhật trạng thái đơn hàng, đổi mật khẩu hoặc thay đổi hồ sơ, lịch sử sẽ hiện tại đây."
              eyebrow="Chưa có dữ liệu"
              title="Chưa có hoạt động gần đây"
            />
          ) : null}

          {!logsLoading && visibleLogs.length > 0 ? (
            <>
              <div className="profile-account-center__log-list">
                {visibleLogs.map((logItem) => (
                  <article className="profile-account-center__log-item" key={logItem.id}>
                    <div className="profile-account-center__log-head">
                      <span>{formatDateTime(logItem.created_at)}</span>
                    </div>

                    <p>{getLogDescription(logItem)}</p>
                  </article>
                ))}
              </div>

              <PublicPagination
                currentPage={logsMeta.page}
                onPageChange={(page) => {
                  setLogsMeta((currentMeta) => ({
                    ...currentMeta,
                    page,
                  }))
                }}
                totalPages={logsMeta.total_pages}
              />
            </>
          ) : null}
        </AccountAccordionItem>
      </div>
    </section>
  )
}
