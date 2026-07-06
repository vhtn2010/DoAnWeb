import {
  AdminActionIconButton,
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminErrorState,
  AdminField,
  AdminFilterBar,
  AdminPageHeader,
  AdminPagination,
  AdminSectionHeader,
  AdminSegmentedControl,
  AdminSearchInput,
  AdminStatusBadge,
  AdminTable,
} from '../../components/admin/ui/index.js'
import {
  ADMIN_PAYMENT_STATUS_OPTIONS,
} from '../../constants/adminPayments.js'
import useAdminPayments from '../../hooks/useAdminPayments.js'
import {
  getAdminPaymentStatusMeta,
} from '../../mappers/adminPaymentMappers.js'

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 0,
})
const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function DetailIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M4 6h16M4 12h10M4 18h7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="m17 15 3 3m1-5.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z"
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
  return `${currencyFormatter.format(Number(value || 0))} ₫`
}

function formatDateTime(value) {
  if (!value) {
    return 'Chưa cập nhật'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Chưa cập nhật'
  }

  return dateTimeFormatter.format(date)
}

function AdminPaymentsPage() {
  const {
    currentPage,
    detailLoading,
    error,
    feedback,
    loading,
    pageNumbers,
    pagination,
    payments,
    reloadPayments,
    resetFilters,
    searchQuery,
    selectedPayment,
    selectPayment,
    setCurrentPage,
    setSearchQuery,
    setStatusFilter,
    statusFilter,
  } = useAdminPayments()

  return (
    <main className="admin-ops-page">
      <AdminPageHeader
        eyebrow="Tài chính"
        title="Lịch sử Giao dịch & Hoàn tiền"
        subtitle="Theo dõi dòng tiền và xử lý các yêu cầu hoàn trả dịch vụ từ khách hàng."
        actions={<AdminButton disabled variant="secondary">Xuất báo cáo</AdminButton>}
      />

      {error ? (
        <AdminErrorState
          title="Không thể tải dữ liệu giao dịch"
          description={error}
          action={
            <AdminButton loading={loading} variant="secondary" onClick={reloadPayments}>
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

      <AdminFilterBar
        aria-label="Bộ lọc giao dịch"
        actions={
          <AdminButton variant="secondary" onClick={resetFilters}>
            Đặt lại
          </AdminButton>
        }
      >
        <AdminSegmentedControl
          ariaLabel="Lọc trạng thái giao dịch"
          disabled={loading}
          options={ADMIN_PAYMENT_STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <AdminField className="admin-ops-page__search" label="Tìm kiếm">
          <AdminSearchInput
            placeholder="Mã giao dịch, khách hàng, mã đơn..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </AdminField>
      </AdminFilterBar>

      <AdminCard className="admin-ops-page__table-card" padding="lg">
        <AdminSectionHeader
          title="Danh sách Giao dịch"
          subtitle={
            pagination.total > 0
              ? `Hiển thị ${payments.length} trong tổng ${pagination.total} giao dịch`
              : 'Chưa có giao dịch phù hợp'
          }
        />
        <AdminTable
          columns={[
            { key: 'code', label: 'Mã giao dịch' },
            { key: 'customer', label: 'Khách hàng / Đơn' },
            { key: 'amount', label: 'Số tiền' },
            { key: 'method', label: 'Phương thức' },
            { key: 'status', label: 'Trạng thái' },
            { key: 'time', label: 'Thời gian' },
            { key: 'action', label: 'Hành động' },
          ]}
          emptyState={
            <AdminEmptyState
              title="Không có giao dịch phù hợp"
              description="Thử đổi trạng thái hoặc từ khóa tìm kiếm."
              action={
                <AdminButton variant="secondary" onClick={resetFilters}>
                  Đặt lại bộ lọc
                </AdminButton>
              }
            />
          }
          loading={loading}
          rows={payments}
        >
          {payments.map((transaction) => {
            const status = getAdminPaymentStatusMeta(transaction.status)

            return (
              <tr className="admin-ops-table__row" key={transaction.id}>
                <td><strong>#{transaction.code}</strong></td>
                <td>
                  <div className="admin-ops-page__stack">
                    <strong>{transaction.customerName}</strong>
                    <span>{transaction.serviceName}</span>
                  </div>
                </td>
                <td>{formatCurrency(transaction.amount)}</td>
                <td>{transaction.method}</td>
                <td><AdminStatusBadge tone={status.tone}>{status.label}</AdminStatusBadge></td>
                <td>{formatDateTime(transaction.timestamp)}</td>
                <td>
                  <AdminActionIconButton
                    label={transaction.actionLabel}
                    loading={detailLoading && selectedPayment?.id === transaction.id}
                    variant="secondary"
                    onClick={() => selectPayment(transaction)}
                  >
                    <DetailIcon />
                  </AdminActionIconButton>
                </td>
              </tr>
            )
          })}
        </AdminTable>
        <AdminPagination
          currentPage={pagination.page || currentPage}
          pages={pageNumbers}
          totalPages={pagination.total_pages}
          onPageChange={setCurrentPage}
        />
      </AdminCard>

      {selectedPayment ? (
        <AdminCard className="admin-ops-page__table-card" padding="lg">
          <AdminSectionHeader
            title={`Chi tiết giao dịch #${selectedPayment.code}`}
            subtitle={detailLoading ? 'Đang tải chi tiết...' : selectedPayment.method}
          />
          <div className="admin-ops-page__summary-box">
            <p><span>Khách hàng:</span> <strong>{selectedPayment.customerName}</strong></p>
            <p><span>Mã đơn:</span> <strong>{selectedPayment.bookingCode || 'Chưa có'}</strong></p>
            <p><span>Số tiền:</span> <strong>{formatCurrency(selectedPayment.amount)}</strong></p>
            <p><span>Trạng thái đơn:</span> <strong>{selectedPayment.bookingStatus || 'Chưa cập nhật'}</strong></p>
            <p><span>Ghi chú nội bộ:</span> <strong>{selectedPayment.internalNote || 'Chưa có'}</strong></p>
          </div>
          {selectedPayment.proof ? (
            <div className="admin-ops-page__summary-box">
              <p><span>Mã chuyển khoản:</span> <strong>{selectedPayment.proof.bank_transaction_code || 'Chưa có'}</strong></p>
              <p><span>Nội dung chuyển khoản:</span> <strong>{selectedPayment.proof.transfer_note || 'Chưa có'}</strong></p>
              <p><span>Thời gian gửi:</span> <strong>{formatDateTime(selectedPayment.proof.submitted_at)}</strong></p>
              {selectedPayment.proof.proof_image_url ? (
                <p>
                  <span>Chứng từ:</span>{' '}
                  <strong>
                    <a href={selectedPayment.proof.proof_image_url} rel="noreferrer" target="_blank">
                      Xem ảnh chứng từ
                    </a>
                  </strong>
                </p>
              ) : null}
            </div>
          ) : null}
        </AdminCard>
      ) : null}
    </main>
  )
}

export default AdminPaymentsPage
