import { Link } from 'react-router-dom'
import { LocalLoading } from '../../components/loading/Loading.jsx'
import { PublicPagination } from '../../components/public/ui/index.js'
import ServiceCard from '../../components/service/ServiceCard.jsx'
import useTourServiceList from '../../hooks/useTourServiceList.js'

function ServiceListPage() {
  const {
    breadcrumbHomePath,
    categoryOptions,
    currentPage,
    draftFilters,
    durationOptions,
    errorMessage,
    handleApplyFilters,
    handlePageChange,
    handleResetFilters,
    handleSortChange,
    handleToggleValue,
    isLoading,
    priceOptions,
    resultCount,
    selectedSort,
    services,
    setDraftFilters,
    sortOptions,
    totalPages,
  } = useTourServiceList()

  return (
    <div className="service-list-page">
      <section className="service-list-page__hero">
        <div className="service-list-page__hero-overlay" />
        <img
          alt="Ruộng bậc thang vùng núi"
          className="service-list-page__hero-image"
          src="/assets/template/service/list/hero-terrace.png"
        />
        <div className="service-list-page__hero-content">
          <h1 className="service-list-page__hero-title">Khám phá Tour</h1>
          <div className="service-list-page__breadcrumb">
            <Link className="service-list-page__breadcrumb-link" to={breadcrumbHomePath}>
              Trang chủ
            </Link>
            <span aria-hidden="true">›</span>
            <span>Danh sách Tour</span>
          </div>
        </div>
      </section>

      <section className="service-list-page__body">
        <div className="service-list-page__layout">
          <aside className="service-filter">
            <div className="service-filter__header">
              <span className="service-filter__marker" aria-hidden="true" />
              <h2 className="service-filter__title">Bộ lọc nâng cao</h2>
            </div>

            <div className="service-filter__section">
              <label className="service-filter__label" htmlFor="service-filter-keyword">
                Địa điểm
              </label>
              <input
                className="service-filter__search"
                id="service-filter-keyword"
                placeholder="Tìm kiếm điểm đến..."
                type="search"
                value={draftFilters.keyword}
                onChange={(event) =>
                  setDraftFilters((currentFilters) => ({
                    ...currentFilters,
                    keyword: event.target.value,
                  }))
                }
              />
            </div>

            <div className="service-filter__section">
              <h3 className="service-filter__label">Mức giá</h3>
              <div className="service-filter__checks">
                {priceOptions.map((option) => (
                  <label className="service-filter__check" key={option.value}>
                    <input
                      checked={draftFilters.prices.includes(option.value)}
                      type="checkbox"
                      onChange={() => handleToggleValue('prices', option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="service-filter__section">
              <h3 className="service-filter__label">Thời gian</h3>
              <div className="service-filter__checks">
                {durationOptions.map((option) => (
                  <label className="service-filter__check" key={option.value}>
                    <input
                      checked={draftFilters.durations.includes(option.value)}
                      type="checkbox"
                      onChange={() => handleToggleValue('durations', option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="service-filter__section">
              <h3 className="service-filter__label">Loại hình Tour</h3>
              <div className="service-filter__chips">
                {categoryOptions.map((option) => (
                  <button
                    className={`service-filter__chip ${
                      draftFilters.categories.includes(option)
                        ? 'service-filter__chip--active'
                        : ''
                    }`}
                    key={option}
                    type="button"
                    onClick={() => handleToggleValue('categories', option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <button className="service-filter__apply" type="button" onClick={handleApplyFilters}>
              Áp dụng bộ lọc
            </button>
          </aside>

          <div className="service-results">
            <div className="service-results__toolbar">
              <p className="service-results__count">Hiển thị {resultCount} kết quả phù hợp</p>

              <label className="service-results__sort">
                <span>Sắp xếp:</span>
                <select
                  value={selectedSort}
                  onChange={handleSortChange}
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {errorMessage ? (
              <div className="service-results__empty" role="alert">
                <h2>Không thể tải danh sách tour</h2>
                <p>{errorMessage}</p>
              </div>
            ) : isLoading ? (
              <LocalLoading className="service-results__empty" minHeight="260px" />
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
                  onPageChange={handlePageChange}
                  totalPages={totalPages}
                />
              </>
            ) : (
              <div className="service-results__empty" role="status">
                <h2>Chưa có tour phù hợp</h2>
                <p>Thử thay đổi từ khóa hoặc bộ lọc để xem thêm hành trình khác.</p>
                <button className="service-results__reset" type="button" onClick={handleResetFilters}>
                  Xóa bộ lọc
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default ServiceListPage
