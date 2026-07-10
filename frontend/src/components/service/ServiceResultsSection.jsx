import ServiceCard from './ServiceCard.jsx'
import {
  PublicButton,
  PublicEmptyState,
  PublicErrorState,
  PublicLoadingBlock,
  PublicPagination,
} from '../public/ui/index.js'

function SortChevronIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="m6 8 4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

export default function ServiceResultsSection({
  currentPage,
  errorMessage,
  isFavorite,
  isLoading,
  onPageChange,
  onResetFilters,
  onSortChange,
  onToggleFavorite,
  resultCount,
  selectedSort,
  services,
  sortOptions,
  totalPages,
}) {
  return (
    <div className="service-results">
      <div className="service-results__toolbar">
        <p className="service-results__count">
          Hiển thị <strong>{resultCount}</strong> kết quả phù hợp
        </p>

        <label className="service-results__sort" htmlFor="service-results-sort">
          <span className="service-results__sort-label">Sắp xếp:</span>
          <span className="service-results__sort-select">
            <select id="service-results-sort" value={selectedSort} onChange={onSortChange}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span aria-hidden="true" className="service-results__sort-icon">
              <SortChevronIcon />
            </span>
          </span>
        </label>
      </div>

      {errorMessage ? (
        <PublicErrorState
          className="service-results__empty"
          description={errorMessage}
          eyebrow="Kết nối thất bại"
          title="Không thể tải danh sách tour"
        />
      ) : isLoading ? (
        <PublicLoadingBlock
          className="service-results__empty"
          description="Danh sách tour đang được đọc từ mock adapter theo API-ready pattern."
          rows={4}
          title="Đang tải tour"
        />
      ) : services.length ? (
        <>
          <div className="service-results__grid">
            {services.map((service) => (
              <ServiceCard
                isFavorite={isFavorite?.(service)}
                key={service.slug}
                service={service}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>

          <PublicPagination
            ariaLabel="Phân trang tour"
            className="service-pagination"
            currentPage={currentPage}
            onPageChange={onPageChange}
            totalPages={totalPages}
          />
        </>
      ) : (
        <PublicEmptyState
          action={
            <PublicButton type="button" variant="secondary" onClick={onResetFilters}>
              Xóa bộ lọc
            </PublicButton>
          }
          className="service-results__empty"
          description="Thử thay đổi từ khóa hoặc bộ lọc để xem thêm hành trình khác."
          eyebrow="Chưa có kết quả"
          title="Chưa có tour phù hợp"
        />
      )}
    </div>
  )
}
