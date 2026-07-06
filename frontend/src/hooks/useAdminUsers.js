import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ROLES } from '../constants/roles.js'
import {
  ADMIN_USER_DEFAULT_DELETE_REASON,
  ADMIN_USER_DEFAULT_LOCK_REASON,
  ADMIN_USER_PAGE_SIZE,
  ADMIN_USER_STATUSES,
} from '../constants/adminUsers.js'
import {
  buildAdminUserCreatePayload,
  buildAdminUserUpdatePayload,
  canResendAdminUserVerification,
  createAdminUserPageNumbers,
  createInitialAdminUserFormValues,
  getAdminUserCreateRoleOptions,
  getAdminUserEditRoleOptions,
  getAdminUserRoleFilterOptions,
  getAdminUserStatusAction,
  mapAdminUser,
  matchesAdminUserSearch,
  sortAdminUsers,
  validateAdminUserForm,
} from '../mappers/adminUserMappers.js'
import {
  changeAdminUserRole,
  changeAdminUserStatus,
  createAdminUser,
  deleteAdminUser,
  getAdminUserDetail,
  listAdminUsers,
  resendAdminUserVerificationEmail,
  updateAdminUser,
} from '../repositories/adminUserRepository.js'
import { normalizeAdminRole } from '../utils/rolePermissions.js'

function createInitialPaginationState() {
  return {
    has_next: false,
    limit: ADMIN_USER_PAGE_SIZE,
    page: 1,
    total: 0,
    total_pages: 0,
  }
}

function createClosedFormState() {
  return {
    isOpen: false,
    mode: 'create',
    user: null,
  }
}

function getStatusReason(status) {
  if (status === ADMIN_USER_STATUSES.locked) {
    return ADMIN_USER_DEFAULT_LOCK_REASON
  }

  if (status === ADMIN_USER_STATUSES.deleted) {
    return ADMIN_USER_DEFAULT_DELETE_REASON
  }

  return undefined
}

export default function useAdminUsers() {
  const outletContext = useOutletContext()
  const currentRole = normalizeAdminRole(outletContext?.currentRole, 'guest')
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [statusFilter, setStatusFilterState] = useState(ADMIN_USER_STATUSES.all)
  const [roleFilter, setRoleFilterState] = useState('all')
  const [sortOrder, setSortOrder] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState(() => createInitialPaginationState())
  const [selectedUserId, setSelectedUserId] = useState('')
  const [checkedUserIds, setCheckedUserIds] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [formState, setFormState] = useState(() => createClosedFormState())
  const [formValues, setFormValues] = useState(() =>
    createInitialAdminUserFormValues({ currentRole }),
  )
  const [formErrors, setFormErrors] = useState({})

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query)
      setCurrentPage(1)
    }, 300)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [query])

  async function loadUsers({
    nextPage = currentPage,
    nextQuery = debouncedQuery,
    nextRole = roleFilter,
    nextStatus = statusFilter,
  } = {}) {
    setLoading(true)
    setError('')

    try {
      const response = await listAdminUsers({
        limit: ADMIN_USER_PAGE_SIZE,
        page: nextPage,
        q: nextQuery,
        role: nextRole,
        status: nextStatus,
      })

      if (!response.success) {
        throw new Error(response.message || 'Không thể tải danh sách người dùng.')
      }

      setUsers(Array.isArray(response.data) ? response.data.map((user) => mapAdminUser(user)) : [])
      setPagination(response.meta ?? createInitialPaginationState())

      if ((response.meta?.page ?? nextPage) !== currentPage) {
        setCurrentPage(response.meta?.page ?? 1)
      }
    } catch (loadError) {
      setUsers([])
      setPagination(createInitialPaginationState())
      setError(loadError?.message ?? 'Không thể tải dữ liệu người dùng lúc này.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isActive = true

    async function loadVisibleUsers() {
      setLoading(true)
      setError('')

      try {
        const response = await listAdminUsers({
          limit: ADMIN_USER_PAGE_SIZE,
          page: currentPage,
          q: debouncedQuery,
          role: roleFilter,
          status: statusFilter,
        })

        if (!isActive) {
          return
        }

        if (!response.success) {
          throw new Error(response.message || 'Không thể tải danh sách người dùng.')
        }

        setUsers(Array.isArray(response.data) ? response.data.map((user) => mapAdminUser(user)) : [])
        setPagination(response.meta ?? createInitialPaginationState())

        if ((response.meta?.page ?? currentPage) !== currentPage) {
          setCurrentPage(response.meta?.page ?? 1)
        }
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setUsers([])
        setPagination(createInitialPaginationState())
        setError(loadError?.message ?? 'Không thể tải dữ liệu người dùng lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadVisibleUsers()

    return () => {
      isActive = false
    }
  }, [currentPage, debouncedQuery, reloadKey, roleFilter, statusFilter])

  function setStatusFilter(value) {
    setStatusFilterState(value)
    setCurrentPage(1)
  }

  function setRoleFilter(value) {
    setRoleFilterState(value)
    setCurrentPage(1)
  }

  function resetFilters() {
    setQuery('')
    setDebouncedQuery('')
    setRoleFilterState('all')
    setStatusFilterState(ADMIN_USER_STATUSES.all)
    setSortOrder('newest')
    setCurrentPage(1)
  }

  function reloadUsers() {
    setReloadKey((currentKey) => currentKey + 1)
  }

  function toggleAllVisibleUsers() {
    if (visibleUsers.length > 0 && visibleUsers.every((user) => checkedUserIds.includes(user.id))) {
      setCheckedUserIds((currentIds) =>
        currentIds.filter((id) => !visibleUsers.some((user) => user.id === id)),
      )
      return
    }

    setCheckedUserIds((currentIds) =>
      Array.from(new Set([
        ...currentIds,
        ...visibleUsers.map((user) => user.id),
      ])),
    )
  }

  function toggleUserChecked(userId) {
    setCheckedUserIds((currentIds) =>
      currentIds.includes(userId)
        ? currentIds.filter((id) => id !== userId)
        : [...currentIds, userId],
    )
  }

  async function loadUserDetail(user) {
    if (!user?.id) {
      return null
    }

    const response = await getAdminUserDetail(user.id)

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Không thể tải chi tiết người dùng.')
    }

    return mapAdminUser(response.data)
  }

  async function viewUser(user) {
    setActionLoading(true)
    setError('')

    try {
      const detail = await loadUserDetail(user)

      setSelectedUser(detail)
      setSelectedUserId(detail.id)
      setFeedback(`Đã tải chi tiết tài khoản ${detail.name}.`)
    } catch (viewError) {
      const nextMessage = viewError?.message ?? 'Không thể tải chi tiết người dùng lúc này.'

      setError(nextMessage)
      setFeedback(nextMessage)
    } finally {
      setActionLoading(false)
    }
  }

  function openCreateForm() {
    setFormState({
      isOpen: true,
      mode: 'create',
      user: null,
    })
    setFormValues(createInitialAdminUserFormValues({ currentRole }))
    setFormErrors({})
    setFeedback('')
  }

  async function openEditForm(user) {
    setActionLoading(true)
    setError('')

    try {
      const detail = await loadUserDetail(user)

      setSelectedUser(detail)
      setSelectedUserId(detail.id)
      setFormState({
        isOpen: true,
        mode: 'edit',
        user: detail,
      })
      setFormValues(createInitialAdminUserFormValues({
        currentRole,
        mode: 'edit',
        user: detail,
      }))
      setFormErrors({})
      setFeedback('')
    } catch (loadError) {
      const nextMessage = loadError?.message ?? 'Không thể mở form chỉnh sửa người dùng.'

      setError(nextMessage)
      setFeedback(nextMessage)
    } finally {
      setActionLoading(false)
    }
  }

  function closeForm() {
    setFormState(createClosedFormState())
    setFormValues(createInitialAdminUserFormValues({ currentRole }))
    setFormErrors({})
  }

  function updateFormField(field, value) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }))
    setFormErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors
      }

      const nextErrors = { ...currentErrors }
      delete nextErrors[field]
      return nextErrors
    })
  }

  async function submitUserForm() {
    const mode = formState.mode
    const nextErrors = validateAdminUserForm(formValues, { mode })

    setFormErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setActionLoading(true)
    setError('')

    try {
      let response

      if (mode === 'create') {
        response = await createAdminUser(buildAdminUserCreatePayload(formValues))
      } else {
        response = await updateAdminUser(
          formState.user.id,
          buildAdminUserUpdatePayload(formValues),
        )

        if (
          currentRole === ROLES.systemAdmin &&
          formValues.roleCode &&
          formValues.roleCode !== formState.user.roleCode
        ) {
          response = await changeAdminUserRole(formState.user.id, {
            roleCode: formValues.roleCode,
          })
        }
      }

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể lưu người dùng.')
      }

      const nextUser = mapAdminUser(response.data)

      setSelectedUser(nextUser)
      setSelectedUserId(nextUser.id)
      setFeedback(`${response.message || 'Đã lưu người dùng.'} Tài khoản: ${nextUser.name}.`)
      closeForm()

      if (mode === 'create' && currentPage !== 1) {
        setCurrentPage(1)
      }

      await loadUsers({
        nextPage: mode === 'create' ? 1 : currentPage,
      })
    } catch (saveError) {
      const nextMessage = saveError?.message ?? 'Không thể lưu người dùng lúc này.'

      setError(nextMessage)
      setFeedback(nextMessage)
    } finally {
      setActionLoading(false)
    }
  }

  async function runStatusAction(user) {
    const action = getAdminUserStatusAction(user)

    if (!action) {
      return
    }

    setActionLoading(true)
    setError('')

    try {
      const response = await changeAdminUserStatus(user.id, {
        reason: getStatusReason(action.nextStatus),
        status: action.nextStatus,
      })

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể cập nhật trạng thái người dùng.')
      }

      const nextUser = mapAdminUser(response.data)

      setSelectedUser(nextUser)
      setSelectedUserId(nextUser.id)
      setFeedback(`${response.message || 'Đã cập nhật trạng thái.'} Tài khoản: ${nextUser.name}.`)
      await loadUsers()
    } catch (actionError) {
      const nextMessage = actionError?.message ?? 'Không thể cập nhật trạng thái người dùng lúc này.'

      setError(nextMessage)
      setFeedback(nextMessage)
    } finally {
      setActionLoading(false)
    }
  }

  async function removeUser(user) {
    setActionLoading(true)
    setError('')

    try {
      const response = await deleteAdminUser(user.id, {
        reason: ADMIN_USER_DEFAULT_DELETE_REASON,
      })

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể xóa người dùng.')
      }

      const deletedUser = mapAdminUser(response.data)

      setSelectedUser(deletedUser)
      setSelectedUserId(deletedUser.id)
      setCheckedUserIds((currentIds) => currentIds.filter((id) => id !== user.id))
      setFeedback(`${response.message || 'Đã xóa mềm tài khoản.'} Tài khoản: ${deletedUser.name}.`)
      await loadUsers()
    } catch (deleteError) {
      const nextMessage = deleteError?.message ?? 'Không thể xóa người dùng lúc này.'

      setError(nextMessage)
      setFeedback(nextMessage)
    } finally {
      setActionLoading(false)
    }
  }

  async function resendVerification(user) {
    if (!canResendAdminUserVerification(user)) {
      return
    }

    setActionLoading(true)
    setError('')

    try {
      const response = await resendAdminUserVerificationEmail(user.id)

      if (!response.success) {
        throw new Error(response.message || 'Không thể gửi lại email xác minh.')
      }

      setSelectedUserId(user.id)
      setFeedback(`${response.message || 'Đã gửi lại email xác minh.'} Email: ${user.email}.`)
    } catch (resendError) {
      const nextMessage = resendError?.message ?? 'Không thể gửi lại email xác minh lúc này.'

      setError(nextMessage)
      setFeedback(nextMessage)
    } finally {
      setActionLoading(false)
    }
  }

  const visibleUsers = useMemo(() => {
    const nextUsers = users.filter((user) => matchesAdminUserSearch(user, query))

    return sortAdminUsers(nextUsers, sortOrder)
  }, [query, sortOrder, users])
  const allVisibleChecked = visibleUsers.length > 0 &&
    visibleUsers.every((user) => checkedUserIds.includes(user.id))
  const pageNumbers = useMemo(
    () => createAdminUserPageNumbers(pagination.total_pages),
    [pagination.total_pages],
  )
  const safeCurrentPage = pagination.page ?? currentPage
  const resultRange = useMemo(() => {
    if (!pagination.total) {
      return {
        end: 0,
        start: 0,
      }
    }

    const start = (safeCurrentPage - 1) * pagination.limit + 1
    const end = Math.min(start + users.length - 1, pagination.total)

    return { end, start }
  }, [pagination.limit, pagination.total, safeCurrentPage, users.length])
  const roleFilterOptions = useMemo(() => getAdminUserRoleFilterOptions(), [])
  const formRoleOptions = useMemo(
    () =>
      formState.mode === 'edit'
        ? getAdminUserEditRoleOptions(currentRole, formState.user?.roleCode)
        : getAdminUserCreateRoleOptions(currentRole),
    [currentRole, formState.mode, formState.user?.roleCode],
  )

  return {
    actionLoading,
    allVisibleChecked,
    canResendVerification: canResendAdminUserVerification,
    checkedUserIds,
    closeForm,
    currentPage,
    currentRole,
    error,
    feedback,
    formErrors,
    formRoleOptions,
    formState,
    formValues,
    getStatusAction: getAdminUserStatusAction,
    loading,
    openCreateForm,
    openEditForm,
    pageNumbers,
    pagination: {
      ...pagination,
      page: safeCurrentPage,
    },
    query,
    reloadUsers,
    removeUser,
    resendVerification,
    resetFilters,
    resultRange,
    roleFilter,
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
    users: visibleUsers,
    viewUser,
  }
}
