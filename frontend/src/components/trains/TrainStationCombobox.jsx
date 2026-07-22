import { useEffect, useMemo, useRef, useState } from 'react'

function getStationCode(station) {
  return station?.code ?? ''
}

function matchesStationSearch(station, keyword) {
  const normalizedKeyword = keyword.trim().toLowerCase()

  if (!normalizedKeyword) {
    return true
  }

  return [station.label, station.city, station.station_name, station.province, station.code]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedKeyword))
}

function ClearIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path d="M6.75 6.75 17.25 17.25M17.25 6.75 6.75 17.25" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function TrainStationCombobox({ label, onChange, options, value }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  const selectedStation = useMemo(() => {
    return options.find((station) => getStationCode(station) === value) ?? null
  }, [options, value])

  const filteredStations = useMemo(() => {
    return options.filter((station) => matchesStationSearch(station, query))
  }, [options, query])
  const hasSelectedValue = Boolean(value)

  useEffect(() => {
    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
      return
    }

    setQuery('')
  }, [isOpen])

  function handleClearSelection() {
    onChange('')
    setQuery('')
  }

  return (
    <div className="train-search-card__field train-station-combobox" ref={containerRef}>
      <span className="train-search-card__field-label">{label}</span>

      <div className="train-search-card__field-control">
        <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`train-search-card__field-shell train-station-combobox__trigger ${
          isOpen ? 'train-station-combobox__trigger--open' : ''
        } ${hasSelectedValue ? 'train-station-combobox__trigger--clearable' : ''}`}
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span className="train-search-card__field-icon" aria-hidden="true">
          <svg fill="none" viewBox="0 0 24 24">
            <rect height="11" rx="3" stroke="currentColor" strokeWidth="1.7" width="12" x="6" y="4.5" />
            <path
              d="M8.5 8.5h2.6M12.9 8.5h2.6M9 15.5l-2 4M15 15.5l2 4M7 19.5h10"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.7"
            />
          </svg>
        </span>

        <span className="train-station-combobox__value">
          {selectedStation?.label ?? 'Chọn ga'}
        </span>

        <span className="train-station-combobox__chevron" aria-hidden="true">
          <svg fill="none" viewBox="0 0 24 24">
            <path d="m7 10 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
        </span>
        </button>

        {hasSelectedValue ? (
          <button
            aria-label={`Xóa lựa chọn ${label}`}
            className="train-search-card__field-clear"
            type="button"
            onClick={handleClearSelection}
          >
            <ClearIcon />
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="train-search-card__popover train-station-menu" role="dialog">
          <input
            ref={searchInputRef}
            aria-label={`Tìm ga cho ${label}`}
            className="train-station-menu__search"
            placeholder="Tìm theo ga, thành phố, mã ga..."
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="train-station-menu__list" role="listbox">
            {filteredStations.length ? (
              filteredStations.map((station) => {
                const stationCode = getStationCode(station)
                const isSelected = stationCode === value

                return (
                  <button
                    key={stationCode}
                    className={`train-station-option ${
                      isSelected ? 'train-station-option--active' : ''
                    }`}
                    role="option"
                    type="button"
                    onClick={() => {
                      onChange(stationCode)
                      setIsOpen(false)
                    }}
                  >
                    <strong>{station.label}</strong>
                    <span>{station.station_name}</span>
                  </button>
                )
              })
            ) : (
              <p className="train-station-menu__empty">Không tìm thấy ga phù hợp.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default TrainStationCombobox
