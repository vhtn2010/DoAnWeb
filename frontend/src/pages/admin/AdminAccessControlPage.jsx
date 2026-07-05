import { useMemo, useState } from 'react'
import {
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminField,
  AdminFilterBar,
  AdminPageHeader,
  AdminSearchInput,
  AdminSectionHeader,
  AdminSelect,
  AdminStatusBadge,
  AdminTable,
} from '../../components/admin/ui/index.js'
import {
  ADMIN_ACCESS_ROLES,
  ADMIN_USERS,
  ADMIN_USER_STATUS_META,
} from '../../fixtures/adminSystem.fixtures.js'

const STATUS_OPTIONS = Object.freeze([
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Hoạt động' },
  { value: 'locked', label: 'Đã khóa' },
])

const ROLE_OPTIONS = Object.freeze([
  { value: 'all', label: 'Tất cả vai trò' },
  ...ADMIN_ACCESS_ROLES.map((role) => ({
    label: role.name,
    value: role.id,
  })),
])

const ACCESS_ROWS = ADMIN_USERS.map((user, index) => {
  const role = ADMIN_ACCESS_ROLES[index % ADMIN_ACCESS_ROLES.length]

  return {
    ...user,
    lastLogin: ['05/07/2026 09:14', '04/07/2026 18:32', '02/07/2026 08:45'][index] ?? '01/07/2026 10:00',
    modules: role.permissions.slice(0, 3),
    roleId: role.id,
    roleName: role.name,
  }
})

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function AdminAccessControlPage() {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')

  const rows = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim())

    return ACCESS_ROWS.filter((user) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        normalizeText(`${user.id} ${user.name} ${user.email} ${user.roleName}`).includes(normalizedQuery)
      const matchesRole = role === 'all' || user.roleId === role
      const matchesStatus = status === 'all' || user.status === status

      return matchesQuery && matchesRole && matchesStatus
    })
  }, [query, role, status])

  function resetFilters() {
    setQuery('')
    setRole('all')
    setStatus('all')
  }

  return (
    <main className="admin-system-page admin-access-control-page">
      <AdminPageHeader
        eyebrow="System Admin"
        title="Phân quyền truy cập"
        subtitle="Quản lý người dùng, vai trò và phạm vi truy cập hệ thống."
        actions={<AdminButton variant="secondary">Xuất danh sách</AdminButton>}
      />

      <AdminFilterBar
        aria-label="Bộ lọc phân quyền truy cập"
        actions={
          <AdminButton variant="secondary" onClick={resetFilters}>
            Đặt lại
          </AdminButton>
        }
      >
        <AdminField className="admin-system-page__search" label="Tìm kiếm">
          <AdminSearchInput
            placeholder="Tên, email, ID hoặc vai trò..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </AdminField>
        <AdminField label="Vai trò">
          <AdminSelect
            options={ROLE_OPTIONS}
            value={role}
            onChange={(event) => setRole(event.target.value)}
          />
        </AdminField>
        <AdminField label="Trạng thái">
          <AdminSelect
            options={STATUS_OPTIONS}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          />
        </AdminField>
      </AdminFilterBar>

      <AdminCard className="admin-system-page__table-card" padding="lg">
        <AdminSectionHeader
          title="Danh sách quyền truy cập"
          subtitle={`Hiển thị ${rows.length} trong số ${ACCESS_ROWS.length} tài khoản có quyền hệ thống`}
        />

        <AdminTable
          tableClassName="admin-access-control-page__table"
          columns={[
            { key: 'user', label: 'Người dùng' },
            { key: 'role', label: 'Vai trò' },
            { key: 'status', label: 'Trạng thái' },
            { key: 'lastLogin', label: 'Đăng nhập gần nhất' },
            { key: 'modules', label: 'Phạm vi truy cập' },
          ]}
          emptyState={
            <AdminEmptyState
              title="Không có tài khoản phù hợp"
              description="Thử đổi từ khóa, vai trò hoặc trạng thái."
              action={<AdminButton variant="secondary" onClick={resetFilters}>Đặt lại</AdminButton>}
            />
          }
          rows={rows}
        >
          {rows.map((user) => {
            const statusMeta = ADMIN_USER_STATUS_META[user.status]

            return (
              <tr className="admin-ops-table__row" key={user.id}>
                <td>
                  <div className="admin-system-page__stack">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                </td>
                <td>
                  <AdminStatusBadge tone={user.roleId === 'system_admin' ? 'brand' : 'info'}>
                    {user.roleName}
                  </AdminStatusBadge>
                </td>
                <td>
                  <AdminStatusBadge tone={statusMeta.tone}>{statusMeta.label}</AdminStatusBadge>
                </td>
                <td>{user.lastLogin}</td>
                <td>
                  <div className="admin-system-page__badges">
                    {user.modules.map((moduleName) => (
                      <AdminStatusBadge key={moduleName} tone="neutral">{moduleName}</AdminStatusBadge>
                    ))}
                  </div>
                </td>
              </tr>
            )
          })}
        </AdminTable>
      </AdminCard>
    </main>
  )
}

export default AdminAccessControlPage
