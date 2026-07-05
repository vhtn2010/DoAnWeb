import FlightPassengerSelector from './FlightPassengerSelector.jsx'

function SearchFieldIcon({ type }) {
  if (type === 'calendar') {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <rect height="14" rx="3" stroke="currentColor" strokeWidth="1.8" width="16" x="4" y="6" />
        <path d="M8 4v4M16 4v4M4 11h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    )
  }

  if (type === 'sort') {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <path d="m8 10 4 4 4-4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    )
  }

  if (type === 'search') {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    )
  }

  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M12 20s6-4.9 6-10a6 6 0 1 0-12 0c0 5.1 6 10 6 10Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="10" fill="currentColor" r="1.8" />
    </svg>
  )
}

function formatDateDisplay(value) {
  if (!value) {
    return '-- -- --'
  }

  const [year, month, day] = value.split('-')

  if (!year || !month || !day) {
    return value
  }

  return `${day} - ${month} - ${year}`
}

function getSortLabel(selectedSort, variant = 'search') {
  if (selectedSort === 'price_asc') {
    return variant === 'search' ? 'Giá rẻ nhất' : 'Giá thấp nhất'
  }

  if (selectedSort === 'price_desc') {
    return 'Giá cao nhất'
  }

  if (selectedSort === 'departure_time_asc') {
    return 'Giờ khởi hành sớm'
  }

  if (selectedSort === 'duration_asc') {
    return 'Thời lượng ngắn nhất'
  }

  return 'Phù hợp nhất'
}

function FlightSearchPanel({
  airports,
  feedback,
  searchState,
  selectedSort,
  sortOptions,
  updatePassengers,
  updateSearchField,
  onSortChange,
  onSubmit,
}) {
  return (
    <section className="flight-search-panel">
      <div className="flight-search-panel__grid">
        <label className="flight-search-panel__field">
          <span className="flight-search-panel__field-label">TỪ</span>
          <span className="flight-search-panel__field-shell">
            <span className="flight-search-panel__field-icon" aria-hidden="true">
              <SearchFieldIcon type="location" />
            </span>
            <select
              value={searchState.from_location}
              onChange={(event) => updateSearchField('from_location', event.target.value)}
            >
              {airports.map((airport) => (
                <option key={airport.airport_code} value={airport.airport_code}>
                  {airport.label}
                </option>
              ))}
            </select>
          </span>
        </label>

        <label className="flight-search-panel__field">
          <span className="flight-search-panel__field-label">ĐẾN</span>
          <span className="flight-search-panel__field-shell">
            <span className="flight-search-panel__field-icon" aria-hidden="true">
              <SearchFieldIcon type="location" />
            </span>
            <select
              value={searchState.to_location}
              onChange={(event) => updateSearchField('to_location', event.target.value)}
            >
              {airports.map((airport) => (
                <option key={airport.airport_code} value={airport.airport_code}>
                  {airport.label}
                </option>
              ))}
            </select>
          </span>
        </label>

        <label className="flight-search-panel__field">
          <span className="flight-search-panel__field-label">NGÀY ĐI - VỀ</span>
          <span className="flight-search-panel__field-shell flight-search-panel__field-shell--date-display">
            <span className="flight-search-panel__field-icon" aria-hidden="true">
              <SearchFieldIcon type="calendar" />
            </span>
            <span className="flight-search-panel__date-display">
              {formatDateDisplay(searchState.departure_date)}
            </span>
            <input
              aria-label="Ngày đi"
              className="flight-search-panel__date-input"
              type="date"
              value={searchState.departure_date}
              onChange={(event) => updateSearchField('departure_date', event.target.value)}
            />
          </span>
        </label>

        <FlightPassengerSelector passengers={searchState.passengers} onChange={updatePassengers} />
      </div>

      <div className="flight-search-panel__divider" aria-hidden="true" />

      <div className="flight-search-panel__footer">
        <div className="flight-search-panel__footer-spacer" aria-hidden="true" />

        <button className="flight-search-panel__submit" type="button" onClick={onSubmit}>
          <SearchFieldIcon type="search" />
          <span>Tìm kiếm chuyến bay</span>
        </button>

        <label className="flight-search-panel__sort">
          <span className="flight-search-panel__sort-prefix">Sắp xếp:</span>
          <div className="flight-search-panel__sort-trigger">
            <span className="flight-search-panel__sort-value">
              {getSortLabel(selectedSort, 'search')}
            </span>
            <span className="flight-search-panel__sort-icon" aria-hidden="true">
              <SearchFieldIcon type="sort" />
            </span>
            <select
              aria-label="Sắp xếp chuyến bay"
              className="flight-search-panel__sort-select"
              value={selectedSort}
              onChange={onSortChange}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </label>
      </div>

      {feedback.message ? (
        <p
          className={`flight-search-panel__feedback flight-search-panel__feedback--${feedback.tone}`}
          role="status"
        >
          {feedback.message}
        </p>
      ) : null}
    </section>
  )
}

export default FlightSearchPanel
