import { useEffect, useMemo, useRef, useState } from 'react'

function getAirportCode(airport) {
  return airport?.airport_code ?? airport?.code ?? ''
}

function matchesAirportSearch(airport, keyword) {
  const normalizedKeyword = keyword.trim().toLowerCase()

  if (!normalizedKeyword) {
    return true
  }

  return [
    airport.label,
    airport.city,
    airport.airport_name,
    airport.province,
    airport.airport_code,
    airport.code,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedKeyword))
}

function FlightAirportCombobox({ label, onChange, options, value }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  const selectedAirport = useMemo(() => {
    return options.find((airport) => getAirportCode(airport) === value) ?? null
  }, [options, value])

  const filteredAirports = useMemo(() => {
    return options.filter((airport) => matchesAirportSearch(airport, query))
  }, [options, query])

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

  return (
    <div className="flight-search-panel__field flight-airport-combobox" ref={containerRef}>
      <span className="flight-search-panel__field-label">{label}</span>

      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`flight-search-panel__field-shell flight-airport-combobox__trigger ${
          isOpen ? 'flight-airport-combobox__trigger--open' : ''
        }`}
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span className="flight-search-panel__field-icon" aria-hidden="true">
          <svg fill="none" viewBox="0 0 24 24">
            <path
              d="M12 20s6-4.9 6-10a6 6 0 1 0-12 0c0 5.1 6 10 6 10Z"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <circle cx="12" cy="10" fill="currentColor" r="1.8" />
          </svg>
        </span>

        <span className="flight-airport-combobox__value">
          {selectedAirport?.label ?? 'Chọn sân bay'}
        </span>

        <span className="flight-airport-combobox__chevron" aria-hidden="true">
          <svg fill="none" viewBox="0 0 24 24">
            <path d="m7 10 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
        </span>
      </button>

      {isOpen ? (
        <div className="flight-date-popover flight-airport-menu" role="dialog">
          <input
            ref={searchInputRef}
            aria-label={`Tìm sân bay cho ${label}`}
            className="flight-airport-menu__search"
            placeholder="Tìm theo thành phố, mã sân bay..."
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="flight-airport-menu__list" role="listbox">
            {filteredAirports.length ? (
              filteredAirports.map((airport) => {
                const airportCode = getAirportCode(airport)
                const isSelected = airportCode === value

                return (
                  <button
                    key={airportCode}
                    className={`flight-airport-option ${
                      isSelected ? 'flight-airport-option--active' : ''
                    }`}
                    role="option"
                    type="button"
                    onClick={() => {
                      onChange(airportCode)
                      setIsOpen(false)
                    }}
                  >
                    <strong>{airport.label}</strong>
                    <span>{airport.airport_name}</span>
                  </button>
                )
              })
            ) : (
              <p className="flight-airport-menu__empty">Không tìm thấy sân bay phù hợp.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default FlightAirportCombobox
