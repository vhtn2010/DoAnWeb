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
  const sourceDate = createDateFromKey(dateKey) ?? new Date(2026, 6, 1, 12)
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

  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}/${date.getFullYear()}`
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

function DateValue({ placeholder, value }) {
  if (!value) {
    return <span className="flight-date-picker__placeholder">{placeholder}</span>
  }

  return <span className="flight-date-picker__value">{formatDateDisplay(value)}</span>
}

function CalendarIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <rect height="14" rx="3" stroke="currentColor" strokeWidth="1.8" width="16" x="4" y="6" />
      <path d="M8 4v4M16 4v4M4 11h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  )
}

function ClearIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path d="M6.75 6.75 17.25 17.25M17.25 6.75 6.75 17.25" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function FlightDateRangePicker({ departureDate, returnDate, tripType, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthStart(departureDate))
  const [activeField, setActiveField] = useState('departure')
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

    const baseDateKey =
      activeField === 'return' ? returnDate || departureDate : departureDate || returnDate

    setVisibleMonth(getMonthStart(baseDateKey))
  }, [activeField, departureDate, isOpen, returnDate])

  function handleSelectDate(nextDateKey) {
    if (tripType === 'one_way') {
      onChange({
        departureDate: nextDateKey,
        returnDate: '',
      })
      setIsOpen(false)
      return
    }

    if (activeField === 'departure') {
      onChange({
        departureDate: nextDateKey,
        returnDate: returnDate && returnDate >= nextDateKey ? returnDate : '',
      })
      setActiveField('return')
      return
    }

    if (!departureDate) {
      onChange({
        departureDate: nextDateKey,
        returnDate: '',
      })
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

    setActiveField('departure')
    setIsOpen(false)
  }

  function openPicker(nextField) {
    setActiveField(nextField)
    setIsOpen(true)
  }

  function clearDepartureDate() {
    onChange({
      departureDate: '',
      returnDate: '',
    })
    setIsOpen(false)
  }

  function clearReturnDate() {
    onChange({
      departureDate,
      returnDate: '',
    })
    setIsOpen(false)
  }

  return (
    <div className="flight-date-picker" ref={containerRef}>
      <div className="flight-search-panel__field flight-date-picker__field">
        <span className="flight-search-panel__field-label">NGÀY ĐI</span>

        <button
          aria-expanded={isOpen && activeField === 'departure'}
          aria-haspopup="dialog"
          className={`flight-search-panel__field-shell flight-date-picker__trigger ${
            isOpen && activeField === 'departure' ? 'flight-date-picker__trigger--open' : ''
          } ${departureDate ? 'flight-date-picker__trigger--clearable' : ''}`}
          type="button"
          onClick={() => openPicker('departure')}
        >
          <span className="flight-search-panel__field-icon" aria-hidden="true">
            <CalendarIcon />
          </span>

          <DateValue placeholder="Chọn ngày đi" value={departureDate} />
        </button>

        {departureDate ? (
          <button
            aria-label="Xóa ngày đi"
            className="flight-search-panel__field-clear"
            type="button"
            onClick={clearDepartureDate}
          >
            <ClearIcon />
          </button>
        ) : null}
      </div>

      <div
        className={`flight-search-panel__field flight-date-picker__field ${
          tripType === 'one_way' ? 'flight-date-picker__field--disabled' : ''
        }`}
      >
        <span className="flight-search-panel__field-label">NGÀY VỀ</span>

        <button
          aria-expanded={isOpen && activeField === 'return'}
          aria-haspopup="dialog"
          className={`flight-search-panel__field-shell flight-date-picker__trigger ${
            isOpen && activeField === 'return' ? 'flight-date-picker__trigger--open' : ''
          } ${tripType === 'one_way' ? 'flight-date-picker__trigger--disabled' : ''} ${
            tripType !== 'one_way' && returnDate ? 'flight-date-picker__trigger--clearable' : ''
          }`}
          disabled={tripType === 'one_way'}
          type="button"
          onClick={() => openPicker('return')}
        >
          <span className="flight-search-panel__field-icon" aria-hidden="true">
            <CalendarIcon />
          </span>

          <DateValue
            placeholder={tripType === 'one_way' ? 'Không áp dụng' : 'Chọn ngày về'}
            value={tripType === 'one_way' ? '' : returnDate}
          />
        </button>

        {tripType !== 'one_way' && returnDate ? (
          <button
            aria-label="Xóa ngày về"
            className="flight-search-panel__field-clear"
            type="button"
            onClick={clearReturnDate}
          >
            <ClearIcon />
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="flight-date-popover" role="dialog">
          <div className="flight-calendar">
            <div className="flight-calendar__header">
              <button
                aria-label="Tháng trước"
                className="flight-calendar__nav"
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
                className="flight-calendar__nav"
                type="button"
                onClick={() => setVisibleMonth((currentValue) => shiftMonth(currentValue, 1))}
              >
                <svg fill="none" viewBox="0 0 24 24">
                  <path d="m10 7 5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                </svg>
              </button>
            </div>

            <div className="flight-calendar__weekdays">
              {WEEKDAY_LABELS.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>

            <div className="flight-calendar__grid">
              {days.map((day) => {
                const isSelected = day.dateKey === departureDate || day.dateKey === returnDate
                const isInRange =
                  tripType === 'round_trip' &&
                  isDateInRange(day.dateKey, departureDate, returnDate)

                return (
                  <button
                    key={day.dateKey}
                    className={`flight-calendar-day ${
                      day.isOutsideMonth ? 'flight-calendar-day--outside' : ''
                    } ${day.isToday ? 'flight-calendar-day--today' : ''} ${
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

            <div className="flight-calendar__footer">
              <button
                className="flight-calendar__today"
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
                  setActiveField('departure')
                  setIsOpen(false)
                }}
              >
                Hôm nay
              </button>

              <button
                className="flight-calendar__done"
                type="button"
                onClick={() => setIsOpen(false)}
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default FlightDateRangePicker
