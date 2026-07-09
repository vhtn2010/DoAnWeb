import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ACCESS_CONTROL_ALL_VALUE,
  arePermissionSetsEqual,
  countRolePermissionsForModule,
  createAccessControlModuleOptions,
  createAccessControlRoleOptions,
  filterAccessControlPermissions,
  filterAccessControlRoles,
  groupAccessControlPermissions,
  mapAccessControlPermission,
  mapAccessControlRole,
} from '../mappers/adminAccessControlMappers.js'
import {
  getAdminRoleDetail,
  listAdminPermissions,
  listAdminRoles,
  replaceAdminRolePermissions,
} from '../repositories/adminAccessControlRepository.js'

function createFeedback(tone = 'info', message = '') {
  return { message, tone }
}

function createRolePermissionsSet(role) {
  return new Set(role?.permissionCodes ?? [])
}

async function loadRoleDetails(roles = []) {
  const detailResponses = await Promise.all(
    roles.map((role) => getAdminRoleDetail(role.id)),
  )

  return detailResponses.map((response, index) => {
    if (!response.success || !response.data) {
      throw new Error(response.message || `Không thể tải chi tiết vai trò ${roles[index]?.name}.`)
    }

    return mapAccessControlRole(response.data)
  })
}

export default function useAdminAccessControl() {
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const selectedRoleIdRef = useRef('')
  const [selectedPermissionCodes, setSelectedPermissionCodes] = useState([])
  const [roleFilter, setRoleFilter] = useState(ACCESS_CONTROL_ALL_VALUE)
  const [moduleFilter, setModuleFilter] = useState(ACCESS_CONTROL_ALL_VALUE)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(() =>
    createFeedback('info', 'Ma trận vai trò và permission đang được đồng bộ với RBAC API.'),
  )
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isActive = true

    async function loadAccessControlState() {
      setLoading(true)
      setError('')

      try {
        const [roleResponse, permissionResponse] = await Promise.all([
          listAdminRoles(),
          listAdminPermissions(),
        ])

        if (!isActive) {
          return
        }

        if (!roleResponse.success) {
          throw new Error(roleResponse.message || 'Không thể tải danh sách vai trò.')
        }

        if (!permissionResponse.success) {
          throw new Error(permissionResponse.message || 'Không thể tải danh sách permission.')
        }

        const roleSummaries = Array.isArray(roleResponse.data)
          ? roleResponse.data.map(mapAccessControlRole)
          : []
        const roleDetails = await loadRoleDetails(roleSummaries)
        const nextPermissions = Array.isArray(permissionResponse.data)
          ? permissionResponse.data.map(mapAccessControlPermission)
          : []
        const nextSelectedRole =
          roleDetails.find((role) => role.id === selectedRoleIdRef.current) ||
          roleDetails.find((role) => role.code !== 'customer') ||
          roleDetails[0] ||
          null

        if (!isActive) {
          return
        }

        selectedRoleIdRef.current = nextSelectedRole?.id ?? ''
        setRoles(roleDetails)
        setPermissions(nextPermissions)
        setSelectedRoleId(nextSelectedRole?.id ?? '')
        setSelectedPermissionCodes(nextSelectedRole?.permissionCodes ?? [])
        setFeedback(
          createFeedback(
            'info',
            `Đã tải ${roleDetails.length} vai trò và ${nextPermissions.length} permission từ API.`,
          ),
        )
      } catch (loadError) {
        if (!isActive) {
          return
        }

        const nextMessage = loadError?.message ?? 'Không thể tải dữ liệu phân quyền lúc này.'

        setRoles([])
        setPermissions([])
        selectedRoleIdRef.current = ''
        setSelectedRoleId('')
        setSelectedPermissionCodes([])
        setError(nextMessage)
        setFeedback(createFeedback('error', nextMessage))
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadAccessControlState()

    return () => {
      isActive = false
    }
  }, [reloadKey])

  function reloadAccessControl() {
    setReloadKey((currentKey) => currentKey + 1)
  }

  function resetFilters() {
    setRoleFilter(ACCESS_CONTROL_ALL_VALUE)
    setModuleFilter(ACCESS_CONTROL_ALL_VALUE)
    setFeedback(createFeedback('info', 'Đã đặt lại bộ lọc phân quyền.'))
  }

  function selectRole(role) {
    if (!role) {
      return
    }

    setSelectedRoleId(role.id)
    selectedRoleIdRef.current = role.id
    setSelectedPermissionCodes(role.permissionCodes)
    setFeedback(createFeedback('info', `Đang xem ma trận quyền của ${role.name}.`))
  }

  function togglePermission(permissionCode) {
    setSelectedPermissionCodes((currentCodes) => {
      const nextCodes = new Set(currentCodes)

      if (nextCodes.has(permissionCode)) {
        nextCodes.delete(permissionCode)
      } else {
        nextCodes.add(permissionCode)
      }

      return Array.from(nextCodes).sort()
    })
  }

  function resetSelectedRolePermissions() {
    const selectedRole = roles.find((role) => role.id === selectedRoleId)

    setSelectedPermissionCodes(selectedRole?.permissionCodes ?? [])
    setFeedback(createFeedback('info', 'Đã hoàn tác thay đổi chưa lưu của vai trò đang chọn.'))
  }

  async function saveSelectedRolePermissions() {
    const selectedRole = roles.find((role) => role.id === selectedRoleId)

    if (!selectedRole) {
      setFeedback(createFeedback('error', 'Chọn một vai trò trước khi lưu phân quyền.'))
      return
    }

    if (selectedRole.isProtected) {
      setFeedback(createFeedback('error', 'Không thể chỉnh quyền của System Admin trong MVP.'))
      return
    }

    setActionLoading(true)
    setError('')

    try {
      const response = await replaceAdminRolePermissions(selectedRole.id, {
        permissionCodes: selectedPermissionCodes,
      })

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể cập nhật quyền cho vai trò.')
      }

      const updatedRole = mapAccessControlRole({
        ...selectedRole.raw,
        ...response.data.role,
        permissions: response.data.permissions,
      })

      setRoles((currentRoles) =>
        currentRoles.map((role) => (role.id === updatedRole.id ? updatedRole : role)),
      )
      selectedRoleIdRef.current = updatedRole.id
      setSelectedRoleId(updatedRole.id)
      setSelectedPermissionCodes(updatedRole.permissionCodes)
      setFeedback(
        createFeedback(
          'success',
          `${response.message || 'Đã cập nhật quyền cho vai trò.'} Phiên đăng nhập liên quan đã được thu hồi.`,
        ),
      )
    } catch (saveError) {
      const nextMessage = saveError?.message ?? 'Không thể lưu phân quyền lúc này.'

      setError(nextMessage)
      setFeedback(createFeedback('error', nextMessage))
    } finally {
      setActionLoading(false)
    }
  }

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  )
  const selectedPermissionSet = useMemo(
    () => new Set(selectedPermissionCodes),
    [selectedPermissionCodes],
  )
  const filteredRoles = useMemo(
    () => filterAccessControlRoles(roles, roleFilter),
    [roleFilter, roles],
  )
  const filteredPermissions = useMemo(
    () => filterAccessControlPermissions(permissions, moduleFilter),
    [moduleFilter, permissions],
  )
  const permissionGroups = useMemo(
    () => groupAccessControlPermissions(filteredPermissions),
    [filteredPermissions],
  )
  const roleOptions = useMemo(() => createAccessControlRoleOptions(roles), [roles])
  const moduleOptions = useMemo(
    () => createAccessControlModuleOptions(permissions),
    [permissions],
  )
  const isDirty = useMemo(
    () => !arePermissionSetsEqual(selectedRole?.permissionCodes, selectedPermissionCodes),
    [selectedPermissionCodes, selectedRole?.permissionCodes],
  )
  const totalFilteredPermissions = filteredPermissions.length
  const originalPermissionSet = useMemo(
    () => createRolePermissionsSet(selectedRole),
    [selectedRole],
  )

  return {
    actionLoading,
    countRolePermissionsForModule: (role) => countRolePermissionsForModule(role, moduleFilter),
    error,
    feedback,
    filteredRoles,
    isDirty,
    loading,
    moduleFilter,
    moduleOptions,
    originalPermissionSet,
    permissionGroups,
    permissions,
    reloadAccessControl,
    resetFilters,
    resetSelectedRolePermissions,
    roleFilter,
    roleOptions,
    roles,
    saveSelectedRolePermissions,
    selectRole,
    selectedPermissionCodes,
    selectedPermissionSet,
    selectedRole,
    setModuleFilter,
    setRoleFilter,
    togglePermission,
    totalFilteredPermissions,
  }
}
