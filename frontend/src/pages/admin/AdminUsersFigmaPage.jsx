import { ROLES } from '../../constants/roles.js'
import {
  ADMIN_USER_SORT_OPTIONS,
  ADMIN_USER_STATUS_OPTIONS,
} from '../../constants/adminUsers.js'
import useClickableSelectShell from '../../hooks/useClickableSelectShell.js'
import useAdminUsers from '../../hooks/useAdminUsers.js'
import {
  getAdminUserStatusMeta,
} from '../../mappers/adminUserMappers.js'

const dateFormatter = new Intl.DateTimeFormat('vi-VN')
const ROLE_OVERVIEW_CARDS = Object.freeze([
  {
    code: 'system_admin',
    helper: 'Quản trị hệ thống',
    label: 'System Admin',
    tone: 'green',
  },
  {
    code: 'admin',
    helper: 'Quản trị viên',
    label: 'Admin',
    tone: 'blue',
  },
  {
    code: 'staff',
    helper: 'Nhân viên nội bộ',
    label: 'Staff',
    tone: 'gold',
  },
  {
    code: 'customer',
    helper: 'Tài khoản khách hàng',
    label: 'Khách hàng',
    tone: 'soft',
  },
])

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M20 6v5h-5M4 18v-5h5M18.2 9A7 7 0 0 0 6.8 6.7L4 9m16 6-2.8 2.3A7 7 0 0 1 5.8 15" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.25" />
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

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="m4 20 4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />
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

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6V10Zm6 4v2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />
    </svg>
  )
}

function UnlockIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M7 10V8a5 5 0 0 1 9.2-2.7M6 10h12v10H6V10Zm6 4v2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M4 6h16v12H4V6Zm0 1 8 6 8-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />
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
  if (!value) {
    return 'Chưa cập nhật'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Chưa cập nhật'
  }

  const { day, month, year } = dateFormatter
    .formatToParts(date)
    .reduce((parts, part) => ({ ...parts, [part.type]: part.value }), {})

  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
}

function getFooterText({ pagination, resultRange, users }) {
  if (!pagination.total) {
    return 'Chưa có người dùng để hiển thị'
  }

  return `Hiển thị ${resultRange.start}-${resultRange.end} trong tổng ${pagination.total} người dùng (${users.length} dòng trang này)`
}

function UserForm({
  actionLoading,
  closeForm,
  currentRole,
  formErrors,
  formRoleOptions,
  formState,
  formValues,
  submitUserForm,
  updateFormField,
}) {
  const isEditMode = formState.mode === 'edit'
  const canEditRole = isEditMode ? currentRole === ROLES.systemAdmin : true

  return (
    <form
      className="admin-users-page__form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        submitUserForm()
      }}
    >
      <div className="admin-users-page__form-header">
        <div>
          <h2>{isEditMode ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}</h2>
          <p>{isEditMode ? 'Cập nhật hồ sơ cơ bản và vai trò nếu đủ quyền.' : 'Tạo tài khoản nội bộ; khách hàng vẫn đăng ký qua luồng public.'}</p>
        </div>
        <button disabled={actionLoading} type="button" onClick={closeForm}>
          Đóng
        </button>
      </div>

      <div className="admin-users-page__form-grid">
        <label>
          <span>Họ tên</span>
          <input
            aria-invalid={Boolean(formErrors.fullName) || undefined}
            value={formValues.fullName}
            onChange={(event) => updateFormField('fullName', event.target.value)}
          />
          {formErrors.fullName ? <em>{formErrors.fullName}</em> : null}
        </label>

        <label>
          <span>Email</span>
          <input
            aria-invalid={Boolean(formErrors.email) || undefined}
            disabled={isEditMode}
            type="email"
            value={formValues.email}
            onChange={(event) => updateFormField('email', event.target.value)}
          />
          {formErrors.email ? <em>{formErrors.email}</em> : null}
        </label>

        <label>
          <span>Số điện thoại</span>
          <input
            aria-invalid={Boolean(formErrors.phone) || undefined}
            value={formValues.phone}
            onChange={(event) => updateFormField('phone', event.target.value)}
          />
          {formErrors.phone ? <em>{formErrors.phone}</em> : null}
        </label>

        <label>
          <span>Vai trò</span>
          <select
            aria-invalid={Boolean(formErrors.roleCode) || undefined}
            disabled={!canEditRole}
            value={formValues.roleCode}
            onChange={(event) => updateFormField('roleCode', event.target.value)}
          >
            {formRoleOptions.map((option) => (
              <option disabled={option.disabled} key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {formErrors.roleCode ? <em>{formErrors.roleCode}</em> : null}
        </label>

        {!isEditMode ? (
          <label>
            <span>Mật khẩu tạm thời</span>
            <input
              aria-invalid={Boolean(formErrors.password) || undefined}
              type="password"
              value={formValues.password}
              onChange={(event) => updateFormField('password', event.target.value)}
            />
            {formErrors.password ? <em>{formErrors.password}</em> : null}
          </label>
        ) : null}
      </div>

      <div className="admin-users-page__form-actions">
        <button disabled={actionLoading} type="button" onClick={closeForm}>
          Hủy
        </button>
        <button disabled={actionLoading} type="submit">
          {actionLoading ? 'Đang lưu...' : isEditMode ? 'Lưu thay đổi' : 'Tạo tài khoản'}
        </button>
      </div>
    </form>
  )
}

function AdminUsersFigmaPage() {
  const {
    actionLoading,
    allVisibleChecked,
    canResendVerification,
    checkedUserIds,
    closeForm,
    currentRole,
    error,
    feedback,
    formErrors,
    formRoleOptions,
    formState,
    formValues,
    getStatusAction,
    loading,
    openCreateForm,
    openEditForm,
    pageNumbers,
    pagination,
    query,
    reloadUsers,
    removeUser,
    resendVerification,
    resetFilters,
    resultRange,
    roleFilter,
    roleCounts,
    roleFilterOptions,
    runStatusAction,
    selectedUser,
    selectedUserId,
    setCurrentPage,
    setQuery,
    setRoleFilter,
    setSortOrder,
    setStatusFilter,
    sortOrder,
    statusFilter,
    submitUserForm,
    toggleAllVisibleUsers,
    toggleUserChecked,
    updateFormField,
    users,
  } = useAdminUsers()
  const roleOverviewCards = ROLE_OVERVIEW_CARDS.map((card) => ({
    ...card,
    count: roleCounts[card.code] ?? 0,
  }))
  const { handlePointerDown: handleRoleSelectPointerDown, selectRef: roleSelectRef } = useClickableSelectShell(loading)
  const { handlePointerDown: handleStatusSelectPointerDown, selectRef: statusSelectRef } = useClickableSelectShell(loading)
  const { handlePointerDown: handleSortSelectPointerDown, selectRef: sortSelectRef } = useClickableSelectShell(loading)

  return (
    <main className="admin-system-page admin-users-page">
      <section className="admin-users-page__header">
        <div className="admin-users-page__header-copy">
          <h1>Quản lý Người dùng</h1>
          <p>Quản lý tài khoản khách hàng và phân quyền truy cập hệ thống.</p>
        </div>

        <div className="admin-users-page__header-actions">
          <button
            className="admin-users-page__export admin-users-page__export--primary"
            disabled={loading || actionLoading}
            type="button"
            onClick={openCreateForm}
          >
            <PlusIcon />
            <span>Thêm người dùng</span>
          </button>
          <button
            className="admin-users-page__export"
            type="button"
            onClick={() => resetFilters()}
          >
            <RefreshIcon />
            <span>Đặt lại</span>
          </button>
        </div>
      </section>

      <section className="admin-users-page__overview" aria-label="Tổng quan số lượng người dùng theo vai trò">
        {roleOverviewCards.map((card) => (
          <article className={`admin-users-page__overview-card admin-users-page__overview-card--${card.tone}`} key={card.code}>
            <span>{card.label}</span>
            <strong>{loading ? '...' : card.count}</strong>
            <p>{card.helper}</p>
          </article>
        ))}
      </section>

      {formState.isOpen ? (
        <div className="admin-users-page__modal-backdrop" onClick={closeForm}>
          <section
            className="admin-users-page__form-modal"
            role="dialog"
            aria-label={formState.mode === 'edit' ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="admin-users-page__modal-close"
              disabled={actionLoading}
              type="button"
              aria-label="Đóng popup người dùng"
              onClick={closeForm}
            >
              <CloseIcon />
            </button>
            <UserForm
              actionLoading={actionLoading}
              closeForm={closeForm}
              currentRole={currentRole}
              formErrors={formErrors}
              formRoleOptions={formRoleOptions}
              formState={formState}
              formValues={formValues}
              submitUserForm={submitUserForm}
              updateFormField={updateFormField}
            />
          </section>
        </div>
      ) : null}

      <form className="admin-users-page__toolbar" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="admin-users-page__search" htmlFor="admin-user-search">
          <span className="admin-users-page__sr-only">Tìm kiếm người dùng</span>
          <SearchIcon />
          <input
            disabled={loading}
            id="admin-user-search"
            placeholder="Tìm tên, email, số điện thoại..."
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <label className="admin-users-page__select" onPointerDown={handleRoleSelectPointerDown}>
          <span className="admin-users-page__sr-only">Vai trò</span>
          <select disabled={loading} ref={roleSelectRef} value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            {roleFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon />
        </label>

        <label className="admin-users-page__select" onPointerDown={handleStatusSelectPointerDown}>
          <span className="admin-users-page__sr-only">Trạng thái</span>
          <select disabled={loading} ref={statusSelectRef} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {ADMIN_USER_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon />
        </label>

        <label className="admin-users-page__select admin-users-page__select--sort" onPointerDown={handleSortSelectPointerDown}>
          <span className="admin-users-page__sr-only">Sắp xếp</span>
          <select disabled={loading} ref={sortSelectRef} value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
            {ADMIN_USER_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon />
        </label>
      </form>

      {error ? (
        <div className="admin-users-page__result-note admin-users-page__result-note--error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={reloadUsers}>Thử lại</button>
        </div>
      ) : null}

      {feedback ? (
        <p className="admin-users-page__result-note" role="status">
          {feedback}
        </p>
      ) : null}

      {selectedUser ? (
        <section className="admin-users-page__detail" aria-label="Chi tiết người dùng đã chọn">
          <div>
            <strong>{selectedUser.name}</strong>
            <span>{selectedUser.email}</span>
          </div>
          <div>
            <span>Vai trò: {selectedUser.roleLabel}</span>
            <span>Xác minh: {selectedUser.emailVerifiedAt ? formatDate(selectedUser.emailVerifiedAt) : 'Chưa xác minh'}</span>
            <span>Đăng nhập cuối: {formatDate(selectedUser.lastLoginAt)}</span>
          </div>
        </section>
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
                    disabled={loading || users.length === 0}
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
              {loading ? (
                <tr>
                  <td colSpan="6">
                    <div className="admin-users-page__empty" role="status">
                      <strong>Đang tải dữ liệu người dùng...</strong>
                      <span>Hệ thống đang đồng bộ với backend.</span>
                    </div>
                  </td>
                </tr>
              ) : users.length > 0 ? users.map((user) => {
                const statusMeta = getAdminUserStatusMeta(user.status)
                const statusAction = getStatusAction(user)
                const isLocked = user.status !== 'active'
                const canResend = canResendVerification(user)

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
                        <span className={isLocked ? 'admin-users-page__avatar admin-users-page__avatar--locked' : 'admin-users-page__avatar'}>
                          {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : isLocked ? <LockedUserIcon /> : user.initials}
                        </span>
                        <span className="admin-users-page__identity">
                          <strong className={isLocked ? 'admin-users-page__name admin-users-page__name--locked' : 'admin-users-page__name'}>
                            {user.name}
                          </strong>
                          <span>ID: #{user.displayId}</span>
                          <em>{user.roleLabel}</em>
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
                      <span className={`admin-users-page__status admin-users-page__status--${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </td>
                    <td>
                      <div className="admin-users-page__actions">
                        <button
                          disabled={actionLoading}
                          type="button"
                          aria-label={`Sửa ${user.name}`}
                          onClick={() => openEditForm(user)}
                        >
                          <EditIcon />
                        </button>
                        {statusAction ? (
                          <button
                            disabled={actionLoading}
                            type="button"
                            aria-label={`${statusAction.label} ${user.name}`}
                            onClick={() => runStatusAction(user)}
                          >
                            {statusAction.nextStatus === 'active' ? <UnlockIcon /> : <LockIcon />}
                          </button>
                        ) : null}
                        {canResend ? (
                          <button
                            disabled={actionLoading}
                            type="button"
                            aria-label={`Gửi lại email xác minh cho ${user.name}`}
                            onClick={() => resendVerification(user)}
                          >
                            <MailIcon />
                          </button>
                        ) : null}
                        <button
                          disabled={actionLoading}
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
                      <span>Thử đổi từ khóa, trạng thái hoặc vai trò.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <nav className="admin-users-page__pagination" aria-label="Phân trang người dùng">
        <p>{getFooterText({ pagination, resultRange, users })}</p>
        <div className="admin-users-page__page-buttons">
          <button
            type="button"
            aria-label="Quay về trước 1 trang"
            disabled={pagination.page <= 1}
            onClick={() => setCurrentPage(Math.max(1, pagination.page - 1))}
          >
            <ChevronLeftIcon />
          </button>
          {pageNumbers.map((pageNumber) => (
            <button
              aria-current={pagination.page === pageNumber ? 'page' : undefined}
              key={pageNumber}
              type="button"
              onClick={() => setCurrentPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            aria-label="Về sau 1 trang"
            disabled={pagination.page >= pagination.total_pages}
            onClick={() => setCurrentPage(Math.min(pagination.total_pages, pagination.page + 1))}
          >
            <ChevronRightIcon />
          </button>
        </div>
      </nav>
    </main>
  )
}

export default AdminUsersFigmaPage
