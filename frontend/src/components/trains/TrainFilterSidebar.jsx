import {
  TRAIN_DEPARTURE_TIME_FILTER_OPTIONS,
  TRAIN_PRICE_FILTER_OPTIONS,
} from '../../constants/trains.js'

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

function TrainFilterSidebar({ draftFilters, onApply, onToggle }) {
  return (
    <aside className="hotel-filter-sidebar hotel-filter-sidebar--sticky">
      <div className="hotel-filter-sidebar__header">
        <span aria-hidden="true" className="hotel-filter-sidebar__icon">
          <FilterIcon />
        </span>
        <h2 className="hotel-filter-sidebar__title">Bộ lọc nâng cao</h2>
      </div>

      <FilterCheckboxGroup
        options={TRAIN_DEPARTURE_TIME_FILTER_OPTIONS}
        selectedValues={draftFilters.departure_windows}
        title="Khung giờ khởi hành"
        onToggle={(value) => onToggle('departure_windows', value)}
      />

      <FilterCheckboxGroup
        options={TRAIN_PRICE_FILTER_OPTIONS}
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

export default TrainFilterSidebar
