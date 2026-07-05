import { useMemo, useState } from 'react'

const ACCESS_TOTAL = 24

const STATUS_OPTIONS = Object.freeze([
  { value: 'all', label: 'Tất cả Trạng thái' },
  { value: 'active', label: 'Hoạt động' },
  { value: 'locked', label: 'Đã khóa' },
])

const ROLE_OPTIONS = Object.freeze([
  { value: 'all', label: 'Tất cả Vai trò' },
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Admin' },
  { value: 'system_admin', label: 'System Admin' },
])

const STATUS_META = Object.freeze({
  active: { label: 'Hoạt động', tone: 'active' },
  locked: { label: 'Đã khóa', tone: 'locked' },
})

const ACCESS_ROWS = Object.freeze([
  {
    email: 'truong.nv@netviet.com',
    id: 'AC-001',
    initials: 'NT',
    name: 'Nguyễn Văn Trường',
    permission: 'Quyền tài khoản Staff',
    roleId: 'staff',
    roleName: 'Staff',
    status: 'active',
    tone: 'gold',
  },
  {
    email: 'thiadmin@netviet.com',
    id: 'AC-002',
    initials: 'NT',
    name: 'Nguyễn Thị',
    permission: 'Quyền tài khoản Admin',
    roleId: 'admin',
    roleName: 'Admin',
    status: 'active',
    tone: 'blue',
  },
  {
    email: 'alevanadmin@netviet.com',
    id: 'AC-003',
    initials: 'LA',
    name: 'Lê Văn A',
    permission: 'Toàn quyền',
    roleId: 'admin',
    roleName: 'Admin',
    status: 'active',
    tone: 'green',
  },
])

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 18v3h16v-3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="m15 18-6-6 6-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="m9 18 6-6-6-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />
    </svg>
  )
}

function ViewIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="m4 20 4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  )
}

function AdminAccessControlPage() {
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [feedback, setFeedback] = useState('')

  const rows = useMemo(() => {
    return ACCESS_ROWS.filter((user) => {
      const matchesRole = role === 'all' || user.roleId === role
      const matchesStatus = status === 'all' || user.status === status

      return matchesRole && matchesStatus
    })
  }, [role, status])

  function resetFilters() {
    setRole('all')
    setStatus('all')
    setFeedback('Đã đặt lại bộ lọc phân quyền.')
  }

  return (
    <main className="admin-system-page admin-access-control-page">
      <section className="admin-access-control-page__header">
        <div className="admin-access-control-page__header-copy">
          <h1>Phân quyền truy cập</h1>
          <p>Quản lý và phân bổ quyền hạn cho Admin và Staff trong hệ thống.</p>
        </div>

        <button
          className="admin-access-control-page__export"
          type="button"
          onClick={() => setFeedback('Đã chuẩn bị dữ liệu phân quyền để xuất Excel.')}
        >
          <DownloadIcon />
          <span>Xuất Excel</span>
        </button>
      </section>

      <form
        className="admin-access-control-page__filters"
        aria-label="Bộ lọc phân quyền truy cập"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="admin-access-control-page__select">
          <span className="admin-access-control-page__sr-only">Vai trò</span>
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon />
        </label>

        <label className="admin-access-control-page__select">
          <span className="admin-access-control-page__sr-only">Trạng thái</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon />
        </label>

        {(role !== 'all' || status !== 'all') ? (
          <button className="admin-access-control-page__reset" type="button" onClick={resetFilters}>
            Đặt lại
          </button>
        ) : null}
      </form>

      {feedback ? (
        <p className="admin-access-control-page__feedback" role="status">
          {feedback}
        </p>
      ) : null}

      <section className="admin-access-control-page__table-card" aria-label="Danh sách quyền truy cập">
        <div className="admin-access-control-page__table-scroll">
          <table className="admin-access-control-page__table">
            <thead>
              <tr>
                <th scope="col">TÊN / EMAIL</th>
                <th scope="col">Vai trò</th>
                <th scope="col">QUYỀN HẠN</th>
                <th scope="col">TRẠNG THÁI</th>
                <th scope="col">THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? rows.map((user) => {
                const statusMeta = STATUS_META[user.status]

                return (
                  <tr key={user.id}>
                    <td>
                      <div className="admin-access-control-page__identity">
                        <span className={`admin-access-control-page__avatar admin-access-control-page__avatar--${user.tone}`}>
                          {user.initials}
                        </span>
                        <span className="admin-access-control-page__person">
                          <strong>{user.name}</strong>
                          <span>{user.email}</span>
                        </span>
                      </div>
                    </td>
                    <td>{user.roleName}</td>
                    <td>
                      <span className="admin-access-control-page__permission">
                        {user.permission}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-access-control-page__status admin-access-control-page__status--${statusMeta.tone}`}>
                        {statusMeta.label}
                      </span>
                    </td>
                    <td>
                      <div className="admin-access-control-page__actions">
                        <button
                          type="button"
                          aria-label={`Xem quyền của ${user.name}`}
                          onClick={() => setFeedback(`Đang xem nhanh quyền của ${user.name}.`)}
                        >
                          <ViewIcon />
                        </button>
                        <button
                          type="button"
                          aria-label={`Sửa quyền của ${user.name}`}
                          onClick={() => setFeedback(`Đang mở chế độ chỉnh quyền cho ${user.name}.`)}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          aria-label={`Xóa quyền của ${user.name}`}
                          onClick={() => setFeedback(`Cần xác nhận trước khi xóa quyền của ${user.name}.`)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan="5">
                    <div className="admin-access-control-page__empty" role="status">
                      <strong>Không có tài khoản phù hợp</strong>
                      <span>Thử đổi vai trò hoặc trạng thái để xem dữ liệu phân quyền.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <nav className="admin-access-control-page__pagination" aria-label="Phân trang quyền truy cập">
          <p>Hiển thị 1 đến {rows.length} của {ACCESS_TOTAL} kết quả</p>
          <div className="admin-access-control-page__page-buttons">
            <button type="button" aria-label="Quay về trước 1 trang" disabled>
              <ChevronLeftIcon />
            </button>
            <button type="button" aria-current="page">1</button>
            <button type="button">2</button>
            <button type="button">3</button>
            <button type="button" aria-label="Về sau 1 trang">
              <ChevronRightIcon />
            </button>
          </div>
        </nav>
      </section>
    </main>
  )
}

export default AdminAccessControlPage
