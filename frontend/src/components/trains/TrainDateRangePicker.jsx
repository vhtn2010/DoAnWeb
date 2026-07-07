import { useEffect, useMemo, useRef, useState } from 'react'

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const MONTH_LABELS = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
]

function createDateFromKey(dateKey) {
  if (!dateKey) {
    return null
  }

  const [year, month, day] = String(dateKey)
    .split('-')
    .map((value) => Number(value))

  if (!year || !month || !day) {
    return null
  }

  return new Date(year, month - 1, day, 12)
}

function createDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function addDays(dateKey, days) {
  const baseDate = createDateFromKey(dateKey)

  if (!baseDate) {
    return ''
  }

  const nextDate = new Date(baseDate)
  nextDate.setDate(nextDate.getDate() + days)

  return createDateKey(nextDate)
}

function getMonthStart(dateKey) {
  const sourceDate = createDateFromKey(dateKey) ?? new Date(2026, 9, 1, 12)
  return new Date(sourceDate.getFullYear(), sourceDate.getMonth(), 1, 12)
}

function shiftMonth(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12)
}

function formatDateDisplay(dateKey) {
  const date = createDateFromKey(dateKey)

  if (!date) {
    return ''
  }

  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${date.getFullYear()}`
}

function buildCalendarDays(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1, 12)
  const leadingDays = (firstDay.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - leadingDays, 12)

  return Array.from({ length: 42 }, (_, index) => {
    const nextDate = new Date(gridStart)
    nextDate.setDate(gridStart.getDate() + index)

    return {
      date: nextDate,
      dateKey: createDateKey(nextDate),
      isOutsideMonth: nextDate.getMonth() !== month,
      isToday: createDateKey(nextDate) === createDateKey(new Date()),
    }
  })
}

function isDateInRange(dateKey, startDateKey, endDateKey) {
  if (!startDateKey || !endDateKey) {
    return false
  }

  return dateKey > startDateKey && dateKey < endDateKey
}

function DateValue({ departureDate, returnDate, tripType }) {
  if (!departureDate) {
    return <span className="train-date-picker__placeholder">Chọn ngày đi</span>
  }

  if (tripType === 'round_trip') {
    return (
      <span className="train-date-picker__value train-date-picker__value--range">
        <span>{formatDateDisplay(departureDate)}</span>
        <span className={!returnDate ? 'train-date-picker__placeholder' : ''}>
          {returnDate ? formatDateDisplay(returnDate) : 'Chọn ngày về'}
        </span>
      </span>
    )
  }

  return <span className="train-date-picker__value">{formatDateDisplay(departureDate)}</span>
}

function TrainDateRangePicker({ departureDate, returnDate, tripType, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthStart(departureDate))
  const [selectionStep, setSelectionStep] = useState('departure')
  const containerRef = useRef(null)

  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth])

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
    if (!isOpen) {
      return
    }

    setVisibleMonth(getMonthStart(departureDate || returnDate))
    setSelectionStep(tripType === 'round_trip' && departureDate && !returnDate ? 'return' : 'departure')
  }, [departureDate, isOpen, returnDate, tripType])

  function handleSelectDate(nextDateKey) {
    if (tripType === 'one_way') {
      onChange({
        departureDate: nextDateKey,
        returnDate: '',
      })
      setIsOpen(false)
      return
    }

    if (!departureDate || returnDate || selectionStep === 'departure') {
      onChange({
        departureDate: nextDateKey,
        returnDate: '',
      })
      setSelectionStep('return')
      return
    }

    if (nextDateKey < departureDate) {
      onChange({
        departureDate: nextDateKey,
        returnDate: departureDate,
      })
    } else {
      onChange({
        departureDate,
        returnDate: nextDateKey,
      })
    }

    setSelectionStep('departure')
    setIsOpen(false)
  }

  return (
    <div className="train-search-card__field train-date-picker" ref={containerRef}>
      <span className="train-search-card__field-label">NGÀY ĐI - VỀ</span>

      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`train-search-card__field-shell train-date-picker__trigger ${
          isOpen ? 'train-date-picker__trigger--open' : ''
        }`}
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span className="train-search-card__field-icon" aria-hidden="true">
          <svg fill="none" viewBox="0 0 24 24">
            <rect height="14" rx="3" stroke="currentColor" strokeWidth="1.8" width="16" x="4" y="6" />
            <path d="M8 4v4M16 4v4M4 11h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
        </span>

        <DateValue departureDate={departureDate} returnDate={returnDate} tripType={tripType} />
      </button>

      {isOpen ? (
        <div className="train-search-card__popover train-date-picker__popover" role="dialog">
          <div className="train-calendar">
            <div className="train-calendar__header">
              <button
                aria-label="Tháng trước"
                className="train-calendar__nav"
                type="button"
                onClick={() => setVisibleMonth((currentValue) => shiftMonth(currentValue, -1))}
              >
                <svg fill="none" viewBox="0 0 24 24">
                  <path d="m14 7-5 5 5 5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                </svg>
              </button>

              <strong>
                {MONTH_LABELS[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
              </strong>

              <button
                aria-label="Tháng sau"
                className="train-calendar__nav"
                type="button"
                onClick={() => setVisibleMonth((currentValue) => shiftMonth(currentValue, 1))}
              >
                <svg fill="none" viewBox="0 0 24 24">
                  <path d="m10 7 5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                </svg>
              </button>
            </div>

            <div className="train-calendar__weekdays">
              {WEEKDAY_LABELS.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>

            <div className="train-calendar__grid">
              {days.map((day) => {
                const isSelected = day.dateKey === departureDate || day.dateKey === returnDate
                const isInRange =
                  tripType === 'round_trip' &&
                  isDateInRange(day.dateKey, departureDate, returnDate)

                return (
                  <button
                    key={day.dateKey}
                    className={`train-calendar-day ${
                      day.isOutsideMonth ? 'train-calendar-day--outside' : ''
                    } ${day.isToday ? 'train-calendar-day--today' : ''} ${
                      isSelected ? 'selected' : ''
                    } ${isInRange ? 'in-range' : ''}`}
                    type="button"
                    onClick={() => handleSelectDate(day.dateKey)}
                  >
                    {day.date.getDate()}
                  </button>
                )
              })}
            </div>

            <div className="train-calendar__footer">
              <button
                className="train-calendar__today"
                type="button"
                onClick={() => {
                  const todayDate = createDateKey(new Date())
                  setVisibleMonth(getMonthStart(todayDate))

                  if (tripType === 'one_way') {
                    onChange({ departureDate: todayDate, returnDate: '' })
                    setIsOpen(false)
                    return
                  }

                  onChange({
                    departureDate: todayDate,
                    returnDate: addDays(todayDate, 5),
                  })
                  setIsOpen(false)
                }}
              >
                Hôm nay
              </button>

              <button className="train-calendar__done" type="button" onClick={() => setIsOpen(false)}>
                Xong
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default TrainDateRangePicker
