const bookingStatusMeta = {
  pending_payment: { label: 'Chờ thanh toán', tone: 'warning' },
  confirmed: { label: 'Đã xác nhận', tone: 'info' },
  completed: { label: 'Hoàn tất', tone: 'success' },
  cancelled: { label: 'Đã hủy', tone: 'danger' },
}

function RecentBookingsTable({ bookings, formatCurrency, formatDateTime }) {
  return (
    <section className="admin-dashboard-card admin-dashboard-table-card">
      <div className="admin-dashboard-section-heading">
        <div>
          <h2 className="admin-dashboard-section-heading__title">Đơn đặt gần đây</h2>
          <p className="admin-dashboard-section-heading__subtitle">
            Dữ liệu mock theo cấu trúc sẵn sàng tích hợp API báo cáo.
          </p>
        </div>
      </div>

      <div className="admin-dashboard-table-card__scroller">
        <table className="admin-dashboard-table">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Dịch vụ</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
              <th>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => {
              const meta = bookingStatusMeta[booking.status] ?? {
                label: booking.status,
                tone: 'default',
              }

              return (
                <tr key={booking.booking_code}>
                  <td className="admin-dashboard-table__code">{booking.booking_code}</td>
                  <td>{booking.customer_name}</td>
                  <td>{booking.service_title}</td>
                  <td>{formatCurrency(booking.total_amount, booking.currency)}</td>
                  <td>
                    <span
                      className={`admin-dashboard-status-badge admin-dashboard-status-badge--${meta.tone}`}
                    >
                      {meta.label}
                    </span>
                  </td>
                  <td>{formatDateTime(booking.created_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default RecentBookingsTable
