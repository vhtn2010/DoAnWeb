import FlightPassengerSelector from './FlightPassengerSelector.jsx'

function FlightSearchPanel({
  airports,
  cabinClasses,
  feedback,
  searchState,
  updatePassengers,
  updateSearchField,
  updateTripType,
  onSubmit,
}) {
  const isRoundTrip = searchState.trip_type === 'round_trip'

  return (
    <section className="flight-search-panel">
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

      <div className="flight-search-panel__grid">
        <label className="flight-search-panel__field">
          <span>Điểm đi</span>
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
        </label>

        <label className="flight-search-panel__field">
          <span>Điểm đến</span>
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
        </label>

        <label className="flight-search-panel__field">
          <span>Ngày đi</span>
          <input
            type="date"
            value={searchState.departure_date}
            onChange={(event) => updateSearchField('departure_date', event.target.value)}
          />
        </label>

        <label className="flight-search-panel__field">
          <span>Ngày về</span>
          <input
            disabled={!isRoundTrip}
            type="date"
            value={isRoundTrip ? searchState.return_date : ''}
            onChange={(event) => updateSearchField('return_date', event.target.value)}
          />
        </label>

        <FlightPassengerSelector passengers={searchState.passengers} onChange={updatePassengers} />

        <label className="flight-search-panel__field">
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
      </div>

      <div className="flight-search-panel__footer">
        <button className="flight-search-panel__submit" type="button" onClick={onSubmit}>
          Tìm chuyến bay
        </button>

        {feedback.message ? (
          <p className={`flight-search-panel__feedback flight-search-panel__feedback--${feedback.tone}`} role="status">
            {feedback.message}
          </p>
        ) : null}
      </div>
    </section>
  )
}

export default FlightSearchPanel
