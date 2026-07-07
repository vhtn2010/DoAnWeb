import { useState } from 'react'
import { getAdminUploadUsage } from '../../repositories/adminUtilityRepository.js'

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

function formatBytes(value) {
  const bytes = Number(value || 0)

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const amount = bytes / (1024 ** unitIndex)

  return `${amount.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function formatUploadDateTime(value) {
  const dateValue = value ? new Date(value) : null

  if (!dateValue || Number.isNaN(dateValue.getTime())) {
    return 'Chưa cập nhật'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateValue)
}

function createUploadUsageRows(data = {}) {
  const storage = data.storage_usage || {}
  const bandwidth = data.bandwidth_usage || {}
  const breakdown = data.resource_breakdown || {}

  return [
    {
      id: 'storage',
      label: 'Dung lượng lưu trữ',
      meta: data.cached ? 'Cached' : formatUploadDateTime(data.fetched_at),
      value: `${formatBytes(storage.used_bytes)} / ${formatBytes(storage.limit_bytes)}`,
    },
    {
      id: 'bandwidth',
      label: 'Băng thông',
      meta: data.provider || 'cloudinary',
      value: `${formatBytes(bandwidth.used_bytes)} / ${formatBytes(bandwidth.limit_bytes)}`,
    },
    {
      id: 'assets',
      label: 'Tổng assets',
      meta: `Image ${breakdown.image ?? 0} · Video ${breakdown.video ?? 0} · Raw ${breakdown.raw ?? 0}`,
      value: `${Number(data.asset_count || 0).toLocaleString('vi-VN')} tài nguyên`,
    },
  ]
}

function getStoragePercent(data = {}) {
  const storage = data.storage_usage || {}
  const usedBytes = Number(storage.used_bytes || 0)
  const limitBytes = Number(storage.limit_bytes || 0)

  if (!Number.isFinite(usedBytes) || !Number.isFinite(limitBytes) || limitBytes <= 0) {
    return 0
  }

  return Math.min(100, Math.round((usedBytes / limitBytes) * 100))
}

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
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadUsage, setUploadUsage] = useState(null)

  const uploadRows = createUploadUsageRows(uploadUsage || {})
  const storagePercent = getStoragePercent(uploadUsage || {})

  function refreshInfrastructure() {
    const nextCheckedAt = new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date())

    setLastCheckedAt(nextCheckedAt)
    setFeedback(`Đã làm mới trạng thái hạ tầng lúc ${nextCheckedAt}.`)
  }

  async function loadUploadUsage() {
    setUploadLoading(true)
    setUploadError('')

    try {
      const response = await getAdminUploadUsage()

      if (!response?.success) {
        throw new Error(response?.message || 'Không thể tải thông tin uploads.')
      }

      setUploadUsage(response.data || {})
    } catch (loadError) {
      setUploadUsage(null)
      setUploadError(loadError?.message || 'Không thể tải thông tin uploads.')
    } finally {
      setUploadLoading(false)
    }
  }

  function openStorageModal() {
    setIsStorageModalOpen(true)

    if (!uploadUsage && !uploadLoading) {
      loadUploadUsage()
    }
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

        <button
          className="admin-infrastructure-page__metric-card admin-infrastructure-page__metric-card--button"
          type="button"
          onClick={openStorageModal}
        >
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
            <small>Nhấn để xem Cloudinary uploads</small>
          </div>
        </button>

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

      {isStorageModalOpen ? (
        <div
          className="admin-infrastructure-page__modal-backdrop"
          role="presentation"
          onClick={() => setIsStorageModalOpen(false)}
        >
          <section
            aria-label="Thông tin lưu trữ uploads"
            aria-modal="true"
            className="admin-infrastructure-page__storage-modal"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="admin-infrastructure-page__modal-header">
              <div>
                <p>Lưu trữ</p>
                <h2>Cloudinary uploads</h2>
              </div>
              <button
                aria-label="Đóng thông tin uploads"
                className="admin-infrastructure-page__modal-close"
                type="button"
                onClick={() => setIsStorageModalOpen(false)}
              >
                ×
              </button>
            </header>

            <div className="admin-infrastructure-page__upload-meter">
              <div>
                <span>Dung lượng đã dùng</span>
                <strong>{storagePercent}%</strong>
              </div>
              <span className="admin-infrastructure-page__upload-track">
                <span style={{ width: `${storagePercent}%` }} />
              </span>
            </div>

            {uploadLoading ? (
              <p className="admin-infrastructure-page__upload-state">Đang tải thông tin uploads...</p>
            ) : null}

            {uploadError ? (
              <p className="admin-infrastructure-page__upload-state admin-infrastructure-page__upload-state--error">
                {uploadError}
              </p>
            ) : null}

            {!uploadLoading && !uploadError ? (
              <div className="admin-infrastructure-page__upload-list">
                {uploadRows.map((row) => (
                  <article className="admin-infrastructure-page__upload-row" key={row.id}>
                    <div>
                      <h3>{row.label}</h3>
                      <p>{row.meta}</p>
                    </div>
                    <strong>{row.value}</strong>
                  </article>
                ))}
              </div>
            ) : null}

            <footer className="admin-infrastructure-page__modal-footer">
              <button type="button" disabled={uploadLoading} onClick={loadUploadUsage}>
                Làm mới usage
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  )
}

export default AdminInfrastructurePage
