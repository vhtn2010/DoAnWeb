import { useMemo, useState } from 'react'
import {
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminField,
  AdminFilterBar,
  AdminPageHeader,
  AdminSectionHeader,
  AdminSegmentedControl,
  AdminSearchInput,
  AdminStatusBadge,
  AdminTextarea,
} from '../../components/admin/ui/index.js'
import {
  ADMIN_SUPPORT_PRIORITY_META,
  ADMIN_SUPPORT_REQUESTS,
  ADMIN_SUPPORT_STATUS_META,
  ADMIN_SUPPORT_STATUS_OPTIONS,
  ADMIN_SUPPORT_STATUSES,
} from '../../fixtures/adminOperations.fixtures.js'

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function cx(...classNames) {
  return classNames.filter(Boolean).join(' ')
}

function SupportIcon({ children }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      {children}
    </svg>
  )
}

function SearchIcon() {
  return (
    <SupportIcon>
      <path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </SupportIcon>
  )
}

function AdminSupportPage() {
  const [reply, setReply] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState(ADMIN_SUPPORT_REQUESTS[0]?.id ?? '')
  const [statusFilter, setStatusFilter] = useState(ADMIN_SUPPORT_STATUSES.all)

  const requests = useMemo(() => {
    const query = normalizeText(searchQuery.trim())

    return ADMIN_SUPPORT_REQUESTS.filter((request) => {
      const matchesStatus =
        statusFilter === ADMIN_SUPPORT_STATUSES.all || request.status === statusFilter
      const matchesSearch =
        query.length === 0 ||
        normalizeText(`${request.id} ${request.customerName} ${request.subject}`).includes(query)

      return matchesStatus && matchesSearch
    })
  }, [searchQuery, statusFilter])

  const selectedRequest = requests.find((request) => request.id === selectedId) ?? requests[0]

  function resetFilters() {
    setSearchQuery('')
    setStatusFilter(ADMIN_SUPPORT_STATUSES.all)
  }

  return (
    <main className="admin-support-page">
      <header className="admin-support-page__header">
        <div className="admin-support-page__header-copy">
          <h1>Hỗ trợ khách hàng</h1>
          <p>Quản lý và phản hồi các yêu cầu từ du khách.</p>
        </div>

        <div className="admin-support-page__filters" role="group" aria-label="Lọc trạng thái hỗ trợ">
          {ADMIN_SUPPORT_STATUS_OPTIONS.map((option) => (
            <button
              className={cx(
                'admin-support-page__filter',
                statusFilter === option.value && 'admin-support-page__filter--active',
              )}
              key={option.value}
              type="button"
              aria-pressed={statusFilter === option.value}
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <AdminPageHeader
        eyebrow="Chăm sóc khách hàng"
        title="Hỗ trợ khách hàng"
        subtitle="Quản lý và phản hồi các yêu cầu từ du khách."
      />

      <AdminFilterBar
        aria-label="Bộ lọc hỗ trợ khách hàng"
        actions={
          <AdminButton variant="secondary" onClick={resetFilters}>
            Đặt lại
          </AdminButton>
        }
      >
        <AdminSegmentedControl
          ariaLabel="Lọc trạng thái hỗ trợ"
          options={ADMIN_SUPPORT_STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <AdminField className="admin-ops-page__search" label="Tìm kiếm">
          <AdminSearchInput
            placeholder="Tìm kiếm mã hỗ trợ, khách hàng..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </AdminField>
      </AdminFilterBar>

      <div className="admin-support-page__workspace">
        <section className="admin-support-page__queue" aria-label="Danh sách yêu cầu hỗ trợ">
          <form className="admin-support-page__search" role="search" onSubmit={(event) => event.preventDefault()}>
            <label className="admin-support-page__search-control">
              <span className="admin-support-page__sr-only">Tìm kiếm mã hỗ trợ, khách hàng</span>
              <SearchIcon />
              <input
                placeholder="Tìm kiếm mã hỗ trợ, khách hàng..."
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
          </form>

          <div className="admin-support-page__list">
          {requests.length > 0 ? requests.map((request) => {
            const priority = ADMIN_SUPPORT_PRIORITY_META[request.priority]
            const status = ADMIN_SUPPORT_STATUS_META[request.status]

            return (
              <button
                className={
                  request.id === selectedRequest?.id
                    ? 'admin-support-ticket admin-support-ticket--active'
                    : 'admin-support-ticket'
                }
                aria-pressed={request.id === selectedRequest?.id}
                key={request.id}
                type="button"
                onClick={() => setSelectedId(request.id)}
              >
                <span className="admin-support-ticket__top">
                  <strong>#{request.id}</strong>
                  <span>{request.createdLabel}</span>
                </span>
                <span className="admin-support-ticket__customer">{request.customerName}</span>
                <span className="admin-support-ticket__subject">{request.subject}</span>
                <span className="admin-support-ticket__badges">
                  <AdminStatusBadge tone={priority.tone}>{priority.label}</AdminStatusBadge>
                  <AdminStatusBadge tone={status.tone}>{status.label}</AdminStatusBadge>
                </span>
              </button>
            )
          }) : (
            <AdminEmptyState
              title="Không có yêu cầu hỗ trợ phù hợp"
              description="Thử đổi trạng thái hoặc từ khóa tìm kiếm."
              action={
                <AdminButton variant="secondary" onClick={resetFilters}>
                  Đặt lại bộ lọc
                </AdminButton>
              }
            />
          )}
          </div>
        </section>

        {selectedRequest ? (
          <AdminCard className="admin-support-page__conversation" padding="lg">
            <AdminSectionHeader
              title={selectedRequest.customerName}
              subtitle={`${selectedRequest.customerTier} · ${selectedRequest.customerPhone}`}
              actions={
                <AdminStatusBadge tone={ADMIN_SUPPORT_STATUS_META[selectedRequest.status].tone}>
                  {ADMIN_SUPPORT_STATUS_META[selectedRequest.status].label}
                </AdminStatusBadge>
              }
            />

            <div className="admin-support-page__thread">
              <p className="admin-support-page__subject">
                Chủ đề: {selectedRequest.subject}
              </p>
              <article className="admin-support-message">
                <strong>{selectedRequest.customerName}</strong>
                <span>09:45 AM, Hôm nay</span>
                <p>{selectedRequest.message}</p>
              </article>
              <article className="admin-support-message admin-support-message--system">
                <strong>Hệ thống</strong>
                <p>{selectedRequest.systemNote}</p>
              </article>
            </div>

            <AdminField label="Phản hồi">
              <AdminTextarea
                placeholder="Nhập phản hồi cho khách hàng..."
                value={reply}
                onChange={(event) => setReply(event.target.value)}
              />
            </AdminField>
            <AdminButton variant="primary">Phản hồi</AdminButton>
          </AdminCard>
        ) : null}
      </div>
    </main>
  )
}

export default AdminSupportPage
