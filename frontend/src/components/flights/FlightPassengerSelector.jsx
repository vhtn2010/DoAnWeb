import { useEffect, useRef, useState } from 'react'

function CounterControl({ description, label, min = 0, value, onChange }) {
  return (
    <div className="flight-passenger-selector__row">
      <div>
        <strong>{label}</strong>
        <p>{description}</p>
      </div>

      <div className="flight-passenger-selector__counter">
        <button
          aria-label={`Giảm ${label}`}
          disabled={value <= min}
          type="button"
          onClick={() => onChange(Math.max(value - 1, min))}
        >
          -
        </button>
        <span>{value}</span>
        <button aria-label={`Tăng ${label}`} type="button" onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  )
}

function formatPassengerDisplayLines(passengers = {}) {
  const adults = Number(passengers.adults ?? 1)
  const children = Number(passengers.children ?? 0)
  const infants = Number(passengers.infants ?? 0)
  const firstLineParts = [`${adults} Người lớn`]

  if (children > 0) {
    firstLineParts.push(`${children} Trẻ em`)
  }

  if (infants > 0) {
    return [firstLineParts.join(', '), `${infants} Em bé`]
  }

  return [firstLineParts.join(', ')]
}

function FlightPassengerSelector({ className = '', passengers, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const passengerLines = formatPassengerDisplayLines(passengers)

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

  return (
    <div
      className={`flight-passenger-selector flight-search-panel__field ${className}`.trim()}
      ref={containerRef}
    >
      <span className="flight-passenger-selector__label flight-search-panel__field-label">
        HÀNH KHÁCH
      </span>

      <button
        aria-expanded={isOpen}
        className={`flight-passenger-selector__trigger ${
          isOpen ? 'flight-passenger-selector__trigger--open' : ''
        }`}
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span className="flight-passenger-selector__icon" aria-hidden="true">
          <svg fill="none" viewBox="0 0 24 24">
            <path
              d="M12 12.5a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6ZM5.5 19.25a6.5 6.5 0 0 1 13 0"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
        </span>

        <span className="flight-passenger-selector__copy flight-passenger-selector__copy--lines">
          {passengerLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </span>

        <span className="flight-passenger-selector__chevron" aria-hidden="true">
          <svg fill="none" viewBox="0 0 24 24">
            <path d="m7 10 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
        </span>
      </button>

      {isOpen ? (
        <div className="flight-passenger-selector__popover" role="dialog">
          <CounterControl
            description="Từ 12 tuổi trở lên"
            label="Người lớn"
            min={1}
            value={passengers.adults}
            onChange={(nextValue) => onChange('adults', nextValue)}
          />
          <CounterControl
            description="Từ 2 đến dưới 12 tuổi"
            label="Trẻ em"
            value={passengers.children}
            onChange={(nextValue) => onChange('children', nextValue)}
          />
          <CounterControl
            description="Dưới 2 tuổi"
            label="Em bé"
            value={passengers.infants}
            onChange={(nextValue) => onChange('infants', nextValue)}
          />
        </div>
      ) : null}
    </div>
  )
}

export default FlightPassengerSelector
