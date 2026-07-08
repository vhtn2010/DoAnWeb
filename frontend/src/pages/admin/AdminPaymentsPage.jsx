import {
  AdminActionIconButton,
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminErrorState,
  AdminField,
  AdminFilterBar,
  AdminPagination,
  AdminSectionHeader,
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

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M12 3v11m0 0 4-4m-4 4-4-4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M5 16v3h14v-3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function DetailIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
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
    clearSelectedPayment,
    setCurrentPage,
    setSearchQuery,
    setStatusFilter,
    statusFilter,
  } = useAdminPayments()

  return (
    <main className="admin-ops-page admin-payments-page">
      <header className="admin-payments-page__header">
        <div className="admin-payments-page__header-copy">
          <h1>Lịch sử Giao dịch & Hoàn tiền</h1>
          <p>Theo dõi dòng tiền và xử lý các yêu cầu hoàn trả dịch vụ từ khách hàng.</p>
        </div>

        <AdminButton
          className="admin-payments-page__export"
          disabled
          icon={<DownloadIcon />}
          variant="secondary"
        >
          Xuất báo cáo
        </AdminButton>

        <div
          className="admin-payments-page__status-tabs"
          role="group"
          aria-label="Lọc trạng thái giao dịch"
        >
          {ADMIN_PAYMENT_STATUS_OPTIONS.map((option) => {
            const isActive = option.value === statusFilter

            return (
              <button
                className={[
                  'admin-payments-page__status-tab',
                  isActive ? 'admin-payments-page__status-tab--active' : '',
                ].filter(Boolean).join(' ')}
                disabled={loading || option.disabled}
                key={option.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setStatusFilter(option.value)}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </header>

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
          tableClassName="admin-payments-page__table"
          columns={[
            { key: 'code', label: 'Mã giao dịch' },
            { key: 'customer', label: 'Khách hàng / Đơn' },
            { key: 'amount', label: 'Số tiền' },
            { key: 'method', label: 'Phương thức' },
            { key: 'status', label: 'Trạng thái' },
            { key: 'time', label: 'Thời gian' },
            { key: 'action', label: 'Thao tác' },
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
              <tr
                className={[
                  'admin-ops-table__row',
                  'admin-payments-page__row',
                  selectedPayment?.id === transaction.id ? 'admin-ops-table__row--selected' : '',
                ].filter(Boolean).join(' ')}
                key={transaction.id}
                role="button"
                tabIndex={0}
                aria-label={`Xem chi tiết giao dịch ${transaction.code}`}
                onClick={() => selectPayment(transaction)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    selectPayment(transaction)
                  }
                }}
              >
                <td className="admin-payments-page__code-cell">
                  <strong>#{transaction.code}</strong>
                </td>
                <td>
                  <div className="admin-ops-page__stack">
                    <strong>{transaction.customerName}</strong>
                    <span>{transaction.serviceName}</span>
                  </div>
                </td>
                <td>{formatCurrency(transaction.amount)}</td>
                <td>{transaction.method}</td>
                <td>
                  <AdminStatusBadge tone={status.tone}>{status.label}</AdminStatusBadge>
                </td>
                <td>{formatDateTime(transaction.timestamp)}</td>
                <td className="admin-payments-page__action-cell">
                  <AdminActionIconButton
                    className="admin-payments-page__view-button"
                    label={transaction.actionLabel}
                    loading={detailLoading && selectedPayment?.id === transaction.id}
                    variant="secondary"
                    onClick={(event) => {
                      event.stopPropagation()
                      selectPayment(transaction)
                    }}
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
        <div
          className="admin-payments-page__modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              clearSelectedPayment()
            }
          }}
        >
          <AdminCard
            className="admin-payments-page__detail-modal"
            padding="lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-payments-detail-title"
          >
            <button
              className="admin-payments-page__modal-close"
              type="button"
              aria-label="Đóng chi tiết giao dịch"
              onClick={clearSelectedPayment}
            >
              ×
            </button>

            <AdminSectionHeader
              className="admin-payments-page__detail-header"
              title={`Chi tiết giao dịch #${selectedPayment.code}`}
              subtitle={detailLoading ? 'Đang tải chi tiết...' : selectedPayment.method}
            >
              <p className="admin-payments-page__detail-eyebrow" id="admin-payments-detail-title">
                Mã đơn {selectedPayment.bookingCode || 'Chưa có'}
              </p>
            </AdminSectionHeader>

            <div className="admin-ops-page__summary-box admin-payments-page__detail-grid">
              <p><span>Khách hàng:</span> <strong>{selectedPayment.customerName}</strong></p>
              <p><span>Số tiền:</span> <strong>{formatCurrency(selectedPayment.amount)}</strong></p>
              <p><span>Trạng thái đơn:</span> <strong>{selectedPayment.bookingStatus || 'Chưa cập nhật'}</strong></p>
              <p><span>Ghi chú nội bộ:</span> <strong>{selectedPayment.internalNote || 'Chưa có'}</strong></p>
            </div>

            {selectedPayment.proof ? (
              <div className="admin-ops-page__summary-box admin-payments-page__detail-grid">
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
        </div>
      ) : null}
    </main>
  )
}

export default AdminPaymentsPage
