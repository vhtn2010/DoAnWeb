import {
  TRAIN_DEPARTURE_TIME_FILTER_OPTIONS,
  TRAIN_PRICE_FILTER_OPTIONS,
  TRAIN_TYPE_FILTER_OPTIONS,
} from '../../constants/trains.js'

function FilterSection({ children, title }) {
  return (
    <section className="train-filter-sidebar__section">
      <h3>{title}</h3>
      <div className="train-filter-sidebar__checks">{children}</div>
    </section>
  )
}

function FilterCheckbox({ checked, label, onChange }) {
  return (
    <label className="train-filter-sidebar__check">
      <input checked={checked} type="checkbox" onChange={onChange} />
      <span>{label}</span>
    </label>
  )
}

function TrainFilterSidebar({ draftFilters, onApply, onToggle }) {
  return (
    <aside className="train-filter-sidebar">
      <div className="train-filter-sidebar__header">
        <span className="train-filter-sidebar__marker" aria-hidden="true">
          <svg fill="none" viewBox="0 0 24 24">
            <path
              d="M4 6.5h16M7.5 12h9M10.5 17.5h3"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
        </span>
        <h2 className="train-filter-sidebar__title">Bộ lọc nâng cao</h2>
      </div>

      <FilterSection title="Loại tàu">
        {TRAIN_TYPE_FILTER_OPTIONS.map((option) => (
          <FilterCheckbox
            checked={draftFilters.train_types.includes(option.value)}
            key={option.value}
            label={option.label}
            onChange={() => onToggle('train_types', option.value)}
          />
        ))}
      </FilterSection>

      <FilterSection title="Khung giờ khởi hành">
        {TRAIN_DEPARTURE_TIME_FILTER_OPTIONS.map((option) => (
          <FilterCheckbox
            checked={draftFilters.departure_windows.includes(option.value)}
            key={option.value}
            label={option.label}
            onChange={() => onToggle('departure_windows', option.value)}
          />
        ))}
      </FilterSection>

      <FilterSection title="Mức giá">
        {TRAIN_PRICE_FILTER_OPTIONS.map((option) => (
          <FilterCheckbox
            checked={draftFilters.price_ranges.includes(option.value)}
            key={option.value}
            label={option.label}
            onChange={() => onToggle('price_ranges', option.value)}
          />
        ))}
      </FilterSection>

      <div className="train-filter-sidebar__actions">
        <button
          className="train-filter-sidebar__button train-filter-sidebar__button--primary"
          type="button"
          onClick={onApply}
        >
          Áp dụng bộ lọc
        </button>
      </div>
    </aside>
  )
}

export default TrainFilterSidebar
