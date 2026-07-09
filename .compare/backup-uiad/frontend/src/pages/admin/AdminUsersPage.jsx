import { useMemo, useState } from 'react'
import {
  AdminActionIconButton,
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminField,
  AdminFilterBar,
  AdminPageHeader,
  AdminPagination,
  AdminSearchInput,
  AdminSectionHeader,
  AdminSelect,
  AdminStatusBadge,
  AdminTable,
} from '../../components/admin/ui/index.js'
import {
  ADMIN_USERS,
  ADMIN_USER_STATUS_META,
} from '../../fixtures/adminSystem.fixtures.js'

const dateFormatter = new Intl.DateTimeFormat('vi-VN')

const USER_STATUS_OPTIONS = Object.freeze([
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Hoạt động' },
  { value: 'locked', label: 'Đã khóa' },
])

const USER_TIER_OPTIONS = Object.freeze([
  { value: 'all', label: 'Tất cả hạng' },
  { value: 'VIP', label: 'VIP' },
  { value: 'standard', label: 'Thường' },
])

const USER_SORT_OPTIONS = Object.freeze([
  { value: 'newest', label: 'Mới nhất' },
  { value: 'name', label: 'Tên A-Z' },
])

function ViewIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6V10Zm6 4v2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function UnlockIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M7 10V8a5 5 0 0 1 9.2-2.7M6 10h12v10H6V10Zm6 4v2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function formatDate(value) {
  return dateFormatter.format(new Date(`${value}T00:00:00+07:00`))
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function normalizeTier(tier) {
  return tier === 'VIP' ? 'VIP' : 'standard'
}

function sortUsers(users, sortOrder) {
  return [...users].sort((firstUser, secondUser) => {
    if (sortOrder === 'name') {
      return firstUser.name.localeCompare(secondUser.name, 'vi')
    }

    return new Date(`${secondUser.joinedAt}T00:00:00+07:00`) -
      new Date(`${firstUser.joinedAt}T00:00:00+07:00`)
  })
}

function AdminUsersPage() {
  const [userItems, setUserItems] = useState(ADMIN_USERS)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [tier, setTier] = useState('all')
  const [sortOrder, setSortOrder] = useState('newest')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [feedback, setFeedback] = useState('')

  const users = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim())
    const filteredUsers = userItems.filter((user) => {
      const matchesStatus = status === 'all' || user.status === status
      const matchesTier = tier === 'all' || normalizeTier(user.tier) === tier
      const matchesQuery =
        normalizedQuery.length === 0 ||
        normalizeText(`${user.id} ${user.name} ${user.email} ${user.phone}`).includes(normalizedQuery)

      return matchesStatus && matchesTier && matchesQuery
    })

    return sortUsers(filteredUsers, sortOrder)
  }, [query, sortOrder, status, tier, userItems])

  function resetFilters() {
    setQuery('')
    setStatus('all')
    setTier('all')
    setSortOrder('newest')
  }

  function updateUserStatus(user) {
    const nextStatus = user.status === 'locked' ? 'active' : 'locked'

    setUserItems((currentUsers) =>
      currentUsers.map((currentUser) =>
        currentUser.id === user.id
          ? { ...currentUser, status: nextStatus }
          : currentUser,
      ),
    )
    setSelectedUserId(user.id)
    setFeedback(nextStatus === 'locked'
      ? `Đã khóa tài khoản ${user.name}.`
      : `Đã mở khóa tài khoản ${user.name}.`)
  }

  return (
    <main className="admin-system-page admin-users-page">
      <AdminPageHeader
        eyebrow="Tài khoản"
        title="Quản lý Người dùng"
        subtitle="Quản lý tài khoản khách hàng và phân quyền truy cập hệ thống."
        actions={<AdminButton variant="secondary" onClick={() => setFeedback('Đã chuẩn bị dữ liệu người dùng để xuất file.')}>Xuất dữ liệu</AdminButton>}
      />

      <AdminFilterBar
        aria-label="Bộ lọc người dùng"
        actions={
          <AdminButton variant="secondary" onClick={resetFilters}>
            Đặt lại
          </AdminButton>
        }
      >
        <AdminField className="admin-system-page__search" label="Tìm kiếm">
          <AdminSearchInput
            placeholder="Tìm tên, email, số điện thoại, ID..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </AdminField>
        <AdminField label="Trạng thái">
          <AdminSelect
            options={USER_STATUS_OPTIONS}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          />
        </AdminField>
        <AdminField label="Hạng khách">
          <AdminSelect
            options={USER_TIER_OPTIONS}
            value={tier}
            onChange={(event) => setTier(event.target.value)}
          />
        </AdminField>
        <AdminField label="Sắp xếp">
          <AdminSelect
            options={USER_SORT_OPTIONS}
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          />
        </AdminField>
      </AdminFilterBar>

      {feedback ? (
        <p className="admin-ops-page__result-note" role="status">
          {feedback}
        </p>
      ) : null}

      <AdminCard className="admin-system-page__table-card" padding="lg">
        <AdminSectionHeader
          title="Danh sách Người dùng"
          subtitle={`Hiển thị ${users.length} trong số ${userItems.length} tài khoản`}
        />
        <AdminTable
          tableClassName="admin-users-page__table"
          columns={[
            { key: 'user', label: 'Người dùng' },
            { key: 'email', label: 'Email' },
            { key: 'joined', label: 'Ngày đăng ký' },
            { key: 'status', label: 'Trạng thái' },
            { key: 'action', label: 'Thao tác' },
          ]}
          emptyState={
            <AdminEmptyState
              title="Không có người dùng phù hợp"
              description="Thử đổi trạng thái, hạng khách hoặc từ khóa tìm kiếm."
              action={
                <AdminButton variant="secondary" onClick={resetFilters}>
                  Đặt lại bộ lọc
                </AdminButton>
              }
            />
          }
          rows={users}
        >
          {users.map((user) => {
            const statusMeta = ADMIN_USER_STATUS_META[user.status]
            const isLocked = user.status === 'locked'

            return (
              <tr
                className={
                  user.id === selectedUserId
                    ? 'admin-ops-table__row admin-ops-table__row--selected'
                    : 'admin-ops-table__row'
                }
                key={user.id}
              >
                <td>
                  <div className="admin-system-page__stack">
                    <strong>{user.name}</strong>
                    <span>ID: #{user.id}</span>
                  </div>
                </td>
                <td>
                  <div className="admin-system-page__stack">
                    <strong>{user.email}</strong>
                    <span>{user.phone}</span>
                  </div>
                </td>
                <td>{formatDate(user.joinedAt)}</td>
                <td>
                  <div className="admin-system-page__badges">
                    <AdminStatusBadge tone={statusMeta.tone}>{statusMeta.label}</AdminStatusBadge>
                    {user.tier === 'VIP' ? <AdminStatusBadge tone="brand">VIP</AdminStatusBadge> : null}
                  </div>
                </td>
                <td>
                  <div className="admin-system-page__actions">
                    <AdminActionIconButton
                      label={`Xem chi tiết ${user.name}`}
                      variant="secondary"
                      onClick={() => {
                        setSelectedUserId(user.id)
                        setFeedback(`Đang xem nhanh tài khoản ${user.name}.`)
                      }}
                    >
                      <ViewIcon />
                    </AdminActionIconButton>
                    <AdminActionIconButton
                      label={isLocked ? `Mở khóa ${user.name}` : `Khóa ${user.name}`}
                      variant={isLocked ? 'secondary' : 'ghost'}
                      onClick={() => updateUserStatus(user)}
                    >
                      {isLocked ? <UnlockIcon /> : <LockIcon />}
                    </AdminActionIconButton>
                  </div>
                </td>
              </tr>
            )
          })}
        </AdminTable>
        <div className="admin-system-page__footer">
          <p>Hiển thị {users.length} trong số {userItems.length} người dùng</p>
          <AdminPagination currentPage={1} pages={[1, 2, 3]} totalPages={3} />
        </div>
      </AdminCard>
    </main>
  )
}

export default AdminUsersPage
