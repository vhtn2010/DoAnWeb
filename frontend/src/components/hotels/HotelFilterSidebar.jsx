const priceOptions = [
  { value: 'under-2m', label: 'Dưới 2 triệu' },
  { value: '2-5m', label: '2 - 5 triệu' },
  { value: 'over-5m', label: 'Trên 5 triệu' },
]

const durationOptions = [
  { value: '1-3', label: '1 - 3 ngày' },
  { value: '4-7', label: '4 - 7 ngày' },
  { value: 'other', label: 'Khác' },
]

const starOptions = [
  { value: '5', label: '5 sao' },
  { value: '4', label: '4 sao' },
  { value: '3', label: '3 sao' },
]

function FilterIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
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

function HotelFilterSidebar({ filters, onApply, onLocationChange, onToggleFilter }) {
  return (
    <aside className="hotel-filter-sidebar">
      <div className="hotel-filter-sidebar__header">
        <span aria-hidden="true" className="hotel-filter-sidebar__icon">
          <FilterIcon />
        </span>
        <h2 className="hotel-filter-sidebar__title">Bộ lọc nâng cao</h2>
      </div>

      <div className="hotel-filter-sidebar__section">
        <label className="hotel-filter-sidebar__section-title" htmlFor="hotel-sidebar-location">
          Địa điểm
        </label>
        <input
          className="hotel-filter-sidebar__search"
          id="hotel-sidebar-location"
          placeholder="Tìm kiếm điểm đến..."
          type="search"
          value={filters.sidebarLocation}
          onChange={onLocationChange}
        />
      </div>

      <FilterCheckboxGroup
        options={priceOptions}
        selectedValues={filters.priceRanges}
        title="Mức giá"
        onToggle={(value) => onToggleFilter('priceRanges', value)}
      />

      <FilterCheckboxGroup
        options={durationOptions}
        selectedValues={filters.durations}
        title="Thời gian"
        onToggle={(value) => onToggleFilter('durations', value)}
      />

      <FilterCheckboxGroup
        options={starOptions}
        selectedValues={filters.starRatings}
        title="Số sao khách sạn"
        onToggle={(value) => onToggleFilter('starRatings', value)}
      />

      <button className="hotel-filter-sidebar__apply" type="button" onClick={onApply}>
        Áp dụng bộ lọc
      </button>
    </aside>
  )
}

export default HotelFilterSidebar
