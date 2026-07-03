const { query } = require('./client');

const createAdminSystemStatsRepository = ({
  queryImpl = query,
} = {}) => {
  const getSystemStatsSnapshot = async () => {
    const [
      userStatusRows,
      serviceTypeRows,
      serviceStatusRows,
      bookingStatusRows,
      paymentStatusRows,
      refundStatusRows,
      emailStatusRows,
      notificationStatusRows,
    ] = await Promise.all([
      queryImpl(
        `
          SELECT
            u.status,
            COUNT(*)::int AS total_count
          FROM users u
          GROUP BY u.status
        `,
      ),
      queryImpl(
        `
          SELECT
            s.service_type,
            COUNT(*)::int AS total_count
          FROM services s
          GROUP BY s.service_type
        `,
      ),
      queryImpl(
        `
          SELECT
            s.status,
            COUNT(*)::int AS total_count
          FROM services s
          GROUP BY s.status
        `,
      ),
      queryImpl(
        `
          SELECT
            b.status,
            COUNT(*)::int AS total_count
          FROM bookings b
          GROUP BY b.status
        `,
      ),
      queryImpl(
        `
          SELECT
            p.status,
            COUNT(*)::int AS total_count
          FROM payments p
          GROUP BY p.status
        `,
      ),
      queryImpl(
        `
          SELECT
            r.status,
            COUNT(*)::int AS total_count
          FROM refunds r
          GROUP BY r.status
        `,
      ),
      queryImpl(
        `
          SELECT
            el.status,
            COUNT(*)::int AS total_count
          FROM email_logs el
          GROUP BY el.status
        `,
      ),
      queryImpl(
        `
          SELECT
            n.status,
            COUNT(*)::int AS total_count
          FROM notifications n
          GROUP BY n.status
        `,
      ),
    ]);

    return {
      bookings: bookingStatusRows.rows,
      mail: emailStatusRows.rows,
      notifications: notificationStatusRows.rows,
      payments: paymentStatusRows.rows,
      refunds: refundStatusRows.rows,
      services_by_status: serviceStatusRows.rows,
      services_by_type: serviceTypeRows.rows,
      users: userStatusRows.rows,
    };
  };

  return {
    getSystemStatsSnapshot,
  };
};

module.exports = Object.assign(createAdminSystemStatsRepository(), {
  createAdminSystemStatsRepository,
});
