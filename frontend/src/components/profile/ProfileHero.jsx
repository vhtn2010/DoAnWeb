import { useEffect, useState } from 'react'
import { requestChangeEmail } from '../../repositories/authRepository.js'
import { updateCurrentProfile } from '../../repositories/profileRepository.js'
import ProfileAvatarEditor from './ProfileAvatarEditor.jsx'

function SparkIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path
        d="m10 2 1.65 4.35L16 8l-4.35 1.65L10 14l-1.65-4.35L4 8l4.35-1.65L10 2Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ChevronRightIcon() {
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

function MailIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path
        d="M3.5 5.5h13a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 13V7a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="m3 6.5 7 5 7-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path
        d="M6.12 3.75h1.84c.3 0 .57.2.65.5l.76 2.9a.75.75 0 0 1-.2.73l-1.06 1.05a11.12 11.12 0 0 0 4.96 4.96l1.05-1.06a.75.75 0 0 1 .73-.2l2.9.76c.3.08.5.35.5.65v1.84a.9.9 0 0 1-.9.9h-.9C8.89 17.98 2 11.11 2 2.9V2a.9.9 0 0 1 .9-.9h3.22Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function EyeOpenIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path
        d="M2.2 10s2.7-4.8 7.8-4.8 7.8 4.8 7.8 4.8-2.7 4.8-7.8 4.8S2.2 10 2.2 10Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function EyeClosedIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path
        d="M3 3.5 17 16.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
      <path
        d="M8.3 5.5a8.35 8.35 0 0 1 1.7-.3c5.1 0 7.8 4.8 7.8 4.8a12.7 12.7 0 0 1-2.4 2.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M5.1 7.2A12.55 12.55 0 0 0 2.2 10s2.7 4.8 7.8 4.8c1 0 1.9-.18 2.7-.48"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M8.5 8.6A2.58 2.58 0 0 0 7.4 10c0 1.43 1.17 2.6 2.6 2.6.56 0 1.08-.18 1.5-.48"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path
        d="M12.4 4.1a1.8 1.8 0 0 1 2.55 0l.95.95a1.8 1.8 0 0 1 0 2.55L8.4 15.1 4.5 15.5l.4-3.9 7.5-7.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="m11.5 5 3.5 3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function normalizeLoyaltyTier(value = '') {
  return value === 'Di sản Vàng' ? 'Hạng Vàng' : value || 'Nét Việt Member'
}

function isValidEmail(value = '') {
  return /\S+@\S+\.\S+/.test(value.trim())
}

function isValidPhone(value = '') {
  return /^[0-9+\s().-]{8,20}$/.test(value.trim())
}

function isUnchangedContactValue(field, nextValue, currentValue) {
  const normalizedNextValue = String(nextValue ?? '').trim()
  const normalizedCurrentValue = String(currentValue ?? '').trim()

  if (field === 'email') {
    return normalizedNextValue.toLowerCase() === normalizedCurrentValue.toLowerCase()
  }

  return normalizedNextValue === normalizedCurrentValue
}

function getApiErrorMessage(field, error) {
  if (error?.code === 'AUTH_INVALID_CREDENTIALS') {
    return 'Mật khẩu hiện tại không đúng.'
  }

  if (field === 'email' && error?.code === 'DUPLICATE_RESOURCE') {
    return 'Email này đã được sử dụng bởi tài khoản khác.'
  }

  const fieldKeys = field === 'email' ? ['new_email', 'current_password'] : [field, 'current_password']
  const matchedDetail = error?.details?.find((detail) => fieldKeys.includes(detail.field))

  if (matchedDetail?.field === 'current_password') {
    return 'Bạn cần nhập đúng mật khẩu hiện tại để xác nhận thay đổi.'
  }

  if (matchedDetail?.field === 'new_email') {
    return matchedDetail.message === 'new_email is invalid'
      ? 'Email chưa đúng định dạng.'
      : matchedDetail.message
  }

  if (matchedDetail?.field === 'phone') {
    return matchedDetail.message === 'phone must be at most 20 characters'
      ? 'Số điện thoại không được vượt quá 20 ký tự.'
      : matchedDetail.message
  }

  return error?.message || 'Không thể cập nhật thông tin lúc này.'
}

function EditableContactField({
  errorMessage,
  field,
  icon,
  inputMode,
  isEditing,
  isPasswordVisible,
  isSaving,
  label,
  onCancel,
  onChange,
  onEdit,
  onPasswordChange,
  onSave,
  onTogglePasswordVisibility,
  passwordValue,
  placeholder,
  type = 'text',
  value,
}) {
  const passwordLabel = `Mật khẩu hiện tại để xác nhận ${label.toLowerCase()}`
  const helperText = errorMessage || 'Nhập đúng mật khẩu hiện tại để xác nhận thay đổi.'
  const helperToneClass = errorMessage
    ? 'profile-hero__member-helper profile-hero__member-helper--error'
    : 'profile-hero__member-helper'

  return (
    <div
      className={
        isEditing
          ? 'profile-hero__member-meta-item profile-hero__member-meta-item--editing'
          : 'profile-hero__member-meta-item'
      }
    >
      <div className="profile-hero__member-meta-row">
        <span className="profile-hero__member-meta-icon" aria-hidden="true">
          {icon}
        </span>

        {isEditing ? (
          <div className="profile-hero__member-edit-stack">
            <input
              aria-label={label}
              className="profile-hero__member-input"
              disabled={isSaving}
              inputMode={inputMode}
              onChange={(event) => onChange(field, event.target.value)}
              placeholder={placeholder}
              type={type}
              value={value}
            />

            <div className="profile-hero__member-password-wrap">
              <input
                aria-invalid={errorMessage ? 'true' : 'false'}
                aria-label={passwordLabel}
                autoComplete="current-password"
                className={`profile-hero__member-input${
                  errorMessage ? ' profile-hero__member-input--error' : ''
                }`}
                disabled={isSaving}
                onChange={(event) => onPasswordChange(field, event.target.value)}
                placeholder="Nhập mật khẩu hiện tại"
                type={isPasswordVisible ? 'text' : 'password'}
                value={passwordValue}
              />

              <button
                aria-label={isPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="profile-hero__member-password-toggle"
                disabled={isSaving}
                type="button"
                onClick={() => onTogglePasswordVisibility(field)}
              >
                {isPasswordVisible ? <EyeClosedIcon /> : <EyeOpenIcon />}
              </button>
            </div>

            <p className={helperToneClass} role={errorMessage ? 'alert' : undefined}>
              {helperText}
            </p>
          </div>
        ) : (
          <span className="profile-hero__member-meta-text">{value}</span>
        )}

        {!isEditing ? (
          <button
            className="profile-hero__member-inline-action"
            type="button"
            onClick={() => onEdit(field)}
          >
            <EditIcon />
            <span>Sửa</span>
          </button>
        ) : null}
      </div>

      {isEditing ? (
        <div className="profile-hero__member-inline-actions">
          <button disabled={isSaving} type="button" onClick={() => onSave(field)}>
            {isSaving ? 'Đang lưu...' : 'Xác nhận'}
          </button>
          <button
            className="profile-hero__member-inline-cancel"
            disabled={isSaving}
            type="button"
            onClick={() => onCancel(field)}
          >
            Hủy
          </button>
        </div>
      ) : null}
    </div>
  )
}

function MiniFavoriteDestinations({ destinations = [], onOpenDestination }) {
  return (
    <button
      className="profile-hero__favorites-stat"
      type="button"
      onClick={() => onOpenDestination?.(destinations[0])}
    >
      <span className="profile-hero__favorites-stat-head">
        <span>
          <strong>{destinations.length}</strong>
          <small>{destinations.length ? 'điểm đến yêu thích' : 'chưa có điểm đến yêu thích'}</small>
        </span>
        <ChevronRightIcon />
      </span>
    </button>
  )
}

function ProfileHero({
  favoriteDestinations = [],
  greeting,
  highlights = [],
  historyEntry = null,
  onOpenFavoriteDestination,
  onOpenHistory,
  onOpenUpcomingTripPrimary,
  onOpenUpcomingTripSecondary,
  onProfileUpdated,
  profile,
  stats = [],
  upcomingTrip,
}) {
  const displayName = profile?.full_name ?? greeting.title.replace('Xin chào, ', '')
  const [contactInfo, setContactInfo] = useState({
    email: profile?.email ?? '',
    phone: profile?.phone ?? '',
  })
  const [draftInfo, setDraftInfo] = useState({
    email: profile?.email ?? '',
    phone: profile?.phone ?? '',
  })
  const [passwordDrafts, setPasswordDrafts] = useState({
    email: '',
    phone: '',
  })
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    phone: '',
  })
  const [visiblePasswords, setVisiblePasswords] = useState({
    email: false,
    phone: false,
  })
  const [editingField, setEditingField] = useState('')
  const [savingField, setSavingField] = useState('')
  const [contactFeedback, setContactFeedback] = useState({
    message: '',
    tone: 'success',
  })

  useEffect(() => {
    const nextContactInfo = {
      email: profile?.email ?? '',
      phone: profile?.phone ?? '',
    }

    setContactInfo(nextContactInfo)
    setDraftInfo(nextContactInfo)
    setPasswordDrafts({
      email: '',
      phone: '',
    })
    setFieldErrors({
      email: '',
      phone: '',
    })
    setVisiblePasswords({
      email: false,
      phone: false,
    })
    setEditingField('')
    setSavingField('')
    setContactFeedback({
      message: '',
      tone: 'success',
    })
  }, [profile?.email, profile?.phone])

  function clearFieldError(field) {
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [field]: '',
    }))
  }

  function clearAllFeedback(field) {
    clearFieldError(field)
    setContactFeedback({
      message: '',
      tone: 'success',
    })
  }

  function handleEdit(field) {
    setDraftInfo((currentDraft) => ({
      ...currentDraft,
      [field]: contactInfo[field] ?? '',
    }))
    setPasswordDrafts((currentPasswords) => ({
      ...currentPasswords,
      [field]: '',
    }))
    clearAllFeedback(field)
    setVisiblePasswords((currentVisibility) => ({
      ...currentVisibility,
      [field]: false,
    }))
    setEditingField(field)
  }

  function handleDraftChange(field, value) {
    setDraftInfo((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }))
    clearAllFeedback(field)
  }

  function handlePasswordChange(field, value) {
    setPasswordDrafts((currentPasswords) => ({
      ...currentPasswords,
      [field]: value,
    }))
    clearAllFeedback(field)
  }

  function handleTogglePasswordVisibility(field) {
    setVisiblePasswords((currentVisibility) => ({
      ...currentVisibility,
      [field]: !currentVisibility[field],
    }))
  }

  function handleCancel(field) {
    setDraftInfo((currentDraft) => ({
      ...currentDraft,
      [field]: contactInfo[field] ?? '',
    }))
    setPasswordDrafts((currentPasswords) => ({
      ...currentPasswords,
      [field]: '',
    }))
    clearAllFeedback(field)
    setVisiblePasswords((currentVisibility) => ({
      ...currentVisibility,
      [field]: false,
    }))
    setEditingField('')
    setSavingField('')
  }

  async function handleSave(field) {
    const nextValue = draftInfo[field]?.trim() ?? ''
    const currentPassword = passwordDrafts[field]?.trim() ?? ''
    const unchangedMessage = field === 'email'
      ? 'Bạn chưa thay đổi email nên hệ thống chưa thể xác nhận cập nhật.'
      : 'Bạn chưa thay đổi số điện thoại nên hệ thống chưa thể xác nhận cập nhật.'

    if (field === 'email' && !isValidEmail(nextValue)) {
      const nextErrorMessage = 'Email chưa đúng định dạng.'

      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [field]: nextErrorMessage,
      }))
      setContactFeedback({
        message: nextErrorMessage,
        tone: 'error',
      })
      return
    }

    if (field === 'phone' && !isValidPhone(nextValue)) {
      const nextErrorMessage = 'Số điện thoại cần từ 8 đến 20 ký tự hợp lệ.'

      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [field]: nextErrorMessage,
      }))
      setContactFeedback({
        message: nextErrorMessage,
        tone: 'error',
      })
      return
    }

    if (!currentPassword) {
      const nextErrorMessage = 'Bạn cần nhập đúng mật khẩu hiện tại để xác nhận thay đổi.'

      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [field]: nextErrorMessage,
      }))
      setContactFeedback({
        message: nextErrorMessage,
        tone: 'error',
      })
      return
    }

    if (isUnchangedContactValue(field, nextValue, contactInfo[field] ?? '')) {
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [field]: unchangedMessage,
      }))
      setContactFeedback({
        message: unchangedMessage,
        tone: 'error',
      })
      return
    }

    clearAllFeedback(field)
    setSavingField(field)

    try {
      if (field === 'email') {
        await requestChangeEmail({
          current_password: currentPassword,
          new_email: nextValue.toLowerCase(),
        })

        setPasswordDrafts((currentPasswords) => ({
          ...currentPasswords,
          email: '',
        }))
        setVisiblePasswords((currentVisibility) => ({
          ...currentVisibility,
          email: false,
        }))
        setEditingField('')
        setContactFeedback({
          message:
            'Đã gửi email xác nhận tới địa chỉ mới. Vui lòng kiểm tra hộp thư để hoàn tất thay đổi.',
          tone: 'success',
        })
        return
      }

      const response = await updateCurrentProfile({
        current_password: currentPassword,
        phone: nextValue,
      })

      const nextPhone = response?.data?.phone ?? nextValue

      setContactInfo((currentInfo) => ({
        ...currentInfo,
        phone: nextPhone,
      }))
      setDraftInfo((currentDraft) => ({
        ...currentDraft,
        phone: nextPhone,
      }))
      setPasswordDrafts((currentPasswords) => ({
        ...currentPasswords,
        phone: '',
      }))
      setVisiblePasswords((currentVisibility) => ({
        ...currentVisibility,
        phone: false,
      }))
      setEditingField('')
      setContactFeedback({
        message: 'Đã cập nhật số điện thoại thành công.',
        tone: 'success',
      })
    } catch (error) {
      const nextErrorMessage = getApiErrorMessage(field, error)

      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [field]: nextErrorMessage,
      }))
      setContactFeedback({
        message: nextErrorMessage,
        tone: 'error',
      })
    } finally {
      setSavingField('')
    }
  }

  return (
    <header className="profile-hero">
      <div className="profile-hero__content">
        <div className="profile-hero__copy">
          <p className="profile-hero__eyebrow">Tài khoản thành viên</p>
          <h1 className="profile-hero__title">{greeting.title}</h1>
          <p className="profile-hero__subtitle">{greeting.subtitle}</p>

          {stats.length ? (
            <div className="profile-hero__stats" aria-label="Tóm tắt nhanh tài khoản">
              {stats.map((stat) => (
                <article className="profile-hero__stat" key={stat.id}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </article>
              ))}
              <MiniFavoriteDestinations
                destinations={favoriteDestinations}
                onOpenDestination={onOpenFavoriteDestination}
              />
            </div>
          ) : null}

          {historyEntry ? (
            <button
              className="profile-hero__history-entry"
              type="button"
              onClick={onOpenHistory}
            >
              <span className="profile-hero__history-copy">
                <span className="profile-hero__history-eyebrow">Theo dõi đơn hàng</span>
                <strong>Lịch sử đơn hàng</strong>
                <small>{historyEntry.description}</small>
              </span>

              <span className="profile-hero__history-metrics" aria-label="Tóm tắt đơn hàng">
                {historyEntry.metrics.map((metric) => (
                  <span className="profile-hero__history-metric" key={metric.id}>
                    <strong>{metric.value}</strong>
                    <small>{metric.label}</small>
                  </span>
                ))}
              </span>

              <span className="profile-hero__history-action" aria-hidden="true">
                <ChevronRightIcon />
              </span>
            </button>
          ) : highlights.length ? (
            <div className="profile-hero__highlights" aria-label="Điểm nhấn cá nhân hóa">
              {highlights.map((highlight) => (
                <span className="profile-hero__highlight" key={highlight}>
                  <SparkIcon />
                  <span>{highlight}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="profile-hero__membership">
          <div className="profile-hero__member-card">
            <div className="profile-hero__member-top">
              <ProfileAvatarEditor
                avatarUrl={profile?.avatar_url ?? ''}
                displayName={displayName}
                onProfileUpdated={onProfileUpdated}
              />

              <div className="profile-hero__member-copy">
                <p className="profile-hero__member-label">Thẻ thành viên</p>
                <strong>{normalizeLoyaltyTier(profile?.loyalty_tier)}</strong>
                <small>{displayName}</small>
              </div>
            </div>

            <div className="profile-hero__member-meta">
              <EditableContactField
                errorMessage={fieldErrors.email}
                field="email"
                icon={<MailIcon />}
                inputMode="email"
                isEditing={editingField === 'email'}
                isPasswordVisible={visiblePasswords.email}
                isSaving={savingField === 'email'}
                label="Email liên hệ"
                onCancel={handleCancel}
                onChange={handleDraftChange}
                onEdit={handleEdit}
                onPasswordChange={handlePasswordChange}
                onSave={handleSave}
                onTogglePasswordVisibility={handleTogglePasswordVisibility}
                passwordValue={passwordDrafts.email}
                placeholder="name@example.com"
                type="email"
                value={editingField === 'email' ? draftInfo.email : contactInfo.email}
              />

              <EditableContactField
                errorMessage={fieldErrors.phone}
                field="phone"
                icon={<PhoneIcon />}
                inputMode="tel"
                isEditing={editingField === 'phone'}
                isPasswordVisible={visiblePasswords.phone}
                isSaving={savingField === 'phone'}
                label="Số điện thoại liên hệ"
                onCancel={handleCancel}
                onChange={handleDraftChange}
                onEdit={handleEdit}
                onPasswordChange={handlePasswordChange}
                onSave={handleSave}
                onTogglePasswordVisibility={handleTogglePasswordVisibility}
                passwordValue={passwordDrafts.phone}
                placeholder="090 234 5678"
                type="tel"
                value={editingField === 'phone' ? draftInfo.phone : contactInfo.phone}
              />
            </div>

            {contactFeedback.message ? (
              <p
                className={`profile-hero__member-feedback profile-hero__member-feedback--${contactFeedback.tone}`}
                role="status"
              >
                {contactFeedback.message}
              </p>
            ) : null}

            {upcomingTrip ? (
              <article
                className="profile-hero__member-trip"
                style={
                  upcomingTrip.image_url
                    ? { backgroundImage: `url(${upcomingTrip.image_url})` }
                    : undefined
                }
              >
                <div className="profile-hero__member-trip-overlay" />
                <div className="profile-hero__member-trip-content">
                  <p>Chuyến đi sắp tới</p>
                  <span className="profile-hero__member-trip-badge">{upcomingTrip.badge}</span>
                  <small>Mã: {upcomingTrip.code}</small>
                  <strong>{upcomingTrip.title}</strong>
                  <span>{upcomingTrip.date_label} • {upcomingTrip.location_label}</span>
                  <div className="profile-hero__member-trip-actions">
                    <button type="button" onClick={onOpenUpcomingTripPrimary}>
                      {upcomingTrip.primary_action_label || 'Xem chi tiết'}
                    </button>
                    <button type="button" onClick={onOpenUpcomingTripSecondary}>
                      {upcomingTrip.secondary_action_label || 'Hỗ trợ'}
                    </button>
                  </div>
                </div>
              </article>
            ) : (
              <div className="profile-hero__member-note">
                <p>Sẵn sàng cho hành trình mới</p>
                <strong>Mọi lịch trình, ưu đãi và hỗ trợ ở cùng một nơi.</strong>
                <span>
                  Theo dõi đơn hàng, lịch khởi hành và hỗ trợ cá nhân trong một màn hình.
                </span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </header>
  )
}

export default ProfileHero
