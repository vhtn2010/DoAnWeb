import { useMemo, useState } from 'react'
import {
  AdminActionIconButton,
  AdminActionIconGroup,
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminField,
  AdminFilterBar,
  AdminInput,
  AdminPageHeader,
  AdminPagination,
  AdminSectionHeader,
  AdminSegmentedControl,
  AdminSearchInput,
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

const currencyFormatter = new Intl.NumberFormat('vi-VN')
const dateFormatter = new Intl.DateTimeFormat('vi-VN')

function ProcessIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M4 7h16M7 11h10M8 17h4m7-2 2 2 3-4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function formatCurrency(value) {
  return `${currencyFormatter.format(value)} ₫`
}

function formatDate(value) {
  return dateFormatter.format(new Date(`${value}T00:00:00+07:00`))
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function AdminRefundsPage() {
  const [requests, setRequests] = useState(ADMIN_REFUND_REQUESTS)
  const [selectedId, setSelectedId] = useState(ADMIN_REFUND_REQUESTS[1]?.id ?? '')
  const [statusFilter, setStatusFilter] = useState(ADMIN_REFUND_STATUSES.all)
  const [searchQuery, setSearchQuery] = useState('')
  const [detailNote, setDetailNote] = useState('')
  const selectedRequest =
    requests.find((request) => request.id === selectedId) ?? requests[0]

  const filteredRequests = useMemo(() => {
    const query = normalizeText(searchQuery.trim())

    return requests.filter((request) => {
      const matchesStatus =
        statusFilter === ADMIN_REFUND_STATUSES.all || request.status === statusFilter
      const matchesSearch =
        query.length === 0 ||
        normalizeText(`${request.bookingCode} ${request.customerName} ${request.customerEmail}`).includes(query)

      return matchesStatus && matchesSearch
    })
  }, [requests, searchQuery, statusFilter])

  function resetFilters() {
    setSearchQuery('')
    setStatusFilter(ADMIN_REFUND_STATUSES.all)
  }

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
        eyebrow="Tài chính"
        title="Yêu cầu Hoàn tiền"
        subtitle="Quản lý và xử lý các yêu cầu hoàn tiền từ khách hàng."
        actions={<AdminButton variant="secondary">Xuất báo cáo</AdminButton>}
      />

      <AdminFilterBar
        aria-label="Bộ lọc yêu cầu hoàn tiền"
        actions={
          <AdminButton
            variant="secondary"
            onClick={resetFilters}
          >
            Đặt lại
          </AdminButton>
        }
      >
        <AdminSegmentedControl
          ariaLabel="Lọc trạng thái hoàn tiền"
          options={ADMIN_REFUND_STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <AdminField className="admin-ops-page__search" label="Tìm kiếm">
          <AdminSearchInput
            placeholder="Mã đơn, khách hàng, email..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </AdminField>
      </AdminFilterBar>

      <div className="admin-ops-page__split">
        <AdminCard className="admin-ops-page__table-card" padding="lg">
          <AdminSectionHeader
            title="Danh sách Yêu cầu hoàn tiền"
            subtitle={`Hiển thị ${filteredRequests.length} trong số 26 giao dịch`}
          />
          <AdminTable
            tableClassName="admin-refunds-page__table"
            columns={[
              { key: 'code', label: 'Mã đơn' },
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
                description="Thử đổi trạng thái hoặc từ khóa tìm kiếm."
                action={
                  <AdminButton variant="secondary" onClick={resetFilters}>
                    Đặt lại bộ lọc
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
                  <td>{formatCurrency(request.originalAmount)}</td>
                  <td>{request.reason}</td>
                  <td>{formatDate(request.requestedAt)}</td>
                  <td>
                    <AdminStatusBadge tone={status.tone}>{status.label}</AdminStatusBadge>
                  </td>
                  <td>
                    <AdminActionIconButton
                      label="Xử lý hoàn tiền"
                      variant="secondary"
                      onClick={() => setSelectedId(request.id)}
                    >
                      <ProcessIcon />
                    </AdminActionIconButton>
                  </td>
                </tr>
              )
            })}
          </AdminTable>
          <AdminPagination currentPage={1} pages={[1, 2, 3]} totalPages={3} />
        </AdminCard>

        {selectedRequest ? (
          <AdminCard className="admin-refunds-page__processor" padding="lg">
            <AdminSectionHeader
              title="Xử lý Hoàn tiền"
              subtitle={`Mã giao dịch #${selectedRequest.bookingCode}`}
            />
            <div className="admin-ops-page__summary-box">
              <p><span>Khách hàng:</span> <strong>{selectedRequest.customerName}</strong></p>
              <p><span>Dịch vụ:</span> <strong>{selectedRequest.serviceName}</strong></p>
              <p><span>Gốc:</span> <strong>{formatCurrency(selectedRequest.originalAmount)}</strong></p>
            </div>
            <AdminField label="Lý do hoàn tiền">
              <AdminInput readOnly value="Khách hàng hủy dịch vụ (>24h)" />
            </AdminField>
            <AdminField label="Ghi chú chi tiết">
              <AdminTextarea
                placeholder="Nhập chi tiết lý do..."
                value={detailNote}
                onChange={(event) => setDetailNote(event.target.value)}
              />
            </AdminField>
            <AdminField helper="Đã trừ 10% phí dịch vụ theo chính sách hủy tour." label="Số tiền hoàn trả (VND)">
              <AdminInput readOnly value={formatCurrency(selectedRequest.refundAmount)} />
            </AdminField>
            <AdminActionIconGroup className="admin-ops-page__actions">
              <AdminButton
                variant="success"
                onClick={() => updateStatus(selectedRequest, ADMIN_REFUND_STATUSES.completed)}
              >
                Xác nhận hoàn tiền
              </AdminButton>
              <AdminButton
                variant="danger"
                onClick={() => updateStatus(selectedRequest, ADMIN_REFUND_STATUSES.processing)}
              >
                Từ chối yêu cầu
              </AdminButton>
            </AdminActionIconGroup>
          </AdminCard>
        ) : null}
      </div>
    </main>
  )
}

export default AdminRefundsPage
