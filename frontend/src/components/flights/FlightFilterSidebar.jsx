import {
  FLIGHT_DEPARTURE_TIME_FILTER_OPTIONS,
  FLIGHT_PRICE_FILTER_OPTIONS,
  FLIGHT_STOP_FILTER_OPTIONS,
} from '../../constants/flights.js'

function FilterIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M4.5 6.25h15m-12 5.5h9m-6 5.5h3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function FilterCheckboxGroup({ options, selectedValues, title, onToggle }) {
  return (
    <div className="hotel-filter-sidebar__section">
      <h3 className="hotel-filter-sidebar__section-title">{title}</h3>
      <div className="hotel-filter-sidebar__checks">
        {options.map((option) => (
          <label className="hotel-filter-sidebar__check" key={option.value}>
            <input
              checked={selectedValues.includes(option.value)}
              type="checkbox"
              onChange={() => onToggle(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

const FLIGHT_AIRLINE_FILTER_OPTIONS = Object.freeze([
  { value: 'VN', label: 'Vietnam Airlines' },
  { value: 'VJ', label: 'Vietject Air' },
])

function FlightFilterSidebar({ draftFilters, onApply, onToggle }) {
  const selectedAirlineCodes = draftFilters.airline_codes.filter((code) =>
    FLIGHT_AIRLINE_FILTER_OPTIONS.some((option) => option.value === code),
  )

  return (
    <aside className="hotel-filter-sidebar hotel-filter-sidebar--sticky">
      <div className="hotel-filter-sidebar__header">
        <span aria-hidden="true" className="hotel-filter-sidebar__icon">
          <FilterIcon />
        </span>
        <h2 className="hotel-filter-sidebar__title">Bộ lọc nâng cao</h2>
      </div>

      <FilterCheckboxGroup
        options={FLIGHT_AIRLINE_FILTER_OPTIONS}
        selectedValues={selectedAirlineCodes}
        title="Hãng hàng không"
        onToggle={(value) => onToggle('airline_codes', value)}
      />

      <FilterCheckboxGroup
        options={FLIGHT_DEPARTURE_TIME_FILTER_OPTIONS}
        selectedValues={draftFilters.departure_windows}
        title="Khung giờ bay"
        onToggle={(value) => onToggle('departure_windows', value)}
      />

      <FilterCheckboxGroup
        options={FLIGHT_STOP_FILTER_OPTIONS}
        selectedValues={draftFilters.stop_counts}
        title="Điểm dừng"
        onToggle={(value) => onToggle('stop_counts', value)}
      />

      <FilterCheckboxGroup
        options={FLIGHT_PRICE_FILTER_OPTIONS}
        selectedValues={draftFilters.price_ranges}
        title="Mức giá"
        onToggle={(value) => onToggle('price_ranges', value)}
      />

      <button
        className="hotel-filter-sidebar__apply hotel-filter-sidebar__apply--full"
        type="button"
        onClick={onApply}
      >
        Áp dụng bộ lọc
      </button>
    </aside>
  )
}

export default FlightFilterSidebar
