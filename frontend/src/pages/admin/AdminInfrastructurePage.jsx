import { useState } from 'react'
import {
  AdminButton,
  AdminCard,
  AdminKpiCard,
  AdminPageHeader,
  AdminSectionHeader,
  AdminStatusBadge,
  AdminTable,
} from '../../components/admin/ui/index.js'
import {
  ADMIN_INFRA_STATUS_META,
  ADMIN_INFRASTRUCTURE_SERVICES,
} from '../../fixtures/adminSystem.fixtures.js'

const SYSTEM_LOGS = Object.freeze([
  {
    id: 'LOG-8401',
    message: 'API gateway phản hồi trong ngưỡng vận hành',
    owner: 'Express API',
    severity: 'success',
    time: '05/07/2026 09:30',
  },
  {
    id: 'LOG-8398',
    message: 'Media CDN tăng usage, cần theo dõi dung lượng',
    owner: 'Cloudinary Media',
    severity: 'warning',
    time: '05/07/2026 09:12',
  },
  {
    id: 'LOG-8392',
    message: 'Database migration marker đã được xác thực',
    owner: 'Supabase Database',
    severity: 'info',
    time: '05/07/2026 08:40',
  },
  {
    id: 'LOG-8388',
    message: 'Email delivery queue đã xử lý toàn bộ thông báo đặt chỗ',
    owner: 'Email Delivery',
    severity: 'success',
    time: '04/07/2026 22:18',
  },
])

function parsePercent(value) {
  return Number(String(value).replace('%', '')) || 0
}

function parseMs(value) {
  return Number(String(value).replace('ms', '')) || 0
}

function AdminInfrastructurePage() {
  const [lastCheckedAt, setLastCheckedAt] = useState('09:30')
  const warningCount = ADMIN_INFRASTRUCTURE_SERVICES.filter((service) => service.status === 'warning').length
  const averageLatency = Math.round(
    ADMIN_INFRASTRUCTURE_SERVICES.reduce((total, service) => total + parseMs(service.latency), 0) /
      Math.max(ADMIN_INFRASTRUCTURE_SERVICES.length, 1),
  )
  const averageUsage = Math.round(
    ADMIN_INFRASTRUCTURE_SERVICES.reduce((total, service) => total + parsePercent(service.usage), 0) /
      Math.max(ADMIN_INFRASTRUCTURE_SERVICES.length, 1),
  )
  const metricCards = [
    ...ADMIN_INFRASTRUCTURE_SERVICES.map((service) => {
      const status = ADMIN_INFRA_STATUS_META[service.status]

      return {
        helper: `${service.latency} latency · ${status.label}`,
        key: service.id,
        label: service.name,
        tone: status.tone,
        value: service.usage,
      }
    }),
    {
      helper: `Cập nhật lúc ${lastCheckedAt}`,
      key: 'average-latency',
      label: 'Latency TB',
      tone: averageLatency > 250 ? 'warning' : 'info',
      value: `${averageLatency}ms`,
    },
    {
      helper: `${warningCount} cảnh báo · ${averageUsage}% usage TB`,
      key: 'warnings',
      label: 'Tín hiệu vận hành',
      tone: warningCount > 0 ? 'warning' : 'success',
      value: warningCount,
    },
  ]

  function runHealthCheck() {
    setLastCheckedAt(new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date()))
  }

  return (
    <main className="admin-system-page admin-infrastructure-page">
      <AdminPageHeader
        eyebrow="System Admin"
        title="Hạ tầng hệ thống"
        subtitle="Giám sát dịch vụ lõi, tài nguyên và nhật ký vận hành nền tảng."
        actions={<AdminButton variant="secondary" onClick={runHealthCheck}>Chạy health check</AdminButton>}
      />

      <section className="admin-system-page__kpis admin-infrastructure-page__metrics" aria-label="Chỉ số hạ tầng">
        {metricCards.map((card) => (
          <AdminKpiCard
            helper={card.helper}
            key={card.key}
            label={card.label}
            tone={card.tone}
            value={card.value}
          />
        ))}
      </section>

      <AdminCard className="admin-system-page__table-card" padding="lg">
        <AdminSectionHeader
          title="System logs"
          subtitle={`Health check gần nhất lúc ${lastCheckedAt}`}
        />

        <AdminTable
          tableClassName="admin-infrastructure-page__logs-table"
          columns={[
            { key: 'id', label: 'Mã log' },
            { key: 'owner', label: 'Dịch vụ' },
            { key: 'message', label: 'Nội dung' },
            { key: 'severity', label: 'Mức độ' },
            { key: 'time', label: 'Thời gian' },
          ]}
          rows={SYSTEM_LOGS}
        >
          {SYSTEM_LOGS.map((log) => (
            <tr className="admin-ops-table__row" key={log.id}>
              <td><strong>{log.id}</strong></td>
              <td>{log.owner}</td>
              <td>{log.message}</td>
              <td><AdminStatusBadge tone={log.severity}>{log.severity}</AdminStatusBadge></td>
              <td>{log.time}</td>
            </tr>
          ))}
        </AdminTable>
      </AdminCard>
    </main>
  )
}

export default AdminInfrastructurePage
