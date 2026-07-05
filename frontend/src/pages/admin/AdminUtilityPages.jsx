import {
  AdminButton,
  AdminCard,
  AdminKpiCard,
  AdminPageHeader,
  AdminPagination,
  AdminSectionHeader,
  AdminStatusBadge,
  AdminTable,
} from '../../components/admin/ui/index.js'
import { ADMIN_UTILITY_MODULES } from '../../fixtures/adminUtilityModules.fixtures.js'

const tableColumns = Object.freeze([
  { key: 'primary', label: 'Thông tin' },
  { key: 'secondary', label: 'Phân loại' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'owner', label: 'Ghi chú' },
  { key: 'action', label: 'Thao tác' },
])

function getStatusTone(value) {
  const normalizedValue = value.toLowerCase()

  if (normalizedValue.includes('lỗi') || normalizedValue.includes('rủi ro') || normalizedValue.includes('cần tối ưu')) {
    return 'danger'
  }

  if (normalizedValue.includes('chờ') || normalizedValue.includes('sắp') || normalizedValue.includes('nháp')) {
    return 'warning'
  }

  if (normalizedValue.includes('thành công') || normalizedValue.includes('sẵn sàng') || normalizedValue.includes('hoạt động') || normalizedValue.includes('ổn định') || normalizedValue.includes('delivered')) {
    return 'success'
  }

  return 'info'
}

function AdminUtilityModulePage({ moduleId }) {
  const module = ADMIN_UTILITY_MODULES[moduleId]

  return (
    <main className="admin-system-page admin-utility-page">
      <AdminPageHeader
        eyebrow={module.eyebrow}
        title={module.title}
        subtitle={module.subtitle}
      />

      <section className="admin-system-page__kpis" aria-label={`Tổng quan ${module.title}`}>
        {module.metrics.map((metric) => (
          <AdminKpiCard
            helper={metric.helper}
            key={metric.label}
            label={metric.label}
            tone={metric.tone}
            value={metric.value}
          />
        ))}
      </section>

      <AdminCard className="admin-system-page__table-card" padding="lg">
        <AdminSectionHeader
          title="Danh sách vận hành"
          subtitle="Dữ liệu mock theo cấu trúc route admin để sẵn sàng nối API."
        />
        <AdminTable columns={tableColumns} rows={module.rows}>
          {module.rows.map((row) => (
            <tr key={`${moduleId}-${row[0]}-${row[1]}`}>
              <td><strong>{row[0]}</strong></td>
              <td>{row[1]}</td>
              <td><AdminStatusBadge tone={getStatusTone(row[2])}>{row[2]}</AdminStatusBadge></td>
              <td>{row[3]}</td>
              <td><AdminButton size="sm" variant="secondary">{module.actionLabel}</AdminButton></td>
            </tr>
          ))}
        </AdminTable>
        <div className="admin-system-page__footer">
          <p>Hiển thị 3 bản ghi mẫu</p>
          <AdminPagination currentPage={1} pages={[1, 2, 3]} totalPages={3} />
        </div>
      </AdminCard>
    </main>
  )
}

export function AdminAuditLogsPage() {
  return <AdminUtilityModulePage moduleId="auditLogs" />
}

export function AdminEmailLogsPage() {
  return <AdminUtilityModulePage moduleId="emailLogs" />
}

export function AdminInventoryPage() {
  return <AdminUtilityModulePage moduleId="inventory" />
}

export function AdminNotificationsPage() {
  return <AdminUtilityModulePage moduleId="notifications" />
}

export function AdminPermissionsPage() {
  return <AdminUtilityModulePage moduleId="permissions" />
}

export function AdminReportsPage() {
  return <AdminUtilityModulePage moduleId="reports" />
}

export function AdminRolesPage() {
  return <AdminUtilityModulePage moduleId="roles" />
}

export function AdminUploadsPage() {
  return <AdminUtilityModulePage moduleId="uploads" />
}

export function AdminVouchersPage() {
  return <AdminUtilityModulePage moduleId="vouchers" />
}
