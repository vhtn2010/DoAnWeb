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

function SearchField({ icon, label, name, onChange, value }) {
  return (
    <label className="hotel-search-bar__field">
      <span className="hotel-search-bar__label">{label}</span>
      <span aria-hidden="true" className="hotel-search-bar__icon">
        {icon}
      </span>
      <input
        className="hotel-search-bar__input"
        name={name}
        type="text"
        value={value}
        onChange={onChange}
      />
    </label>
  )
}

function HotelSearchBar({ searchValues, onChange, onSubmit }) {
  return (
    <section className="hotel-search-bar">
      <div className="hotel-search-bar__fields">
        <SearchField
          icon={<LocationIcon />}
          label="ĐỊA ĐIỂM"
          name="location"
          value={searchValues.location}
          onChange={onChange}
        />
        <SearchField
          icon={<CalendarIcon />}
          label="NHẬN PHÒNG"
          name="checkin"
          value={searchValues.checkin}
          onChange={onChange}
        />
        <SearchField
          icon={<CalendarIcon />}
          label="TRẢ PHÒNG"
          name="checkout"
          value={searchValues.checkout}
          onChange={onChange}
        />
      </div>

      <button className="hotel-search-bar__button" type="button" onClick={onSubmit}>
        <SearchIcon />
        <span>Tìm kiếm</span>
      </button>
    </section>
  )
}

export default HotelSearchBar
