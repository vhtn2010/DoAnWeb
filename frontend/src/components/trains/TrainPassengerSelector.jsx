import { useEffect, useRef, useState } from 'react'

function CounterControl({ description, label, min = 0, value, onChange }) {
  return (
    <div className="train-passenger-selector__row">
      <div>
        <strong>{label}</strong>
        <p>{description}</p>
      </div>

      <div className="train-passenger-selector__counter">
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

function formatPassengerDisplay(passengers = {}) {
  const adults = Math.max(Number(passengers.adults ?? 1) || 0, 1)
  const children = Math.max(Number(passengers.children ?? 0) || 0, 0)
  const infants = Math.max(Number(passengers.infants ?? 0) || 0, 0)
  const parts = [`${adults} Người lớn`]

  if (children > 0) {
    parts.push(`${children} Trẻ em`)
  }

  if (infants > 0) {
    parts.push(`${infants} Em bé`)
  }

  return parts.join(', ')
}

function TrainPassengerSelector({ passengers, onChange }) {
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
    <div className="train-search-card__field train-passenger-selector" ref={containerRef}>
      <span className="train-search-card__field-label">HÀNH KHÁCH</span>

      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`train-search-card__field-shell train-passenger-selector__trigger ${
          isOpen ? 'train-passenger-selector__trigger--open' : ''
        }`}
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span className="train-search-card__field-icon" aria-hidden="true">
          <svg fill="none" viewBox="0 0 24 24">
            <path
              d="M12 12.5a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6ZM5.5 19.25a6.5 6.5 0 0 1 13 0"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
        </span>

        <span className="train-search-card__field-value">
          {formatPassengerDisplay(passengers)}
        </span>

        <span className="train-passenger-selector__chevron" aria-hidden="true">
          <svg fill="none" viewBox="0 0 24 24">
            <path d="m7 10 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
        </span>
      </button>

      {isOpen ? (
        <div className="train-search-card__popover train-passenger-selector__popover" role="dialog">
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

export default TrainPassengerSelector
