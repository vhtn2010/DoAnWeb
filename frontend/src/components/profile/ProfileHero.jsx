function ArrowIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path
        d="M4.75 10h10.5m-4-4 4 4-4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

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

function ProfileHero({
  greeting,
  highlights = [],
  onPrimaryAction,
  onSecondaryAction,
  primaryActionLabel = 'Xem lịch trình gần nhất',
  profile,
  secondaryActionLabel = 'Theo dõi chuyến đi',
  stats = [],
  upcomingTrip,
}) {
  const displayName = profile?.full_name ?? greeting.title.replace('Xin chào, ', '')

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

          <div className="profile-hero__actions">
            <button className="profile-hero__cta" type="button" onClick={onPrimaryAction}>
              <span>{primaryActionLabel}</span>
              <ArrowIcon />
            </button>

            <button
              className="profile-hero__ghost"
              type="button"
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </button>
          </div>

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
                <strong>{profile?.loyalty_tier ?? 'Nét Việt Member'}</strong>
                <small>{displayName}</small>
              </div>
            </div>

            <div className="profile-hero__member-meta">
              {profile?.email ? (
                <span>
                  <MailIcon />
                  <span className="profile-hero__member-meta-text">{profile.email}</span>
                </span>
              ) : null}

              {profile?.phone ? (
                <span>
                  <PhoneIcon />
                  <span className="profile-hero__member-meta-text">{profile.phone}</span>
                </span>
              ) : null}
            </div>

            <div className="profile-hero__member-note">
              <p>{upcomingTrip ? 'Chuyến đi nổi bật' : 'Sẵn sàng cho hành trình mới'}</p>
              <strong>{upcomingTrip?.title ?? 'Mọi lịch trình, ưu đãi và hỗ trợ ở cùng một nơi.'}</strong>
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
