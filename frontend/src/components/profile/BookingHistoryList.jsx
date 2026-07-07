import BookingHistoryItem from './BookingHistoryItem.jsx'

function BookingHistoryList({ items, onOpenItem }) {
  return (
    <section className="profile-history">
      <header className="profile-history__header">
        <h2>Lịch sử đặt chỗ</h2>
      </header>

      <div className="profile-history__list">
        {items.map((item) => (
          <BookingHistoryItem key={item.id} item={item} onOpen={onOpenItem} />
        ))}
      </div>
    </section>
  )
}

export default BookingHistoryList
