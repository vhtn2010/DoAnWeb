import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const destinationServices = [
  {
    service_type: 'tour',
    title: 'Đà Nẵng',
    slug: 'da-nang',
    short_description: 'Thành phố của những cây cầu & bãi biển quyến rũ.',
    location_text: 'Đà Nẵng',
    base_price: 0,
    sale_price: 0,
    image_url: '/assets/template/home/v39_1669.png',
    badge_text: 'HOT DESTINATION',
    size: 'tall',
  },
  {
    service_type: 'tour',
    title: 'Sapa',
    slug: 'sapa',
    short_description: 'Sương mù & Ruộng bậc thang.',
    location_text: 'Sapa',
    base_price: 0,
    sale_price: 0,
    image_url: '/assets/template/home/v39_1679.png',
    size: 'small',
  },
  {
    service_type: 'tour',
    title: 'Ninh Bình',
    slug: 'ninh-binh',
    short_description: 'Hạ Long trên cạn.',
    location_text: 'Ninh Bình',
    base_price: 0,
    sale_price: 0,
    image_url: '/assets/template/home/v39_1685.png',
    size: 'small',
  },
  {
    service_type: 'hotel',
    title: 'Phú Quốc',
    slug: 'phu-quoc',
    short_description: 'Thiên đường nghỉ dưỡng nhiệt đới.',
    location_text: 'Phú Quốc',
    base_price: 0,
    sale_price: 0,
    image_url: '/assets/template/home/v39_1693.png',
    size: 'wide',
  },
]

const flashSaleServices = [
  {
    service_type: 'hotel',
    title: 'Heritage Hotel Da Lat',
    slug: 'heritage-hotel-da-lat',
    short_description: 'Trải nghiệm không gian Đông Dương cổ điển giữa lòng Đà Lạt.',
    location_text: 'Đà Lạt',
    base_price: 4080000,
    sale_price: 2450000,
    image_url: '/assets/template/home/v1_107.png',
    discount_percent: 40,
    price_unit: '/đêm',
  },
  {
    service_type: 'hotel',
    title: 'Amanoi Resort Nha Trang',
    slug: 'amanoi-resort-nha-trang',
    short_description: 'Đỉnh cao của sự riêng tư và sang trọng bậc nhất Việt Nam.',
    location_text: 'Nha Trang',
    base_price: 18770000,
    sale_price: 12200000,
    image_url: '/assets/template/home/v1_122.png',
    discount_percent: 35,
    price_unit: '/đêm',
  },
  {
    service_type: 'combo',
    title: 'Combo Gourmet Hoi An',
    slug: 'combo-gourmet-hoi-an',
    short_description: 'Thưởng thức tinh hoa ẩm thực phố Hội trên thuyền rồng.',
    location_text: 'Hội An',
    base_price: 2400000,
    sale_price: 1800000,
    image_url: '/assets/template/home/v1_137.png',
    discount_percent: 25,
    price_unit: '/khách',
  },
]

const vietnamProvinceOptions = [
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

const searchFieldOptions = [
  {
    key: 'from',
    label: 'ĐIỂM KHỞI HÀNH',
    icon: 'departure',
    options: vietnamProvinceOptions,  
  },

  {
    key: 'to',
    label: 'ĐIỂM ĐẾN',
    icon: 'destination',
    options: vietnamProvinceOptions,
  },
]

const weekdayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN']

const filterGroups = [
  {
    key: 'airline',
    label: 'Hãng hàng không',
    options: ['Vietnam Airlines', 'Vietjet Air', 'Bamboo Airways'],
  },
  {
    key: 'tour',
    label: 'Tour',
    options: ['Tour miền Bắc', 'Tour miền Trung', 'Tour miền Nam'],
  },
  {
    key: 'hotel',
    label: 'Khách sạn',
    options: ['3 sao', '4 sao', '5 sao'],
  },
  {
    key: 'train',
    label: 'Vé tàu',
    options: ['Ghế cứng','Ghế mềm', 'Giường nằm', 'Khoang VIP'],
  },
]

const sortOptions = ['Giá rẻ nhất', 'Giá cao nhất', 'Mới nhất', 'Phổ biến nhất']

const sortQueryMap = {
  'Giá rẻ nhất': 'price_asc',
  'Giá cao nhất': 'price_desc',
  'Mới nhất': 'newest',
  'Phổ biến nhất': 'popular',
}

const coreValues = [
  {
    icon: 'shield',
    tone: 'red',
    title: 'Chất lượng 5 Sao',
    description:
      'Mọi dịch vụ từ khách sạn đến vận chuyển đều đạt tiêu chuẩn cao nhất.',
  },
  {
    icon: 'gem',
    tone: 'gold',
    title: 'Trải nghiệm độc bản',
    description:
      'Các hành trình được thiết kế riêng tư, mang đậm bản sắc văn hóa địa phương.',
  },
  {
    icon: 'support',
    tone: 'red',
    title: 'Hỗ trợ 24/7',
    description:
      'Đội ngũ chuyên gia luôn sẵn sàng đồng hành cùng bạn trên mọi nẻo đường.',
  },
]

const initialSearchState = {
  from: 'TP. Hồ Chí Minh (SGN)',
  to: 'Hà Nội (HAN)',
  startDate: createDate(2026, 6, 1),
  endDate: createDate(2026, 6, 2),
  sort: 'Giá rẻ nhất',
  filters: {
    airline: '',
    tour: '',
    hotel: '',
    train: '',
  },
}

function formatCurrency(value) {
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`
}

function createDate(year, monthIndex, day) {
  return new Date(year, monthIndex, day)
}

function addMonths(date, offset) {
  return createDate(date.getFullYear(), date.getMonth() + offset, 1)
}

function compareDates(firstDate, secondDate) {
  const first = createDate(
    firstDate.getFullYear(),
    firstDate.getMonth(),
    firstDate.getDate()
  ).getTime()
  const second = createDate(
    secondDate.getFullYear(),
    secondDate.getMonth(),
    secondDate.getDate()
  ).getTime()

  if (first === second) {
    return 0
  }

  return first > second ? 1 : -1
}

function isSameDay(firstDate, secondDate) {
  return compareDates(firstDate, secondDate) === 0
}

function formatDateDisplay(date) {
  return `${String(date.getDate()).padStart(2, '0')} thg ${date.getMonth() + 1} ${date.getFullYear()}`
}

function formatDateRangeDisplay(startDate, endDate) {
  return `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`
}

function formatMonthLabel(date) {
  return `tháng ${date.getMonth() + 1} năm ${date.getFullYear()}`
}

function formatQueryDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

function slugifyQueryValue(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function getMonthDays(monthDate) {
  const firstDayOfMonth = createDate(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const startOffset = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1
  const gridStartDate = createDate(
    firstDayOfMonth.getFullYear(),
    firstDayOfMonth.getMonth(),
    1 - startOffset
  )

  return Array.from({ length: 42 }, (_, index) =>
    createDate(
      gridStartDate.getFullYear(),
      gridStartDate.getMonth(),
      gridStartDate.getDate() + index
    )
  )
}

function ChevronIcon({ isOpen }) {
  return (
    <svg
      aria-hidden="true"
      className={`home-search-card__chevron ${isOpen ? 'home-search-card__chevron--open' : ''}`}
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

function SearchFieldIcon({ type }) {
  const icons = {
    departure: (
      <path
        d="M4 11.25h12.25c.44 0 .8-.36.8-.8s-.36-.8-.8-.8H9.9l-1.32-2.27h3.1c.28 0 .55-.15.69-.4l1.02-1.8c.17-.31.08-.7-.2-.91L8.58.74a.82.82 0 0 0-1.31.68l.17 3.7-2.3 1.34L3 4.5l-.8.46 1.09 2.53L1.26 8.65a.8.8 0 0 0 .4 1.5h2.18l.16 1.1Z"
        fill="currentColor"
      />
    ),
    destination: (
      <path
        d="M10.5 16.25S5 11.72 5 7.75A5.5 5.5 0 0 1 16 7.7c0 4.02-5.5 8.55-5.5 8.55Zm0-6.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
        fill="currentColor"
      />
    ),
    calendar: (
      <>
        <path
          d="M5.75 3.5A1.25 1.25 0 0 1 7 2.25h7A1.25 1.25 0 0 1 15.25 3.5v1H5.75v-1Z"
          fill="currentColor"
          opacity="0.34"
        />
        <path
          d="M7 3v2.25M14 3v2.25M5 6h11m-9.25 3.25h1.5m2 0h1.5m2 0h1.5M6.75 12h1.5m2 0h1.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <rect
          x="5"
          y="3.5"
          width="11"
          height="10.5"
          rx="2.2"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </>
    ),
    search: (
      <>
        <circle cx="7.25" cy="7.25" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="m10.2 10.2 3.05 3.05"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </>
    ),
  }

  return (
    <svg aria-hidden="true" className="home-search-card__field-icon-svg" viewBox="0 0 20 20">
      {icons[type]}
    </svg>
  )
}

function CoreValueIcon({ type, tone }) {
  const iconColor = tone === 'gold' ? '#f4c542' : '#d62828'

  return (
    <span
      aria-hidden="true"
      className={`home-values__icon home-values__icon--${tone}`}
    >
      <svg className="home-values__icon-svg" viewBox="0 0 28 28">
        {type === 'shield' ? (
          <path
            d="M14 4.5 20.75 7v5.2c0 5-3.38 8.77-6.75 10.3-3.37-1.53-6.75-5.3-6.75-10.3V7L14 4.5Zm0 5.1-1.14 2.3-2.54.37 1.84 1.8-.44 2.55L14 15.42l2.28 1.2-.43-2.55 1.83-1.8-2.53-.37L14 9.6Z"
            fill={iconColor}
          />
        ) : null}
        {type === 'gem' ? (
          <path
            d="m7 10.25 4.2-4.75h5.6L21 10.25 14 21 7 10.25Zm3.25 0L14 16.4l3.75-6.15h-7.5Z"
            fill={iconColor}
          />
        ) : null}
        {type === 'support' ? (
          <>
            <path
              d="M7.25 14.25V12.5a6.75 6.75 0 1 1 13.5 0v1.75"
              fill="none"
              stroke={iconColor}
              strokeLinecap="round"
              strokeWidth="2.2"
            />
            <rect x="5" y="13.5" width="4.25" height="7" rx="2.1" fill={iconColor} />
            <rect x="18.75" y="13.5" width="4.25" height="7" rx="2.1" fill={iconColor} />
            <path
              d="M18 21c-.72 1.3-2.06 2-4 2h-2.2"
              fill="none"
              stroke={iconColor}
              strokeLinecap="round"
              strokeWidth="2.2"
            />
          </>
        ) : null}
      </svg>
    </span>
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

function DestinationCard({ service }) {
  const modifierClass = {
    tall: 'home-destination-card--tall',
    small: 'home-destination-card--small',
    wide: 'home-destination-card--wide',
  }[service.size]

  return (
    <article
      className={`home-destination-card ${modifierClass ?? ''}`}
      style={{ backgroundImage: `url(${service.image_url})` }}
    >
      <div className="home-destination-card__overlay" />
      <div className="home-destination-card__content">
        {service.badge_text ? (
          <span className="home-destination-card__badge">{service.badge_text}</span>
        ) : null}
        <h3 className="home-destination-card__title">{service.title}</h3>
        <p className="home-destination-card__description">{service.short_description}</p>
      </div>
    </article>
  )
}

function FlashSaleCard({ service }) {
  return (
    <article className="home-offer-card">
      <div className="home-offer-card__image-frame">
        <div
          aria-hidden="true"
          className="home-offer-card__media"
          style={{ backgroundImage: `url(${service.image_url})` }}
        />
      </div>
      <div className="home-offer-card__body">
        <span className="home-offer-card__discount">GIẢM {service.discount_percent}%</span>
        <h3 className="home-offer-card__title">{service.title}</h3>
        <p className="home-offer-card__description">{service.short_description}</p>
        <div className="home-offer-card__footer">
          <div className="home-offer-card__price-group">
            <span className="home-offer-card__price">
              {formatCurrency(service.sale_price)}
              <span className="home-offer-card__unit">{service.price_unit}</span>
            </span>
          </div>

          <Link className="home-offer-card__action" to="/services">
            Đặt Ngay
          </Link>
        </div>
      </div>
    </article>
  )
}

function HomePage() {
  const navigate = useNavigate()
  const searchCardRef = useRef(null)
  const [searchState, setSearchState] = useState(initialSearchState)
  const [calendarSelection, setCalendarSelection] = useState({
    startDate: initialSearchState.startDate,
    endDate: initialSearchState.endDate,
  })
  const [openMenu, setOpenMenu] = useState(null)
  const [visibleMonth, setVisibleMonth] = useState(createDate(2026, 6, 1))

  useEffect(() => {
    function handlePointerDown(event) {
      if (!searchCardRef.current?.contains(event.target)) {
        setOpenMenu(null)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  function toggleMenu(menuKey) {
    setOpenMenu((currentMenu) => (currentMenu === menuKey ? null : menuKey))
  }

  function handleFieldSelect(fieldKey, value) {
    setSearchState((currentState) => ({
      ...currentState,
      [fieldKey]: value,
    }))
    setOpenMenu(null)
  }

  function handleDateFieldToggle() {
    if (openMenu === 'date') {
      setOpenMenu(null)
      return
    }

    setCalendarSelection({
      startDate: searchState.startDate,
      endDate: searchState.endDate,
    })
    setVisibleMonth(createDate(searchState.startDate.getFullYear(), searchState.startDate.getMonth(), 1))
    setOpenMenu('date')
  }

  function handleDateSelect(date) {
    const currentSelection = calendarSelection
    let nextSelection

    if (!currentSelection.startDate || currentSelection.endDate) {
      nextSelection = {
        startDate: date,
        endDate: null,
      }
      setCalendarSelection(nextSelection)
      return
    }

    if (compareDates(date, currentSelection.startDate) < 0) {
      nextSelection = {
        startDate: date,
        endDate: null,
      }
      setCalendarSelection(nextSelection)
      return
    }

    nextSelection = {
      startDate: currentSelection.startDate,
      endDate: date,
    }

    setCalendarSelection(nextSelection)
    setSearchState((currentState) => ({
      ...currentState,
      startDate: nextSelection.startDate,
      endDate: nextSelection.endDate,
    }))
    setOpenMenu(null)
  }

  function handleFilterSelect(filterKey, value) {
    setSearchState((currentState) => ({
      ...currentState,
      filters: {
        ...currentState.filters,
        [filterKey]: currentState.filters[filterKey] === value ? '' : value,
      },
    }))
    setOpenMenu(null)
  }

  function handleSortSelect(value) {
    setSearchState((currentState) => ({
      ...currentState,
      sort: value,
    }))
    setOpenMenu(null)
  }

  function handleSearch() {
    const params = new URLSearchParams({
      from: slugifyQueryValue(searchState.from),
      to: slugifyQueryValue(searchState.to),
      start: formatQueryDate(searchState.startDate),
      end: formatQueryDate(searchState.endDate),
      sort: sortQueryMap[searchState.sort] ?? slugifyQueryValue(searchState.sort),
    })

    Object.entries(searchState.filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, slugifyQueryValue(value))
      }
    })

    setOpenMenu(null)
    navigate(`/services?${params.toString()}`)
  }

  const displayedDateRange = formatDateRangeDisplay(searchState.startDate, searchState.endDate)
  const calendarPreview = calendarSelection.endDate
    ? formatDateRangeDisplay(calendarSelection.startDate, calendarSelection.endDate)
    : calendarSelection.startDate
      ? `${formatDateDisplay(calendarSelection.startDate)} - Chọn ngày về`
      : displayedDateRange
  const visibleMonths = [visibleMonth, addMonths(visibleMonth, 1)]

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero__content">
          <div className="home-hero__copy">
            <div className="home-hero__title-group">
              <span className="home-hero__title-leading">Khám phá</span>
              <span className="home-hero__title-script">Việt Nam</span>
            </div>

            <p className="home-hero__description">
              Hành trình di sản cao cấp, kết nối tinh hoa văn hóa truyền thống với
              những trải nghiệm nghỉ dưỡng xa hoa nhất.
            </p>

            <Link className="home-hero__cta" to="/services">
              Bắt đầu hành trình
            </Link>
          </div>

          <div className="home-hero__art">
            <img
              alt="Nét Việt Travel collage"
              className="home-hero__art-image"
              src="/assets/template/home/v39_1982.png"
            />
          </div>
        </div>

        <div className="home-search-card" ref={searchCardRef}>
          <div className="home-search-card__top-row">
            {searchFieldOptions.map((field) => (
              <div className="home-search-card__field-wrap" key={field.key}>
                <button
                  aria-expanded={openMenu === field.key}
                  aria-haspopup="listbox"
                  className={`home-search-card__field-button ${
                    openMenu === field.key ? 'home-search-card__field-button--open' : ''
                  }`}
                  type="button"
                  onClick={() => toggleMenu(field.key)}
                >
                  <span className="home-search-card__field-icon">
                    <SearchFieldIcon type={field.icon} />
                  </span>
                  <span className="home-search-card__field-copy">
                    <span className="home-search-card__label">{field.label}</span>
                    <span className="home-search-card__value">{searchState[field.key]}</span>
                  </span>
                  <ChevronIcon isOpen={openMenu === field.key} />
                </button>

                {openMenu === field.key ? (
                  <div className="home-search-card__dropdown" role="listbox">
                    {field.options.map((option) => (
                      <button
                        className={`home-search-card__dropdown-option ${
                          searchState[field.key] === option
                            ? 'home-search-card__dropdown-option--selected'
                            : ''
                        }`}
                        key={option}
                        type="button"
                        onClick={() => handleFieldSelect(field.key, option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            <div className="home-search-card__field-wrap home-search-card__field-wrap--date">
              <button
                aria-expanded={openMenu === 'date'}
                aria-haspopup="dialog"
                className={`home-search-card__field-button home-search-card__field-button--date ${
                  openMenu === 'date' ? 'home-search-card__field-button--open' : ''
                }`}
                type="button"
                onClick={handleDateFieldToggle}
              >
                <span className="home-search-card__field-icon">
                  <SearchFieldIcon type="calendar" />
                </span>
                <span className="home-search-card__field-copy">
                  <span className="home-search-card__label">NGÀY ĐI - VỀ</span>
                  <span className="home-search-card__value home-search-card__value--date">
                    {displayedDateRange}
                  </span>
                </span>
                <ChevronIcon isOpen={openMenu === 'date'} />
              </button>

              {openMenu === 'date' ? (
                <div
                  aria-label="Ngày đi và ngày về"
                  className="home-search-card__date-popover"
                  role="dialog"
                >
                  <div className="home-search-card__calendar-header">
                    <div className="home-search-card__calendar-heading">
                      <h3 className="home-search-card__calendar-title">Ngày đi và ngày về</h3>
                      <p className="home-search-card__calendar-preview">{calendarPreview}</p>
                    </div>

                    <div className="home-search-card__calendar-nav">
                      <button
                        aria-label="Tháng trước"
                        className="home-search-card__calendar-nav-button"
                        type="button"
                        onClick={() => setVisibleMonth((currentMonth) => addMonths(currentMonth, -1))}
                      >
                        <MonthNavIcon direction="left" />
                      </button>
                      <button
                        aria-label="Tháng sau"
                        className="home-search-card__calendar-nav-button"
                        type="button"
                        onClick={() => setVisibleMonth((currentMonth) => addMonths(currentMonth, 1))}
                      >
                        <MonthNavIcon direction="right" />
                      </button>
                    </div>
                  </div>

                  <div className="home-search-card__calendar-panels">
                    {visibleMonths.map((monthDate) => (
                      <section className="home-search-card__calendar-month" key={monthDate.toISOString()}>
                        <h4 className="home-search-card__calendar-month-label">
                          {formatMonthLabel(monthDate)}
                        </h4>

                        <div className="home-search-card__calendar-weekdays">
                          {weekdayLabels.map((weekdayLabel) => (
                            <span
                              className={`home-search-card__calendar-weekday ${
                                weekdayLabel === 'CN'
                                  ? 'home-search-card__calendar-weekday--sunday'
                                  : ''
                              }`}
                              key={weekdayLabel}
                            >
                              {weekdayLabel}
                            </span>
                          ))}
                        </div>

                        <div className="home-search-card__calendar-grid">
                          {getMonthDays(monthDate).map((day) => {
                            const isCurrentMonth = day.getMonth() === monthDate.getMonth()
                            const isStartDate =
                              calendarSelection.startDate &&
                              isSameDay(day, calendarSelection.startDate)
                            const isEndDate =
                              calendarSelection.endDate &&
                              isSameDay(day, calendarSelection.endDate)
                            const isInSelectedRange =
                              calendarSelection.startDate &&
                              calendarSelection.endDate &&
                              compareDates(day, calendarSelection.startDate) > 0 &&
                              compareDates(day, calendarSelection.endDate) < 0

                            return (
                              <button
                                className={`home-search-card__calendar-day ${
                                  isCurrentMonth ? '' : 'home-search-card__calendar-day--outside'
                                } ${
                                  day.getDay() === 0 ? 'home-search-card__calendar-day--sunday' : ''
                                } ${
                                  isInSelectedRange
                                    ? 'home-search-card__calendar-day--in-range'
                                    : ''
                                } ${
                                  isStartDate
                                    ? 'home-search-card__calendar-day--range-start'
                                    : ''
                                } ${
                                  isEndDate ? 'home-search-card__calendar-day--range-end' : ''
                                }`}
                                key={day.toISOString()}
                                type="button"
                                onClick={() => handleDateSelect(day)}
                              >
                                {day.getDate()}
                              </button>
                            )
                          })}
                        </div>
                      </section>
                    ))}
                  </div>

                  <div className="home-search-card__calendar-footer">
                    <span className="home-search-card__calendar-helper">
                      Chọn ngày đi trước, sau đó chọn ngày về.
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <button
              aria-label="Tìm kiếm dịch vụ"
              className="home-search-card__submit"
              type="button"
              onClick={handleSearch}
            >
              <SearchFieldIcon type="search" />
              <span>Tìm kiếm</span>
            </button>
          </div>

          <div className="home-search-card__bottom-row">
            <div className="home-search-card__filters">
              <span className="home-search-card__filters-title">BỘ LỌC:</span>

              <div className="home-search-card__chips">
                {filterGroups.map((group) => {
                  const selectedValue = searchState.filters[group.key]
                  const menuKey = `filter-${group.key}`

                  return (
                    <div className="home-search-card__chip-wrap" key={group.key}>
                      <button
                        aria-expanded={openMenu === menuKey}
                        aria-haspopup="listbox"
                        className={`home-search-card__chip ${
                          selectedValue ? 'home-search-card__chip--selected' : ''
                        } ${
                          openMenu === menuKey ? 'home-search-card__chip--open' : ''
                        }`}
                        type="button"
                        onClick={() => toggleMenu(menuKey)}
                      >
                        <span>{selectedValue || group.label}</span>
                        <ChevronIcon isOpen={openMenu === menuKey} />
                      </button>

                      {openMenu === menuKey ? (
                        <div className="home-search-card__dropdown" role="listbox">
                          {group.options.map((option) => (
                            <button
                              className={`home-search-card__dropdown-option ${
                                selectedValue === option
                                  ? 'home-search-card__dropdown-option--selected'
                                  : ''
                              }`}
                              key={option}
                              type="button"
                              onClick={() => handleFilterSelect(group.key, option)}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="home-search-card__sort-wrap">
              <span className="home-search-card__sort-label">Sắp xếp:</span>
              <div className="home-search-card__sort-control">
                <button
                  aria-expanded={openMenu === 'sort'}
                  aria-haspopup="listbox"
                  className={`home-search-card__sort-button ${
                    openMenu === 'sort' ? 'home-search-card__sort-button--open' : ''
                  }`}
                  type="button"
                  onClick={() => toggleMenu('sort')}
                >
                  <span>{searchState.sort}</span>
                  <ChevronIcon isOpen={openMenu === 'sort'} />
                </button>

                {openMenu === 'sort' ? (
                  <div className="home-search-card__dropdown home-search-card__dropdown--sort" role="listbox">
                    {sortOptions.map((option) => (
                      <button
                        className={`home-search-card__dropdown-option ${
                          searchState.sort === option
                            ? 'home-search-card__dropdown-option--selected'
                            : ''
                        }`}
                        key={option}
                        type="button"
                        onClick={() => handleSortSelect(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__heading">
          <span className="home-section__spark" aria-hidden="true" />
          <h2 className="home-section__title">Điểm Đến Tuyệt Diệu</h2>
          <span className="home-section__underline" aria-hidden="true" />
          <p className="home-section__subtitle">
            Lựa chọn hàng đầu cho những tâm hồn xê dịch thượng lưu
          </p>
        </div>

        <div className="home-destinations-grid">
          {destinationServices.map((service) => (
            <DestinationCard key={service.slug} service={service} />
          ))}
        </div>
      </section>

      <section className="home-flash-sale">
        <div className="home-flash-sale__glow" aria-hidden="true" />
        <div className="home-flash-sale__header">
          <div className="home-flash-sale__intro">
            <div className="home-flash-sale__eyebrow">
              <span className="home-flash-sale__eyebrow-mark" aria-hidden="true" />
              <span>ƯU ĐÃI GIỚI HẠN</span>
            </div>
            <h2 className="home-flash-sale__title">
              Flash Sale
              <br />
              Mùa Hội Ngộ
            </h2>
          </div>

          <div className="home-flash-sale__timer">
            <div className="home-flash-sale__timer-unit">
              <span className="home-flash-sale__timer-value">02</span>
              <span className="home-flash-sale__timer-label">NGÀY</span>
            </div>
            <div className="home-flash-sale__timer-unit">
              <span className="home-flash-sale__timer-value">14</span>
              <span className="home-flash-sale__timer-label">GIỜ</span>
            </div>
            <div className="home-flash-sale__timer-unit">
              <span className="home-flash-sale__timer-value">45</span>
              <span className="home-flash-sale__timer-label">PHÚT</span>
            </div>
          </div>
        </div>

        <div className="home-flash-sale__offers">
          {flashSaleServices.map((service) => (
            <FlashSaleCard key={service.slug} service={service} />
          ))}
        </div>
      </section>

      <section className="home-values">
        <div className="home-values__image-wrap">
          <img
            alt="Nét Việt Travel core values"
            className="home-values__image"
            src="/assets/template/home/v184_152.png"
          />
        </div>

        <div className="home-values__content">
          <div className="home-values__heading">
            <span className="home-values__eyebrow">GIÁ TRỊ CỐT LÕI</span>
            <h2 className="home-values__title">
              Tại sao chọn <span className="home-values__title-highlight">Nét Việt Travel?</span>
            </h2>
          </div>

          <div className="home-values__list">
            {coreValues.map((item) => (
              <article className="home-values__item" key={item.title}>
                <CoreValueIcon type={item.icon} tone={item.tone} />
                <div className="home-values__copy">
                  <h3 className="home-values__item-title">{item.title}</h3>
                  <p className="home-values__item-description">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
