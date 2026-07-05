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

  if (type === 'location') {
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

  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M4.5 12h15M13 5.5l6 6.5-6 6.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function FlightSearchPanel({
  airports,
  cabinClasses,
  feedback,
  searchState,
  selectedSort,
  sortOptions,
  updatePassengers,
  updateSearchField,
  updateTripType,
  onSortChange,
  onSubmit,
}) {
  const isRoundTrip = searchState.trip_type === 'round_trip'

  return (
    <section className="flight-search-panel">
      <div className="flight-search-panel__topbar">
        <div className="flight-search-panel__trip-types" role="tablist" aria-label="Loại hành trình">
          <button
            aria-selected={searchState.trip_type === 'one_way'}
            className={`flight-search-panel__trip-button ${
              searchState.trip_type === 'one_way' ? 'flight-search-panel__trip-button--active' : ''
            }`}
            type="button"
            onClick={() => updateTripType('one_way')}
          >
            Một chiều
          </button>
          <button
            aria-selected={isRoundTrip}
            className={`flight-search-panel__trip-button ${
              isRoundTrip ? 'flight-search-panel__trip-button--active' : ''
            }`}
            type="button"
            onClick={() => updateTripType('round_trip')}
          >
            Khứ hồi
          </button>
        </div>

        <span className="flight-search-panel__caption">Đặt vé máy bay nội địa nhanh chóng</span>
      </div>

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

        <label className="flight-search-panel__field flight-search-panel__field--dates">
          <span className="flight-search-panel__field-label">NGÀY ĐI - VỀ</span>
          <span className="flight-search-panel__field-shell flight-search-panel__field-shell--dates">
            <span className="flight-search-panel__field-icon" aria-hidden="true">
              <SearchFieldIcon type="calendar" />
            </span>
            <input
              type="date"
              value={searchState.departure_date}
              onChange={(event) => updateSearchField('departure_date', event.target.value)}
            />
            <span className="flight-search-panel__date-separator" aria-hidden="true">
              -
            </span>
            <input
              disabled={!isRoundTrip}
              type="date"
              value={isRoundTrip ? searchState.return_date : ''}
              onChange={(event) => updateSearchField('return_date', event.target.value)}
            />
          </span>
        </label>

        <FlightPassengerSelector passengers={searchState.passengers} onChange={updatePassengers} />
      </div>

      <div className="flight-search-panel__divider" aria-hidden="true" />

      <div className="flight-search-panel__footer">
        <label className="flight-search-panel__utility">
          <span>Hạng vé</span>
          <select
            value={searchState.cabin_class}
            onChange={(event) => updateSearchField('cabin_class', event.target.value)}
          >
            {cabinClasses.map((cabinClass) => (
              <option key={cabinClass.value} value={cabinClass.value}>
                {cabinClass.label}
              </option>
            ))}
          </select>
        </label>

        <button className="flight-search-panel__submit" type="button" onClick={onSubmit}>
          <SearchFieldIcon type="search" />
          <span>Tìm kiếm chuyến bay</span>
        </button>

        <label className="flight-search-panel__sort">
          <span>Sắp xếp:</span>
          <div className="flight-search-panel__sort-shell">
            <select value={selectedSort} onChange={onSortChange}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span aria-hidden="true">
              <SearchFieldIcon type="sort" />
            </span>
          </div>
        </label>
      </div>

      {feedback.message ? (
        <p className={`flight-search-panel__feedback flight-search-panel__feedback--${feedback.tone}`} role="status">
          {feedback.message}
        </p>
      ) : null}
    </section>
  )
}

export default FlightSearchPanel
