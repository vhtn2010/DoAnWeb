import { useEffect, useMemo, useState } from 'react'
import {
  ADMIN_PROMOTION_PAGE_SIZE,
  ADMIN_PROMOTION_STATUSES,
  ADMIN_PROMOTION_SUMMARY_LIMIT,
} from '../constants/adminPromotions.js'
import {
  buildAdminPromotionPayloadFromForm,
  createAdminPromotionFeedback,
  createAdminPromotionOverview,
  createAdminPromotionPageNumbers,
  createInitialAdminPromotionFormValues,
  matchesAdminPromotionSearch,
  mapAdminPromotion,
  sortAdminPromotions,
  validateAdminPromotionForm,
} from '../mappers/adminPromotionMappers.js'
import {
  changeAdminPromotionStatus,
  createAdminPromotion,
  getAdminPromotionDetail,
  listAdminPromotions,
  updateAdminPromotion,
} from '../repositories/adminPromotionRepository.js'

function createInitialPaginationState() {
  return {
    has_next: false,
    limit: ADMIN_PROMOTION_PAGE_SIZE,
    page: 1,
    total: 0,
    total_pages: 1,
  }
}

function createClosedFormState() {
  return {
    isOpen: false,
    mode: 'create',
    promotion: null,
  }
}

async function fetchPromotionState({ page, status }) {
  const [listResponse, summaryResponse] = await Promise.all([
    listAdminPromotions({
      limit: ADMIN_PROMOTION_PAGE_SIZE,
      page,
      status,
    }),
    listAdminPromotions({
      limit: ADMIN_PROMOTION_SUMMARY_LIMIT,
      page: 1,
    }),
  ])

  return {
    listResponse,
    summaryResponse,
  }
}

export default function useAdminPromotions() {
  const [promotionItems, setPromotionItems] = useState([])
  const [summaryPromotionItems, setSummaryPromotionItems] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilterState] = useState(ADMIN_PROMOTION_STATUSES.all)
  const [sortOrder, setSortOrderState] = useState('default')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState(() => createInitialPaginationState())
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(() => createAdminPromotionFeedback())
  const [formState, setFormState] = useState(() => createClosedFormState())
  const [formValues, setFormValues] = useState(() => createInitialAdminPromotionFormValues())
  const [formErrors, setFormErrors] = useState({})
  const [reloadKey, setReloadKey] = useState(0)

  async function loadPromotionState({
    nextPage = currentPage,
    nextStatus = statusFilter,
  } = {}) {
    setLoading(true)
    setError('')

    try {
      const { listResponse, summaryResponse } = await fetchPromotionState({
        page: nextPage,
        status: nextStatus,
      })

      if (!listResponse.success) {
        throw new Error(listResponse.message || 'Không thể tải danh sách khuyến mãi.')
      }

      if (!summaryResponse.success) {
        throw new Error(summaryResponse.message || 'Không thể tải tổng quan khuyến mãi.')
      }

      setPromotionItems(
        Array.isArray(listResponse.data)
          ? listResponse.data.map((promotion) => mapAdminPromotion(promotion))
          : [],
      )
      setSummaryPromotionItems(
        Array.isArray(summaryResponse.data)
          ? summaryResponse.data.map((promotion) => mapAdminPromotion(promotion))
          : [],
      )
      setPagination(listResponse.meta ?? createInitialPaginationState())

      if ((listResponse.meta?.page ?? nextPage) !== currentPage) {
        setCurrentPage(listResponse.meta?.page ?? 1)
      }
    } catch (loadError) {
      setPromotionItems([])
      setSummaryPromotionItems([])
      setPagination(createInitialPaginationState())
      setError(loadError?.message ?? 'Không thể tải dữ liệu khuyến mãi lúc này.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isActive = true

    async function loadVisiblePromotions() {
      setLoading(true)
      setError('')

      try {
        const { listResponse, summaryResponse } = await fetchPromotionState({
          page: currentPage,
          status: statusFilter,
        })

        if (!isActive) {
          return
        }

        if (!listResponse.success) {
          throw new Error(listResponse.message || 'Không thể tải danh sách khuyến mãi.')
        }

        if (!summaryResponse.success) {
          throw new Error(summaryResponse.message || 'Không thể tải tổng quan khuyến mãi.')
        }

        setPromotionItems(
          Array.isArray(listResponse.data)
            ? listResponse.data.map((promotion) => mapAdminPromotion(promotion))
            : [],
        )
        setSummaryPromotionItems(
          Array.isArray(summaryResponse.data)
            ? summaryResponse.data.map((promotion) => mapAdminPromotion(promotion))
            : [],
        )
        setPagination(listResponse.meta ?? createInitialPaginationState())

        if ((listResponse.meta?.page ?? currentPage) !== currentPage) {
          setCurrentPage(listResponse.meta?.page ?? 1)
        }
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setPromotionItems([])
        setSummaryPromotionItems([])
        setPagination(createInitialPaginationState())
        setError(loadError?.message ?? 'Không thể tải dữ liệu khuyến mãi lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadVisiblePromotions()

    return () => {
      isActive = false
    }
  }, [currentPage, reloadKey, statusFilter])

  function setStatusFilter(value) {
    setStatusFilterState(value)
    setCurrentPage(1)
  }

  function setSortOrder(value) {
    setSortOrderState(value)
  }

  function resetFilters() {
    setSearchQuery('')
    setStatusFilterState(ADMIN_PROMOTION_STATUSES.all)
    setSortOrderState('default')
    setCurrentPage(1)
  }

  function reloadPromotions() {
    setReloadKey((currentKey) => currentKey + 1)
  }

  function openCreateForm() {
    setFormState({
      isOpen: true,
      mode: 'create',
      promotion: null,
    })
    setFormValues(createInitialAdminPromotionFormValues())
    setFormErrors({})
    setFeedback(createAdminPromotionFeedback())
  }

  async function openEditForm(promotion) {
    if (!promotion?.id) {
      return
    }

    setActionLoading(true)
    setError('')

    try {
      const response = await getAdminPromotionDetail(promotion.id)

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể tải chi tiết khuyến mãi.')
      }

      const nextPromotion = mapAdminPromotion(response.data)

      setFormState({
        isOpen: true,
        mode: 'edit',
        promotion: nextPromotion,
      })
      setFormValues(createInitialAdminPromotionFormValues(nextPromotion))
      setFormErrors({})
      setFeedback(createAdminPromotionFeedback())
    } catch (loadError) {
      const nextMessage = loadError?.message ?? 'Không thể mở form chỉnh sửa khuyến mãi.'

      setError(nextMessage)
      setFeedback(createAdminPromotionFeedback('error', nextMessage))
    } finally {
      setActionLoading(false)
    }
  }

  function closeForm() {
    setFormState(createClosedFormState())
    setFormValues(createInitialAdminPromotionFormValues())
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

  async function submitPromotionForm() {
    const isCreateMode = formState.mode !== 'edit'
    const nextErrors = validateAdminPromotionForm(formValues, { isCreateMode })

    setFormErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setActionLoading(true)
    setError('')

    try {
      const payload = buildAdminPromotionPayloadFromForm(formValues, {
        includeStatus: isCreateMode,
      })
      const response = isCreateMode
        ? await createAdminPromotion(payload)
        : await updateAdminPromotion(formState.promotion.id, payload)

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể lưu khuyến mãi.')
      }

      const nextPromotion = mapAdminPromotion(response.data)
      const nextPage = isCreateMode ? 1 : currentPage

      setFeedback(
        createAdminPromotionFeedback(
          'success',
          `${response.message || 'Đã lưu khuyến mãi.'} Mã: ${nextPromotion.code}.`,
        ),
      )
      closeForm()

      if (isCreateMode && currentPage !== 1) {
        setCurrentPage(1)
      }

      await loadPromotionState({
        nextPage,
        nextStatus: statusFilter,
      })
    } catch (saveError) {
      const nextMessage = saveError?.message ?? 'Không thể lưu khuyến mãi lúc này.'

      setError(nextMessage)
      setFeedback(createAdminPromotionFeedback('error', nextMessage))
    } finally {
      setActionLoading(false)
    }
  }

  async function runStatusAction(promotion, nextStatus) {
    if (!promotion?.id || !nextStatus) {
      return
    }

    setActionLoading(true)
    setError('')

    try {
      const response = await changeAdminPromotionStatus(promotion.id, {
        status: nextStatus,
      })

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể cập nhật trạng thái khuyến mãi.')
      }

      const nextPromotion = mapAdminPromotion(response.data)

      setFeedback(
        createAdminPromotionFeedback(
          'success',
          `${response.message || 'Đã cập nhật trạng thái khuyến mãi.'} Mã: ${nextPromotion.code}.`,
        ),
      )
      await loadPromotionState({
        nextPage: currentPage,
        nextStatus: statusFilter,
      })
    } catch (actionError) {
      const nextMessage = actionError?.message ?? 'Không thể cập nhật trạng thái khuyến mãi lúc này.'

      setError(nextMessage)
      setFeedback(createAdminPromotionFeedback('error', nextMessage))
    } finally {
      setActionLoading(false)
    }
  }

  const promotions = useMemo(() => {
    const filteredPromotions = promotionItems.filter((promotion) =>
      matchesAdminPromotionSearch(promotion, searchQuery),
    )

    return sortAdminPromotions(filteredPromotions, sortOrder)
  }, [promotionItems, searchQuery, sortOrder])
  const overview = useMemo(
    () => createAdminPromotionOverview(summaryPromotionItems),
    [summaryPromotionItems],
  )
  const pageNumbers = useMemo(
    () => createAdminPromotionPageNumbers(pagination.total_pages),
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
    const end = Math.min(start + promotionItems.length - 1, pagination.total)

    return { end, start }
  }, [pagination.limit, pagination.total, promotionItems.length, safeCurrentPage])

  return {
    actionLoading,
    closeForm,
    currentPage,
    error,
    feedback,
    formErrors,
    formState,
    formValues,
    loading,
    openCreateForm,
    openEditForm,
    overview,
    pageNumbers,
    pagination: {
      ...pagination,
      page: safeCurrentPage,
    },
    promotions,
    reloadPromotions,
    resetFilters,
    resultRange,
    runStatusAction,
    searchQuery,
    setCurrentPage,
    setSearchQuery,
    setSortOrder,
    setStatusFilter,
    sortOrder,
    statusFilter,
    submitPromotionForm,
    updateFormField,
  }
}
