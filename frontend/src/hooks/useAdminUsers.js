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

const USER_ROLE_COUNTER_CODES = Object.freeze([
  'system_admin',
  'admin',
  'staff',
  'customer',
])

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

function getUnlockReason() {
  return 'Mở khóa tài khoản sau khi đã xác minh thông tin.'
}

function createClosedReasonModalState() {
  return {
    actionType: '',
    confirmLabel: '',
    currentStatusLabel: '',
    defaultReason: '',
    description: '',
    errorMessage: '',
    isOpen: false,
    nextStatus: '',
    nextStatusLabel: '',
    quickReasons: [],
    reason: '',
    subtitle: '',
    title: '',
    tone: 'neutral',
    user: null,
    warningText: '',
  }
}

function buildStatusReasonModalState(user, action) {
  const isLockAction = action?.nextStatus === ADMIN_USER_STATUSES.locked
  const defaultReason = isLockAction
    ? getStatusReason(action.nextStatus) ?? 'Khóa tài khoản từ màn quản trị người dùng.'
    : getUnlockReason()

  return {
    actionType: isLockAction ? 'lock' : 'unlock',
    confirmLabel: action?.label || (isLockAction ? 'Khóa' : 'Mở khóa'),
    currentStatusLabel: user?.status ?? '',
    defaultReason,
    description: isLockAction
      ? 'Tài khoản sẽ bị tạm khóa và không thể đăng nhập cho đến khi được mở khóa lại.'
      : 'Tài khoản sẽ trở lại trạng thái hoạt động và có thể đăng nhập bình thường.',
    errorMessage: '',
    isOpen: true,
    nextStatus: action?.nextStatus ?? ADMIN_USER_STATUSES.active,
    nextStatusLabel: isLockAction ? 'Đã khóa' : 'Hoạt động',
    quickReasons: isLockAction
      ? [
          'Phát hiện đăng nhập bất thường',
          'Cần rà soát thủ công',
          'Theo yêu cầu hỗ trợ',
        ]
      : [
          'Đã xác minh thông tin',
          'Khách hàng đã liên hệ lại',
          'Khôi phục quyền truy cập',
        ],
    reason: defaultReason,
    subtitle: isLockAction
      ? 'Chọn lý do trước khi khóa tài khoản này.'
      : 'Chọn lý do trước khi mở khóa tài khoản này.',
    title: isLockAction ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
    tone: isLockAction ? 'danger' : 'success',
    user,
    warningText: isLockAction
      ? 'Tài khoản sẽ không thể truy cập hệ thống cho đến khi được mở khóa.'
      : 'Tài khoản sẽ trở lại trạng thái hoạt động ngay sau thao tác này.',
  }
}

function buildDeleteReasonModalState(user) {
  return {
    actionType: 'delete',
    confirmLabel: 'Xóa mềm',
    currentStatusLabel: user?.status ?? '',
    defaultReason: ADMIN_USER_DEFAULT_DELETE_REASON,
    description:
      'Tài khoản sẽ được chuyển sang deleted nhưng vẫn giữ lịch sử để dễ đối soát và phục hồi khi cần.',
    errorMessage: '',
    isOpen: true,
    nextStatus: ADMIN_USER_STATUSES.deleted,
    nextStatusLabel: 'Đã xóa',
    quickReasons: [
      'Không còn sử dụng',
      'Yêu cầu từ khách hàng',
      'Chuẩn hóa dữ liệu nội bộ',
    ],
    reason: ADMIN_USER_DEFAULT_DELETE_REASON,
    subtitle: 'Nhập lý do trước khi xóa mềm tài khoản này.',
    title: 'Xóa mềm tài khoản',
    tone: 'danger',
    user,
    warningText: 'Đây không phải hard delete, nhưng tài khoản sẽ bị ẩn khỏi danh sách hoạt động.',
  }
}

function getResponseTotal(response) {
  return Number(response?.meta?.total ?? 0)
}

async function loadUserRoleCounts() {
  const countEntries = await Promise.all(
    USER_ROLE_COUNTER_CODES.map(async (roleCode) => {
      try {
        const response = await listAdminUsers({
          limit: 1,
          page: 1,
          role: roleCode,
        })

        return [roleCode, getResponseTotal(response)]
      } catch {
        return [roleCode, 0]
      }
    }),
  )

  return Object.fromEntries(countEntries)
}

export default function useAdminUsers() {
  const outletContext = useOutletContext()
  const currentRole = normalizeAdminRole(outletContext?.currentRole, 'guest')
  const currentUser = outletContext?.currentUser ?? null
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
  const [roleCounts, setRoleCounts] = useState({})
  const [formState, setFormState] = useState(() => createClosedFormState())
  const [formValues, setFormValues] = useState(() =>
    createInitialAdminUserFormValues({ currentRole }),
  )
  const [formErrors, setFormErrors] = useState({})
  const [reasonModalState, setReasonModalState] = useState(() => createClosedReasonModalState())

  function isCurrentAdminUser(user) {
    return Boolean(
      user?.id &&
      currentUser?.id &&
      String(user.id) === String(currentUser.id),
    )
  }

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
      const [response, roleCountResult] = await Promise.all([
        listAdminUsers({
          limit: ADMIN_USER_PAGE_SIZE,
          page: nextPage,
          q: nextQuery,
          role: nextRole,
          status: nextStatus,
        }),
        loadUserRoleCounts(),
      ])

      if (!response.success) {
        throw new Error(response.message || 'Không thể tải danh sách người dùng.')
      }

      setUsers(Array.isArray(response.data) ? response.data.map((user) => mapAdminUser(user)) : [])
      setPagination(response.meta ?? createInitialPaginationState())
      setRoleCounts(roleCountResult)

      if ((response.meta?.page ?? nextPage) !== currentPage) {
        setCurrentPage(response.meta?.page ?? 1)
      }
    } catch (loadError) {
      setUsers([])
      setPagination(createInitialPaginationState())
      setRoleCounts({})
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
        const [response, roleCountResult] = await Promise.all([
          listAdminUsers({
            limit: ADMIN_USER_PAGE_SIZE,
            page: currentPage,
            q: debouncedQuery,
            role: roleFilter,
            status: statusFilter,
          }),
          loadUserRoleCounts(),
        ])

        if (!isActive) {
          return
        }

        if (!response.success) {
          throw new Error(response.message || 'Không thể tải danh sách người dùng.')
        }

        setUsers(Array.isArray(response.data) ? response.data.map((user) => mapAdminUser(user)) : [])
        setPagination(response.meta ?? createInitialPaginationState())
        setRoleCounts(roleCountResult)

        if ((response.meta?.page ?? currentPage) !== currentPage) {
          setCurrentPage(response.meta?.page ?? 1)
        }
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setUsers([])
        setPagination(createInitialPaginationState())
        setRoleCounts({})
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

  function closeReasonModal() {
    if (actionLoading) {
      return
    }

    setReasonModalState(createClosedReasonModalState())
  }

  function openStatusReasonModal(user, action) {
    setSelectedUser(user)
    setSelectedUserId(user.id)
    setFeedback('')
    setReasonModalState(buildStatusReasonModalState(user, action))
  }

  function openDeleteReasonModal(user) {
    setSelectedUser(user)
    setSelectedUserId(user.id)
    setFeedback('')
    setReasonModalState(buildDeleteReasonModalState(user))
  }

  function updateReasonModalReason(value) {
    setReasonModalState((currentState) => ({
      ...currentState,
      errorMessage: '',
      reason: value,
    }))
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

    if (isCurrentAdminUser(user)) {
      setFeedback('Không thể tự thay đổi trạng thái tài khoản đang đăng nhập.')
      return
    }

    openStatusReasonModal(user, action)
  }

  async function removeUser(user) {
    if (isCurrentAdminUser(user)) {
      setFeedback('Không thể tự xóa tài khoản đang đăng nhập.')
      return
    }

    openDeleteReasonModal(user)
  }

  async function submitReasonModal() {
    const modalUser = reasonModalState.user
    const trimmedReason = reasonModalState.reason.trim()

    if (!modalUser) {
      return
    }

    if (!trimmedReason) {
      setReasonModalState((currentState) => ({
        ...currentState,
        errorMessage: 'Vui lòng nhập lý do để tiếp tục.',
      }))
      return
    }

    setActionLoading(true)
    setError('')

    try {
      let response

      if (reasonModalState.actionType === 'delete') {
        response = await deleteAdminUser(modalUser.id, {
          reason: trimmedReason,
        })
      } else {
        response = await changeAdminUserStatus(modalUser.id, {
          reason: trimmedReason,
          status: reasonModalState.nextStatus,
        })
      }

      if (!response.success || !response.data) {
        throw new Error(
          response.message ||
            (reasonModalState.actionType === 'delete'
              ? 'Không thể xóa người dùng.'
              : 'Không thể cập nhật trạng thái người dùng.'),
        )
      }

      const nextUser = mapAdminUser(response.data)

      setSelectedUser(nextUser)
      setSelectedUserId(nextUser.id)

      if (reasonModalState.actionType === 'delete') {
        setCheckedUserIds((currentIds) => currentIds.filter((id) => id !== modalUser.id))
        setFeedback(`${response.message || 'Đã xóa mềm tài khoản.'} Tài khoản: ${nextUser.name}.`)
      } else {
        setFeedback(`${response.message || 'Đã cập nhật trạng thái.'} Tài khoản: ${nextUser.name}.`)
      }

      closeReasonModal()
      await loadUsers()
    } catch (actionError) {
      const nextMessage =
        actionError?.message ??
        (reasonModalState.actionType === 'delete'
          ? 'Không thể xóa người dùng lúc này.'
          : 'Không thể cập nhật trạng thái người dùng lúc này.')

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
    reasonModalState,
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
    closeReasonModal,
    setCurrentPage,
    setQuery,
    setRoleFilter,
    setSortOrder,
    setStatusFilter,
    sortOrder,
    statusFilter,
    submitUserForm,
    submitReasonModal,
    toggleAllVisibleUsers,
    toggleUserChecked,
    updateFormField,
    updateReasonModalReason,
    users: visibleUsers,
  }
}
