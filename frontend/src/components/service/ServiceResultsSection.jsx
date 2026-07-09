import ServiceCard from './ServiceCard.jsx'
import {
  PublicButton,
  PublicEmptyState,
  PublicErrorState,
  PublicLoadingBlock,
  PublicPagination,
  PublicSectionHeader,
} from '../public/ui/index.js'

export default function ServiceResultsSection({
  currentPage,
  errorMessage,
  isLoading,
  onPageChange,
  onResetFilters,
  onSortChange,
  resultCount,
  selectedSort,
  services,
  sortOptions,
  totalPages,
}) {
  return (
    <div className="service-results">
      <div className="service-results__toolbar">
        <PublicSectionHeader
          className="service-results__summary"
          eyebrow="Tour công khai"
          subtitle={`Hiển thị ${resultCount} kết quả phù hợp`}
          title="Danh sách hành trình nổi bật"
        />

        <label className="service-results__sort">
          <span>Sắp xếp:</span>
          <select value={selectedSort} onChange={onSortChange}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
              <ServiceCard key={service.slug} service={service} />
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
