import { useEffect, useMemo, useRef, useState } from 'react'

const provinceOptions = [
  'Hà Nội',
  'Huế',
  'Hải Phòng',
  'Đà Nẵng',
  'TP. Hồ Chí Minh',
  'Cần Thơ',
  'Cao Bằng',
  'Tuyên Quang',
  'Lào Cai',
  'Thái Nguyên',
  'Phú Thọ',
  'Bắc Ninh',
  'Hưng Yên',
  'Ninh Bình',
  'Quảng Trị',
  'Quảng Ngãi',
  'Gia Lai',
  'Khánh Hòa',
  'Lâm Đồng',
  'Đắk Lắk',
  'Đồng Nai',
  'Tây Ninh',
  'Vĩnh Long',
  'Đồng Tháp',
  'Cà Mau',
  'An Giang',
  'Điện Biên',
  'Lai Châu',
  'Sơn La',
  'Lạng Sơn',
  'Quảng Ninh',
  'Thanh Hóa',
  'Nghệ An',
  'Hà Tĩnh',
]

const weekdayLabels = ['Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'CN']

function createDate(year, monthIndex, day) {
  return new Date(year, monthIndex, day)
}

function addMonths(date, offset) {
  return createDate(date.getFullYear(), date.getMonth() + offset, 1)
}

function addDays(date, offset) {
  return createDate(date.getFullYear(), date.getMonth(), date.getDate() + offset)
}

function formatDateValue(date) {
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`
}

function formatMonthLabel(date) {
  return `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`
}

function parseDateValue(value) {
  const [dayText, monthText, yearText] = value.split('-')
  const day = Number(dayText)
  const month = Number(monthText)
  const year = Number(yearText)

  if (!day || !month || !year) {
    return createDate(2026, 9, 15)
  }

  return createDate(year, month - 1, day)
}

function parseOptionalDateValue(value) {
  if (!value) {
    return null
  }

  const [dayText, monthText, yearText] = value.split('-')
  const day = Number(dayText)
  const month = Number(monthText)
  const year = Number(yearText)

  if (!day || !month || !year) {
    return null
  }

  return createDate(year, month - 1, day)
}

function isSameDay(firstDate, secondDate) {
  if (!firstDate || !secondDate) {
    return false
  }

  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  )
}

function compareDates(firstDate, secondDate) {
  const firstTime = createDate(
    firstDate.getFullYear(),
    firstDate.getMonth(),
    firstDate.getDate(),
  ).getTime()
  const secondTime = createDate(
    secondDate.getFullYear(),
    secondDate.getMonth(),
    secondDate.getDate(),
  ).getTime()

  if (firstTime === secondTime) {
    return 0
  }

  return firstTime > secondTime ? 1 : -1
}

function getMonthDays(monthDate) {
  const firstDayOfMonth = createDate(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const startOffset = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1
  const gridStartDate = createDate(
    firstDayOfMonth.getFullYear(),
    firstDayOfMonth.getMonth(),
    1 - startOffset,
  )

  return Array.from({ length: 42 }, (_, index) =>
    createDate(
      gridStartDate.getFullYear(),
      gridStartDate.getMonth(),
      gridStartDate.getDate() + index,
    ),
  )
}

function ChevronIcon({ isOpen }) {
  return (
    <svg
      aria-hidden="true"
      className={`hotel-search-bar__chevron ${isOpen ? 'hotel-search-bar__chevron--open' : ''}`}
      viewBox="0 0 12 12"
    >
      <path
        d="M2.25 4.5 6 8.25 9.75 4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
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

function MonthNavIcon({ direction }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12">
      <path
        d={direction === 'left' ? 'M7.5 2.25 3.75 6l3.75 3.75' : 'M4.5 2.25 8.25 6 4.5 9.75'}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M12 20s6-5.1 6-10.2A6 6 0 1 0 6 9.8C6 14.9 12 20 12 20Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="9.6" r="2.3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <rect
        height="14"
        rx="3"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
        width="18"
        x="3"
        y="6"
      />
      <path
        d="M8 3.75v4M16 3.75v4M3 10.5h18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4.25 4.25" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  )
}

function CalendarPopover({ minDate, selectedValue, visibleMonth, onMonthChange, onSelect }) {
  const selectedDate = parseOptionalDateValue(selectedValue)

  return (
    <div aria-label="Chọn ngày" className="hotel-search-bar__calendar-popover" role="dialog">
      <div className="hotel-search-bar__calendar-header">
        <h3 className="hotel-search-bar__calendar-title">{formatMonthLabel(visibleMonth)}</h3>

        <div className="hotel-search-bar__calendar-nav">
          <button
            aria-label="Tháng trước"
            className="hotel-search-bar__calendar-nav-button"
            type="button"
            onClick={() => onMonthChange(-1)}
          >
            <MonthNavIcon direction="left" />
          </button>
          <button
            aria-label="Tháng sau"
            className="hotel-search-bar__calendar-nav-button"
            type="button"
            onClick={() => onMonthChange(1)}
          >
            <MonthNavIcon direction="right" />
          </button>
        </div>
      </div>

      <div className="hotel-search-bar__calendar-weekdays">
        {weekdayLabels.map((weekdayLabel) => (
          <span
            className={`hotel-search-bar__calendar-weekday ${
              weekdayLabel === 'CN' ? 'hotel-search-bar__calendar-weekday--sunday' : ''
            }`}
            key={weekdayLabel}
          >
            {weekdayLabel}
          </span>
        ))}
      </div>

      <div className="hotel-search-bar__calendar-grid">
        {getMonthDays(visibleMonth).map((day) => {
          const isCurrentMonth = day.getMonth() === visibleMonth.getMonth()
          const isSelectedDay = isSameDay(day, selectedDate)
          const isDisabledDay = minDate ? compareDates(day, minDate) <= 0 : false

          return (
            <button
              className={`hotel-search-bar__calendar-day ${
                isCurrentMonth ? '' : 'hotel-search-bar__calendar-day--outside'
              } ${day.getDay() === 0 ? 'hotel-search-bar__calendar-day--sunday' : ''} ${
                isSelectedDay ? 'hotel-search-bar__calendar-day--selected' : ''
              } ${isDisabledDay ? 'hotel-search-bar__calendar-day--disabled' : ''}`}
              disabled={isDisabledDay}
              key={day.toISOString()}
              type="button"
              onClick={() => onSelect(formatDateValue(day))}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function HotelSearchField({
  icon,
  isOpen,
  label,
  menu,
  onClear,
  onToggle,
  placeholder,
  value,
}) {
  const hasValue = Boolean(value)

  return (
    <div className="hotel-search-bar__field">
      <button
        aria-expanded={isOpen}
        className={`hotel-search-bar__field-button ${
          isOpen ? 'hotel-search-bar__field-button--open' : ''
        } ${hasValue ? 'hotel-search-bar__field-button--clearable' : ''}`}
        type="button"
        onClick={onToggle}
      >
        <span aria-hidden="true" className="hotel-search-bar__icon">
          {icon}
        </span>
        <span className="hotel-search-bar__field-copy">
          <span className="hotel-search-bar__label">{label}</span>
          <span
            className={`hotel-search-bar__value ${
              hasValue ? '' : 'hotel-search-bar__value--placeholder'
            }`}
          >
            {hasValue ? value : placeholder}
          </span>
        </span>
        {hasValue ? null : <ChevronIcon isOpen={isOpen} />}
      </button>
      {hasValue && onClear ? (
        <button
          aria-label={`Xóa ${label.toLowerCase()}`}
          className="hotel-search-bar__clear-button"
          type="button"
          onClick={onClear}
        >
          <ClearIcon />
        </button>
      ) : null}
      {isOpen ? menu : null}
    </div>
  )
}

function HotelSearchBar({ onFieldChange, onSubmit, searchValues }) {
  const containerRef = useRef(null)
  const [openMenu, setOpenMenu] = useState(null)
  const [visibleMonth, setVisibleMonth] = useState(() => parseDateValue(searchValues.checkin))

  useEffect(() => {
    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpenMenu(null)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  const normalizedProvinceOptions = useMemo(() => {
    if (
      searchValues.location &&
      !provinceOptions.includes(searchValues.location) &&
      !provinceOptions.includes(searchValues.location.replace(' (SGN)', ''))
    ) {
      return [searchValues.location, ...provinceOptions]
    }

    return provinceOptions
  }, [searchValues.location])

  function toggleMenu(menuKey) {
    setOpenMenu((currentMenu) => {
      if (currentMenu === menuKey) {
        return null
      }

      if (menuKey === 'checkin' || menuKey === 'checkout') {
        setVisibleMonth(parseDateValue(searchValues[menuKey]))
      }

      return menuKey
    })
  }

  function handleProvinceSelect(provinceName) {
    onFieldChange('location', provinceName)
    setOpenMenu(null)
  }

  function handleDateSelect(fieldKey, value) {
    if (fieldKey === 'checkin') {
      const nextCheckinDate = parseDateValue(value)
      const currentCheckoutDate = parseOptionalDateValue(searchValues.checkout)

      onFieldChange('checkin', value)

      if (currentCheckoutDate && compareDates(currentCheckoutDate, nextCheckinDate) <= 0) {
        onFieldChange('checkout', formatDateValue(addDays(nextCheckinDate, 1)))
      }
    } else {
      onFieldChange(fieldKey, value)
    }

    setOpenMenu(null)
  }

  function handleFieldClear(fieldKey) {
    if (fieldKey === 'checkin') {
      onFieldChange('checkin', '')
      onFieldChange('checkout', '')
    } else {
      onFieldChange(fieldKey, '')
    }

    setOpenMenu(null)
  }

  return (
    <section className="hotel-search-bar" ref={containerRef}>
      <div className="hotel-search-bar__fields">
        <HotelSearchField
          icon={<LocationIcon />}
          isOpen={openMenu === 'location'}
          label="ĐỊA ĐIỂM"
          placeholder="Chọn địa điểm"
          value={searchValues.location}
          onClear={() => handleFieldClear('location')}
          onToggle={() => toggleMenu('location')}
          menu={
            <div className="hotel-search-bar__dropdown" role="listbox">
              {normalizedProvinceOptions.map((provinceName) => (
                <button
                  className={`hotel-search-bar__dropdown-option ${
                    searchValues.location === provinceName
                      ? 'hotel-search-bar__dropdown-option--selected'
                      : ''
                  }`}
                  key={provinceName}
                  type="button"
                  onClick={() => handleProvinceSelect(provinceName)}
                >
                  {provinceName}
                </button>
              ))}
            </div>
          }
        />

        <HotelSearchField
          icon={<CalendarIcon />}
          isOpen={openMenu === 'checkin'}
          label="NHẬN PHÒNG"
          placeholder="Chọn ngày nhận"
          value={searchValues.checkin}
          onClear={() => handleFieldClear('checkin')}
          onToggle={() => toggleMenu('checkin')}
          menu={
            <CalendarPopover
              selectedValue={searchValues.checkin}
              visibleMonth={visibleMonth}
              onMonthChange={(offset) => setVisibleMonth((currentMonth) => addMonths(currentMonth, offset))}
              onSelect={(value) => handleDateSelect('checkin', value)}
            />
          }
        />

        <HotelSearchField
          icon={<CalendarIcon />}
          isOpen={openMenu === 'checkout'}
          label="TRẢ PHÒNG"
          placeholder="Chọn ngày trả"
          value={searchValues.checkout}
          onClear={() => handleFieldClear('checkout')}
          onToggle={() => toggleMenu('checkout')}
          menu={
            <CalendarPopover
              minDate={parseOptionalDateValue(searchValues.checkin)}
              selectedValue={searchValues.checkout}
              visibleMonth={visibleMonth}
              onMonthChange={(offset) => setVisibleMonth((currentMonth) => addMonths(currentMonth, offset))}
              onSelect={(value) => handleDateSelect('checkout', value)}
            />
          }
        />

        <button className="hotel-search-bar__button" type="button" onClick={onSubmit}>
          <SearchIcon />
          <span>Tìm kiếm</span>
        </button>
      </div>
    </section>
  )
}

export default HotelSearchBar
