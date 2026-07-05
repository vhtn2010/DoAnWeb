import { useMemo, useState } from 'react'
import avatarVanHai from '../../assets/admin-users/avatar-van-hai.png'
import avatarYenNhi from '../../assets/admin-users/avatar-yen-nhi.png'

const dateFormatter = new Intl.DateTimeFormat('vi-VN')
const FIGMA_TOTAL_USERS = 248

const ADMIN_USERS = Object.freeze([
  {
    id: 'ND-8492',
    email: 'yennhi.nguyen@email.com',
    joinedAt: '2025-05-12',
    name: 'Nguyễn Trần Yến Nhi',
    phone: '+84 987 654 321',
    status: 'active',
    tier: 'VIP',
  },
  {
    id: 'ND-7731',
    email: 'tvhai.business@email.com',
    joinedAt: '2024-11-03',
    name: 'Trần Văn Hải',
    phone: '+84 901 234 567',
    status: 'active',
    tier: 'Thường',
  },
  {
    id: 'ND-9102',
    email: 'nam.lh99@email.com',
    joinedAt: '2024-01-22',
    name: 'Lê Hoàng Nam',
    phone: '+84 933 445 566',
    status: 'locked',
    tier: 'Thường',
  },
])

const ADMIN_USER_STATUS_META = Object.freeze({
  active: { label: 'Hoạt động' },
  locked: { label: 'Đã khóa' },
})

const USER_STATUS_OPTIONS = Object.freeze([
  { value: 'all', label: 'Tất cả Trạng thái' },
  { value: 'active', label: 'Hoạt động' },
  { value: 'locked', label: 'Đã khóa' },
])

const USER_SORT_OPTIONS = Object.freeze([
  { value: 'newest', label: 'Mới nhất' },
  { value: 'name', label: 'Tên A-Z' },
])

const USER_AVATARS = Object.freeze({
  'ND-8492': avatarYenNhi,
  'ND-7731': avatarVanHai,
})

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v3h16v-3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M4 6h16M7 12h10M10 18h4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
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
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="m4 20 4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />
    </svg>
  )
}

function LockedUserIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M7 12a5 5 0 0 1 7.4-4.4M9 18h6m-7-2.5a6 6 0 0 0 8 0M4 4l16 16" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}

function formatDate(value) {
  const { day, month, year } = dateFormatter
    .formatToParts(new Date(`${value}T00:00:00+07:00`))
    .reduce((parts, part) => ({ ...parts, [part.type]: part.value }), {})

  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
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

function splitUserId(id) {
  const [prefix, number] = id.split('-')

  return { prefix, number }
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

function AdminUsersFigmaPage() {
  const [userItems, setUserItems] = useState(ADMIN_USERS)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [tier, setTier] = useState('all')
  const [sortOrder, setSortOrder] = useState('newest')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [checkedUserIds, setCheckedUserIds] = useState([])
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

  const allVisibleChecked = users.length > 0 && users.every((user) => checkedUserIds.includes(user.id))

  function toggleAdvancedFilter() {
    const nextTier = tier === 'VIP' ? 'all' : 'VIP'

    setTier(nextTier)
    setFeedback(nextTier === 'VIP' ? 'Đang lọc nhóm khách VIP.' : 'Đã bỏ lọc nâng cao.')
  }

  function toggleAllVisibleUsers() {
    if (allVisibleChecked) {
      setCheckedUserIds((currentIds) => currentIds.filter((id) => !users.some((user) => user.id === id)))
      return
    }

    setCheckedUserIds((currentIds) => Array.from(new Set([
      ...currentIds,
      ...users.map((user) => user.id),
    ])))
  }

  function toggleUserChecked(userId) {
    setCheckedUserIds((currentIds) =>
      currentIds.includes(userId)
        ? currentIds.filter((id) => id !== userId)
        : [...currentIds, userId],
    )
  }

  function removeUser(user) {
    setUserItems((currentUsers) => currentUsers.filter((currentUser) => currentUser.id !== user.id))
    setCheckedUserIds((currentIds) => currentIds.filter((id) => id !== user.id))
    setSelectedUserId('')
    setFeedback(`Đã xóa tài khoản ${user.name} khỏi danh sách hiển thị.`)
  }

  return (
    <main className="admin-system-page admin-users-page">
      <section className="admin-users-page__header">
        <div className="admin-users-page__header-copy">
          <h1>Quản lý Người dùng</h1>
          <p>Quản lý tài khoản khách hàng và phân quyền truy cập hệ thống.</p>
        </div>

        <button
          className="admin-users-page__export"
          type="button"
          onClick={() => setFeedback('Đã chuẩn bị dữ liệu người dùng để xuất file.')}
        >
          <DownloadIcon />
          <span>Xuất dữ liệu</span>
        </button>
      </section>

      <form className="admin-users-page__toolbar" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="admin-users-page__search" htmlFor="admin-user-search">
          <span className="admin-users-page__sr-only">Tìm kiếm người dùng</span>
          <SearchIcon />
          <input
            id="admin-user-search"
            placeholder="Tìm tên, email, sđt..."
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <button
          className="admin-users-page__filter-button"
          type="button"
          aria-pressed={tier === 'VIP'}
          onClick={toggleAdvancedFilter}
        >
          <FilterIcon />
          <span>Lọc nâng cao</span>
        </button>

        <label className="admin-users-page__select">
          <span className="admin-users-page__sr-only">Trạng thái</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {USER_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon />
        </label>

        <label className="admin-users-page__select admin-users-page__select--sort">
          <span className="admin-users-page__sr-only">Sắp xếp</span>
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
            {USER_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon />
        </label>
      </form>

      {feedback ? (
        <p className="admin-users-page__result-note" role="status">
          {feedback}
        </p>
      ) : null}

      <section className="admin-users-page__table-shell" aria-label="Danh sách người dùng">
        <div className="admin-users-page__table-scroll">
          <table className="admin-users-page__table">
            <thead>
              <tr>
                <th scope="col" className="admin-users-page__checkbox-cell">
                  <input
                    aria-label="Chọn tất cả người dùng đang hiển thị"
                    checked={allVisibleChecked}
                    type="checkbox"
                    onChange={toggleAllVisibleUsers}
                  />
                </th>
                <th scope="col">Người dùng</th>
                <th scope="col">Email</th>
                <th scope="col">Ngày đăng ký</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? users.map((user) => {
                const statusMeta = ADMIN_USER_STATUS_META[user.status]
                const idParts = splitUserId(user.id)
                const avatar = USER_AVATARS[user.id]

                return (
                  <tr
                    className={selectedUserId === user.id ? 'admin-users-page__row admin-users-page__row--selected' : 'admin-users-page__row'}
                    key={user.id}
                  >
                    <td className="admin-users-page__checkbox-cell">
                      <input
                        aria-label={`Chọn ${user.name}`}
                        checked={checkedUserIds.includes(user.id)}
                        type="checkbox"
                        onChange={() => toggleUserChecked(user.id)}
                      />
                    </td>
                    <td>
                      <div className="admin-users-page__user">
                        <span className={user.status === 'locked' ? 'admin-users-page__avatar admin-users-page__avatar--locked' : 'admin-users-page__avatar'}>
                          {avatar ? <img src={avatar} alt="" /> : <LockedUserIcon />}
                        </span>
                        <span className="admin-users-page__identity">
                          <strong className={user.status === 'locked' ? 'admin-users-page__name admin-users-page__name--locked' : 'admin-users-page__name'}>
                            {user.name}
                          </strong>
                          <span>ID: #{idParts.prefix}-<br />{idParts.number}</span>
                          {user.tier === 'VIP' ? <em>VIP</em> : null}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-users-page__contact">
                        <span>{user.email}</span>
                        <strong>{user.phone}</strong>
                      </div>
                    </td>
                    <td>{formatDate(user.joinedAt)}</td>
                    <td>
                      <span className={`admin-users-page__status admin-users-page__status--${user.status}`}>
                        {statusMeta.label}
                      </span>
                    </td>
                    <td>
                      <div className="admin-users-page__actions">
                        <button
                          type="button"
                          aria-label={`Xem chi tiết ${user.name}`}
                          onClick={() => {
                            setSelectedUserId(user.id)
                            setFeedback(`Đang xem nhanh tài khoản ${user.name}.`)
                          }}
                        >
                          <ViewIcon />
                        </button>
                        <button
                          type="button"
                          aria-label={`Sửa ${user.name}`}
                          onClick={() => {
                            setSelectedUserId(user.id)
                            setFeedback(`Đang mở chế độ chỉnh sửa ${user.name}.`)
                          }}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          aria-label={`Xóa ${user.name}`}
                          onClick={() => removeUser(user)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan="6">
                    <div className="admin-users-page__empty" role="status">
                      <strong>Không có người dùng phù hợp</strong>
                      <span>Thử đổi từ khóa, trạng thái hoặc bộ lọc nâng cao.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <nav className="admin-users-page__pagination" aria-label="Phân trang người dùng">
        <p>Hiển thị {users.length} trong số {FIGMA_TOTAL_USERS} người dùng</p>
        <div className="admin-users-page__page-buttons">
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
    </main>
  )
}

export default AdminUsersFigmaPage
