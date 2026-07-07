import { useEffect, useMemo, useState } from 'react'
import { ADMIN_SERVICE_SUMMARY_LIMIT } from '../constants/adminServices.js'
import { SERVICE_STATUSES } from '../constants/serviceStatuses.js'
import {
  ADMIN_SERVICE_REVIEW_TYPE_ALL,
  createAdminServiceReviewTypeOptions,
  getAdminServiceReviewTypeLabel,
  mapAdminServiceReviewItem,
} from '../mappers/adminServiceReviewMappers.js'
import {
  approveService,
  listAdminServices,
  rejectService,
} from '../repositories/adminServiceRepository.js'

function createFeedback(tone = 'info', message = '') {
  return { message, tone }
}

function getActionKey(itemId, action) {
  return `${itemId}:${action}`
}

export default function useAdminServiceReview() {
  const [activeType, setActiveType] = useState(ADMIN_SERVICE_REVIEW_TYPE_ALL)
  const [reviewItems, setReviewItems] = useState([])
  const [notes, setNotes] = useState({})
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [actionLoadingKey, setActionLoadingKey] = useState('')
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(() =>
    createFeedback('info', 'Danh sách dịch vụ chờ duyệt đang được đồng bộ với Admin Service API.'),
  )
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isActive = true

    async function loadReviewItems() {
      setLoading(true)
      setError('')

      try {
        const response = await listAdminServices({
          limit: ADMIN_SERVICE_SUMMARY_LIMIT,
          page: 1,
          status: SERVICE_STATUSES.pendingReview,
        })

        if (!isActive) {
          return
        }

        if (!response.success) {
          throw new Error(response.message || 'Không thể tải danh sách dịch vụ chờ duyệt.')
        }

        const nextItems = Array.isArray(response.data)
          ? response.data.map(mapAdminServiceReviewItem)
          : []

        setReviewItems(nextItems)
        setFeedback(createFeedback('info', `Có ${nextItems.length} dịch vụ đang chờ phê duyệt.`))
      } catch (loadError) {
        if (!isActive) {
          return
        }

        const nextMessage = loadError?.message ?? 'Không thể tải dữ liệu phê duyệt dịch vụ lúc này.'

        setReviewItems([])
        setError(nextMessage)
        setFeedback(createFeedback('error', nextMessage))
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadReviewItems()

    return () => {
      isActive = false
    }
  }, [reloadKey])

  function reloadReviewItems() {
    setReloadKey((currentKey) => currentKey + 1)
  }

  function updateNote(itemId, value) {
    setNotes((currentNotes) => ({
      ...currentNotes,
      [itemId]: value,
    }))
    setErrors((currentErrors) => {
      if (!currentErrors[itemId]) {
        return currentErrors
      }

      const nextErrors = { ...currentErrors }
      delete nextErrors[itemId]
      return nextErrors
    })
  }

  function removeReviewedItem(itemId) {
    setReviewItems((currentItems) => currentItems.filter((item) => item.id !== itemId))
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors[itemId]
      return nextErrors
    })
    setNotes((currentNotes) => {
      const nextNotes = { ...currentNotes }
      delete nextNotes[itemId]
      return nextNotes
    })
  }

  async function approveReviewItem(item) {
    const note = notes[item.id]?.trim() ?? ''
    const actionKey = getActionKey(item.id, 'approve')

    setActionLoadingKey(actionKey)
    setError('')

    try {
      const response = await approveService(item.id, note ? { note } : {})

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể phê duyệt dịch vụ.')
      }

      removeReviewedItem(item.id)
      setFeedback(createFeedback('success', `Đã phê duyệt dịch vụ "${item.title}".`))
    } catch (approveError) {
      const nextMessage = approveError?.message ?? 'Không thể phê duyệt dịch vụ lúc này.'

      setError(nextMessage)
      setFeedback(createFeedback('error', nextMessage))
    } finally {
      setActionLoadingKey('')
    }
  }

  async function rejectReviewItem(item) {
    const reason = notes[item.id]?.trim() ?? ''

    if (!reason) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [item.id]: 'Nhập lý do trước khi từ chối.',
      }))
      return
    }

    const actionKey = getActionKey(item.id, 'reject')

    setActionLoadingKey(actionKey)
    setError('')

    try {
      const response = await rejectService(item.id, { reason })

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể từ chối dịch vụ.')
      }

      removeReviewedItem(item.id)
      setFeedback(createFeedback('success', `Đã từ chối dịch vụ "${item.title}".`))
    } catch (rejectError) {
      const nextMessage = rejectError?.message ?? 'Không thể từ chối dịch vụ lúc này.'

      setError(nextMessage)
      setFeedback(createFeedback('error', nextMessage))
    } finally {
      setActionLoadingKey('')
    }
  }

  const visibleItems = useMemo(
    () =>
      activeType === ADMIN_SERVICE_REVIEW_TYPE_ALL
        ? reviewItems
        : reviewItems.filter((item) => item.type === activeType),
    [activeType, reviewItems],
  )
  const reviewTypeOptions = useMemo(
    () => createAdminServiceReviewTypeOptions(reviewItems),
    [reviewItems],
  )
  const activeTypeLabel = activeType === ADMIN_SERVICE_REVIEW_TYPE_ALL
    ? 'dịch vụ'
    : getAdminServiceReviewTypeLabel(activeType).toLowerCase()

  return {
    actionLoadingKey,
    activeType,
    activeTypeLabel,
    approveReviewItem,
    error,
    errors,
    feedback,
    isActionLoading: (itemId, action) => actionLoadingKey === getActionKey(itemId, action),
    isMutating: Boolean(actionLoadingKey),
    loading,
    notes,
    rejectReviewItem,
    reloadReviewItems,
    resetFilters,
    reviewItems,
    reviewTypeOptions,
    setActiveType,
    updateNote,
    visibleItems,
  }
}
