import { Link } from 'react-router-dom'
import useHomePage from '../../hooks/useHomePage.js'

function buildHomeServiceDetailPath(service = {}) {
  if (service.detail_path) {
    return service.detail_path
  }

  if (service.service_type === 'hotel' || service.service_type === 'room') {
    return `/hotels/${service.slug}`
  }

  if (service.service_type === 'flight') {
    return `/flights/${service.slug}`
  }

  if (service.service_type === 'train') {
    return `/trains/${service.slug}`
  }

  return `/services/${service.slug}`
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
  const detailPath = buildHomeServiceDetailPath(service)

  return (
    <Link
      className={`home-destination-card ${modifierClass ?? ''}`}
      to={detailPath}
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
    </Link>
  )
}

function FlashSaleCard({ formatCurrency, service }) {
  const detailPath = buildHomeServiceDetailPath(service)

  return (
    <Link className="home-offer-card" to={detailPath}>
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

          <span className="home-offer-card__action">
            Đặt Ngay
          </span>
        </div>
      </div>
    </Link>
  )
}

function HomePage() {
  const {
    calendarSelection,
    calendarPreview,
    compareDates,
    destinations,
    displayedDateRange,
    errorMessage,
    feedbackMessage,
    flashSaleMeta,
    flashSaleServices,
    formatCurrency,
    formatMonthLabel,
    getMonthDays,
    handleDateFieldToggle,
    handleDateSelect,
    handleFieldSelect,
    handleFilterSelect,
    handleRetry,
    handleSearch,
    handleSortSelect,
    hero,
    heroCtaPath,
    isSameDay,
    loading,
    openMenu,
    searchCardRef,
    searchFieldOptions,
    searchState,
    showNextMonth,
    showPreviousMonth,
    sortOptions,
    toggleMenu,
    valueProps,
    visibleMonths,
    weekdayLabels,
    filterGroups,
  } = useHomePage()

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero__content">
          <div className="home-hero__copy">
            <div className="home-hero__title-group">
              <span className="home-hero__title-leading">{hero.title_leading}</span>
              <span className="home-hero__title-script">{hero.title_script}</span>
            </div>

            <p className="home-hero__description">{hero.description}</p>

            <Link className="home-hero__cta" to={heroCtaPath}>
              {hero.cta_label}
            </Link>
          </div>

          <div className="home-hero__art">
            <img
              alt={hero.art_image_alt}
              className="home-hero__art-image"
              src={hero.art_image_url}
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
                        onClick={showPreviousMonth}
                      >
                        <MonthNavIcon direction="left" />
                      </button>
                      <button
                        aria-label="Tháng sau"
                        className="home-search-card__calendar-nav-button"
                        type="button"
                        onClick={showNextMonth}
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

          {loading ? (
            <div className="home-search-card__calendar-footer" role="status">
              <span className="home-search-card__calendar-helper">
                Đang tải dữ liệu trang chủ từ mock adapter...
              </span>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="home-search-card__calendar-footer" role="alert">
              <span className="home-search-card__calendar-helper">{errorMessage}</span>
              <button className="home-search-card__chip" type="button" onClick={handleRetry}>
                Thử lại
              </button>
            </div>
          ) : null}

          {feedbackMessage ? (
            <div className="home-search-card__calendar-footer" role="status">
              <span className="home-search-card__calendar-helper">{feedbackMessage}</span>
            </div>
          ) : null}
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
          {destinations.map((service) => (
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
              <span className="home-flash-sale__timer-value">{flashSaleMeta.timer.days}</span>
              <span className="home-flash-sale__timer-label">{flashSaleMeta.day_label}</span>
            </div>
            <div className="home-flash-sale__timer-unit">
              <span className="home-flash-sale__timer-value">{flashSaleMeta.timer.hours}</span>
              <span className="home-flash-sale__timer-label">{flashSaleMeta.hour_label}</span>
            </div>
            <div className="home-flash-sale__timer-unit">
              <span className="home-flash-sale__timer-value">{flashSaleMeta.timer.minutes}</span>
              <span className="home-flash-sale__timer-label">{flashSaleMeta.minute_label}</span>
            </div>
          </div>
        </div>

        <div className="home-flash-sale__offers">
          {flashSaleServices.map((service) => (
            <FlashSaleCard
              formatCurrency={formatCurrency}
              key={service.slug}
              service={service}
            />
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
            {valueProps.map((item) => (
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
