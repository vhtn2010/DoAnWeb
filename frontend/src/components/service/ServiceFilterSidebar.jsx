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

export default function ServiceFilterSidebar({
  categoryOptions,
  draftFilters,
  durationOptions,
  onApply,
  onKeywordChange,
  onToggleValue,
  priceOptions,
}) {
  const categoryFilterOptions = categoryOptions.map((option) => ({
    value: option,
    label: option,
  }))

  return (
    <aside className="hotel-filter-sidebar hotel-filter-sidebar--sticky">
      <div className="hotel-filter-sidebar__header">
        <span aria-hidden="true" className="hotel-filter-sidebar__icon">
          <FilterIcon />
        </span>
        <h2 className="hotel-filter-sidebar__title">Bộ lọc nâng cao</h2>
      </div>

      <div className="hotel-filter-sidebar__section">
        <label className="hotel-filter-sidebar__section-title" htmlFor="service-filter-keyword">
          Địa điểm
        </label>
        <input
          className="hotel-filter-sidebar__search"
          id="service-filter-keyword"
          placeholder="Tìm kiếm điểm đến..."
          type="search"
          value={draftFilters.keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
        />
      </div>

      <FilterCheckboxGroup
        options={priceOptions}
        selectedValues={draftFilters.prices}
        title="Mức giá"
        onToggle={(value) => onToggleValue('prices', value)}
      />

      <FilterCheckboxGroup
        options={durationOptions}
        selectedValues={draftFilters.durations}
        title="Thời lượng tour"
        onToggle={(value) => onToggleValue('durations', value)}
      />

      <FilterCheckboxGroup
        options={categoryFilterOptions}
        selectedValues={draftFilters.categories}
        title="Loại hình tour"
        onToggle={(value) => onToggleValue('categories', value)}
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
