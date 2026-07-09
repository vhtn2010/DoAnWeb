import { PublicButton } from '../public/ui/index.js'

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
        <span className="service-filter__marker" aria-hidden="true" />
        <h2 className="service-filter__title">Bộ lọc nâng cao</h2>
      </div>

      <div className="service-filter__section">
        <label className="service-filter__label" htmlFor="service-filter-keyword">
          Địa điểm
        </label>
        <input
          className="service-filter__search"
          id="service-filter-keyword"
          placeholder="Tìm kiếm điểm đến..."
          type="search"
          value={draftFilters.keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
        />
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
              <span>{option.label}</span>
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
              <span>{option.label}</span>
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

      <PublicButton className="service-filter__apply" type="button" variant="primary" onClick={onApply}>
        Áp dụng bộ lọc
      </PublicButton>
    </aside>
  )
}
