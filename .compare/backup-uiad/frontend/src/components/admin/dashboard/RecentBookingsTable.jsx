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
              <th scope="col">Mã đơn</th>
              <th scope="col">Khách hàng</th>
              <th scope="col">Dịch vụ</th>
              <th scope="col">Tổng tiền</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => {
              const meta = bookingStatusMeta[booking.status] ?? {
                label: booking.status,
                tone: 'default',
              }

              return (
                <tr key={booking.id ?? booking.booking_code}>
                  <td className="admin-dashboard-table__code">{booking.booking_code}</td>
                  <td>
                    <span className="admin-dashboard-table__text" title={booking.customer_name}>
                      {booking.customer_name}
                    </span>
                  </td>
                  <td>
                    <span className="admin-dashboard-table__service" title={booking.service_title}>
                      {booking.service_title}
                    </span>
                  </td>
                  <td className="admin-dashboard-table__amount">
                    {formatCurrency(booking.total_amount, booking.currency)}
                  </td>
                  <td>
                    <span
                      className={`admin-dashboard-status-badge admin-dashboard-status-badge--${meta.tone}`}
                    >
                      <span className="admin-dashboard-status-badge__dot" aria-hidden="true" />
                      {meta.label}
                    </span>
                  </td>
                  <td>
                    <span className="admin-dashboard-table__date">
                      {formatDateTime(booking.created_at)}
                    </span>
                  </td>
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
