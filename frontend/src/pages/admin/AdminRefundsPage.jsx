import { useState } from 'react'
import {
  AdminActionIconButton,
  AdminActionIconGroup,
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminErrorState,
  AdminField,
  AdminInput,
  AdminPageHeader,
  AdminPagination,
  AdminSegmentedControl,
  AdminStatusBadge,
  AdminTable,
  AdminTextarea,
} from '../../components/admin/ui/index.js'
import {
  ADMIN_REFUND_STATUS_OPTIONS,
  ADMIN_REFUND_STATUSES,
} from '../../constants/adminRefunds.js'
import useAdminRefunds from '../../hooks/useAdminRefunds.js'
import {
  getAdminRefundStatusMeta,
} from '../../mappers/adminRefundMappers.js'

const tableCurrencyFormatter = new Intl.NumberFormat('en-US')
const panelCurrencyFormatter = new Intl.NumberFormat('vi-VN')
const dateFormatter = new Intl.DateTimeFormat('vi-VN')

function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function ViewIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="m5 12.5 4.2 4.2L19 7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
  )
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="m6 6 12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </svg>
  )
}

function formatTableCurrency(value) {
  return `${tableCurrencyFormatter.format(Number(value || 0))}₫`
}

function formatPanelCurrency(value) {
  return `${panelCurrencyFormatter.format(Number(value || 0))} ₫`
}

function formatPanelAmount(value) {
  return panelCurrencyFormatter.format(Number(value || 0))
}

function formatDate(value) {
  if (!value) {
    return 'Chưa cập nhật'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Chưa cập nhật'
  }

  return dateFormatter.format(date)
}

function AdminRefundsPage() {
  const [isProcessorOpen, setIsProcessorOpen] = useState(false)
  const {
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
    refundStatusFilter,
    refunds,
    reloadRefunds,
    runRefundAction,
    selectRefund,
    selectedRequest,
    setCurrentPage,
    setDetailNote,
    setRefundStatusFilter,
  } = useAdminRefunds()
  const selectedStatus = getAdminRefundStatusMeta(selectedRequest?.status)

  function openRefundProcessor(request) {
    selectRefund(request)
    setIsProcessorOpen(true)
  }

  function closeRefundProcessor() {
    if (!actionLoading) {
      setIsProcessorOpen(false)
    }
  }

  function handleRefundRowKeyDown(event, request) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openRefundProcessor(request)
    }
  }

  return (
    <main className="admin-ops-page admin-refunds-page">
      <AdminPageHeader
        className="admin-refunds-page__header"
        title="Yêu cầu Hoàn tiền"
        subtitle="Quản lý và xử lý các yêu cầu hoàn tiền từ khách hàng."
        actions={
          <AdminButton
            className="admin-refunds-page__export"
            disabled
            icon={<ExportIcon />}
            variant="secondary"
          >
            Xuất báo cáo
          </AdminButton>
        }
      />

      {error ? (
        <AdminErrorState
          title="Không thể tải dữ liệu hoàn tiền"
          description={error}
          action={
            <AdminButton loading={loading} variant="secondary" onClick={reloadRefunds}>
              Thử lại
            </AdminButton>
          }
        />
      ) : null}

      {feedback ? (
        <p className="admin-ops-page__result-note" role="status">
          {feedback}
        </p>
      ) : null}

      <div className="admin-refunds-page__content">
        <AdminCard className="admin-ops-page__table-card" padding="lg">
          <div className="admin-refunds-page__table-heading">
            <h2>Danh sách Yêu cầu hoàn tiền</h2>
            <AdminSegmentedControl
              ariaLabel="Lọc trạng thái hoàn tiền"
              className="admin-refunds-page__status-tabs"
              disabled={loading}
              options={ADMIN_REFUND_STATUS_OPTIONS}
              value={refundStatusFilter}
              onChange={setRefundStatusFilter}
            />
          </div>

          <AdminTable
            tableClassName="admin-refunds-page__table"
            columns={[
              { key: 'code', label: 'Mã Đơn' },
              { key: 'customer', label: 'Khách hàng' },
              { key: 'amount', label: 'Số tiền' },
              { key: 'reason', label: 'Lý do' },
              { key: 'date', label: 'Ngày yêu cầu' },
              { key: 'status', label: 'Trạng thái' },
              { key: 'action', label: 'Thao tác' },
            ]}
            emptyState={
              <AdminEmptyState
                title="Không có yêu cầu hoàn tiền phù hợp"
                description="Thử chuyển về tab Tất cả để xem toàn bộ giao dịch."
                action={
                  <AdminButton
                    variant="secondary"
                    onClick={() => setRefundStatusFilter(ADMIN_REFUND_STATUSES.all)}
                  >
                    Xem tất cả
                  </AdminButton>
                }
              />
            }
            loading={loading}
            rows={refunds}
          >
            {refunds.map((request) => {
              const status = getAdminRefundStatusMeta(request.status)

              return (
                <tr
                  className={
                    request.id === selectedRequest?.id
                      ? 'admin-ops-table__row admin-ops-table__row--selected admin-refunds-page__clickable-row'
                      : 'admin-ops-table__row admin-refunds-page__clickable-row'
                  }
                  key={request.id}
                  tabIndex={0}
                  onClick={() => openRefundProcessor(request)}
                  onKeyDown={(event) => handleRefundRowKeyDown(event, request)}
                >
                  <td><strong>#{request.bookingCode || request.refundCode}</strong></td>
                  <td>
                    <div className="admin-ops-page__stack">
                      <strong>{request.customerName}</strong>
                      <span>{request.customerEmail || request.paymentCode}</span>
                    </div>
                  </td>
                  <td><strong>{formatTableCurrency(request.refundAmount)}</strong></td>
                  <td>{request.reason}</td>
                  <td>{formatDate(request.requestedAt)}</td>
                  <td>
                    <AdminStatusBadge tone={status.tone}>{status.label}</AdminStatusBadge>
                  </td>
                  <td>
                    <AdminActionIconGroup className="admin-refunds-page__row-actions">
                      <AdminActionIconButton
                        label="Xem yêu cầu hoàn tiền"
                        loading={detailLoading && selectedRequest?.id === request.id}
                        onClick={(event) => {
                          event.stopPropagation()
                          openRefundProcessor(request)
                        }}
                      >
                        <ViewIcon />
                      </AdminActionIconButton>
                    </AdminActionIconGroup>
                  </td>
                </tr>
              )
            })}
          </AdminTable>

          <div className="admin-refunds-page__table-footer">
            <p>
              {pagination.total > 0
                ? `Hiển thị ${refunds.length} trong tổng ${pagination.total} yêu cầu`
                : 'Chưa có yêu cầu để hiển thị'}
            </p>
            <AdminPagination
              currentPage={pagination.page || currentPage}
              pages={pageNumbers}
              totalPages={pagination.total_pages}
              onPageChange={setCurrentPage}
            />
          </div>
        </AdminCard>
      </div>

      {isProcessorOpen && selectedRequest ? (
        <div
          className="admin-refunds-page__modal-backdrop"
          role="presentation"
          onClick={closeRefundProcessor}
        >
          <AdminCard
            className="admin-refunds-page__processor admin-refunds-page__processor--modal"
            padding="lg"
            role="dialog"
            aria-labelledby="admin-refunds-processor-title"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-refunds-page__processor-hero">
              <div className="admin-refunds-page__processor-title">
                <h2 id="admin-refunds-processor-title">Xử lý Hoàn tiền</h2>
                <AdminStatusBadge tone={selectedStatus.tone}>{selectedStatus.label}</AdminStatusBadge>
              </div>
              <button
                className="admin-refunds-page__modal-close"
                disabled={actionLoading}
                type="button"
                aria-label="Đóng popup xử lý hoàn tiền"
                onClick={closeRefundProcessor}
              >
                <XIcon />
              </button>
              <div className="admin-refunds-page__transaction-card">
                <span>MÃ HOÀN TIỀN</span>
                <strong>#{selectedRequest.refundCode}</strong>
              </div>
            </div>

            <div className="admin-refunds-page__processor-body">
              <div className="admin-ops-page__summary-box">
                <p><span>Khách hàng:</span> <strong>{selectedRequest.customerName}</strong></p>
                <p><span>Dịch vụ:</span> <strong>{selectedRequest.serviceName}</strong></p>
                <p><span>Thanh toán:</span> <strong>{selectedRequest.paymentCode || 'Chưa có'}</strong></p>
                <p><span>Gốc:</span> <strong>{formatPanelCurrency(selectedRequest.originalAmount)}</strong></p>
              </div>

              <AdminField label="LÝ DO HOÀN TIỀN">
                <AdminInput readOnly value={selectedRequest.reason} />
              </AdminField>

              <AdminField label="GHI CHÚ XỬ LÝ">
                <AdminTextarea
                  placeholder="Nhập ghi chú xử lý hoặc lý do từ chối/thất bại..."
                  readOnly={detailLoading}
                  value={detailNote}
                  onChange={(event) => setDetailNote(event.target.value)}
                />
              </AdminField>

              <AdminField
                className="admin-refunds-page__amount-field"
                helper="Số tiền gửi lên backend khi duyệt yêu cầu hoàn tiền."
                label="SỐ TIỀN HOÀN TRẢ (VND)"
              >
                <div className="admin-refunds-page__amount-input">
                  <AdminInput readOnly value={formatPanelAmount(selectedRequest.refundAmount)} />
                  <span>₫</span>
                </div>
              </AdminField>

              <AdminActionIconGroup className="admin-ops-page__actions">
                {actionConfig.primary ? (
                  <AdminButton
                    className="admin-refunds-page__confirm"
                    icon={<CheckIcon />}
                    loading={actionLoading}
                    variant="primary"
                    onClick={() => runRefundAction(actionConfig.primary.action)}
                  >
                    {actionConfig.primary.label}
                  </AdminButton>
                ) : null}
                {actionConfig.secondary ? (
                  <AdminButton
                    className="admin-refunds-page__reject"
                    icon={<XIcon />}
                    loading={actionLoading}
                    variant="secondary"
                    onClick={() => runRefundAction(actionConfig.secondary.action)}
                  >
                    {actionConfig.secondary.label}
                  </AdminButton>
                ) : null}
              </AdminActionIconGroup>
            </div>
          </AdminCard>
        </div>
      ) : null}
    </main>
  )
}

export default AdminRefundsPage
