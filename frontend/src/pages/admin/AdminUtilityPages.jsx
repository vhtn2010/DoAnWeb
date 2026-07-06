import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminErrorState,
  AdminKpiCard,
  AdminLoadingBlock,
  AdminPageHeader,
  AdminPagination,
  AdminSectionHeader,
  AdminStatusBadge,
  AdminTable,
} from '../../components/admin/ui/index.js'
import { ADMIN_UTILITY_MODULES } from '../../fixtures/adminUtilityModules.fixtures.js'
import {
  changeAdminVoucherStatus,
  getAdminReportsOverview,
  getAdminUploadUsage,
  listAdminAuditLogs,
  listAdminEmailLogs,
  listAdminNotifications,
  listAdminVouchers,
  resendAdminEmailLog,
  updateAdminNotificationStatus,
} from '../../repositories/adminUtilityRepository.js'
import { ADMIN_PERMISSIONS, hasPermission } from '../../utils/rolePermissions.js'

const PAGE_SIZE = 10
const tableColumns = Object.freeze([
  { key: 'primary', label: 'Thông tin' },
  { key: 'secondary', label: 'Phân loại' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'owner', label: 'Ghi chú' },
  { key: 'action', label: 'Thao tác' },
])
const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 0,
})

function formatDateTime(value) {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? dateTimeFormatter.format(date) : 'Chưa cập nhật'
}

function formatMoney(value) {
  return `${currencyFormatter.format(Number(value || 0))} Đ`
}

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

function getMeta(response, fallbackPage = 1) {
  return {
    page: Number(response?.meta?.page || fallbackPage),
    total: Number(response?.meta?.total || 0),
    total_pages: Math.max(1, Number(response?.meta?.total_pages || 1)),
  }
}

function createPageNumbers(totalPages, currentPage) {
  const pageCount = Math.max(1, Number(totalPages || 1))
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(pageCount, start + 4)

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function getStatusTone(value = '') {
  const normalizedValue = String(value).toLowerCase()

  if (normalizedValue.includes('failed') || normalizedValue.includes('error') || normalizedValue.includes('disabled')) {
    return 'danger'
  }

  if (normalizedValue.includes('queued') || normalizedValue.includes('pending') || normalizedValue.includes('draft')) {
    return 'warning'
  }

  if (normalizedValue.includes('success') || normalizedValue.includes('sent') || normalizedValue.includes('active') || normalizedValue.includes('delivered') || normalizedValue.includes('read')) {
    return 'success'
  }

  return 'info'
}

function getVoucherDiscountLabel(voucher = {}) {
  if (voucher.discount_type === 'percent') {
    return `${Number(voucher.discount_value || 0)}%`
  }

  return formatMoney(voucher.discount_value)
}

function mapAuditRows(items = []) {
  return items.map((item) => ({
    actionLabel: '',
    id: item.id,
    owner: item.actor?.email || item.user_email || item.user_id || 'System',
    primary: item.action || 'Audit event',
    secondary: item.entity_name || item.entity_type || 'system',
    status: formatDateTime(item.created_at),
  }))
}

function mapEmailRows(items = []) {
  return items.map((item) => ({
    actionLabel: 'Gửi lại',
    id: item.id,
    owner: formatDateTime(item.created_at),
    primary: item.subject || item.template_code || 'Email hệ thống',
    secondary: item.to_email || item.recipient_email || 'Không có email',
    status: item.status || 'unknown',
  }))
}

function mapNotificationRows(items = []) {
  return items.map((item) => ({
    actionLabel: item.status === 'queued' ? 'Đánh dấu đã gửi' : '',
    id: item.id,
    owner: item.recipient?.email || (item.is_broadcast ? 'Broadcast' : 'Người nhận trực tiếp'),
    primary: item.title || 'Thông báo',
    secondary: item.type || item.related_entity_name || 'system',
    status: item.status || 'unknown',
  }))
}

function mapVoucherRows(items = []) {
  return items.map((item) => ({
    actionLabel: item.status === 'active' ? 'Tắt' : 'Bật',
    id: item.id,
    nextStatus: item.status === 'active' ? 'disabled' : 'active',
    owner: `${Number(item.used_count || 0)} đã dùng${item.usage_limit_total ? ` / ${item.usage_limit_total}` : ''}`,
    primary: item.code || item.id,
    secondary: `${item.promotion_name || 'Không có promotion'} · ${getVoucherDiscountLabel(item)}`,
    status: item.status || 'unknown',
  }))
}

function mapUploadRows(data = {}) {
  const storage = data.storage_usage || {}
  const bandwidth = data.bandwidth_usage || {}
  const breakdown = data.resource_breakdown || {}

  return [
    {
      id: 'storage',
      owner: data.cached ? 'Cached' : formatDateTime(data.fetched_at),
      primary: 'Dung lượng lưu trữ',
      secondary: `${formatBytes(storage.used_bytes)} / ${formatBytes(storage.limit_bytes)}`,
      status: data.partial ? 'partial' : 'ready',
    },
    {
      id: 'bandwidth',
      owner: data.provider || 'cloudinary',
      primary: 'Băng thông',
      secondary: `${formatBytes(bandwidth.used_bytes)} / ${formatBytes(bandwidth.limit_bytes)}`,
      status: data.partial ? 'partial' : 'ready',
    },
    {
      id: 'assets',
      owner: `Image ${breakdown.image ?? 0} · Video ${breakdown.video ?? 0} · Raw ${breakdown.raw ?? 0}`,
      primary: 'Tổng assets',
      secondary: `${Number(data.asset_count || 0)} tài nguyên`,
      status: data.partial ? 'partial' : 'ready',
    },
  ]
}

function mapReportRows(data = {}) {
  const revenueSummary = data.revenue?.summary || {}
  const bookingSummary = data.bookings?.summary || {}
  const serviceSummary = data.services?.summary || {}
  const paymentSummary = data.payments?.summary || {}

  return [
    {
      id: 'revenue',
      owner: `${Number(revenueSummary.payment_count || 0)} giao dịch`,
      primary: 'Báo cáo doanh thu',
      secondary: formatMoney(revenueSummary.net_revenue),
      status: Number(revenueSummary.refund_amount || 0) > 0 ? 'has refunds' : 'ready',
    },
    {
      id: 'bookings',
      owner: formatMoney(bookingSummary.total_booking_value),
      primary: 'Báo cáo đơn hàng',
      secondary: `${Number(bookingSummary.total_bookings || 0)} đơn`,
      status: 'ready',
    },
    {
      id: 'services',
      owner: `${Number(serviceSummary.active_services || 0)} đang bán`,
      primary: 'Báo cáo dịch vụ',
      secondary: `${Number(serviceSummary.total_services || 0)} dịch vụ`,
      status: 'ready',
    },
    {
      id: 'payments',
      owner: `${Number(paymentSummary.success_count || 0)} thành công`,
      primary: 'Báo cáo thanh toán',
      secondary: formatMoney(paymentSummary.collected_amount),
      status: Number(paymentSummary.reconciled_count || 0) > 0 ? 'reconciled' : 'ready',
    },
  ]
}

const API_MODULE_CONFIG = Object.freeze({
  auditLogs: {
    action: null,
    list: listAdminAuditLogs,
    mapRows: mapAuditRows,
    title: 'Audit logs',
  },
  emailLogs: {
    action: resendAdminEmailLog,
    actionPermission: ADMIN_PERMISSIONS.emailLogsResend,
    list: listAdminEmailLogs,
    mapRows: mapEmailRows,
    title: 'Lịch sử email',
  },
  notifications: {
    action: (id) => updateAdminNotificationStatus(id, { status: 'sent' }),
    actionPermission: ADMIN_PERMISSIONS.notificationsRead,
    list: listAdminNotifications,
    mapRows: mapNotificationRows,
    title: 'Thông báo hệ thống',
  },
  reports: {
    list: getAdminReportsOverview,
    mapRows: mapReportRows,
    single: true,
    title: 'Báo cáo quản trị',
  },
  uploads: {
    list: getAdminUploadUsage,
    mapRows: (data) => mapUploadRows(data),
    single: true,
    title: 'Quản lý uploads',
  },
  vouchers: {
    action: (id, row) => changeAdminVoucherStatus(id, { status: row.nextStatus }),
    actionPermission: ADMIN_PERMISSIONS.vouchersWrite,
    list: listAdminVouchers,
    mapRows: mapVoucherRows,
    title: 'Quản lý voucher',
  },
})

function useAdminUtilityApi(moduleId) {
  const config = API_MODULE_CONFIG[moduleId]
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ page: 1, total: 0, total_pages: 1 })
  const [loading, setLoading] = useState(Boolean(config))
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [actionId, setActionId] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!config) {
      return undefined
    }

    let isActive = true

    async function loadRows() {
      setLoading(true)
      setError('')

      try {
        const response = config.single
          ? await config.list()
          : await config.list({
              limit: PAGE_SIZE,
              page: meta.page,
            })

        if (!isActive) {
          return
        }

        if (!response?.success) {
          throw new Error(response?.message || 'Không thể tải dữ liệu admin.')
        }

        const source = config.single ? response.data : response.data || []
        const mappedRows = config.mapRows(source)

        setRows(mappedRows)
        setMeta(config.single
          ? { page: 1, total: mappedRows.length, total_pages: 1 }
          : getMeta(response, meta.page))
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setRows([])
        setError(loadError?.message || 'Không thể tải dữ liệu admin.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadRows()

    return () => {
      isActive = false
    }
  }, [config, meta.page, moduleId, reloadKey])

  async function runRowAction(row) {
    if (!config?.action || !row?.id) {
      return
    }

    setActionId(row.id)
    setFeedback('')

    try {
      const response = await config.action(row.id, row)
      setFeedback(response?.message || 'Đã cập nhật dữ liệu admin.')
      setReloadKey((value) => value + 1)
    } catch (actionError) {
      setFeedback(actionError?.message || 'Không thể thực hiện thao tác.')
    } finally {
      setActionId('')
    }
  }

  return {
    actionId,
    config,
    error,
    feedback,
    loading,
    meta,
    reload: () => setReloadKey((value) => value + 1),
    rows,
    runRowAction,
    setPage: (page) => setMeta((currentMeta) => ({ ...currentMeta, page })),
  }
}

function ApiUtilityPage({ moduleId }) {
  const { currentPermissions, currentRole } = useOutletContext()
  const module = ADMIN_UTILITY_MODULES[moduleId]
  const {
    actionId,
    config,
    error,
    feedback,
    loading,
    meta,
    reload,
    rows,
    runRowAction,
    setPage,
  } = useAdminUtilityApi(moduleId)
  const pageNumbers = useMemo(
    () => createPageNumbers(meta.total_pages, meta.page),
    [meta.page, meta.total_pages],
  )
  const canRunModuleAction = !config.actionPermission || hasPermission(
    currentRole,
    config.actionPermission,
    currentPermissions,
  )

  return (
    <main className="admin-system-page admin-utility-page">
      <AdminPageHeader
        eyebrow={module?.eyebrow || 'Admin API'}
        title={module?.title || config.title}
        subtitle={module?.subtitle || 'Dữ liệu đang được đồng bộ từ backend API.'}
      />

      {feedback ? <p className="admin-system-page__feedback" role="status">{feedback}</p> : null}

      <AdminCard className="admin-system-page__table-card" padding="lg">
        <AdminSectionHeader
          title={config.title}
          subtitle="Dữ liệu thật từ backend, có phân trang và trạng thái lỗi."
          actions={
            <AdminButton loading={loading} variant="secondary" onClick={reload}>
              Làm mới
            </AdminButton>
          }
        />

        {error ? (
          <AdminErrorState
            title="Không thể tải dữ liệu"
            description={error}
            action={
              <AdminButton variant="secondary" onClick={reload}>
                Thử lại
              </AdminButton>
            }
          />
        ) : null}

        {loading && rows.length === 0 ? <AdminLoadingBlock rows={3} /> : null}

        {!loading && !error ? (
          <AdminTable
            columns={tableColumns}
            emptyState={
              <AdminEmptyState
                title="Chưa có dữ liệu"
                description="Backend chưa trả bản ghi phù hợp với bộ lọc hiện tại."
              />
            }
            rows={rows}
          >
            {rows.map((row) => (
              <tr key={`${moduleId}-${row.id}`}>
                <td><strong>{row.primary}</strong></td>
                <td>{row.secondary}</td>
                <td><AdminStatusBadge tone={getStatusTone(row.status)}>{row.status}</AdminStatusBadge></td>
                <td>{row.owner}</td>
                <td>
                  {row.actionLabel && canRunModuleAction ? (
                    <AdminButton
                      loading={actionId === row.id}
                      size="sm"
                      variant="secondary"
                      onClick={() => runRowAction(row)}
                    >
                      {row.actionLabel}
                    </AdminButton>
                  ) : (
                    <span>{row.actionLabel ? 'Thiếu quyền' : 'Không có thao tác'}</span>
                  )}
                </td>
              </tr>
            ))}
          </AdminTable>
        ) : null}

        <div className="admin-system-page__footer">
          <p>{meta.total > 0 ? `Tổng ${meta.total} bản ghi` : 'Không có bản ghi'}</p>
          <AdminPagination
            currentPage={meta.page}
            onPageChange={setPage}
            pages={pageNumbers}
            totalPages={meta.total_pages}
          />
        </div>
      </AdminCard>
    </main>
  )
}

function MockUtilityPage({ moduleId }) {
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
          subtitle="Module này chưa nằm trong phạm vi nối API admin hiện tại."
        />
        <AdminTable columns={tableColumns} rows={module.rows}>
          {module.rows.map((row) => (
            <tr key={`${moduleId}-${row[0]}-${row[1]}`}>
              <td><strong>{row[0]}</strong></td>
              <td>{row[1]}</td>
              <td><AdminStatusBadge tone={getStatusTone(row[2])}>{row[2]}</AdminStatusBadge></td>
              <td>{row[3]}</td>
              <td><AdminButton disabled size="sm" variant="secondary">{module.actionLabel}</AdminButton></td>
            </tr>
          ))}
        </AdminTable>
      </AdminCard>
    </main>
  )
}

function AdminUtilityModulePage({ moduleId }) {
  if (API_MODULE_CONFIG[moduleId]) {
    return <ApiUtilityPage moduleId={moduleId} />
  }

  return <MockUtilityPage moduleId={moduleId} />
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
