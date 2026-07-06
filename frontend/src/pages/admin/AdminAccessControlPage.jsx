import useAdminAccessControl from '../../hooks/useAdminAccessControl.js'

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M20 6v5h-5M4 18v-5h5M18.2 9A7 7 0 0 0 6.8 6.7L4 9m16 6-2.8 2.3A7 7 0 0 1 5.8 15" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />
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

function getRoleTone(role) {
  if (role.code === 'system_admin') {
    return 'green'
  }

  if (role.code === 'admin') {
    return 'blue'
  }

  return 'gold'
}

function getRoleStatus(role) {
  if (role.isProtected) {
    return {
      className: 'locked',
      label: 'Bảo vệ',
    }
  }

  if (role.isSystemRole) {
    return {
      className: 'active',
      label: 'Hệ thống',
    }
  }

  return {
    className: 'custom',
    label: 'Tùy chỉnh',
  }
}

function AdminAccessControlPage() {
  const {
    actionLoading,
    countRolePermissionsForModule,
    error,
    feedback,
    filteredRoles,
    isDirty,
    loading,
    moduleFilter,
    moduleOptions,
    originalPermissionSet,
    permissionGroups,
    reloadAccessControl,
    resetFilters,
    resetSelectedRolePermissions,
    roleFilter,
    roleOptions,
    roles,
    saveSelectedRolePermissions,
    selectRole,
    selectedPermissionSet,
    selectedRole,
    setModuleFilter,
    setRoleFilter,
    togglePermission,
    totalFilteredPermissions,
  } = useAdminAccessControl()

  const isBusy = loading || actionLoading
  const canResetFilters = roleFilter !== 'all' || moduleFilter !== 'all'
  const canEditSelectedRole = Boolean(selectedRole) && !selectedRole.isProtected

  return (
    <main className="admin-system-page admin-access-control-page">
      <section className="admin-access-control-page__header">
        <div className="admin-access-control-page__header-copy">
          <h1>Phân quyền truy cập</h1>
          <p>Quản lý role và permission cho Admin, Staff trong hệ thống.</p>
        </div>

        <button
          className="admin-access-control-page__export"
          disabled={isBusy}
          type="button"
          onClick={reloadAccessControl}
        >
          <RefreshIcon />
          <span>Tải lại</span>
        </button>
      </section>

      <form
        className="admin-access-control-page__filters"
        aria-label="Bộ lọc phân quyền truy cập"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="admin-access-control-page__select">
          <span className="admin-access-control-page__sr-only">Vai trò</span>
          <select disabled={isBusy} value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon />
        </label>

        <label className="admin-access-control-page__select">
          <span className="admin-access-control-page__sr-only">Module</span>
          <select disabled={isBusy} value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
            {moduleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon />
        </label>

        {canResetFilters ? (
          <button className="admin-access-control-page__reset" disabled={isBusy} type="button" onClick={resetFilters}>
            Đặt lại
          </button>
        ) : null}
      </form>

      {feedback.message ? (
        <p
          className={`admin-access-control-page__feedback admin-access-control-page__feedback--${feedback.tone}`}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      ) : null}

      <section className="admin-access-control-page__workspace">
        <section className="admin-access-control-page__table-card" aria-label="Danh sách vai trò">
          <div className="admin-access-control-page__table-scroll">
            <table className="admin-access-control-page__table">
              <thead>
                <tr>
                  <th scope="col">Vai trò</th>
                  <th scope="col">Cấp</th>
                  <th scope="col">Quyền hạn</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5">
                      <div className="admin-access-control-page__empty" role="status">
                        <strong>Đang tải dữ liệu RBAC...</strong>
                        <span>Hệ thống đang lấy roles và permissions từ backend.</span>
                      </div>
                    </td>
                  </tr>
                ) : null}

                {!loading && error ? (
                  <tr>
                    <td colSpan="5">
                      <div className="admin-access-control-page__empty" role="alert">
                        <strong>Không thể tải phân quyền</strong>
                        <span>{error}</span>
                      </div>
                    </td>
                  </tr>
                ) : null}

                {!loading && !error && filteredRoles.length > 0 ? filteredRoles.map((role) => {
                  const status = getRoleStatus(role)
                  const rolePermissionCount = countRolePermissionsForModule(role)

                  return (
                    <tr
                      className={selectedRole?.id === role.id ? 'admin-access-control-page__row--selected' : undefined}
                      key={role.id}
                    >
                      <td>
                        <button
                          className="admin-access-control-page__identity admin-access-control-page__permission-button"
                          type="button"
                          onClick={() => selectRole(role)}
                        >
                          <span className={`admin-access-control-page__avatar admin-access-control-page__avatar--${getRoleTone(role)}`}>
                            {role.initials}
                          </span>
                          <span className="admin-access-control-page__person">
                            <strong>{role.name}</strong>
                            <span>{role.code}</span>
                          </span>
                        </button>
                      </td>
                      <td>{role.level}</td>
                      <td>
                        <span className="admin-access-control-page__permission">
                          {rolePermissionCount}/{totalFilteredPermissions} permission
                        </span>
                      </td>
                      <td>
                        <span className={`admin-access-control-page__status admin-access-control-page__status--${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <div className="admin-access-control-page__actions">
                          <button
                            disabled={isBusy}
                            type="button"
                            aria-label={`Xem quyền của ${role.name}`}
                            onClick={() => selectRole(role)}
                          >
                            <ViewIcon />
                          </button>
                          <button
                            disabled={isBusy}
                            type="button"
                            aria-label={`Chỉnh quyền của ${role.name}`}
                            onClick={() => selectRole(role)}
                          >
                            <EditIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }) : null}

                {!loading && !error && filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan="5">
                      <div className="admin-access-control-page__empty" role="status">
                        <strong>Không có vai trò phù hợp</strong>
                        <span>Thử đổi bộ lọc vai trò hoặc module để xem dữ liệu phân quyền.</span>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="admin-access-control-page__pagination" aria-label="Tổng quan phân quyền">
            <p>
              Hiển thị {filteredRoles.length} trong số {roles.length} vai trò; {totalFilteredPermissions} permission trong phạm vi đang xem.
            </p>
          </div>
        </section>

        <aside className="admin-access-control-page__role-detail" aria-label="Chi tiết phân quyền vai trò">
          {selectedRole ? (
            <>
              <div className="admin-access-control-page__detail-header">
                <div>
                  <p>Vai trò đang chọn</p>
                  <h2>{selectedRole.name}</h2>
                  <span>{selectedRole.description || 'Chưa có mô tả vai trò.'}</span>
                </div>
                <span className={`admin-access-control-page__status admin-access-control-page__status--${getRoleStatus(selectedRole).className}`}>
                  {getRoleStatus(selectedRole).label}
                </span>
              </div>

              <dl className="admin-access-control-page__detail-metrics">
                <div>
                  <dt>Mã role</dt>
                  <dd>{selectedRole.code}</dd>
                </div>
                <div>
                  <dt>Cấp</dt>
                  <dd>{selectedRole.level}</dd>
                </div>
                <div>
                  <dt>Quyền</dt>
                  <dd>{selectedPermissionSet.size}</dd>
                </div>
              </dl>

              {selectedRole.isProtected ? (
                <p className="admin-access-control-page__locked-note">
                  System Admin được bảo vệ, backend không cho cập nhật permission trong MVP.
                </p>
              ) : null}

              <div className="admin-access-control-page__permission-panel">
                {permissionGroups.length > 0 ? permissionGroups.map((group) => (
                  <section className="admin-access-control-page__permission-group" key={group.module}>
                    <h3>{group.label}</h3>
                    {group.resources.map((resource) => (
                      <div className="admin-access-control-page__permission-resource" key={`${group.module}:${resource.resource}`}>
                        <strong>{resource.resource}</strong>
                        <div className="admin-access-control-page__permission-grid">
                          {resource.permissions.map((permission) => {
                            const isChecked = selectedPermissionSet.has(permission.code)
                            const wasChecked = originalPermissionSet.has(permission.code)

                            return (
                              <label
                                className={wasChecked ? 'admin-access-control-page__permission-check admin-access-control-page__permission-check--original' : 'admin-access-control-page__permission-check'}
                                key={permission.code}
                              >
                                <input
                                  checked={isChecked}
                                  disabled={!canEditSelectedRole || isBusy}
                                  type="checkbox"
                                  onChange={() => togglePermission(permission.code)}
                                />
                                <span>
                                  <strong>{permission.code}</strong>
                                  <small>{permission.description || `${permission.resource}.${permission.action}`}</small>
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </section>
                )) : (
                  <div className="admin-access-control-page__empty" role="status">
                    <strong>Không có permission trong module này</strong>
                    <span>Thử đổi bộ lọc module để xem nhóm permission khác.</span>
                  </div>
                )}
              </div>

              <div className="admin-access-control-page__detail-actions">
                <button disabled={!isDirty || isBusy} type="button" onClick={resetSelectedRolePermissions}>
                  Hoàn tác
                </button>
                <button disabled={!canEditSelectedRole || !isDirty || isBusy} type="button" onClick={saveSelectedRolePermissions}>
                  {actionLoading ? 'Đang lưu...' : 'Lưu phân quyền'}
                </button>
              </div>
            </>
          ) : (
            <div className="admin-access-control-page__empty" role="status">
              <strong>Chưa chọn vai trò</strong>
              <span>Chọn một role trong bảng để xem và chỉnh permission.</span>
            </div>
          )}
        </aside>
      </section>
    </main>
  )
}

export default AdminAccessControlPage
