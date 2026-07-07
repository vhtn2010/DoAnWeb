function TrainSeatTypeCard({
  formatCurrency,
  onSelect,
  option,
  selected,
}) {
  return (
    <article className={selected ? 'train-seat-type-card train-seat-type-card--selected' : 'train-seat-type-card'}>
      <div className="train-seat-type-card__header">
        <div>
          <h3>{option.name}</h3>
          {option.badge ? <span>{option.badge}</span> : null}
        </div>
        <strong>{formatCurrency(option.price)}</strong>
      </div>

      <ul className="train-seat-type-card__benefits">
        {option.benefits.map((benefit) => (
          <li key={benefit}>{benefit}</li>
        ))}
      </ul>

      <button className="train-seat-type-card__button" type="button" onClick={() => onSelect(option.id)}>
        {selected ? 'Đang chọn' : 'Chọn hạng vé'}
      </button>
    </article>
  )
}

export default TrainSeatTypeCard
