function HistoryIcon({ type }) {
  if (type === 'flight') {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M11.25 2.75a.75.75 0 0 1 1.5 0v5.89l6.68 3.03a1.5 1.5 0 0 1-.62 2.87h-5.34l1.88 5.39a.75.75 0 0 1-1.16.85L12 19.16l-2.19 1.62a.75.75 0 0 1-1.16-.85l1.88-5.39H5.19a1.5 1.5 0 0 1-.62-2.87l6.68-3.03V2.75Z"
          fill="currentColor"
        />
      </svg>
    )
  }

  if (type === 'train') {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M7.5 4.5h9a3 3 0 0 1 3 3V14a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M8 17.5 6.5 20m11-2.5 1.5 2.5M8.5 9h7M9 13h2m4 0h.01"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  if (type === 'tour') {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M5 18.5 12 5l7 13.5H5Z"
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
    <button
      className={`profile-history-item profile-history-item--${item.status_tone}`}
      type="button"
      onClick={() => onOpen(item)}
    >
      <span className="profile-history-item__visual" aria-hidden="true">
        {item.image_url ? (
          <img src={item.image_url} alt="" />
        ) : (
          <span className="profile-history-item__visual-fallback">
            <HistoryIcon type={item.icon_type} />
          </span>
        )}

        <span className="profile-history-item__icon">
          <HistoryIcon type={item.icon_type} />
        </span>
      </span>

      <span className="profile-history-item__copy">
        <span className="profile-history-item__tags">
          {item.service_label ? (
            <span className="profile-history-item__service">{item.service_label}</span>
          ) : null}
          {item.booking_code ? (
            <span className="profile-history-item__code">Mã {item.booking_code}</span>
          ) : null}
        </span>

        <strong>{item.title}</strong>
        <small>{item.description}</small>

        <span className="profile-history-item__details">
          {item.travel_date_label ? <span>{item.travel_date_label}</span> : null}
          {item.route_label ? <span>{item.route_label}</span> : null}
          {item.detail_summary ? <span>{item.detail_summary}</span> : null}
        </span>

        {item.support_note ? (
          <span className="profile-history-item__support-note">{item.support_note}</span>
        ) : null}
      </span>

      <span className="profile-history-item__meta">
        <span className={`profile-history-item__status profile-history-item__status--${item.status_tone}`}>
          {item.status_label}
        </span>
        <strong className="profile-history-item__price">{item.price_label}</strong>
        <span className="profile-history-item__action">{item.action_label}</span>
      </span>

      <span className="profile-history-item__arrow" aria-hidden="true">
        <ChevronIcon />
      </span>
    </button>
  )
}

export default BookingHistoryItem
