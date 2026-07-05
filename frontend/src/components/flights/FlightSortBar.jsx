function FlightSortBar({ resultSummary, selectedSort, sortOptions, onSortChange }) {
  return (
    <div className="flight-sort-bar">
      <div>
        <h2 className="flight-sort-bar__title">Chuyến bay phù hợp</h2>
        <p className="flight-sort-bar__summary">{resultSummary}</p>
      </div>

      <label className="flight-sort-bar__control">
        <span>Sắp xếp:</span>
        <select value={selectedSort} onChange={onSortChange}>
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export default FlightSortBar
