import {
  ADMIN_REFUND_STATUS_META,
  ADMIN_REFUND_STATUSES,
} from '../constants/adminRefunds.js'

function getDisplayValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '') ?? ''
}

function getInternalNoteText(internalNote) {
  if (!internalNote) {
    return ''
  }

  if (Array.isArray(internalNote)) {
    return internalNote
      .map((entry) => entry?.note)
      .filter(Boolean)
      .join('\n')
  }

  return internalNote.note || ''
}

export function mapAdminRefund(refund = {}) {
  const bookingCode = refund.booking?.booking_code ?? ''
  const requestedBy = refund.requested_by ?? refund.booking?.customer ?? {}
  const createdAt = refund.created_at || refund.processed_at || ''

  return {
    approvedBy: refund.approved_by ?? null,
    bookingCode,
    bookingStatus: refund.booking?.status || '',
    customerEmail: requestedBy.email || refund.booking?.contact_email || '',
    customerName:
      getDisplayValue(
        requestedBy.full_name,
        requestedBy.email,
        refund.booking?.contact_name,
        'Khách chưa có tên',
      ),
    detailNote: getInternalNoteText(refund.internal_note),
    id: refund.id,
    originalAmount: Number(refund.payment?.amount || refund.booking?.total_amount || refund.amount || 0),
    paymentCode: refund.payment?.payment_code || '',
    paymentMethod: refund.payment?.payment_method || '',
    paymentStatus: refund.payment?.status || '',
    processedAt: refund.processed_at || '',
    providerRefundId: refund.provider_refund_id || '',
    raw: refund,
    reason: refund.reason || 'Chưa có lý do',
    refundAmount: Number(refund.amount || 0),
    refundCode: refund.refund_code || refund.id,
    requestedAt: createdAt,
    serviceName: bookingCode ? `Đơn ${bookingCode}` : 'Dịch vụ đã thanh toán',
    status: refund.status,
  }
}

export function createAdminRefundPageNumbers(totalPages = 1) {
  return Array.from({ length: Math.max(Number(totalPages) || 1, 1) }, (_, index) => index + 1)
}

export function getAdminRefundStatusMeta(status) {
  return ADMIN_REFUND_STATUS_META[status] ?? {
    label: status || ADMIN_REFUND_STATUSES.requested,
    tone: 'neutral',
  }
}

export function getAdminRefundActionConfig(refund) {
  if (!refund) {
    return {
      primary: null,
      secondary: null,
    }
  }

  if (refund.status === ADMIN_REFUND_STATUSES.requested) {
    return {
      primary: {
        action: 'approve',
        label: 'Duyệt hoàn tiền',
      },
      secondary: {
        action: 'reject',
        label: 'Từ chối yêu cầu',
      },
    }
  }

  if (refund.status === ADMIN_REFUND_STATUSES.approved) {
    return {
      primary: {
        action: 'processing',
        label: 'Chuyển sang xử lý',
      },
      secondary: null,
    }
  }

  if (refund.status === ADMIN_REFUND_STATUSES.processing) {
    return {
      primary: {
        action: 'success',
        label: 'Xác nhận hoàn tiền',
      },
      secondary: {
        action: 'failed',
        label: 'Đánh dấu thất bại',
      },
    }
  }

  return {
    primary: {
      action: 'note',
      label: 'Lưu ghi chú',
    },
    secondary: null,
  }
}
