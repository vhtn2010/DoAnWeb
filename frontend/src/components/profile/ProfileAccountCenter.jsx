import { useEffect, useMemo, useState } from 'react'
import {
  PublicButton,
  PublicCard,
  PublicEmptyState,
  PublicLoadingBlock,
  PublicNotice,
  PublicPagination,
  PublicSectionHeader,
} from '../public/ui/index.js'
import {
  getCurrentProfileLogs,
  requestAccountDeactivation,
  updateCurrentAvatar,
  updateCurrentPassword,
} from '../../repositories/profileRepository.js'
import { uploadAvatarAsset } from '../../adapters/api/uploadApiAdapter.js'
import './profileAccountCenter.css'

function UploadIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M12 15.5V4.75m0 0-4.25 4.25M12 4.75 16.25 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
      <path
        d="M5.25 14.25v2.5A2.75 2.75 0 0 0 8 19.5h8a2.75 2.75 0 0 0 2.75-2.75v-2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
    </svg>
  )
}

function SwapIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M7.25 7.75h9.5l-2.3-2.3M16.75 16.25h-9.5l2.3 2.3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
      <path
        d="M16.75 7.75c1.65 0 3 1.35 3 3v.75M7.25 16.25c-1.65 0-3-1.35-3-3v-.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
    </svg>
  )
}

function XIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M7.25 7.25 16.75 16.75M16.75 7.25 7.25 16.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
    </svg>
  )
}

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

export default function ProfileAccountCenter({ onProfileUpdated } = {}) {
  const [passwordForm, setPasswordForm] = useState(createPasswordState)
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
  const [avatarFeedback, setAvatarFeedback] = useState({
    message: '',
    tone: 'info',
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarFileName, setAvatarFileName] = useState('')
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState({
    isObjectUrl: false,
    url: '',
  })
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!avatarPreview.isObjectUrl || !avatarPreview.url) {
      return undefined
    }

    const previewUrl = avatarPreview.url

    return () => {
      URL.revokeObjectURL(previewUrl)
    }
  }, [avatarPreview])

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

    if (passwordForm.newPassword.length < 8) {
      setPasswordFeedback({
        message: 'Mật khẩu mới cần có ít nhất 8 ký tự.',
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
      setPasswordFeedback({
        message: response?.message || 'Mật khẩu đã được cập nhật thành công.',
        tone: 'success',
      })
      setReloadToken((value) => value + 1)
    } catch (error) {
      setPasswordFeedback({
        message: error?.message || 'Không thể đổi mật khẩu lúc này.',
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

  function resetAvatarSelection() {
    setAvatarFile(null)
    setAvatarFileName('')
    setAvatarPreview({
      isObjectUrl: false,
      url: '',
    })
  }

  function handleAvatarChange(event) {
    const nextFile = event.target.files?.[0]

    if (!nextFile) {
      return
    }

    if (!nextFile.type.startsWith('image/')) {
      setAvatarFeedback({
        message: 'Vui lòng chọn đúng tệp ảnh để cập nhật avatar.',
        tone: 'error',
      })
      event.target.value = ''
      return
    }

    setAvatarFile(nextFile)
    setAvatarFileName(nextFile.name)
    setAvatarPreview({
      isObjectUrl: true,
      url: URL.createObjectURL(nextFile),
    })
    setAvatarFeedback({
      message: '',
      tone: 'info',
    })
    event.target.value = ''
  }

  async function handleAvatarConfirm() {
    if (!avatarFile) {
      setAvatarFeedback({
        message: 'Vui lòng chọn ảnh đại diện trước khi xác nhận.',
        tone: 'error',
      })
      return
    }

    setAvatarLoading(true)
    setAvatarFeedback({
      message: 'Đang tải ảnh lên và cập nhật avatar...',
      tone: 'info',
    })

    try {
      const uploadResponse = await uploadAvatarAsset(avatarFile)
      const avatarUrl = uploadResponse.data?.asset_url ?? uploadResponse.data?.secure_url

      if (!avatarUrl) {
        throw new Error('Không nhận được URL avatar hợp lệ sau khi tải ảnh lên.')
      }

      const response = await updateCurrentAvatar({
        avatar_url: avatarUrl,
      })

      resetAvatarSelection()
      setAvatarFeedback({
        message: 'Ảnh đại diện đã được cập nhật thành công.',
        tone: 'success',
      })
      onProfileUpdated?.(response?.data)
      setReloadToken((value) => value + 1)
    } catch (error) {
      setAvatarFeedback({
        message: error?.message || 'Không thể cập nhật ảnh đại diện lúc này.',
        tone: 'error',
      })
    } finally {
      setAvatarLoading(false)
    }
  }

  return (
    <section className="profile-account-center">
      <PublicSectionHeader
        eyebrow="Bảo mật & nhật ký"
        subtitle="Các API tài khoản cá nhân đã được nối vào khu vực này để bạn tự theo dõi và thao tác trực tiếp."
        title="Trung tâm tài khoản"
      />

      <div className="profile-account-center__grid">
        <div className="profile-account-center__stack">
          <PublicCard className="profile-account-center__card" padding="lg">
            <PublicSectionHeader
              actions={
                avatarPreview.url ? null : (
                  <label className="public-ui-button public-ui-button--ghost public-ui-button--md">
                    <input
                      accept="image/*"
                      disabled={avatarLoading}
                      hidden
                      type="file"
                      onChange={handleAvatarChange}
                    />
                    <span className="profile-account-center__avatar-action-icon" aria-hidden="true">
                      <UploadIcon />
                    </span>
                    {avatarLoading ? 'Đang tải avatar...' : 'Đổi ảnh đại diện'}
                  </label>
                )
              }
              subtitle="Chọn ảnh mới, kiểm tra bản xem trước rồi bấm xác nhận để cập nhật vào hồ sơ."
              title="Ảnh đại diện"
            />

            {avatarPreview.url ? (
              <div className="profile-account-center__avatar-upload-shell">
                <div className="profile-account-center__avatar-upload profile-account-center__avatar-upload--ready">
                  <span className="profile-account-center__avatar-upload-media">
                    <img alt="Ảnh đại diện đã chọn" src={avatarPreview.url} />
                  </span>
                </div>

                <div className="profile-account-center__avatar-upload-status" role="status">
                  <span>
                    <strong>{avatarLoading ? 'Đang cập nhật ảnh đại diện' : 'Ảnh đã được chọn'}</strong>
                    {avatarFileName ? <small>{avatarFileName}</small> : null}
                  </span>

                  <div className="profile-account-center__avatar-icon-actions" aria-label="Tùy chọn ảnh đại diện">
                    <label
                      aria-label="Chọn ảnh khác"
                      className="profile-account-center__avatar-icon-button"
                      title="Chọn ảnh khác"
                    >
                      <input
                        accept="image/*"
                        disabled={avatarLoading}
                        hidden
                        type="file"
                        onChange={handleAvatarChange}
                      />
                      <SwapIcon />
                    </label>
                    <button
                      aria-label="Hủy ảnh đã chọn"
                      className="profile-account-center__avatar-icon-button"
                      disabled={avatarLoading}
                      title="Hủy"
                      type="button"
                      onClick={() => {
                        resetAvatarSelection()
                        setAvatarFeedback({
                          message: '',
                          tone: 'info',
                        })
                      }}
                    >
                      <XIcon />
                    </button>
                  </div>
                </div>

                <div className="profile-account-center__avatar-confirm">
                  <PublicButton
                    disabled={!avatarFile}
                    loading={avatarLoading}
                    type="button"
                    variant="primary"
                    onClick={handleAvatarConfirm}
                  >
                    Xác nhận cập nhật avatar
                  </PublicButton>
                </div>
              </div>
            ) : null}

            {avatarFeedback.message ? (
              <PublicNotice
                className="profile-account-center__feedback"
                role="status"
                tone={avatarFeedback.tone === 'error' ? 'info' : avatarFeedback.tone}
              >
                {avatarFeedback.message}
              </PublicNotice>
            ) : null}

            <PublicNotice tone="info">
              Ảnh chỉ được cập nhật vào tài khoản sau khi bạn bấm xác nhận.
            </PublicNotice>
          </PublicCard>

          <PublicCard className="profile-account-center__card" padding="lg">
            <PublicSectionHeader
              subtitle="Xác nhận lại bằng mật khẩu hiện tại trước khi lưu mật khẩu đăng nhập mới."
              title="Đổi mật khẩu"
            />

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
              <label className="profile-account-center__field">
                <span>Mật khẩu hiện tại</span>
                <input
                  autoComplete="current-password"
                  name="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordFieldChange}
                />
              </label>

              <label className="profile-account-center__field">
                <span>Mật khẩu mới</span>
                <input
                  autoComplete="new-password"
                  name="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordFieldChange}
                />
              </label>

              <label className="profile-account-center__field">
                <span>Xác nhận mật khẩu mới</span>
                <input
                  autoComplete="new-password"
                  name="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordFieldChange}
                />
              </label>

              <div className="profile-account-center__actions">
                <PublicButton loading={passwordLoading} type="submit" variant="primary">
                  Lưu mật khẩu mới
                </PublicButton>
              </div>
            </form>
          </PublicCard>

          <PublicCard className="profile-account-center__card" padding="lg">
            <PublicSectionHeader
              subtitle="Yêu cầu này sẽ được ghi nhận vào hệ thống để đội ngũ hỗ trợ kiểm tra và xử lý tiếp."
              title="Yêu cầu vô hiệu hóa tài khoản"
            />

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
          </PublicCard>
        </div>

        <PublicCard className="profile-account-center__logs" padding="lg">
          <PublicSectionHeader
            subtitle="Chỉ hiển thị các cập nhật quan trọng về đơn hàng và tài khoản của bạn."
            title="Hoạt động gần đây"
          />

          {logsLoading ? <PublicLoadingBlock rows={4} title="Đang tải lịch sử hoạt động" /> : null}

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
        </PublicCard>
      </div>
    </section>
  )
}
