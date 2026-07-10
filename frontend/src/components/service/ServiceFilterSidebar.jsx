import { PublicButton } from '../public/ui/index.js'

function FilterIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M3.75 5.25h12.5M6.5 10h7m-4.25 4.75h1.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M9 4.25a4.75 4.75 0 1 1 0 9.5 4.75 4.75 0 0 1 0-9.5Zm6.25 11 2 2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
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
  return (
    <aside className="service-filter">
      <div className="service-filter__header">
        <span className="service-filter__marker" aria-hidden="true">
          <FilterIcon />
        </span>
        <h2 className="service-filter__title">Bộ lọc nâng cao</h2>
      </div>

      <div className="service-filter__section">
        <label className="service-filter__label" htmlFor="service-filter-keyword">
          Địa điểm
        </label>
        <div className="service-filter__search-shell">
          <span className="service-filter__search-icon" aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            className="service-filter__search"
            id="service-filter-keyword"
            placeholder="Tìm kiếm điểm đến..."
            type="search"
            value={draftFilters.keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
          />
        </div>
      </div>

      <div className="service-filter__section">
        <h3 className="service-filter__label">Mức giá</h3>
        <div className="service-filter__checks">
          {priceOptions.map((option) => (
            <label className="service-filter__check" key={option.value}>
              <input
                checked={draftFilters.prices.includes(option.value)}
                type="checkbox"
                onChange={() => onToggleValue('prices', option.value)}
              />
              <span aria-hidden="true" className="service-filter__check-box" />
              <span className="service-filter__check-label">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="service-filter__section">
        <h3 className="service-filter__label">Thời gian</h3>
        <div className="service-filter__checks">
          {durationOptions.map((option) => (
            <label className="service-filter__check" key={option.value}>
              <input
                checked={draftFilters.durations.includes(option.value)}
                type="checkbox"
                onChange={() => onToggleValue('durations', option.value)}
              />
              <span aria-hidden="true" className="service-filter__check-box" />
              <span className="service-filter__check-label">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="service-filter__section">
        <h3 className="service-filter__label">Loại hình Tour</h3>
        <div className="service-filter__chips">
          {categoryOptions.map((option) => (
            <button
              className={`service-filter__chip ${
                draftFilters.categories.includes(option) ? 'service-filter__chip--active' : ''
              }`}
              key={option}
              type="button"
              onClick={() => onToggleValue('categories', option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <PublicButton
        className="service-filter__apply"
        size="md"
        type="button"
        variant="primary"
        onClick={onApply}
      >
        Áp dụng bộ lọc
      </PublicButton>
    </aside>
  )
}
