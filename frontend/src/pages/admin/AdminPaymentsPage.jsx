import { useMemo, useState } from 'react'
import {
  AdminActionIconButton,
  AdminButton,
  AdminCard,
  AdminEmptyState,
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
  ADMIN_PAYMENT_STATUS_META,
  ADMIN_PAYMENT_STATUS_OPTIONS,
  ADMIN_PAYMENT_STATUSES,
  ADMIN_PAYMENT_TRANSACTIONS,
} from '../../fixtures/adminOperations.fixtures.js'

const currencyFormatter = new Intl.NumberFormat('vi-VN')
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
  return `${currencyFormatter.format(value)} ₫`
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function AdminPaymentsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(ADMIN_PAYMENT_STATUSES.all)

  const transactions = useMemo(() => {
    const query = normalizeText(searchQuery.trim())

    return ADMIN_PAYMENT_TRANSACTIONS.filter((transaction) => {
      const matchesStatus =
        statusFilter === ADMIN_PAYMENT_STATUSES.all || transaction.status === statusFilter
      const matchesSearch =
        query.length === 0 ||
        normalizeText(`${transaction.code} ${transaction.customerName} ${transaction.serviceName}`).includes(query)

      return matchesStatus && matchesSearch
    })
  }, [searchQuery, statusFilter])

  function resetFilters() {
    setSearchQuery('')
    setStatusFilter(ADMIN_PAYMENT_STATUSES.all)
  }

  return (
    <main className="admin-ops-page">
      <AdminPageHeader
        eyebrow="Tài chính"
        title="Lịch sử Giao dịch & Hoàn tiền"
        subtitle="Theo dõi dòng tiền và xử lý các yêu cầu hoàn trả dịch vụ từ khách hàng."
        actions={<AdminButton variant="secondary">Xuất báo cáo</AdminButton>}
      />

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
          options={ADMIN_PAYMENT_STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <AdminField className="admin-ops-page__search" label="Tìm kiếm">
          <AdminSearchInput
            placeholder="Mã giao dịch, khách hàng, dịch vụ..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </AdminField>
      </AdminFilterBar>

      <AdminCard className="admin-ops-page__table-card" padding="lg">
        <AdminSectionHeader
          title="Danh sách Giao dịch"
          subtitle={`Hiển thị ${transactions.length} trong số 26 giao dịch`}
        />
        <AdminTable
          columns={[
            { key: 'code', label: 'Mã giao dịch' },
            { key: 'customer', label: 'Khách hàng / Dịch vụ' },
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
          rows={transactions}
        >
          {transactions.map((transaction) => {
            const status = ADMIN_PAYMENT_STATUS_META[transaction.status]

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
                <td>{dateTimeFormatter.format(new Date(transaction.timestamp))}</td>
                <td>
                  <AdminActionIconButton label={transaction.actionLabel} variant="secondary">
                    <DetailIcon />
                  </AdminActionIconButton>
                </td>
              </tr>
            )
          })}
        </AdminTable>
        <AdminPagination currentPage={1} pages={[1, 2, 3]} totalPages={3} />
      </AdminCard>
    </main>
  )
}

export default AdminPaymentsPage
