import FlightAirportCombobox from './FlightAirportCombobox.jsx'
import FlightDateRangePicker from './FlightDateRangePicker.jsx'
import FlightPassengerSelector from './FlightPassengerSelector.jsx'

function SearchFieldIcon({ type }) {
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

  return null
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
  updateTripType,
  onSortChange,
  onSubmit,
}) {
  function handleAirportChange(fieldName, nextAirportCode) {
    if (fieldName === 'from_location') {
      if (nextAirportCode === searchState.to_location) {
        updateSearchField('to_location', searchState.from_location)
      }

      updateSearchField('from_location', nextAirportCode)
      return
    }

    if (nextAirportCode === searchState.from_location) {
      updateSearchField('from_location', searchState.to_location)
    }

    updateSearchField('to_location', nextAirportCode)
  }

  function handleDateChange({ departureDate, returnDate }) {
    updateSearchField('departure_date', departureDate)
    updateSearchField('return_date', returnDate ?? '')
  }

  return (
    <section className="flight-search-panel">
      <div className="flight-search-panel__grid">
        <FlightAirportCombobox
          label="TỪ"
          options={airports}
          value={searchState.from_location}
          onChange={(nextAirportCode) => handleAirportChange('from_location', nextAirportCode)}
        />

        <FlightAirportCombobox
          label="ĐẾN"
          options={airports}
          value={searchState.to_location}
          onChange={(nextAirportCode) => handleAirportChange('to_location', nextAirportCode)}
        />

        <FlightDateRangePicker
          departureDate={searchState.departure_date}
          returnDate={searchState.return_date}
          tripType={searchState.trip_type}
          onChange={handleDateChange}
        />

        <FlightPassengerSelector passengers={searchState.passengers} onChange={updatePassengers} />

        <button className="flight-search-panel__submit" type="button" onClick={onSubmit}>
          <SearchFieldIcon type="search" />
          <span>Tìm kiếm chuyến bay</span>
        </button>
      </div>

      <div className="flight-search-panel__divider" aria-hidden="true" />

      <div className="flight-search-panel__footer">
        <div className="flight-trip-toggle" aria-label="Loại vé" role="group">
          <button
            className={`flight-trip-toggle-btn ${
              searchState.trip_type === 'round_trip' ? 'active' : ''
            }`}
            type="button"
            onClick={() => updateTripType('round_trip')}
          >
            Khứ hồi
          </button>
          <button
            className={`flight-trip-toggle-btn ${
              searchState.trip_type === 'one_way' ? 'active' : ''
            }`}
            type="button"
            onClick={() => updateTripType('one_way')}
          >
            1 Chiều
          </button>
        </div>

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
