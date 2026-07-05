import {
  FLIGHT_DEPARTURE_TIME_FILTER_OPTIONS,
  FLIGHT_PRICE_FILTER_OPTIONS,
} from '../../constants/flights.js'

const STOP_OPTIONS = Object.freeze([
  { value: 'direct', label: 'Bay thẳng' },
])

function FilterSection({ children, title }) {
  return (
    <section className="flight-filter-sidebar__section">
      <h3>{title}</h3>
      <div className="flight-filter-sidebar__checks">{children}</div>
    </section>
  )
}

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
        <span className="flight-filter-sidebar__marker" aria-hidden="true">
          <svg fill="none" viewBox="0 0 24 24">
            <path
              d="M4 6.5h16M7.5 12h9M10.5 17.5h3"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
        </span>
        <h2 className="flight-filter-sidebar__title">Bộ lọc nâng cao</h2>
      </div>

      <FilterSection title="Hãng hàng không">
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
      </FilterSection>

      <FilterSection title="Khung giờ bay">
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
      </FilterSection>

      <FilterSection title="Điểm dừng">
        {STOP_OPTIONS.map((option) => (
          <label className="flight-filter-sidebar__check" key={option.value}>
            <input checked readOnly type="checkbox" />
            <span>{option.label}</span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Mức giá">
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
      </FilterSection>

      <div className="flight-filter-sidebar__actions">
        <button
          className="flight-filter-sidebar__button flight-filter-sidebar__button--primary"
          type="button"
          onClick={onApply}
        >
          Áp dụng bộ lọc
        </button>
        <button
          className="flight-filter-sidebar__button flight-filter-sidebar__button--ghost"
          type="button"
          onClick={onReset}
        >
          Xóa bộ lọc
        </button>
      </div>
    </aside>
  )
}

export default FlightFilterSidebar
