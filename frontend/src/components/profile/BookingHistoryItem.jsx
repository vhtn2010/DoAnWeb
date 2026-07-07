function HistoryIcon({ type }) {
  if (type === 'flight') {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M3.75 13.25h7.05l3.15 5.2c.2.35.56.55.96.55h1.34c.4 0 .65-.44.45-.8l-1.88-4.95h4.46c.56 0 1.08-.3 1.36-.78l.66-1.16c.19-.33-.05-.75-.43-.75H14.1L9.96 4.43a1.23 1.23 0 0 0-1.06-.61H7.7c-.36 0-.6.36-.46.68l2.02 5.06H3.75c-.42 0-.75.33-.75.75v2.19c0 .42.33.75.75.75Z"
          fill="currentColor"
        />
      </svg>
    )
  }

  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M4.5 8.5a2.5 2.5 0 0 1 2.5-2.5h10a2.5 2.5 0 0 1 2.5 2.5v7a2.5 2.5 0 0 1-2.5 2.5H7a2.5 2.5 0 0 1-2.5-2.5v-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 18V7m8 11V7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
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

function BookingHistoryItem({ item, onOpen }) {
  return (
    <button className="profile-history-item" type="button" onClick={() => onOpen(item)}>
      <span className="profile-history-item__icon" aria-hidden="true">
        <HistoryIcon type={item.icon_type} />
      </span>

      <span className="profile-history-item__copy">
        <strong>{item.title}</strong>
        <small>{item.description}</small>
      </span>

      <span className="profile-history-item__meta">
        <strong className="profile-history-item__price">{item.price_label}</strong>
        <span className="profile-history-item__status">{item.status_label}</span>
      </span>

      <span className="profile-history-item__arrow" aria-hidden="true">
        <ChevronIcon />
      </span>
    </button>
  )
}

export default BookingHistoryItem
