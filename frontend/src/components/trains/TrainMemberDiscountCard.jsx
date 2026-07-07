function TrainMemberDiscountCard({ memberDiscount }) {
  if (!memberDiscount) {
    return null
  }

  return (
    <section className="train-detail-card train-member-discount-card">
      <h3>{memberDiscount.title}</h3>
      <p>{memberDiscount.description}</p>
      <button type="button">{memberDiscount.link_label}</button>
    </section>
  )
}

export default TrainMemberDiscountCard
