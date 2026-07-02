import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ServiceCard from '../../components/service/ServiceCard.jsx'
import { mockServices } from '../../data/mockServices.js'

const priceOptions = [
  { value: 'under-2m', label: 'Dưới 2 triệu' },
  { value: '2-5m', label: '2 - 5 triệu' },
  { value: 'over-5m', label: 'Trên 5 triệu' },
]

const durationOptions = [
  { value: '1-3', label: '1 - 3 ngày' },
  { value: '4-7', label: '4 - 7 ngày' },
  { value: 'other', label: 'Khác' },
]

const categoryOptions = ['Văn hoá', 'Nghỉ dưỡng', 'Khám phá']

const sortOptions = ['Đề xuất', 'Giá thấp nhất', 'Giá cao nhất', 'Mới nhất']

const sortQueryToLabel = {
  popular: 'Đề xuất',
  price_asc: 'Giá thấp nhất',
  price_desc: 'Giá cao nhất',
  newest: 'Mới nhất',
}

function createEmptyFilters() {
  return {
    keyword: '',
    prices: [],
    durations: [],
    categories: [],
  }
}

function normalizeText(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

function humanizeQueryValue(value) {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function buildFiltersFromSearchParams(searchParams) {
  const nextFilters = createEmptyFilters()
  const locationValue = searchParams.get('location') ?? searchParams.get('to') ?? ''

  if (locationValue) {
    nextFilters.keyword = humanizeQueryValue(locationValue)
  }

  return nextFilters
}

function buildSortFromSearchParams(searchParams) {
  const querySort = searchParams.get('sort')
  return sortQueryToLabel[querySort] ?? 'Đề xuất'
}

function matchesPrice(service, selectedPrices) {
  if (!selectedPrices.length) {
    return true
  }

  return selectedPrices.some((priceRange) => {
    if (priceRange === 'under-2m') {
      return service.sale_price < 2000000
    }

    if (priceRange === '2-5m') {
      return service.sale_price >= 2000000 && service.sale_price <= 5000000
    }

    if (priceRange === 'over-5m') {
      return service.sale_price > 5000000
    }

    return false
  })
}

function matchesDuration(service, selectedDurations) {
  if (!selectedDurations.length) {
    return true
  }

  return selectedDurations.includes(service.duration_group)
}

function matchesCategory(service, selectedCategories) {
  if (!selectedCategories.length) {
    return true
  }

  return selectedCategories.includes(service.category_label)
}

function getSortedServices(services, sortValue) {
  const nextServices = [...services]

  if (sortValue === 'Giá thấp nhất') {
    nextServices.sort((first, second) => first.sale_price - second.sale_price)
    return nextServices
  }

  if (sortValue === 'Giá cao nhất') {
    nextServices.sort((first, second) => second.sale_price - first.sale_price)
    return nextServices
  }

  if (sortValue === 'Mới nhất') {
    nextServices.sort((first, second) => first.sort_order - second.sort_order)
    return nextServices
  }

  nextServices.sort((first, second) => first.sort_order - second.sort_order)
  return nextServices
}

function ServiceListPage() {
  const [searchParams] = useSearchParams()
  const [draftFilters, setDraftFilters] = useState(() => buildFiltersFromSearchParams(searchParams))
  const [appliedFilters, setAppliedFilters] = useState(() => buildFiltersFromSearchParams(searchParams))
  const [selectedSort, setSelectedSort] = useState(() => buildSortFromSearchParams(searchParams))

  useEffect(() => {
    const nextFilters = buildFiltersFromSearchParams(searchParams)
    setDraftFilters(nextFilters)
    setAppliedFilters(nextFilters)
    setSelectedSort(buildSortFromSearchParams(searchParams))
  }, [searchParams])

  function handleToggleValue(filterKey, value) {
    setDraftFilters((currentFilters) => ({
      ...currentFilters,
      [filterKey]: currentFilters[filterKey].includes(value)
        ? currentFilters[filterKey].filter((item) => item !== value)
        : [...currentFilters[filterKey], value],
    }))
  }

  function handleApplyFilters() {
    setAppliedFilters(draftFilters)
  }

  function handleResetFilters() {
    const emptyFilters = createEmptyFilters()
    setDraftFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
  }

  const keyword = normalizeText(appliedFilters.keyword)
  const activeServices = mockServices.filter((service) => service.status === 'active')
  const filteredServices = activeServices.filter((service) => {
    const searchableText = normalizeText(`${service.title} ${service.location_text}`)
    const matchesKeyword = !keyword || searchableText.includes(keyword)

    return (
      matchesKeyword &&
      matchesPrice(service, appliedFilters.prices) &&
      matchesDuration(service, appliedFilters.durations) &&
      matchesCategory(service, appliedFilters.categories)
    )
  })
  const visibleServices = getSortedServices(filteredServices, selectedSort)
  const hasAppliedFilters =
    Boolean(appliedFilters.keyword) ||
    appliedFilters.prices.length > 0 ||
    appliedFilters.durations.length > 0 ||
    appliedFilters.categories.length > 0
  const resultCount = hasAppliedFilters ? visibleServices.length : 24

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
            <Link className="service-list-page__breadcrumb-link" to="/">
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
                  onChange={(event) => setSelectedSort(event.target.value)}
                >
                  {sortOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {visibleServices.length ? (
              <>
                <div className="service-results__grid">
                  {visibleServices.map((service) => (
                    <ServiceCard key={service.slug} service={service} />
                  ))}
                </div>

                <div className="service-pagination" aria-label="Phân trang tour">
                  <button className="service-pagination__button" type="button">
                    ‹
                  </button>
                  <button
                    aria-current="page"
                    className="service-pagination__button service-pagination__button--active"
                    type="button"
                  >
                    1
                  </button>
                  <button className="service-pagination__button" type="button">
                    2
                  </button>
                  <button className="service-pagination__button" type="button">
                    3
                  </button>
                  <button className="service-pagination__button" type="button">
                    ›
                  </button>
                </div>
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
