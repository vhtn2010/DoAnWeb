import {
  FLIGHT_DEPARTURE_TIME_FILTER_OPTIONS,
  FLIGHT_PRICE_FILTER_OPTIONS,
} from '../../constants/flights.js'

function FlightFilterSidebar({
  airlineOptions,
  draftFilters,
  onApply,
  onReset,
  onToggle,
}) {
  return (
    <aside className="flight-filter-sidebar">
      <div className="flight-filter-sidebar__header">
        <span className="flight-filter-sidebar__marker" aria-hidden="true" />
        <h2 className="flight-filter-sidebar__title">Bộ lọc chuyến bay</h2>
      </div>

      <section className="flight-filter-sidebar__section">
        <h3>Hãng bay</h3>
        <div className="flight-filter-sidebar__checks">
          {airlineOptions.map((airline) => (
            <label className="flight-filter-sidebar__check" key={airline.code}>
              <input
                checked={draftFilters.airline_codes.includes(airline.code)}
                type="checkbox"
                onChange={() => onToggle('airline_codes', airline.code)}
              />
              <span>{airline.name}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="flight-filter-sidebar__section">
        <h3>Giờ khởi hành</h3>
        <div className="flight-filter-sidebar__checks">
          {FLIGHT_DEPARTURE_TIME_FILTER_OPTIONS.map((option) => (
            <label className="flight-filter-sidebar__check" key={option.value}>
              <input
                checked={draftFilters.departure_windows.includes(option.value)}
                type="checkbox"
                onChange={() => onToggle('departure_windows', option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="flight-filter-sidebar__section">
        <h3>Mức giá</h3>
        <div className="flight-filter-sidebar__checks">
          {FLIGHT_PRICE_FILTER_OPTIONS.map((option) => (
            <label className="flight-filter-sidebar__check" key={option.value}>
              <input
                checked={draftFilters.price_ranges.includes(option.value)}
                type="checkbox"
                onChange={() => onToggle('price_ranges', option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </section>

      <div className="flight-filter-sidebar__actions">
        <button className="flight-filter-sidebar__button flight-filter-sidebar__button--primary" type="button" onClick={onApply}>
          Áp dụng bộ lọc
        </button>
        <button className="flight-filter-sidebar__button flight-filter-sidebar__button--ghost" type="button" onClick={onReset}>
          Xóa bộ lọc
        </button>
      </div>
    </aside>
  )
}

export default FlightFilterSidebar
