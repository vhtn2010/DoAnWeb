import { useState } from 'react'

const SYSTEM_LOGS = Object.freeze([
  {
    id: 'LOG-8401',
    message: 'Timeout kết nối đến đối tác thanh toán VNPAY (Connection Timeout 5000ms).',
    service: 'Payment Gateway API',
    severity: 'error',
    time: '10:42:05 - Hôm nay',
  },
  {
    id: 'LOG-8398',
    message: 'RAM usage vượt ngưỡng 85% trong 5 phút liên tục.',
    service: 'Database Node 2',
    severity: 'warning',
    time: '10:15:22 - Hôm nay',
  },
  {
    id: 'LOG-8392',
    message: 'Hoàn thành đồng bộ dữ liệu cache khách sạn hàng ngày thành công.',
    service: 'Cron Job',
    severity: 'info',
    time: '09:00:01 - Hôm nay',
  },
  {
    id: 'LOG-8388',
    message: 'Tự động sao lưu Database Snapshot #DB-20231027 thành công (Dung lượng: 14.2GB).',
    service: 'System Backup',
    severity: 'info',
    time: '02:30:00 - Hôm nay',
  },
])

const LOG_SEVERITY_LABELS = Object.freeze({
  error: 'ERROR',
  info: 'INFO',
  warning: 'WARNING',
})

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M20 7v5h-5M4 17v-5h5M18.2 9A7 7 0 0 0 6.8 6.8L4 9m2 6a7 7 0 0 0 11.2 2.2L20 15" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  )
}

function ServerIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M5 4h14v6H5V4Zm0 10h14v6H5v-6Zm3-7h.01M8 17h.01M12 7h4M12 17h4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}

function CpuIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3M7 7h10v10H7V7Zm3 3h4v4h-4v-4Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}

function RamIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M6 8h12v8H6V8Zm2-4v4m4-4v4m4-4v4M8 16v4m4-4v4m4-4v4M4 10H2m2 4H2m20-4h-2m2 4h-2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}

function StorageIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M4 7c0-2 16-2 16 0v10c0 2-16 2-16 0V7Zm0 0c0 2 16 2 16 0M4 12c0 2 16 2 16 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}

function DatabaseIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M12 4c4.4 0 8 1.34 8 3s-3.6 3-8 3-8-1.34-8-3 3.6-3 8-3Zm-8 3v5c0 1.66 3.6 3 8 3s8-1.34 8-3V7M4 12v5c0 1.66 3.6 3 8 3s8-1.34 8-3v-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}

function ApiIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M7 8 3 12l4 4m10-8 4 4-4 4M14 5l-4 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  )
}

function AdminInfrastructurePage() {
  const [lastCheckedAt, setLastCheckedAt] = useState('10:42')
  const [feedback, setFeedback] = useState('')

  function refreshInfrastructure() {
    const nextCheckedAt = new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date())

    setLastCheckedAt(nextCheckedAt)
    setFeedback(`Đã làm mới trạng thái hạ tầng lúc ${nextCheckedAt}.`)
  }

  return (
    <main className="admin-system-page admin-infrastructure-page">
      <section className="admin-infrastructure-page__header">
        <div className="admin-infrastructure-page__header-copy">
          <h1>Hạ tầng hệ thống</h1>
          <p>Giám sát tài nguyên và trạng thái dịch vụ theo thời gian thực.</p>
        </div>

        <div className="admin-infrastructure-page__header-actions">
          <span className="admin-infrastructure-page__live">
            <span aria-hidden="true" />
            Live
          </span>
          <button
            className="admin-infrastructure-page__refresh"
            type="button"
            onClick={refreshInfrastructure}
          >
            <RefreshIcon />
            <span>Làm mới</span>
          </button>
        </div>
      </section>

      {feedback ? (
        <p className="admin-infrastructure-page__feedback" role="status">
          {feedback}
        </p>
      ) : null}

      <section className="admin-infrastructure-page__bento" aria-label="Chỉ số hạ tầng">
        <article className="admin-infrastructure-page__metric-card">
          <div className="admin-infrastructure-page__metric-heading">
            <h2>Máy chủ chính</h2>
            <span className="admin-infrastructure-page__metric-icon admin-infrastructure-page__metric-icon--brand">
              <ServerIcon />
            </span>
          </div>
          <div className="admin-infrastructure-page__server-status">
            <span aria-hidden="true" />
            <strong>Online / Active</strong>
            <small>Uptime: 99.98% (45 days)</small>
          </div>
        </article>

        <article className="admin-infrastructure-page__metric-card admin-infrastructure-page__metric-card--tall">
          <div className="admin-infrastructure-page__metric-heading">
            <h2>CPU Usage</h2>
            <span className="admin-infrastructure-page__metric-icon">
              <CpuIcon />
            </span>
          </div>
          <div className="admin-infrastructure-page__cpu">
            <div className="admin-infrastructure-page__cpu-ring">
              <strong>68%</strong>
            </div>
            <div className="admin-infrastructure-page__legend">
              <span><i className="admin-infrastructure-page__dot admin-infrastructure-page__dot--brand" />System (30%)</span>
              <span><i className="admin-infrastructure-page__dot admin-infrastructure-page__dot--gold" />User (38%)</span>
            </div>
          </div>
        </article>

        <article className="admin-infrastructure-page__metric-card">
          <div className="admin-infrastructure-page__metric-heading">
            <h2>RAM Allocation</h2>
            <span className="admin-infrastructure-page__metric-icon">
              <RamIcon />
            </span>
          </div>
          <div className="admin-infrastructure-page__capacity">
            <div>
              <span>/64 GB</span>
              <strong>65%</strong>
            </div>
            <span className="admin-infrastructure-page__track admin-infrastructure-page__track--ram">
              <span />
            </span>
            <small>Healthy capacity</small>
          </div>
        </article>

        <article className="admin-infrastructure-page__metric-card">
          <div className="admin-infrastructure-page__metric-heading">
            <h2>Lưu trữ (SSD)</h2>
            <span className="admin-infrastructure-page__metric-icon">
              <StorageIcon />
            </span>
          </div>
          <div className="admin-infrastructure-page__storage">
            <p>
              <span>Khả dụng</span>
              <strong>1.2 TB</strong>
            </p>
            <span className="admin-infrastructure-page__track admin-infrastructure-page__track--blue">
              <span />
            </span>
            <p>
              <span>Đã dùng</span>
              <strong>2.8 TB</strong>
            </p>
            <span className="admin-infrastructure-page__track admin-infrastructure-page__track--brand">
              <span />
            </span>
          </div>
        </article>

        <article className="admin-infrastructure-page__metric-card">
          <div className="admin-infrastructure-page__metric-heading">
            <h2>Database <span>(PostgreSQL)</span></h2>
            <span className="admin-infrastructure-page__metric-icon">
              <DatabaseIcon />
            </span>
          </div>
          <div className="admin-infrastructure-page__database">
            <strong>Healthy</strong>
            <span>Sync: Active | Replication: OK</span>
          </div>
        </article>

        <article className="admin-infrastructure-page__metric-card">
          <div className="admin-infrastructure-page__metric-heading">
            <h2>API Latency</h2>
            <span className="admin-infrastructure-page__metric-icon">
              <ApiIcon />
            </span>
          </div>
          <div className="admin-infrastructure-page__latency">
            <p><strong>124</strong><span> ms</span></p>
            <div className="admin-infrastructure-page__sparkline" aria-hidden="true">
              {[
                ['bar-1', 'low'],
                ['bar-2', 'mid'],
                ['bar-3', 'short'],
                ['bar-4', 'high'],
                ['bar-5', 'medium'],
                ['bar-6', 'peak'],
                ['bar-7', 'mid'],
              ].map(([id, bar]) => (
                <span className={`admin-infrastructure-page__sparkline-bar admin-infrastructure-page__sparkline-bar--${bar}`} key={id} />
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="admin-infrastructure-page__logs-card" aria-label="Nhật ký hệ thống">
        <header className="admin-infrastructure-page__logs-header">
          <h2>Nhật ký hệ thống (System Logs)</h2>
          <button type="button" onClick={() => setFeedback(`Đang hiển thị ${SYSTEM_LOGS.length} nhật ký gần nhất.`)}>
            Xem tất cả
          </button>
        </header>

        <div className="admin-infrastructure-page__table-scroll">
          <table className="admin-infrastructure-page__logs-table">
            <thead>
              <tr>
                <th scope="col">Thời gian</th>
                <th scope="col">Mức độ</th>
                <th scope="col">Dịch vụ</th>
                <th scope="col">Nội dung</th>
              </tr>
            </thead>
            <tbody>
              {SYSTEM_LOGS.map((log) => (
                <tr key={log.id}>
                  <td>{log.time}</td>
                  <td>
                    <span className={`admin-infrastructure-page__severity admin-infrastructure-page__severity--${log.severity}`}>
                      {LOG_SEVERITY_LABELS[log.severity]}
                    </span>
                  </td>
                  <td>{log.service}</td>
                  <td>{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="admin-infrastructure-page__updated">Cập nhật lúc {lastCheckedAt}</p>
      </section>
    </main>
  )
}

export default AdminInfrastructurePage
