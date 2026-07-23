import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  ADMIN_SERVICE_ACTION_META,
  ADMIN_SERVICE_INITIAL_FEEDBACK,
  ADMIN_SERVICE_PAGE_SIZE,
  ADMIN_SERVICE_SORT_OPTIONS,
  ADMIN_SERVICE_STATUS_META,
  ADMIN_SERVICE_STATUS_OPTIONS,
  ADMIN_SERVICE_SUMMARY_LIMIT,
  ADMIN_SERVICE_TYPE_OPTIONS,
} from '../constants/adminServices.js'
import {
  buildServicePayloadFromForm,
  createAdminServicesPageNumbers,
  createAdminServicesSummary,
  createFeedbackState,
  formatAdminServiceCurrency,
  formatAdminServiceDateTime,
  getAdminRoleLabel,
  getAllowedServiceActions,
  getAdminServiceTypeLabel,
  getServiceDetailSummary,
  matchesAdminServiceFilters,
  buildServiceStatusActionPayload,
  normalizeAdminPreviewRole,
} from '../mappers/adminServiceMappers.js'
import {
  approveService,
  createAdminService,
  getAdminServiceById,
  hideService,
  listAdminServices,
  rejectService,
  restoreService,
  softDeleteService,
  submitServiceForReview,
  updateAdminService,
  updateServiceStatus,
} from '../repositories/adminServiceRepository.js'

function createClosedFormModalState() {
  return {
    isOpen: false,
    mode: 'add',
    service: null,
  }
}

function createClosedStatusActionState() {
  return {
    isOpen: false,
    actionKey: null,
    service: null,
  }
}

function createInitialPaginationState() {
  return {
    page: 1,
    limit: ADMIN_SERVICE_PAGE_SIZE,
    total: 0,
    total_pages: 1,
    has_next: false,
  }
}

function mapApiValidationDetails(details = []) {
  if (!Array.isArray(details)) {
    return {}
  }

  return details.reduce((result, item) => {
    const field = item?.field
    const message = translateAdminServiceMessage(item?.message, { field })

    if (!field || !message) {
      return result
    }

    result[field] = message
    return result
  }, {})
}

function translateAdminServiceMessage(message, { field = '' } = {}) {
  const normalizedMessage = String(message ?? '').trim()

  if (!normalizedMessage) {
    return 'Không thể lưu dịch vụ lúc này.'
  }

  const lowerMessage = normalizedMessage.toLowerCase()

  if (lowerMessage.includes('invalid input syntax for type json')) {
    return 'Không thể lưu dịch vụ vì dữ liệu lịch trình hoặc tiện ích chưa đúng định dạng.'
  }

  if (normalizedMessage === 'Admin service created successfully') {
    return 'Tạo dịch vụ thành công.'
  }

  if (normalizedMessage === 'Admin service updated successfully') {
    return 'Cập nhật dịch vụ thành công.'
  }

  if (normalizedMessage === 'Admin service deleted successfully') {
    return 'Xóa dịch vụ thành công.'
  }

  if (lowerMessage.endsWith('is required')) {
    return 'Trường này là bắt buộc.'
  }

  if (lowerMessage.includes('must be an array')) {
    return 'Dữ liệu phải ở dạng danh sách.'
  }

  if (lowerMessage.includes('must be an object')) {
    return 'Dữ liệu phải ở dạng đối tượng hợp lệ.'
  }

  if (lowerMessage.includes('must be a string')) {
    return 'Dữ liệu phải ở dạng văn bản.'
  }

  if (lowerMessage.includes('must be a valid time')) {
    return 'Thời gian không hợp lệ.'
  }

  if (lowerMessage.includes('must be a valid iso 8601 datetime')) {
    return 'Ngày giờ không hợp lệ.'
  }

  if (lowerMessage.includes('must be a number greater than or equal to 0')) {
    return 'Giá trị phải là số lớn hơn hoặc bằng 0.'
  }

  if (lowerMessage.includes('must be an integer')) {
    return 'Giá trị phải là số nguyên hợp lệ.'
  }

  if (lowerMessage.includes('contains unsupported characters')) {
    return 'Dữ liệu chứa ký tự không được hỗ trợ.'
  }

  if (lowerMessage.includes('already exists')) {
    if (field === 'slug') {
      return 'Slug này đã tồn tại.'
    }

    if (field === 'service_code') {
      return 'Mã dịch vụ này đã tồn tại.'
    }

    return 'Dữ liệu này đã tồn tại trong hệ thống.'
  }

  if (lowerMessage.includes('cannot be updated through this endpoint')) {
    return 'Trường này không thể cập nhật từ màn hình hiện tại.'
  }

  if (lowerMessage === 'no updatable fields were provided') {
    return 'Chưa có thông tin nào thay đổi để cập nhật.'
  }

  if (lowerMessage === 'service not found') {
    return 'Không tìm thấy dịch vụ cần cập nhật.'
  }

  return normalizedMessage
}

function getVisibilityNote(service, filters) {
  return matchesAdminServiceFilters(service, {
    destination: filters.destination,
    q: filters.search,
    type: filters.type,
    status: filters.status,
  })
    ? ''
    : ' Dịch vụ có thể không còn xuất hiện trong danh sách vì không khớp bộ lọc hiện tại.'
}

function buildStatusActionRequest(actionKey, service, formValues, currentRole) {
  const requestOptions = {
    currentRole,
  }
  const serviceId = service?.id
  const payload = buildServiceStatusActionPayload(actionKey, service, formValues)

  if (!serviceId || payload === null) {
    return Promise.resolve({
      success: false,
      message: 'Thao tác không hợp lệ với trạng thái hiện tại.',
      data: null,
    })
  }

  if (actionKey === 'submit_review') {
    return submitServiceForReview(serviceId, payload, requestOptions)
  }

  if (actionKey === 'approve') {
    return approveService(serviceId, payload, requestOptions)
  }

  if (actionKey === 'reject') {
    return rejectService(serviceId, payload, requestOptions)
  }

  if (actionKey === 'hide') {
    return hideService(serviceId, payload, requestOptions)
  }

  if (actionKey === 'restore') {
    return restoreService(serviceId, payload, requestOptions)
  }

  if (actionKey === 'delete') {
    return softDeleteService(serviceId, payload, requestOptions)
  }

  return Promise.resolve({
    success: false,
    message: 'Thao tác không hợp lệ với trạng thái hiện tại.',
    data: null,
  })
}

async function fetchAdminServicesState({ currentRole, nextFilters, nextPage, nextSort }) {
  const [listResponse, summaryResponse] = await Promise.all([
    listAdminServices({
      currentRole,
      destination: nextFilters.destination,
      limit: ADMIN_SERVICE_PAGE_SIZE,
      page: nextPage,
      q: nextFilters.search,
      sort: nextSort,
      status: nextFilters.status,
      type: nextFilters.type,
    }),
    listAdminServices({
      currentRole,
      limit: ADMIN_SERVICE_SUMMARY_LIMIT,
      page: 1,
    }),
  ])

  return {
    listResponse,
    summaryResponse,
  }
}

export default function useAdminServices() {
  const outletContext = useOutletContext()
  const currentRole = normalizeAdminPreviewRole(outletContext?.currentRole)
  const currentPermissions = outletContext?.currentPermissions

  const [services, setServices] = useState([])
  const [summarySourceServices, setSummarySourceServices] = useState([])
  const [filters, setFilters] = useState({
    destination: 'all',
    search: '',
    type: 'all',
    status: 'all',
  })
  const [debouncedFilters, setDebouncedFilters] = useState(filters)
  const [sort, setSortState] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState(() => createInitialPaginationState())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(ADMIN_SERVICE_INITIAL_FEEDBACK)
  const [selectedService, setSelectedService] = useState(null)
  const [formModalState, setFormModalState] = useState(() => createClosedFormModalState())
  const [statusActionModalState, setStatusActionModalState] = useState(() =>
    createClosedStatusActionState(),
  )

  async function loadServicesState({
    nextFilters = debouncedFilters,
    nextPage = currentPage,
    nextSort = sort,
  } = {}) {
    setLoading(true)
    setError('')

    try {
      const { listResponse, summaryResponse } = await fetchAdminServicesState({
        currentRole,
        nextFilters,
        nextPage,
        nextSort,
      })

      if (!listResponse.success) {
        throw new Error(listResponse.message || 'Không thể tải danh sách dịch vụ.')
      }

      if (!summaryResponse.success) {
        throw new Error(summaryResponse.message || 'Không thể tải dữ liệu tóm tắt dịch vụ.')
      }

      setServices(Array.isArray(listResponse.data) ? listResponse.data : [])
      setSummarySourceServices(Array.isArray(summaryResponse.data) ? summaryResponse.data : [])
      setPagination(listResponse.meta ?? createInitialPaginationState())

      if ((listResponse.meta?.page ?? nextPage) !== nextPage) {
        setCurrentPage(listResponse.meta?.page ?? 1)
      }
    } catch (loadError) {
      setServices([])
      setSummarySourceServices([])
      setPagination(createInitialPaginationState())
      setError(loadError?.message ?? 'Không thể tải dữ liệu dịch vụ lúc này.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isActive = true

    async function loadVisibleServices() {
      setLoading(true)
      setError('')

      try {
        const { listResponse, summaryResponse } = await fetchAdminServicesState({
          currentRole,
          nextFilters: debouncedFilters,
          nextPage: currentPage,
          nextSort: sort,
        })

        if (!isActive) {
          return
        }

        if (!listResponse.success) {
          throw new Error(listResponse.message || 'Không thể tải danh sách dịch vụ.')
        }

        if (!summaryResponse.success) {
          throw new Error(summaryResponse.message || 'Không thể tải dữ liệu tóm tắt dịch vụ.')
        }

        setServices(Array.isArray(listResponse.data) ? listResponse.data : [])
        setSummarySourceServices(Array.isArray(summaryResponse.data) ? summaryResponse.data : [])
        setPagination(listResponse.meta ?? createInitialPaginationState())

        if ((listResponse.meta?.page ?? currentPage) !== currentPage) {
          setCurrentPage(listResponse.meta?.page ?? 1)
        }
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setServices([])
        setSummarySourceServices([])
        setPagination(createInitialPaginationState())
        setError(loadError?.message ?? 'Không thể tải dữ liệu dịch vụ lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadVisibleServices()

    return () => {
      isActive = false
    }
  }, [currentRole, currentPage, debouncedFilters, sort])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedFilters(filters)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [filters])

  function setSearch(value) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      search: value,
    }))
    setCurrentPage(1)
  }

  function setTypeFilter(value) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      type: value,
    }))
    setCurrentPage(1)
  }

  function setStatusFilter(value) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      status: value,
    }))
    setCurrentPage(1)
  }

  function setDestinationFilter(value) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      destination: value,
    }))
    setCurrentPage(1)
  }

  function setSort(value) {
    setSortState(value)
    setCurrentPage(1)
  }

  function resetFilters() {
    setFilters({
      destination: 'all',
      search: '',
      type: 'all',
      status: 'all',
    })
    setSortState('newest')
    setCurrentPage(1)
  }

  function openCreateForm() {
    setSelectedService(null)
    setFormModalState({
      isOpen: true,
      mode: 'add',
      service: null,
    })
  }

  async function openEditForm(service) {
    setLoading(true)
    setError('')

    try {
      const response = await getAdminServiceById(service.id)

      if (!response.success || !response.data) {
        setError(response.message || 'Không tìm thấy dịch vụ để chỉnh sửa.')
        return
      }

      setSelectedService(response.data)
      setFormModalState({
        isOpen: true,
        mode: 'edit',
        service: response.data,
      })
    } catch (loadError) {
      setError(loadError?.message ?? 'Không thể mở dữ liệu chỉnh sửa dịch vụ.')
    } finally {
      setLoading(false)
    }
  }

  async function openStatusAction(service, actionKey) {
    setLoading(true)
    setError('')

    try {
      const response = await getAdminServiceById(service.id)

      if (!response.success || !response.data) {
        setError(response.message || 'Không tìm thấy dịch vụ để xử lý.')
        return
      }

      setSelectedService(response.data)
      setStatusActionModalState({
        isOpen: true,
        actionKey,
        service: response.data,
      })
    } catch (loadError) {
      setError(loadError?.message ?? 'Không thể mở workflow dịch vụ.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRowAction(service, actionKey) {
    if (actionKey === 'view') {
      setLoading(true)
      setError('')

      try {
        const response = await getAdminServiceById(service.id)

        if (!response.success || !response.data) {
          setError(response.message || 'Không tìm thấy chi tiết dịch vụ.')
          return
        }

        setSelectedService(response.data)
        setFeedback(
          createFeedbackState(
            'success',
            `Đã tải chi tiết dịch vụ ${response.data.service_code} từ API.`,
          ),
        )
      } catch (loadError) {
        const nextMessage = loadError?.message ?? 'Không thể tải chi tiết dịch vụ lúc này.'

        setError(nextMessage)
        setFeedback(createFeedbackState('error', nextMessage))
      } finally {
        setLoading(false)
      }
      return
    }

    if (actionKey === 'edit') {
      await openEditForm(service)
      return
    }

    await openStatusAction(service, actionKey)
  }

  function closeModal(modalType = 'all') {
    if (modalType === 'all' || modalType === 'form') {
      setFormModalState(createClosedFormModalState())
    }

    if (modalType === 'all' || modalType === 'status') {
      setStatusActionModalState(createClosedStatusActionState())
    }
  }

  async function submitServiceForm(formValues, submitIntent) {
    const payload = buildServicePayloadFromForm(formValues, { submitIntent })
    const requestOptions = { currentRole }
    const isEditMode = formModalState.mode === 'edit' && Boolean(formModalState.service?.id)
    const shouldUpdateStatus =
      isEditMode &&
      payload.status &&
      payload.status !== formModalState.service?.status

    setLoading(true)
    setError('')

    try {
      let response = isEditMode
        ? await updateAdminService(formModalState.service.id, payload, requestOptions)
        : await createAdminService(payload, requestOptions)

      if (!response.success || !response.data) {
        const nextMessage = translateAdminServiceMessage(response.message)
        setError(nextMessage)
        setFeedback(createFeedbackState('error', nextMessage))
        return {
          success: false,
          message: nextMessage,
        }
      }

      if (shouldUpdateStatus) {
        response = await updateServiceStatus(
          response.data.id,
          {
            reason: 'Cập nhật trạng thái từ form quản lý dịch vụ.',
            status: payload.status,
          },
          requestOptions,
        )

        if (!response.success || !response.data) {
          const nextMessage = translateAdminServiceMessage(response.message)
          setError(nextMessage)
          setFeedback(createFeedbackState('error', nextMessage))
          return {
            success: false,
            message: nextMessage,
          }
        }
      }

      setSelectedService(response.data)
      const successMessage = translateAdminServiceMessage(response.message)
      const imageWarning = response.data.image_upload_error
        ? ` Dịch vụ đã lưu, nhưng ảnh bìa chưa được gắn: ${translateAdminServiceMessage(response.data.image_upload_error)}`
        : ''
      setFeedback(
        createFeedbackState(
          response.data.image_upload_error ? 'warning' : 'success',
          `${successMessage} Mã dịch vụ: ${response.data.service_code}.${getVisibilityNote(
            response.data,
            filters,
          )}${imageWarning}`,
        ),
      )
      setFormModalState({
        isOpen: true,
        mode: 'edit',
        service: response.data,
      })

      const nextPage = isEditMode ? currentPage : 1
      if (!isEditMode && currentPage !== 1) {
        setCurrentPage(1)
      }
      await loadServicesState({
        nextFilters: filters,
        nextPage,
        nextSort: sort,
      })
      return {
        success: true,
        data: response.data,
        message: successMessage,
      }
    } catch (saveError) {
      const nextMessage = translateAdminServiceMessage(saveError?.message)
      const fieldErrors = mapApiValidationDetails(saveError?.details)
      setError(nextMessage)
      setFeedback(createFeedbackState('error', nextMessage))
      return {
        success: false,
        fieldErrors,
        message: nextMessage,
      }
    } finally {
      setLoading(false)
    }
  }

  async function confirmStatusAction(formValues) {
    const actionKey = statusActionModalState.actionKey
    const serviceId = statusActionModalState.service?.id

    if (!actionKey || !serviceId) {
      setFeedback(createFeedbackState('error', 'Không tìm thấy dịch vụ để xử lý thao tác.'))
      closeModal('status')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await buildStatusActionRequest(
        actionKey,
        statusActionModalState.service,
        formValues,
        currentRole,
      )

      if (!response.success || !response.data) {
        const nextMessage =
          response.message || 'Thao tác không hợp lệ với trạng thái hiện tại.'
        setError(nextMessage)
        setFeedback(createFeedbackState('error', nextMessage))
        closeModal('status')
        return
      }

      setSelectedService(response.data)
      setFeedback(
        createFeedbackState(
          'success',
          `${response.message} Mã dịch vụ: ${response.data.service_code}.${getVisibilityNote(
            response.data,
            filters,
          )}`,
        ),
      )
      closeModal('status')
      await loadServicesState({
        nextFilters: filters,
        nextPage: currentPage,
        nextSort: sort,
      })
    } catch (actionError) {
      const nextMessage =
        actionError?.message ?? 'Không thể cập nhật trạng thái dịch vụ lúc này.'
      setError(nextMessage)
      setFeedback(createFeedbackState('error', nextMessage))
      closeModal('status')
    } finally {
      setLoading(false)
    }
  }

  const summaryCards = useMemo(
    () => createAdminServicesSummary(summarySourceServices),
    [summarySourceServices],
  )
  const destinationOptions = useMemo(() => {
    const uniqueDestinations = Array.from(
      new Set(summarySourceServices.map((service) => service.location_text).filter(Boolean)),
    ).sort((firstDestination, secondDestination) =>
      firstDestination.localeCompare(secondDestination, 'vi'),
    )

    return [
      { value: 'all', label: 'Điểm đến:' },
      ...uniqueDestinations.map((destination) => ({
        value: destination,
        label: destination,
      })),
    ]
  }, [summarySourceServices])
  const pageNumbers = useMemo(
    () => createAdminServicesPageNumbers(pagination.total_pages ?? 1),
    [pagination.total_pages],
  )
  const safeCurrentPage = pagination.page ?? currentPage
  const resultRange = useMemo(() => {
    if (!pagination.total) {
      return {
        start: 0,
        end: 0,
      }
    }

    const start = (safeCurrentPage - 1) * pagination.limit + 1
    const end = Math.min(start + services.length - 1, pagination.total)

    return { start, end }
  }, [pagination.limit, pagination.total, safeCurrentPage, services.length])

  return {
    actionMeta: ADMIN_SERVICE_ACTION_META,
    closeModal,
    confirmStatusAction,
    currentRole,
    currentRoleLabel: getAdminRoleLabel(currentRole),
    error,
    destinationOptions,
    feedback,
    filters,
    formModalState,
    formatCurrency: formatAdminServiceCurrency,
    formatDateTime: formatAdminServiceDateTime,
    getAllowedActions: (service) =>
      getAllowedServiceActions(service, currentRole, currentPermissions),
    getServiceDetailSummary,
    getServiceTypeLabel: getAdminServiceTypeLabel,
    handleRowAction,
    loading,
    openCreateForm,
    openEditForm,
    openStatusAction,
    pageNumbers,
    pagination: {
      ...pagination,
      page: safeCurrentPage,
    },
    reloadServices: loadServicesState,
    resetFilters,
    selectedService,
    services,
    setCurrentPage,
    setDestinationFilter,
    setSearch,
    setSort,
    setStatusFilter,
    setTypeFilter,
    sort,
    sortOptions: ADMIN_SERVICE_SORT_OPTIONS,
    statusActionModalState,
    statusMeta: ADMIN_SERVICE_STATUS_META,
    statusOptions: ADMIN_SERVICE_STATUS_OPTIONS,
    submitServiceForm,
    summaryCards,
    typeOptions: ADMIN_SERVICE_TYPE_OPTIONS,
    resultRange,
  }
}



