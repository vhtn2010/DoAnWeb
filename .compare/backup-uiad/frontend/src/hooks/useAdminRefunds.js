import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ADMIN_REFUND_PAGE_SIZE,
  ADMIN_REFUND_STATUSES,
} from '../constants/adminRefunds.js'
import {
  createAdminRefundPageNumbers,
  getAdminRefundActionConfig,
  mapAdminRefund,
} from '../mappers/adminRefundMappers.js'
import {
  approveAdminRefund,
  getAdminRefundDetail,
  listAdminRefunds,
  markAdminRefundFailed,
  markAdminRefundProcessing,
  markAdminRefundSuccess,
  rejectAdminRefund,
  updateAdminRefundNote,
} from '../repositories/adminRefundRepository.js'

function createInitialPagination() {
  return {
    has_next: false,
    limit: ADMIN_REFUND_PAGE_SIZE,
    page: 1,
    total: 0,
    total_pages: 0,
  }
}

function getActionNote(detailNote, fallback) {
  return detailNote.trim() || fallback
}

export default function useAdminRefunds() {
  const [refunds, setRefunds] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [selectedRefundDetail, setSelectedRefundDetail] = useState(null)
  const [statusFilter, setStatusFilterState] = useState(ADMIN_REFUND_STATUSES.all)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState(() => createInitialPagination())
  const [detailNote, setDetailNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [detailReloadKey, setDetailReloadKey] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const selectedIdRef = useRef('')

  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  const selectedRequest = useMemo(
    () =>
      selectedRefundDetail ||
      refunds.find((refund) => refund.id === selectedId) ||
      refunds[0] ||
      null,
    [refunds, selectedId, selectedRefundDetail],
  )
  const actionConfig = useMemo(
    () => getAdminRefundActionConfig(selectedRequest),
    [selectedRequest],
  )
  const pageNumbers = useMemo(
    () => createAdminRefundPageNumbers(pagination.total_pages),
    [pagination.total_pages],
  )

  async function loadRefundDetail(refundId) {
    if (!refundId) {
      setSelectedRefundDetail(null)
      setDetailNote('')
      return
    }

    setDetailLoading(true)
    setError('')

    try {
      const response = await getAdminRefundDetail(refundId)

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể tải chi tiết hoàn tiền.')
      }

      const nextRefund = mapAdminRefund(response.data)

      setSelectedRefundDetail(nextRefund)
      setSelectedId(nextRefund.id)
      setDetailNote(nextRefund.detailNote)
    } catch (loadError) {
      const nextMessage = loadError?.message ?? 'Không thể tải chi tiết hoàn tiền lúc này.'

      setError(nextMessage)
      setFeedback(nextMessage)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    let isActive = true

    async function loadRefunds() {
      setLoading(true)
      setError('')

      try {
        const response = await listAdminRefunds({
          limit: ADMIN_REFUND_PAGE_SIZE,
          page: currentPage,
          status: statusFilter,
        })

        if (!isActive) {
          return
        }

        if (!response.success) {
          throw new Error(response.message || 'Không thể tải danh sách hoàn tiền.')
        }

        const nextRefunds = Array.isArray(response.data)
          ? response.data.map((refund) => mapAdminRefund(refund))
          : []
        const currentSelectedId = selectedIdRef.current
        const nextSelectedId = nextRefunds.some((refund) => refund.id === currentSelectedId)
          ? currentSelectedId
          : nextRefunds[0]?.id ?? ''

        setRefunds(nextRefunds)
        setPagination(response.meta ?? createInitialPagination())
        setSelectedId(nextSelectedId)

        if (!nextSelectedId) {
          setSelectedRefundDetail(null)
          setDetailNote('')
        } else {
          const nextSelectedRefund = nextRefunds.find((refund) => refund.id === nextSelectedId)

          setSelectedRefundDetail(nextSelectedRefund ?? null)
          setDetailNote(nextSelectedRefund?.detailNote ?? '')
          setDetailReloadKey((currentKey) => currentKey + 1)
        }
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setRefunds([])
        setSelectedId('')
        setSelectedRefundDetail(null)
        setDetailNote('')
        setPagination(createInitialPagination())
        setError(loadError?.message ?? 'Không thể tải danh sách hoàn tiền lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadRefunds()

    return () => {
      isActive = false
    }
  }, [currentPage, reloadKey, statusFilter])

  useEffect(() => {
    if (!selectedId) {
      return
    }

    loadRefundDetail(selectedId)
  }, [detailReloadKey, selectedId])

  function setStatusFilter(value) {
    setStatusFilterState(value)
    setCurrentPage(1)
    setSelectedRefundDetail(null)
  }

  function selectRefund(refund) {
    setSelectedId(refund.id)
    setSelectedRefundDetail(refund)
    setDetailNote(refund.detailNote)
    setDetailReloadKey((currentKey) => currentKey + 1)
  }

  function reloadRefunds() {
    setReloadKey((currentKey) => currentKey + 1)
  }

  async function runRefundAction(action) {
    if (!selectedRequest) {
      return
    }

    setActionLoading(true)
    setError('')

    try {
      let response

      if (action === 'approve') {
        response = await approveAdminRefund(selectedRequest.id, {
          approvedAmount: selectedRequest.refundAmount,
          note: detailNote.trim() || undefined,
        })
      } else if (action === 'reject') {
        response = await rejectAdminRefund(selectedRequest.id, {
          reason: getActionNote(detailNote, selectedRequest.reason),
        })
      } else if (action === 'processing') {
        response = await markAdminRefundProcessing(selectedRequest.id, {
          note: detailNote.trim() || undefined,
        })
      } else if (action === 'success') {
        response = await markAdminRefundSuccess(selectedRequest.id, {
          note: detailNote.trim() || undefined,
          processedAt: new Date().toISOString(),
        })
      } else if (action === 'failed') {
        response = await markAdminRefundFailed(selectedRequest.id, {
          reason: getActionNote(detailNote, 'Không thể hoàn tiền qua nhà cung cấp.'),
        })
      } else {
        response = await updateAdminRefundNote(selectedRequest.id, {
          note: getActionNote(detailNote, 'Cập nhật ghi chú nội bộ.'),
        })
      }

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể cập nhật hoàn tiền.')
      }

      const nextRefund = mapAdminRefund(response.data)

      setSelectedRefundDetail(nextRefund)
      setDetailNote(nextRefund.detailNote)
      setFeedback(response.message || `Đã cập nhật yêu cầu ${nextRefund.refundCode}.`)
      reloadRefunds()
    } catch (actionError) {
      const nextMessage = actionError?.message ?? 'Không thể cập nhật hoàn tiền lúc này.'

      setError(nextMessage)
      setFeedback(nextMessage)
    } finally {
      setActionLoading(false)
    }
  }

  return {
    actionConfig,
    actionLoading,
    currentPage,
    detailLoading,
    detailNote,
    error,
    feedback,
    loading,
    pageNumbers,
    pagination,
    refundStatusFilter: statusFilter,
    refunds,
    reloadRefunds,
    runRefundAction,
    selectRefund,
    selectedRequest,
    setCurrentPage,
    setDetailNote,
    setRefundStatusFilter: setStatusFilter,
  }
}
