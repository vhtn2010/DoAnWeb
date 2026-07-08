function TrainSeatTypeCard({
  formatCurrency,
  onSelect,
  option,
  selected,
}) {
  function handleSelect() {
    onSelect(option.id)
  }

  return (
    <article
      className={selected ? 'train-seat-type-card train-seat-type-card--selected' : 'train-seat-type-card'}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleSelect()
        }
      }}
    >
      <div className="train-seat-type-card__header">
        <div>
          <h3>{option.name}</h3>
          {option.badge ? <span className="train-seat-type-card__badge">{option.badge}</span> : null}
        </div>
      </div>

      <ul className="train-seat-type-card__benefits">
        {option.benefits.map((benefit) => (
          <li key={benefit}>{benefit}</li>
        ))}
      </ul>

      <div className="train-seat-type-card__footer">
        <strong>{formatCurrency(option.price)}</strong>
        {selected ? <small>Đang chọn</small> : null}
      </div>
    </article>
  )
}

export default TrainSeatTypeCard
