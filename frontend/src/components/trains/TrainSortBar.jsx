function getSortLabel(selectedSort) {
  if (!selectedSort) {
    return 'Chọn sắp xếp'
  }

  if (selectedSort === 'price_asc') {
    return 'Giá thấp nhất'
  }

  if (selectedSort === 'price_desc') {
    return 'Giá cao nhất'
  }

  if (selectedSort === 'departure_time_asc') {
    return 'Khởi hành sớm'
  }

  if (selectedSort === 'duration_asc') {
    return 'Thời lượng ngắn nhất'
  }

  return 'Phù hợp nhất'
}

function TrainSortBar({ resultSummary, selectedSort, sortOptions, onSortChange }) {
  return (
    <div className="train-results__sort-bar">
      <p className="train-results__summary">
        {resultSummary.hasRoute ? (
          <>
            Tìm thấy <strong>{resultSummary.total}</strong> chuyến tàu từ{' '}
            <span>{resultSummary.fromLabel}</span> đến <span>{resultSummary.toLabel}</span>
          </>
        ) : (
          <>
            Hiện có <strong>{resultSummary.total}</strong> chuyến tàu đang mở bán
          </>
        )}
      </p>

      <label className="train-results__sort-control">
        <span>Sắp xếp theo:</span>
        <div className="train-results__sort-trigger">
          <span className="train-results__sort-value">{getSortLabel(selectedSort)}</span>
          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <path d="m8 10 4 4 4-4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
          <select
            aria-label="Sắp xếp danh sách chuyến tàu"
            className="train-results__sort-select"
            value={selectedSort}
            onChange={onSortChange}
          >
            <option value="">Chọn sắp xếp</option>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </label>
    </div>
  )
}

export default TrainSortBar
