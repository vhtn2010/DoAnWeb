import TrainDateRangePicker from './TrainDateRangePicker.jsx'
import TrainPassengerSelector from './TrainPassengerSelector.jsx'
import TrainStationCombobox from './TrainStationCombobox.jsx'

function SearchFieldIcon({ type }) {
  if (type === 'sort') {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <path d="m8 10 4 4 4-4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    )
  }

  if (type === 'search') {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    )
  }

  return null
}

function getSortLabel(selectedSort, variant = 'search') {
  if (!selectedSort) {
    return 'Chọn sắp xếp'
  }

  if (selectedSort === 'price_asc') {
    return variant === 'search' ? 'Giá rẻ nhất' : 'Giá thấp nhất'
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

function TrainSearchPanel({
  feedback,
  searchState,
  selectedSort,
  sortOptions,
  stations,
  updatePassengers,
  updateSearchField,
  updateTripType,
  onSortChange,
  onSubmit,
}) {
  function handleStationChange(fieldName, nextStationCode) {
    if (fieldName === 'from_station') {
      if (nextStationCode === searchState.to_station) {
        updateSearchField('to_station', searchState.from_station)
      }

      updateSearchField('from_station', nextStationCode)
      return
    }

    if (nextStationCode === searchState.from_station) {
      updateSearchField('from_station', searchState.to_station)
    }

    updateSearchField('to_station', nextStationCode)
  }

  function handleDateChange({ departureDate, returnDate }) {
    updateSearchField('departure_date', departureDate)
    updateSearchField('return_date', returnDate ?? '')
  }

  return (
    <section className="train-search-card">
      <div className="train-search-card__grid">
        <TrainStationCombobox
          label="TỪ"
          options={stations}
          value={searchState.from_station}
          onChange={(nextStationCode) => handleStationChange('from_station', nextStationCode)}
        />

        <TrainStationCombobox
          label="ĐẾN"
          options={stations}
          value={searchState.to_station}
          onChange={(nextStationCode) => handleStationChange('to_station', nextStationCode)}
        />

        <TrainDateRangePicker
          departureDate={searchState.departure_date}
          returnDate={searchState.return_date}
          tripType={searchState.trip_type}
          onChange={handleDateChange}
        />

        <TrainPassengerSelector passengers={searchState.passengers} onChange={updatePassengers} />

        <button className="train-search-card__submit" type="button" onClick={onSubmit}>
          <SearchFieldIcon type="search" />
          <span>Tìm kiếm vé tàu</span>
        </button>
      </div>

      <div className="train-search-card__divider" aria-hidden="true" />

      <div className="train-search-card__footer">
        <div className="train-trip-toggle" aria-label="Loại hành trình" role="group">
          <button
            className={`train-trip-toggle-btn ${
              searchState.trip_type === 'round_trip' ? 'active' : ''
            }`}
            type="button"
            onClick={() => updateTripType('round_trip')}
          >
            Khứ hồi
          </button>
          <button
            className={`train-trip-toggle-btn ${
              searchState.trip_type === 'one_way' ? 'active' : ''
            }`}
            type="button"
            onClick={() => updateTripType('one_way')}
          >
            1 chiều
          </button>
        </div>

        <label className="train-search-card__sort">
          <span className="train-search-card__sort-prefix">Sắp xếp:</span>
          <div className="train-search-card__sort-trigger">
            <span className="train-search-card__sort-value">
              {getSortLabel(selectedSort, 'search')}
            </span>
            <span className="train-search-card__sort-icon" aria-hidden="true">
              <SearchFieldIcon type="sort" />
            </span>
            <select
              aria-label="Sắp xếp chuyến tàu"
              className="train-search-card__sort-select"
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

      {feedback.message ? (
        <p className={`train-search-card__feedback train-search-card__feedback--${feedback.tone}`} role="status">
          {feedback.message}
        </p>
      ) : null}
    </section>
  )
}

export default TrainSearchPanel
