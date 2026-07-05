import { useMemo, useState } from 'react'
import {
  AdminActionIconButton,
  AdminActionIconGroup,
  AdminButton,
  AdminCard,
  AdminEmptyState,
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
  ADMIN_REFUND_REQUESTS,
  ADMIN_REFUND_STATUS_META,
  ADMIN_REFUND_STATUS_OPTIONS,
  ADMIN_REFUND_STATUSES,
} from '../../fixtures/adminOperations.fixtures.js'

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

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="m4 16.5-.8 4.3 4.3-.8L18.7 8.8 15.2 5.3 4 16.5ZM14 6.5l3.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M4 7h16m-9 4v6m4-6v6M6 7l1 14h10l1-14M9 7l1-3h4l1 3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
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
  return `${tableCurrencyFormatter.format(value)}₫`
}

function formatPanelCurrency(value) {
  return `${panelCurrencyFormatter.format(value)} ₫`
}

function formatPanelAmount(value) {
  return panelCurrencyFormatter.format(value)
}

function formatDate(value) {
  return dateFormatter.format(new Date(`${value}T00:00:00+07:00`))
}

function AdminRefundsPage() {
  const [requests, setRequests] = useState(ADMIN_REFUND_REQUESTS)
  const [selectedId, setSelectedId] = useState(ADMIN_REFUND_REQUESTS[1]?.id ?? '')
  const [statusFilter, setStatusFilter] = useState(ADMIN_REFUND_STATUSES.all)
  const [detailNote, setDetailNote] = useState('')
  const selectedRequest =
    requests.find((request) => request.id === selectedId) ?? requests[0]

  const filteredRequests = useMemo(() => {
    if (statusFilter === ADMIN_REFUND_STATUSES.all) {
      return requests
    }

    return requests.filter((request) => request.status === statusFilter)
  }, [requests, statusFilter])

  function updateStatus(request, status) {
    setRequests((currentRequests) =>
      currentRequests.map((currentRequest) =>
        currentRequest.id === request.id
          ? { ...currentRequest, status }
          : currentRequest,
      ),
    )
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
            icon={<ExportIcon />}
            variant="secondary"
          >
            Xuất báo cáo
          </AdminButton>
        }
      />

      <div className="admin-ops-page__split">
        <AdminCard className="admin-ops-page__table-card" padding="lg">
          <div className="admin-refunds-page__table-heading">
            <h2>Danh sách Yêu cầu hoàn tiền</h2>
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
                    onClick={() => setStatusFilter(ADMIN_REFUND_STATUSES.all)}
                  >
                    Xem tất cả
                  </AdminButton>
                }
              />
            }
            rows={filteredRequests}
          >
            {filteredRequests.map((request) => {
              const status = ADMIN_REFUND_STATUS_META[request.status]

              return (
                <tr
                  className={
                    request.id === selectedRequest?.id
                      ? 'admin-ops-table__row admin-ops-table__row--selected'
                      : 'admin-ops-table__row'
                  }
                  key={request.id}
                >
                  <td><strong>#{request.bookingCode}</strong></td>
                  <td>
                    <div className="admin-ops-page__stack">
                      <strong>{request.customerName}</strong>
                      <span>{request.customerEmail}</span>
                    </div>
                  </td>
                  <td><strong>{formatTableCurrency(request.originalAmount)}</strong></td>
                  <td>{request.reason}</td>
                  <td>{formatDate(request.requestedAt)}</td>
                  <td>
                    <AdminStatusBadge tone={status.tone}>{status.label}</AdminStatusBadge>
                  </td>
                  <td>
                    <AdminActionIconGroup className="admin-refunds-page__row-actions">
                      <AdminActionIconButton
                        label="Xem yêu cầu hoàn tiền"
                        onClick={() => setSelectedId(request.id)}
                      >
                        <ViewIcon />
                      </AdminActionIconButton>
                      <AdminActionIconButton
                        label="Sửa yêu cầu hoàn tiền"
                        onClick={() => setSelectedId(request.id)}
                      >
                        <EditIcon />
                      </AdminActionIconButton>
                      <AdminActionIconButton
                        label="Xóa yêu cầu hoàn tiền"
                        onClick={() => setSelectedId(request.id)}
                      >
                        <DeleteIcon />
                      </AdminActionIconButton>
                    </AdminActionIconGroup>
                  </td>
                </tr>
              )
            })}
          </AdminTable>

          <div className="admin-refunds-page__table-footer">
            <AdminSegmentedControl
              ariaLabel="Lọc trạng thái hoàn tiền"
              options={ADMIN_REFUND_STATUS_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
            />
            <p>Hiển thị {filteredRequests.length} trong số 26 giao dịch</p>
            <AdminPagination currentPage={1} pages={[1, 2, 3]} totalPages={3} />
          </div>
        </AdminCard>

        {selectedRequest ? (
          <AdminCard className="admin-refunds-page__processor" padding="lg">
            <div className="admin-refunds-page__processor-hero">
              <div className="admin-refunds-page__processor-title">
                <h2>Xử lý Hoàn tiền</h2>
                <span aria-hidden="true">×</span>
              </div>
              <div className="admin-refunds-page__transaction-card">
                <span>MÃ GIAO DỊCH</span>
                <strong>#{selectedRequest.bookingCode}</strong>
              </div>
            </div>

            <div className="admin-refunds-page__processor-body">
              <div className="admin-ops-page__summary-box">
                <p><span>Khách hàng:</span> <strong>{selectedRequest.customerName}</strong></p>
                <p><span>Dịch vụ:</span> <strong>{selectedRequest.serviceName}</strong></p>
                <p><span>Gốc:</span> <strong>{formatPanelCurrency(selectedRequest.originalAmount)}</strong></p>
              </div>

              <AdminField label="LÝ DO HOÀN TIỀN">
                <AdminInput readOnly value="Khách hàng hủy dịch vụ (>24h)" />
              </AdminField>

              <AdminField label="GHI CHÚ CHI TIẾT">
                <AdminTextarea
                  placeholder="Nhập chi tiết lý do..."
                  value={detailNote}
                  onChange={(event) => setDetailNote(event.target.value)}
                />
              </AdminField>

              <AdminField
                className="admin-refunds-page__amount-field"
                helper="* Đã trừ 10% phí dịch vụ theo chính sách hủy tour."
                label="SỐ TIỀN HOÀN TRẢ (VND)"
              >
                <div className="admin-refunds-page__amount-input">
                  <AdminInput readOnly value={formatPanelAmount(selectedRequest.refundAmount)} />
                  <span>₫</span>
                </div>
              </AdminField>

              <AdminActionIconGroup className="admin-ops-page__actions">
                <AdminButton
                  className="admin-refunds-page__confirm"
                  icon={<CheckIcon />}
                  variant="primary"
                  onClick={() => updateStatus(selectedRequest, ADMIN_REFUND_STATUSES.completed)}
                >
                  XÁC NHẬN HOÀN TIỀN
                </AdminButton>
                <AdminButton
                  className="admin-refunds-page__reject"
                  icon={<XIcon />}
                  variant="secondary"
                  onClick={() => updateStatus(selectedRequest, ADMIN_REFUND_STATUSES.processing)}
                >
                  TỪ CHỐI YÊU CẦU
                </AdminButton>
              </AdminActionIconGroup>
            </div>
          </AdminCard>
        ) : null}
      </div>
    </main>
  )
}

export default AdminRefundsPage
