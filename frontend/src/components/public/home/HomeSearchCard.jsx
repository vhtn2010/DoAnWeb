const FIELD_PLACEHOLDERS = {
  from: 'Chọn điểm khởi hành',
  to: 'Chọn điểm đến',
}

function ChevronIcon({ isOpen }) {
  return (
    <svg
      aria-hidden="true"
      className={`home-search-card__chevron ${isOpen ? 'home-search-card__chevron--open' : ''}`}
      viewBox="0 0 16 16"
    >
      <path
        d="m4 6 4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function SearchFieldIcon({ type }) {
  const icons = {
    departure: {
      viewBox: '0 0 24 24',
      content: (
        <>
          <path
            d="M4 18.25h11.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.7"
          />
          <path
            d="M20.73 10.37a.78.78 0 0 0-.94-.56l-4.57 1.22-5.97-5.56-1.24.33 3.57 6.19-4.28 1.15-1.82-1.41-.95.25 2.02 3.5 15.62-4.19a.78.78 0 0 0 .56-.92Z"
            fill="currentColor"
          />
        </>
      ),
    },
    destination: (
      <>
        <path d="M12 21s6-4.7 6-9.2a6 6 0 1 0-12 0c0 4.5 6 9.2 6 9.2Z" />
        <circle cx="12" cy="11" r="2.3" />
      </>
    ),
    calendar: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M8 3v4M16 3v4M4 10h16M8 13h2M14 13h2M8 17h2M14 17h2" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="5" />
        <path d="m15 15 5 5" />
      </>
    ),
  }

  const iconDefinition =
    typeof icons[type] === 'object' && 'content' in icons[type]
      ? icons[type]
      : { viewBox: '0 0 24 24', content: icons[type] }

  return (
    <svg
      aria-hidden="true"
      className={`home-search-card__field-icon-svg home-search-card__field-icon-svg--${type}`}
      viewBox={iconDefinition.viewBox}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {iconDefinition.content}
    </svg>
  )
}

function MonthNavIcon({ direction }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path
        d={direction === 'left' ? 'm10 3-5 5 5 5' : 'm6 3 5 5-5 5'}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function HomeSearchField({ field, handleFieldSelect, isOpen, searchState, toggleMenu }) {
  const fieldValue = searchState[field.key] || FIELD_PLACEHOLDERS[field.key] || ''
  const isPlaceholder = !searchState[field.key]

  return (
    <div className="home-search-card__field-wrap">
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`home-search-card__field-button ${isOpen ? 'home-search-card__field-button--open' : ''}`}
        type="button"
        onClick={() => toggleMenu(field.key)}
      >
        <span className="home-search-card__field-icon">
          <SearchFieldIcon type={field.icon} />
        </span>
        <span className="home-search-card__field-copy">
          <span className="home-search-card__label">{field.label}</span>
          <span
            className={`home-search-card__value ${
              isPlaceholder ? 'home-search-card__value--placeholder' : ''
            }`}
          >
            {fieldValue}
          </span>
        </span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {isOpen ? (
        <div className="home-search-card__dropdown" role="listbox">
          {field.options.map((option) => (
            <button
              className={`home-search-card__dropdown-option ${
                searchState[field.key] === option ? 'home-search-card__dropdown-option--selected' : ''
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
  )
}

function HomeSearchDateField({
  calendarPreview,
  calendarSelection,
  compareDates,
  displayedDateRange,
  formatMonthLabel,
  getMonthDays,
  handleDateFieldToggle,
  handleDateSelect,
  isOpen,
  isSameDay,
  showNextMonth,
  showPreviousMonth,
  visibleMonths,
  weekdayLabels,
}) {
  return (
    <div className="home-search-card__field-wrap home-search-card__field-wrap--date">
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`home-search-card__field-button home-search-card__field-button--date ${
          isOpen ? 'home-search-card__field-button--open' : ''
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
        <ChevronIcon isOpen={isOpen} />
      </button>

      {isOpen ? (
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
                        weekdayLabel === 'CN' ? 'home-search-card__calendar-weekday--sunday' : ''
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
                          isInSelectedRange ? 'home-search-card__calendar-day--in-range' : ''
                        } ${
                          isStartDate ? 'home-search-card__calendar-day--range-start' : ''
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
  )
}

function HomeSearchFilterChip({ group, handleFilterSelect, isOpen, selectedValue, toggleMenu }) {
  const menuKey = `filter-${group.key}`

  return (
    <div className="home-search-card__chip-wrap">
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`home-search-card__chip ${
          selectedValue ? 'home-search-card__chip--selected' : ''
        } ${isOpen ? 'home-search-card__chip--open' : ''}`}
        type="button"
        onClick={() => toggleMenu(menuKey)}
      >
        <span>{selectedValue || group.label}</span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {isOpen ? (
        <div className="home-search-card__dropdown" role="listbox">
          {group.options.map((option) => (
            <button
              className={`home-search-card__dropdown-option ${
                selectedValue === option ? 'home-search-card__dropdown-option--selected' : ''
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
}

export default function HomeSearchCard({
  calendarPreview,
  calendarSelection,
  compareDates,
  displayedDateRange,
  errorMessage,
  feedbackMessage,
  filterGroups,
  formatMonthLabel,
  getMonthDays,
  handleDateFieldToggle,
  handleDateSelect,
  handleFieldSelect,
  handleFilterSelect,
  handleRetry,
  handleSearch,
  handleSortSelect,
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
  visibleMonths,
  weekdayLabels,
}) {
  const sortLabel = searchState.sort || 'Chưa chọn'

  return (
    <div className="home-search-card" ref={searchCardRef}>
      <div className="home-search-card__top-row">
        {searchFieldOptions.map((field) => (
          <HomeSearchField
            field={field}
            handleFieldSelect={handleFieldSelect}
            isOpen={openMenu === field.key}
            key={field.key}
            searchState={searchState}
            toggleMenu={toggleMenu}
          />
        ))}

        <HomeSearchDateField
          calendarPreview={calendarPreview}
          calendarSelection={calendarSelection}
          compareDates={compareDates}
          displayedDateRange={displayedDateRange}
          formatMonthLabel={formatMonthLabel}
          getMonthDays={getMonthDays}
          handleDateFieldToggle={handleDateFieldToggle}
          handleDateSelect={handleDateSelect}
          isOpen={openMenu === 'date'}
          isSameDay={isSameDay}
          showNextMonth={showNextMonth}
          showPreviousMonth={showPreviousMonth}
          visibleMonths={visibleMonths}
          weekdayLabels={weekdayLabels}
        />

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
            {filterGroups.map((group) => (
              <HomeSearchFilterChip
                group={group}
                handleFilterSelect={handleFilterSelect}
                isOpen={openMenu === `filter-${group.key}`}
                key={group.key}
                selectedValue={searchState.filters[group.key]}
                toggleMenu={toggleMenu}
              />
            ))}
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
              } ${searchState.sort ? '' : 'home-search-card__sort-button--placeholder'}`}
              type="button"
              onClick={() => toggleMenu('sort')}
            >
              <span>{sortLabel}</span>
              <ChevronIcon isOpen={openMenu === 'sort'} />
            </button>

            {openMenu === 'sort' ? (
              <div className="home-search-card__dropdown home-search-card__dropdown--sort" role="listbox">
                {sortOptions.map((option) => (
                  <button
                    className={`home-search-card__dropdown-option ${
                      searchState.sort === option ? 'home-search-card__dropdown-option--selected' : ''
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
  )
}
