function FlightSortBar({ resultSummary, selectedSort, sortOptions, onSortChange }) {
  return (
    <div className="flight-sort-bar">
      <p className="flight-sort-bar__summary">
        Tìm thấy <strong>{resultSummary.total}</strong> chuyến bay từ{' '}
        <span>{resultSummary.fromLabel}</span> đến <span>{resultSummary.toLabel}</span>
      </p>

      <label className="flight-sort-bar__control">
        <span>Sắp xếp theo:</span>
        <div className="flight-sort-bar__select-shell">
          <select value={selectedSort} onChange={onSortChange}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <path d="m8 10 4 4 4-4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
        </div>
      </label>
    </div>
  )
}

export default FlightSortBar
