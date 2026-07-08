import { useEffect, useState } from 'react'

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

function getInitials(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean)

  if (!words.length) {
    return 'NV'
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
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

function EditableContactField({
  field,
  icon,
  inputMode,
  isEditing,
  label,
  onCancel,
  onChange,
  onEdit,
  onSave,
  placeholder,
  type = 'text',
  value,
}) {
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
          <input
            aria-label={label}
            className="profile-hero__member-input"
            inputMode={inputMode}
            onChange={(event) => onChange(field, event.target.value)}
            placeholder={placeholder}
            type={type}
            value={value}
          />
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
          <button type="button" onClick={() => onSave(field)}>
            Lưu
          </button>
          <button
            className="profile-hero__member-inline-cancel"
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

function ProfileHero({
  greeting,
  highlights = [],
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
  const [editingField, setEditingField] = useState('')
  const [contactFeedback, setContactFeedback] = useState('')

  useEffect(() => {
    const nextContactInfo = {
      email: profile?.email ?? '',
      phone: profile?.phone ?? '',
    }

    setContactInfo(nextContactInfo)
    setDraftInfo(nextContactInfo)
    setEditingField('')
    setContactFeedback('')
  }, [profile?.email, profile?.phone])

  function handleEdit(field) {
    setDraftInfo((currentDraft) => ({
      ...currentDraft,
      [field]: contactInfo[field] ?? '',
    }))
    setEditingField(field)
    setContactFeedback('')
  }

  function handleDraftChange(field, value) {
    setDraftInfo((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }))
    setContactFeedback('')
  }

  function handleCancel(field) {
    setDraftInfo((currentDraft) => ({
      ...currentDraft,
      [field]: contactInfo[field] ?? '',
    }))
    setEditingField('')
    setContactFeedback('')
  }

  function handleSave(field) {
    const nextValue = draftInfo[field]?.trim() ?? ''
    const isValid = field === 'email' ? isValidEmail(nextValue) : isValidPhone(nextValue)

    if (!isValid) {
      setContactFeedback(
        field === 'email'
          ? 'Email chưa đúng định dạng.'
          : 'Số điện thoại cần từ 8 đến 20 ký tự hợp lệ.',
      )
      return
    }

    setContactInfo((currentInfo) => ({
      ...currentInfo,
      [field]: nextValue,
    }))
    setDraftInfo((currentDraft) => ({
      ...currentDraft,
      [field]: nextValue,
    }))
    setEditingField('')
    setContactFeedback(
      field === 'email'
        ? 'Đã cập nhật email trong giao diện demo.'
        : 'Đã cập nhật số điện thoại trong giao diện demo.',
    )
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
            </div>
          ) : null}

          {highlights.length ? (
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
              {profile?.avatar_url ? (
                <img
                  alt={displayName}
                  className="profile-hero__avatar-image"
                  src={profile.avatar_url}
                />
              ) : (
                <span className="profile-hero__avatar" aria-hidden="true">
                  {getInitials(displayName)}
                </span>
              )}

              <div className="profile-hero__member-copy">
                <p className="profile-hero__member-label">Thẻ thành viên</p>
                <strong>{normalizeLoyaltyTier(profile?.loyalty_tier)}</strong>
                <small>{displayName}</small>
              </div>
            </div>

            <div className="profile-hero__member-meta">
              <EditableContactField
                field="email"
                icon={<MailIcon />}
                inputMode="email"
                isEditing={editingField === 'email'}
                label="Email liên hệ"
                onCancel={handleCancel}
                onChange={handleDraftChange}
                onEdit={handleEdit}
                onSave={handleSave}
                placeholder="name@example.com"
                type="email"
                value={editingField === 'email' ? draftInfo.email : contactInfo.email}
              />

              <EditableContactField
                field="phone"
                icon={<PhoneIcon />}
                inputMode="tel"
                isEditing={editingField === 'phone'}
                label="Số điện thoại liên hệ"
                onCancel={handleCancel}
                onChange={handleDraftChange}
                onEdit={handleEdit}
                onSave={handleSave}
                placeholder="090 234 5678"
                type="tel"
                value={editingField === 'phone' ? draftInfo.phone : contactInfo.phone}
              />
            </div>

            {contactFeedback ? (
              <p className="profile-hero__member-feedback" role="status">
                {contactFeedback}
              </p>
            ) : null}

            <div className="profile-hero__member-note">
              <p>{upcomingTrip ? 'Chuyến đi nổi bật' : 'Sẵn sàng cho hành trình mới'}</p>
              <strong>
                {upcomingTrip?.title ?? 'Mọi lịch trình, ưu đãi và hỗ trợ ở cùng một nơi.'}
              </strong>
              <span>
                {upcomingTrip
                  ? `${upcomingTrip.date_label} • ${upcomingTrip.location_label}`
                  : 'Theo dõi đơn hàng, lịch khởi hành và hỗ trợ cá nhân trong một màn hình.'}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </header>
  )
}

export default ProfileHero
