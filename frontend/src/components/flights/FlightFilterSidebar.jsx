import {
  FLIGHT_DEPARTURE_TIME_FILTER_OPTIONS,
  FLIGHT_PRICE_FILTER_OPTIONS,
  FLIGHT_STOP_FILTER_OPTIONS,
} from '../../constants/flights.js'

function FilterSection({ children, title }) {
  return (
    <section className="flight-filter-sidebar__section">
      <h3>{title}</h3>
      <div className="flight-filter-sidebar__checks">{children}</div>
    </section>
  )
}

function FilterCheckbox({ checked, label, onChange }) {
  return (
    <label className="flight-filter-sidebar__check">
      <input checked={checked} type="checkbox" onChange={onChange} />
      <span>{label}</span>
    </label>
  )
}

function FlightFilterSidebar({ airlineOptions, draftFilters, onApply, onToggle }) {
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
          <FilterCheckbox
            checked={draftFilters.airline_codes.includes(airline.code)}
            key={airline.code}
            label={airline.name}
            onChange={() => onToggle('airline_codes', airline.code)}
          />
        ))}
      </FilterSection>

      <FilterSection title="Khung giờ bay">
        {FLIGHT_DEPARTURE_TIME_FILTER_OPTIONS.map((option) => (
          <FilterCheckbox
            checked={draftFilters.departure_windows.includes(option.value)}
            key={option.value}
            label={option.label}
            onChange={() => onToggle('departure_windows', option.value)}
          />
        ))}
      </FilterSection>

      <FilterSection title="Điểm dừng">
        {FLIGHT_STOP_FILTER_OPTIONS.map((option) => (
          <FilterCheckbox
            checked={draftFilters.stop_counts.includes(option.value)}
            key={option.value}
            label={option.label}
            onChange={() => onToggle('stop_counts', option.value)}
          />
        ))}
      </FilterSection>

      <FilterSection title="Mức giá">
        {FLIGHT_PRICE_FILTER_OPTIONS.map((option) => (
          <FilterCheckbox
            checked={draftFilters.price_ranges.includes(option.value)}
            key={option.value}
            label={option.label}
            onChange={() => onToggle('price_ranges', option.value)}
          />
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
      </div>
    </aside>
  )
}

export default FlightFilterSidebar
