import { Link } from 'react-router-dom'

function ShortcutIcon({ icon }) {
  if (icon === 'ticket') {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M7 6.5h10a2 2 0 0 1 2 2v1.25a1.75 1.75 0 0 0 0 3.5v1.25a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-1.25a1.75 1.75 0 0 0 0-3.5V8.5a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M9 9.5h6M9 14.5h3"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  if (icon === 'users') {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 1.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M4.5 18a4.5 4.5 0 0 1 9 0m1 0a3.5 3.5 0 0 1 5 0"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  if (icon === 'bell') {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M7 10a5 5 0 1 1 10 0v3.06c0 .69.22 1.37.62 1.93l.88 1.23a1 1 0 0 1-.81 1.58H6.31a1 1 0 0 1-.81-1.58l.88-1.23A3.33 3.33 0 0 0 7 13.06V10Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M10 18.5a2 2 0 0 0 4 0"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  if (icon === 'headset') {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M5.5 12a6.5 6.5 0 1 1 13 0v4a2 2 0 0 1-2 2h-1.5v-5H19"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M5 13h1.5v5H5a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  if (icon === 'blog') {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M7 5.5h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M8.5 9.5h7m-7 3h7m-7 3h4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  if (icon === 'help') {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M12 18h.01M9.4 9.5a2.6 2.6 0 1 1 4.2 2.06c-.74.58-1.1.97-1.1 1.94"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }

  if (icon === 'logout') {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M10 6.5H7.5A2.5 2.5 0 0 0 5 9v6a2.5 2.5 0 0 0 2.5 2.5H10"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M13 8.5 18 12l-5 3.5M18 12H9"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M6.5 18.5 12 6l5.5 12.5h-11Z"
        stroke="currentColor"
        strokeJoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M12 9.5v4m0 2h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function ProfileShortcutPanel({
  description,
  eyebrow,
  items = [],
  onOpenItem,
  title,
  tone = 'utility',
}) {
  return (
    <section className={`profile-shortcut-panel profile-shortcut-panel--${tone}`}>
      <header className="profile-shortcut-panel__header">
        <p className="profile-shortcut-panel__eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="profile-shortcut-panel__description">{description}</p>
      </header>

      <div className="profile-shortcut-panel__grid">
        {items.map((item) => {
          const cardContent = (
            <>
              <span className="profile-shortcut-card__icon" aria-hidden="true">
                <ShortcutIcon icon={item.icon} />
              </span>

              <span className="profile-shortcut-card__copy">
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>

              <span className="profile-shortcut-card__action">{item.action_label}</span>
            </>
          )

          if (item.detail_path) {
            return (
              <Link className="profile-shortcut-card" key={item.id} to={item.detail_path}>
                {cardContent}
              </Link>
            )
          }

          return (
            <button
              key={item.id}
              className="profile-shortcut-card"
              type="button"
              onClick={() => onOpenItem(item)}
            >
              {cardContent}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default ProfileShortcutPanel
