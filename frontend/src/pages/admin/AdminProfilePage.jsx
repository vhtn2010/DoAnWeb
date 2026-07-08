import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminErrorState,
  AdminField,
  AdminInput,
  AdminLoadingBlock,
  AdminPageHeader,
  AdminSectionHeader,
  AdminStatusBadge,
} from '../../components/admin/ui/index.js'
import { ADMIN_ROLE_LABELS } from '../../constants/adminRoutes.js'
import {
  getCurrentProfile,
  getCurrentProfileLogs,
  updateCurrentAvatar,
  updateCurrentPassword,
  updateCurrentProfile,
} from '../../repositories/profileRepository.js'
import './adminProfilePage.css'

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
})

const ROLE_EXPERIENCE = Object.freeze({
  staff: {
    accentLabel: 'Tuyến đầu vận hành',
    description:
      'Tập trung xử lý đơn hàng, đồng bộ dịch vụ, thanh toán và hỗ trợ khách hàng mỗi ngày.',
    highlights: [
      'Theo dõi đơn hàng, thanh toán và các yêu cầu hoàn tiền.',
      'Cập nhật dịch vụ, tồn kho và chương trình bán hàng đang chạy.',
      'Phản hồi ticket hỗ trợ và email vận hành tới khách hàng.',
    ],
    primaryRouteId: 'bookings',
    primaryRouteLabel: 'Mở quản lý đơn hàng',
    secondaryRouteId: 'services',
    secondaryRouteLabel: 'Đi tới dịch vụ',
    spotlightTitle: 'Góc nhìn của Staff',
  },
  admin: {
    accentLabel: 'Điều phối quản lý',
    description:
      'Theo dõi hiệu suất kinh doanh, duyệt nghiệp vụ quan trọng và quản lý người dùng vận hành.',
    highlights: [
      'Giám sát doanh thu, hiệu quả bán hàng và tiến độ xử lý dịch vụ.',
      'Phê duyệt hoàn tiền, xét duyệt dịch vụ và điều phối khuyến mãi.',
      'Quản lý người dùng nội bộ, quyền cơ bản và cấu hình vận hành.',
    ],
    primaryRouteId: 'revenue',
    primaryRouteLabel: 'Xem doanh thu',
    secondaryRouteId: 'users',
    secondaryRouteLabel: 'Mở quản lý người dùng',
    spotlightTitle: 'Góc nhìn của Admin',
  },
  system_admin: {
    accentLabel: 'Quản trị lõi hệ thống',
    description:
      'Nắm toàn quyền hệ thống, hạ tầng và phân quyền để đảm bảo vận hành ổn định, an toàn.',
    highlights: [
      'Giám sát hạ tầng, tải hệ thống và các tín hiệu vận hành trọng yếu.',
      'Quản trị role, permission và những cấu hình nhạy cảm của nền tảng.',
      'Can thiệp các tác vụ quản trị cấp cao khi hệ thống cần xử lý đặc biệt.',
    ],
    primaryRouteId: 'accessControl',
    primaryRouteLabel: 'Mở phân quyền truy cập',
    secondaryRouteId: 'infrastructure',
    secondaryRouteLabel: 'Xem hạ tầng hệ thống',
    spotlightTitle: 'Góc nhìn của System Admin',
  },
})

const STATUS_META = Object.freeze({
  active: { label: 'Đang hoạt động', tone: 'success' },
  disabled: { label: 'Đã vô hiệu hóa', tone: 'neutral' },
  locked: { label: 'Đang bị khóa', tone: 'warning' },
  suspended: { label: 'Tạm ngưng', tone: 'danger' },
  deleted: { label: 'Đã xóa mềm', tone: 'danger' },
})

const ACTIVITY_VISIBLE_PAGE_COUNT = 5

function formatDateTime(value) {
  if (!value) {
    return 'Chưa cập nhật'
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Chưa cập nhật'
  }

  return dateTimeFormatter.format(parsedDate)
}

function formatDate(value) {
  if (!value) {
    return 'Chưa cập nhật'
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Chưa cập nhật'
  }

  return dateFormatter.format(parsedDate)
}

function formatRoleCodeLabel(roleCode = '') {
  if (!roleCode) {
    return 'Chưa xác định'
  }

  return roleCode
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function getProfileStatusMeta(status) {
  return STATUS_META[status] ?? {
    label: status || 'Chưa xác định',
    tone: 'neutral',
  }
}

function createProfileFormValues(profile = null) {
  return {
    avatarUrl: '',
    fullName: profile?.fullName || profile?.full_name || '',
    phone: profile?.phone || '',
  }
}

function createPasswordFormValues() {
  return {
    confirmPassword: '',
    currentPassword: '',
    newPassword: '',
  }
}

function normalizeProfileData(data = {}, fallbackRole = 'staff') {
  const roleCode = data.role?.code || data.role_code || data.role || fallbackRole

  return {
    avatarUrl: data.avatar_url || '',
    createdAt: data.created_at || '',
    email: data.email || '',
    emailVerifiedAt: data.email_verified_at || '',
    fullName: data.full_name || '',
    id: data.id || '',
    lastLoginAt: data.last_login_at || '',
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    phone: data.phone || '',
    roleCode,
    roleName: data.role?.name || ADMIN_ROLE_LABELS[roleCode] || formatRoleCodeLabel(roleCode),
    status: data.status || '',
    updatedAt: data.updated_at || '',
  }
}

function createActivityPaginationItems(currentPage, totalPages, visiblePageCount = ACTIVITY_VISIBLE_PAGE_COUNT) {
  const safeCurrentPage = Math.max(1, Number(currentPage) || 1)
  const safeTotalPages = Math.max(0, Number(totalPages) || 0)

  if (safeTotalPages <= visiblePageCount) {
    return Array.from({ length: safeTotalPages }, (_, index) => ({
      type: 'page',
      value: index + 1,
    }))
  }

  const trailingWindowSize = Math.max(1, visiblePageCount - 1)
  const lastWindowStart = Math.max(1, safeTotalPages - visiblePageCount + 1)

  if (safeCurrentPage >= lastWindowStart) {
    return Array.from({ length: visiblePageCount }, (_, index) => ({
      type: 'page',
      value: lastWindowStart + index,
    }))
  }

  const windowStart = safeCurrentPage <= 2 ? 1 : safeCurrentPage - 1

  return [
    ...Array.from({ length: trailingWindowSize }, (_, index) => ({
      type: 'page',
      value: windowStart + index,
    })),
    { type: 'ellipsis', value: 'activity-ellipsis' },
    { type: 'page', value: safeTotalPages },
  ]
}

function getLogActionLabel(action = '') {
  const normalizedAction = String(action || '').trim().toLowerCase()

  if (normalizedAction === 'profile.update') {
    return 'Cập nhật hồ sơ'
  }

  if (normalizedAction === 'profile.avatar_update') {
    return 'Cập nhật ảnh đại diện'
  }

  if (normalizedAction === 'profile.change_password') {
    return 'Đổi mật khẩu'
  }

  if (normalizedAction === 'account.deactivation_requested') {
    return 'Gửi yêu cầu vô hiệu hóa tài khoản'
  }

  return normalizedAction
    ? normalizedAction.replace(/[._]/g, ' ')
    : 'Hoạt động hệ thống'
}

function getLogMetadataSummary(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return 'Không có chi tiết bổ sung.'
  }

  if (Array.isArray(metadata.changed_fields) && metadata.changed_fields.length > 0) {
    return `Trường cập nhật: ${metadata.changed_fields.join(', ')}.`
  }

  if (metadata.request_status) {
    return `Trạng thái yêu cầu: ${metadata.request_status}.`
  }

  const entries = Object.entries(metadata).filter(([, value]) => {
    if (value == null) {
      return false
    }

    if (Array.isArray(value)) {
      return value.length > 0
    }

    return String(value).trim() !== ''
  })

  if (entries.length === 0) {
    return 'Không có chi tiết bổ sung.'
  }

  return entries
    .slice(0, 3)
    .map(([key, value]) => {
      const label = key.replace(/_/g, ' ')
      const formattedValue = Array.isArray(value) ? value.join(', ') : String(value)
      return `${label}: ${formattedValue}`
    })
    .join(' • ')
}

function getProfileInitials(profile = null) {
  const source = profile?.fullName || profile?.email || profile?.roleName || 'QT'
  const parts = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || 'QT'
}

function ProfileAvatar({ alt, className = '', profile }) {
  if (profile?.avatarUrl) {
    return <img alt={alt} className={className} src={profile.avatarUrl} />
  }

  return <span className={`admin-profile-page__avatar-fallback ${className}`}>{getProfileInitials(profile)}</span>
}

function AdminProfilePage() {
  const { currentRole, currentUser } = useOutletContext()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [logsReloadKey, setLogsReloadKey] = useState(0)
  const [profile, setProfile] = useState(null)
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsError, setLogsError] = useState('')
  const [logsMeta, setLogsMeta] = useState({
    limit: 6,
    page: 1,
    total: 0,
    total_pages: 0,
  })
  const [profileFormValues, setProfileFormValues] = useState(() =>
    createProfileFormValues(currentUser),
  )
  const [passwordFormValues, setPasswordFormValues] = useState(createPasswordFormValues)
  const [profileFormError, setProfileFormError] = useState('')
  const [profileFormFeedback, setProfileFormFeedback] = useState('')
  const [profileFormLoading, setProfileFormLoading] = useState(false)
  const [passwordFormError, setPasswordFormError] = useState('')
  const [passwordFormFeedback, setPasswordFormFeedback] = useState('')
  const [passwordFormLoading, setPasswordFormLoading] = useState(false)

  const effectiveRole = profile?.roleCode || currentRole
  const roleExperience = ROLE_EXPERIENCE[effectiveRole] ?? ROLE_EXPERIENCE.admin
  const profileStatusMeta = getProfileStatusMeta(profile?.status)
  const activityPaginationItems = createActivityPaginationItems(logsMeta.page, logsMeta.total_pages)

  useEffect(() => {
    let isActive = true

    async function loadProfileData() {
      setLoading(true)
      setError('')

      try {
        const response = await getCurrentProfile()

        if (!isActive) {
          return
        }

        if (!response?.success || !response.data) {
          throw new Error(response?.message || 'Không thể tải hồ sơ quản trị lúc này.')
        }

        const normalizedProfile = normalizeProfileData(response.data, currentRole)

        setProfile(normalizedProfile)
        setProfileFormValues(createProfileFormValues(normalizedProfile))
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setError(loadError?.message || 'Không thể tải hồ sơ quản trị lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadProfileData()

    return () => {
      isActive = false
    }
  }, [currentRole, reloadKey])

  useEffect(() => {
    let isActive = true

    async function loadProfileLogs() {
      setLogsLoading(true)
      setLogsError('')

      try {
        const response = await getCurrentProfileLogs({
          limit: logsMeta.limit,
          page: logsMeta.page,
        })

        if (!isActive) {
          return
        }

        if (!response?.success) {
          throw new Error(response?.message || 'Không thể tải lịch sử hoạt động.')
        }

        setLogs(Array.isArray(response.data) ? response.data : [])
        setLogsMeta((currentValue) => ({
          ...currentValue,
          ...(response.meta || {}),
        }))
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setLogsError(loadError?.message || 'Không thể tải lịch sử hoạt động.')
      } finally {
        if (isActive) {
          setLogsLoading(false)
        }
      }
    }

    loadProfileLogs()

    return () => {
      isActive = false
    }
  }, [logsMeta.limit, logsMeta.page, logsReloadKey])

  async function refreshProfileView() {
    const response = await getCurrentProfile()

    if (!response?.success || !response.data) {
      throw new Error(response?.message || 'Không thể đồng bộ lại hồ sơ.')
    }

    const normalizedProfile = normalizeProfileData(response.data, currentRole)

    setProfile(normalizedProfile)
    setProfileFormValues(createProfileFormValues(normalizedProfile))

    return normalizedProfile
  }

  async function handleManualRefresh() {
    setProfileFormError('')

    try {
      await refreshProfileView()
      setLogsReloadKey((currentValue) => currentValue + 1)
      setProfileFormFeedback('Hồ sơ đã được đồng bộ lại từ hệ thống.')
    } catch (refreshError) {
      setProfileFormError(refreshError?.message || 'Không thể đồng bộ lại hồ sơ.')
    }
  }

  function handleProfileFormChange(event) {
    const { name, value } = event.target

    setProfileFormValues((currentValue) => ({
      ...currentValue,
      [name]: value,
    }))
  }

  function handlePasswordFormChange(event) {
    const { name, value } = event.target

    setPasswordFormValues((currentValue) => ({
      ...currentValue,
      [name]: value,
    }))
  }

  async function handleProfileSubmit(event) {
    event.preventDefault()

    if (!profile) {
      return
    }

    const trimmedFullName = profileFormValues.fullName.trim()
    const trimmedPhone = profileFormValues.phone.trim()
    const trimmedAvatarUrl = profileFormValues.avatarUrl.trim()
    const nextProfilePayload = {}

    setProfileFormError('')
    setProfileFormFeedback('')

    if (!trimmedFullName) {
      setProfileFormError('Họ tên không được để trống.')
      return
    }

    if (trimmedAvatarUrl && !/^https?:\/\//i.test(trimmedAvatarUrl)) {
      setProfileFormError('Ảnh đại diện mới phải là URL HTTP hoặc HTTPS hợp lệ.')
      return
    }

    if (trimmedFullName !== profile.fullName) {
      nextProfilePayload.full_name = trimmedFullName
    }

    if (trimmedPhone !== (profile.phone || '')) {
      nextProfilePayload.phone = trimmedPhone || null
    }

    if (Object.keys(nextProfilePayload).length === 0 && !trimmedAvatarUrl) {
      setProfileFormFeedback('Hồ sơ hiện chưa có thay đổi nào để lưu.')
      return
    }

    setProfileFormLoading(true)

    try {
      if (Object.keys(nextProfilePayload).length > 0) {
        const response = await updateCurrentProfile(nextProfilePayload)

        if (!response?.success) {
          throw new Error(response?.message || 'Không thể cập nhật thông tin hồ sơ.')
        }
      }

      if (trimmedAvatarUrl) {
        const avatarResponse = await updateCurrentAvatar({
          avatar_url: trimmedAvatarUrl,
        })

        if (!avatarResponse?.success) {
          throw new Error(avatarResponse?.message || 'Không thể cập nhật ảnh đại diện.')
        }
      }

      await refreshProfileView()
      setLogsReloadKey((currentValue) => currentValue + 1)
      setProfileFormFeedback('Hồ sơ đã được cập nhật thành công.')
    } catch (submitError) {
      setProfileFormError(submitError?.message || 'Không thể cập nhật hồ sơ lúc này.')
    } finally {
      setProfileFormLoading(false)
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()

    const currentPassword = passwordFormValues.currentPassword
    const newPassword = passwordFormValues.newPassword
    const confirmPassword = passwordFormValues.confirmPassword

    setPasswordFormError('')
    setPasswordFormFeedback('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordFormError('Điền đầy đủ mật khẩu hiện tại, mật khẩu mới và xác nhận.')
      return
    }

    if (newPassword.length < 8) {
      setPasswordFormError('Mật khẩu mới cần có ít nhất 8 ký tự.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordFormError('Xác nhận mật khẩu mới chưa khớp.')
      return
    }

    setPasswordFormLoading(true)

    try {
      const response = await updateCurrentPassword({
        current_password: currentPassword,
        new_password: newPassword,
      })

      if (!response?.success) {
        throw new Error(response?.message || 'Không thể đổi mật khẩu lúc này.')
      }

      await refreshProfileView()
      setLogsReloadKey((currentValue) => currentValue + 1)
      setPasswordFormValues(createPasswordFormValues())
      setPasswordFormFeedback('Mật khẩu đã được thay đổi thành công.')
    } catch (submitError) {
      setPasswordFormError(submitError?.message || 'Không thể đổi mật khẩu lúc này.')
    } finally {
      setPasswordFormLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="admin-profile-page admin-profile-page--loading">
        <AdminLoadingBlock rows={4} />
      </main>
    )
  }

  if (error) {
    return (
      <main className="admin-profile-page">
        <AdminErrorState
          title="Không thể tải hồ sơ quản trị"
          description={error}
          action={
            <AdminButton variant="secondary" onClick={() => setReloadKey((currentValue) => currentValue + 1)}>
              Thử lại
            </AdminButton>
          }
        />
      </main>
    )
  }

  return (
    <main className={`admin-profile-page admin-profile-page--${effectiveRole}`}>
      <AdminPageHeader
        className="admin-profile-page__header"
        eyebrow="Profile / Me API"
        title="Hồ sơ quản trị"
        subtitle="Bố cục được tinh gọn lại để ưu tiên thông tin cá nhân, bảo mật tài khoản và lịch sử thao tác gần đây."
        actions={
          <AdminButton variant="secondary" onClick={handleManualRefresh}>
            Đồng bộ lại hồ sơ
          </AdminButton>
        }
      />

      <section className="admin-profile-page__hero-grid">
        <div className="admin-profile-page__hero-stack">
          <AdminCard className="admin-profile-page__hero-card" padding="lg">
            <div className="admin-profile-page__hero-main">
              <div className="admin-profile-page__avatar-shell">
                <ProfileAvatar alt={profile.fullName || profile.email} className="admin-profile-page__avatar-media" profile={profile} />
              </div>

              <div className="admin-profile-page__hero-copy">
                <div className="admin-profile-page__hero-topline">
                  <AdminBadge tone="neutral">{roleExperience.accentLabel}</AdminBadge>
                  <AdminStatusBadge tone={profileStatusMeta.tone}>{profileStatusMeta.label}</AdminStatusBadge>
                </div>

                <h1>{profile.fullName || profile.email || 'Tài khoản quản trị'}</h1>
                <p>{roleExperience.description}</p>

                <div className="admin-profile-page__hero-meta">
                  <span>{profile.email || 'Chưa có email'}</span>
                  <span>{profile.phone || 'Chưa cập nhật số điện thoại'}</span>
                  <span>Đăng nhập gần nhất: {formatDateTime(profile.lastLoginAt)}</span>
                </div>
              </div>
            </div>
          </AdminCard>

          <AdminCard className="admin-profile-page__panel-card admin-profile-page__profile-details-card" padding="lg">
            <AdminSectionHeader
              title="Thông tin cá nhân"
              subtitle="Cập nhật họ tên, số điện thoại và dán URL ảnh đại diện mới nếu bạn muốn thay avatar."
            />

            {profileFormError ? (
              <p className="admin-profile-page__form-feedback admin-profile-page__form-feedback--error" role="alert">
                {profileFormError}
              </p>
            ) : null}

            {profileFormFeedback ? (
              <p className="admin-profile-page__form-feedback" role="status">
                {profileFormFeedback}
              </p>
            ) : null}

            <form className="admin-profile-page__form" onSubmit={handleProfileSubmit}>
              <div className="admin-profile-page__form-grid">
                <AdminField label="Họ và tên" required>
                  <AdminInput
                    name="fullName"
                    placeholder="Nhập họ và tên"
                    value={profileFormValues.fullName}
                    onChange={handleProfileFormChange}
                  />
                </AdminField>

                <AdminField label="Số điện thoại">
                  <AdminInput
                    name="phone"
                    placeholder="Ví dụ 0911000002"
                    value={profileFormValues.phone}
                    onChange={handleProfileFormChange}
                  />
                </AdminField>
              </div>

              <AdminField
                helper="Chỉ cần dán URL ảnh mới khi muốn thay avatar hiện tại."
                label="URL ảnh đại diện mới"
              >
                <AdminInput
                  name="avatarUrl"
                  placeholder="https://..."
                  value={profileFormValues.avatarUrl}
                  onChange={handleProfileFormChange}
                />
              </AdminField>

              <div className="admin-profile-page__inline-meta">
                <div className="admin-profile-page__inline-meta-item admin-profile-page__inline-meta-item--email">
                  <span>Email đăng nhập</span>
                  <strong>{profile.email || 'Chưa cập nhật'}</strong>
                </div>
                <div className="admin-profile-page__inline-meta-item">
                  <span>Vai trò</span>
                  <strong>{profile.roleName}</strong>
                </div>
              </div>

              <div className="admin-profile-page__form-actions">
                <AdminButton loading={profileFormLoading} type="submit" variant="primary">
                  Lưu thay đổi hồ sơ
                </AdminButton>
              </div>
            </form>
          </AdminCard>
        </div>

        <AdminCard className="admin-profile-page__spotlight-card" padding="lg">
          <AdminSectionHeader
            eyebrow={profile.roleName || ADMIN_ROLE_LABELS[effectiveRole] || formatRoleCodeLabel(effectiveRole)}
            title={roleExperience.spotlightTitle}
            subtitle="Khối nội dung thay đổi theo role hiện tại để mỗi nhóm quản trị nhìn thấy đúng trọng tâm công việc của mình."
          />

          <ul className="admin-profile-page__focus-list">
            {roleExperience.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <dl className="admin-profile-page__detail-list">
            <div>
              <dt>Mã role</dt>
              <dd>{profile.roleCode}</dd>
            </div>
            <div>
              <dt>Ngày tạo tài khoản</dt>
              <dd>{formatDate(profile.createdAt)}</dd>
            </div>
            <div>
              <dt>Email xác thực</dt>
              <dd>{profile.emailVerifiedAt ? formatDateTime(profile.emailVerifiedAt) : 'Chưa xác thực'}</dd>
            </div>
            <div>
              <dt>Lần cập nhật gần nhất</dt>
              <dd>{formatDateTime(profile.updatedAt)}</dd>
            </div>
          </dl>
        </AdminCard>
      </section>

      <section className="admin-profile-page__content-grid">
        <AdminCard className="admin-profile-page__panel-card admin-profile-page__security-card" padding="lg">
          <AdminSectionHeader
            title="Bảo mật tài khoản"
            subtitle="Đổi mật khẩu đăng nhập bằng mật khẩu hiện tại và đồng bộ thời điểm cập nhật ngay sau khi thành công."
          />

          {passwordFormError ? (
            <p className="admin-profile-page__form-feedback admin-profile-page__form-feedback--error" role="alert">
              {passwordFormError}
            </p>
          ) : null}

          {passwordFormFeedback ? (
            <p className="admin-profile-page__form-feedback" role="status">
              {passwordFormFeedback}
            </p>
          ) : null}

          <form className="admin-profile-page__form" onSubmit={handlePasswordSubmit}>
            <AdminField label="Mật khẩu hiện tại" required>
              <AdminInput
                autoComplete="current-password"
                name="currentPassword"
                type="password"
                value={passwordFormValues.currentPassword}
                onChange={handlePasswordFormChange}
              />
            </AdminField>

            <AdminField helper="Tối thiểu 8 ký tự." label="Mật khẩu mới" required>
              <AdminInput
                autoComplete="new-password"
                name="newPassword"
                type="password"
                value={passwordFormValues.newPassword}
                onChange={handlePasswordFormChange}
              />
            </AdminField>

            <AdminField label="Xác nhận mật khẩu mới" required>
              <AdminInput
                autoComplete="new-password"
                name="confirmPassword"
                type="password"
                value={passwordFormValues.confirmPassword}
                onChange={handlePasswordFormChange}
              />
            </AdminField>

            <div className="admin-profile-page__form-actions">
              <AdminButton loading={passwordFormLoading} type="submit" variant="secondary">
                Đổi mật khẩu
              </AdminButton>
            </div>
          </form>
        </AdminCard>
      </section>

      <section className="admin-profile-page__activity-section">
        <AdminCard className="admin-profile-page__panel-card admin-profile-page__activity-card" padding="lg">
          <AdminSectionHeader
            title="Lịch sử hoạt động của tôi"
            subtitle="Hiển thị dữ liệu từ /me/logs để bạn kiểm tra các lần cập nhật hồ sơ, đổi mật khẩu hoặc thao tác nhạy cảm gần đây."
          />

          {logsError ? (
            <p className="admin-profile-page__form-feedback admin-profile-page__form-feedback--error" role="alert">
              {logsError}
            </p>
          ) : null}

          {logsLoading ? <AdminLoadingBlock rows={3} /> : null}

          {!logsLoading && logs.length === 0 ? (
            <AdminEmptyState
              title="Chưa có hoạt động nào để hiển thị"
              description="Khi tài khoản thực hiện cập nhật hồ sơ hoặc thao tác bảo mật, nhật ký sẽ xuất hiện ở đây."
            />
          ) : null}

          {!logsLoading && logs.length > 0 ? (
            <>
              <div className="admin-profile-page__activity-list">
                {logs.map((logItem) => (
                  <article className="admin-profile-page__activity-item" key={logItem.id}>
                    <div className="admin-profile-page__activity-head">
                      <div>
                        <strong>{getLogActionLabel(logItem.action)}</strong>
                        <span>{formatDateTime(logItem.created_at)}</span>
                      </div>
                      <AdminBadge tone="neutral">{logItem.entity_name || 'user_logs'}</AdminBadge>
                    </div>

                    <p>{getLogMetadataSummary(logItem.metadata)}</p>

                    <div className="admin-profile-page__activity-meta">
                      <span>IP: {logItem.ip_address || 'Chưa ghi nhận'}</span>
                      <span>Thiết bị: {logItem.user_agent || 'Chưa ghi nhận'}</span>
                    </div>
                  </article>
                ))}
              </div>

              <div className="admin-profile-page__activity-footer">
                <p>
                  {logsMeta.total > 0
                    ? `Hiển thị trang ${logsMeta.page}/${logsMeta.total_pages || 1} • ${logsMeta.total} hoạt động`
                    : 'Chưa có hoạt động để hiển thị'}
                </p>
                {logsMeta.total_pages > 1 ? (
                  <nav className="admin-profile-page__activity-pagination" aria-label="Phân trang lịch sử hoạt động">
                    <AdminButton
                      aria-label="Đến trang đầu tiên"
                      disabled={logsMeta.page <= 1}
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setLogsMeta((currentValue) => ({
                          ...currentValue,
                          page: 1,
                        }))
                      }}
                    >
                      {'<<'}
                    </AdminButton>

                    <AdminButton
                      aria-label="Về trang trước"
                      disabled={logsMeta.page <= 1}
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setLogsMeta((currentValue) => ({
                          ...currentValue,
                          page: Math.max(1, currentValue.page - 1),
                        }))
                      }}
                    >
                      {'<'}
                    </AdminButton>

                    {activityPaginationItems.map((item) => {
                      if (item.type === 'ellipsis') {
                        return <span className="admin-profile-page__activity-pagination-ellipsis" key={item.value}>...</span>
                      }

                      return (
                        <AdminButton
                          key={item.value}
                          size="sm"
                          variant={logsMeta.page === item.value ? 'primary' : 'ghost'}
                          onClick={() => {
                            setLogsMeta((currentValue) => ({
                              ...currentValue,
                              page: item.value,
                            }))
                          }}
                        >
                          {item.value}
                        </AdminButton>
                      )
                    })}

                    <AdminButton
                      aria-label="Sang trang sau"
                      disabled={logsMeta.page >= logsMeta.total_pages}
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setLogsMeta((currentValue) => ({
                          ...currentValue,
                          page: Math.min(currentValue.total_pages || 1, currentValue.page + 1),
                        }))
                      }}
                    >
                      {'>'}
                    </AdminButton>

                    <AdminButton
                      aria-label="Đến trang cuối cùng"
                      disabled={logsMeta.page >= logsMeta.total_pages}
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setLogsMeta((currentValue) => ({
                          ...currentValue,
                          page: currentValue.total_pages || 1,
                        }))
                      }}
                    >
                      {'>>'}
                    </AdminButton>
                  </nav>
                ) : null}
              </div>
            </>
          ) : null}
        </AdminCard>
      </section>
    </main>
  )
}

export default AdminProfilePage
