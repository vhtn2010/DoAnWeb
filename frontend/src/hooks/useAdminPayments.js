import { useEffect, useMemo, useState } from 'react'
import {
  ADMIN_PAYMENT_PAGE_SIZE,
  ADMIN_PAYMENT_STATUSES,
} from '../constants/adminPayments.js'
import {
  createAdminPaymentPageNumbers,
  mapAdminPayment,
  mapAdminPaymentDetail,
  matchesAdminPaymentSearch,
} from '../mappers/adminPaymentMappers.js'
import {
  getAdminPaymentDetail,
  getAdminPaymentProof,
  listAdminPayments,
} from '../repositories/adminPaymentRepository.js'

function createInitialPagination() {
  return {
    has_next: false,
    limit: ADMIN_PAYMENT_PAGE_SIZE,
    page: 1,
    total: 0,
    total_pages: 0,
  }
}

export default function useAdminPayments() {
  const [payments, setPayments] = useState([])
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilterState] = useState(ADMIN_PAYMENT_STATUSES.all)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState(() => createInitialPagination())
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isActive = true

    async function loadPayments() {
      setLoading(true)
      setError('')

      try {
        const response = await listAdminPayments({
          limit: ADMIN_PAYMENT_PAGE_SIZE,
          page: currentPage,
          status: statusFilter,
        })

        if (!isActive) {
          return
        }

        if (!response.success) {
          throw new Error(response.message || 'Không thể tải danh sách giao dịch.')
        }

        const nextPayments = Array.isArray(response.data)
          ? response.data.map((payment) => mapAdminPayment(payment))
          : []

        setPayments(nextPayments)
        setPagination(response.meta ?? createInitialPagination())
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setPayments([])
        setPagination(createInitialPagination())
        setError(loadError?.message ?? 'Không thể tải danh sách giao dịch lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadPayments()

    return () => {
      isActive = false
    }
  }, [currentPage, reloadKey, statusFilter])

  const visiblePayments = useMemo(
    () => payments.filter((payment) => matchesAdminPaymentSearch(payment, searchQuery)),
    [payments, searchQuery],
  )
  const pageNumbers = useMemo(
    () => createAdminPaymentPageNumbers(pagination.total_pages),
    [pagination.total_pages],
  )

  function setStatusFilter(value) {
    setStatusFilterState(value)
    setCurrentPage(1)
  }

  function resetFilters() {
    setSearchQuery('')
    setStatusFilterState(ADMIN_PAYMENT_STATUSES.all)
    setCurrentPage(1)
  }

  function reloadPayments() {
    setReloadKey((currentKey) => currentKey + 1)
  }

  function clearSelectedPayment() {
    setSelectedPayment(null)
  }

  async function selectPayment(payment) {
    setDetailLoading(true)
    setError('')

    try {
      const detailResponse = await getAdminPaymentDetail(payment.id)

      if (!detailResponse.success || !detailResponse.data) {
        throw new Error(detailResponse.message || 'Không thể tải chi tiết giao dịch.')
      }

      let proofData = null

      if (detailResponse.data.proof_summary || payment.hasProof) {
        const proofResponse = await getAdminPaymentProof(payment.id)

        if (!proofResponse.success || !proofResponse.data) {
          throw new Error(
            proofResponse.message || 'Khong the tai minh chung thanh toan.',
          )
        }

        proofData = proofResponse.data
      }

      setSelectedPayment(mapAdminPaymentDetail(detailResponse.data, proofData))
      setFeedback(`Đã tải chi tiết giao dịch ${detailResponse.data.payment_code}.`)
    } catch (detailError) {
      const nextMessage = detailError?.message ?? 'Không thể tải chi tiết giao dịch lúc này.'

      setSelectedPayment(payment)
      setError(nextMessage)
      setFeedback(nextMessage)
    } finally {
      setDetailLoading(false)
    }
  }

  return {
    currentPage,
    detailLoading,
    error,
    feedback,
    loading,
    pageNumbers,
    pagination,
    payments: visiblePayments,
    rawPayments: payments,
    reloadPayments,
    resetFilters,
    searchQuery,
    selectedPayment,
    selectPayment,
    clearSelectedPayment,
    setCurrentPage,
    setSearchQuery,
    setStatusFilter,
    statusFilter,
  }
}
