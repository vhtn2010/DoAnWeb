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

function buildPassengerSummary(passengers = {}) {
  const adults = Number(passengers.adults ?? 1)
  const children = Number(passengers.children ?? 0)
  const infants = Number(passengers.infants ?? 0)

  return `${adults} NL • ${children} TE • ${infants} EB`
}

function FlightPassengerSelector({ passengers, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

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
    <div className="flight-passenger-selector" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        className={`flight-passenger-selector__trigger ${
          isOpen ? 'flight-passenger-selector__trigger--open' : ''
        }`}
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span className="flight-passenger-selector__label">Hành khách</span>
        <strong>{buildPassengerSummary(passengers)}</strong>
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
