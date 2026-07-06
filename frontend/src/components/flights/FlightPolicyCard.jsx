function FlightPolicyCard({ policies }) {
  if (!policies.length) {
    return null
  }

  return (
    <section
      id="flight-detail-policies"
      className="flight-detail-policy-card"
      aria-labelledby="flight-detail-policy-title"
    >
      <div className="flight-detail-section-heading">
        <h2 id="flight-detail-policy-title">Điều kiện & chính sách</h2>
      </div>

      <ul className="flight-detail-policy-card__list">
        {policies.map((policy) => (
          <li key={policy}>{policy}</li>
        ))}
      </ul>
    </section>
  )
}

export default FlightPolicyCard
