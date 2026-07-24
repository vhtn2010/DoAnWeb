import ServiceDetailBreadcrumb from './ServiceDetailBreadcrumb.jsx'
import { FullPageLoading } from '../loading/Loading.jsx'
import { PublicErrorState } from '../public/ui/index.js'

export default function ServiceDetailStateBlock({
  breadcrumbHomePath,
  breadcrumbListPath,
  errorMessage = '',
  loading = false,
}) {
  return (
    <div className="service-detail-page">
      <div className="service-detail-page__shell">
        {errorMessage ? (
          <>
            <ServiceDetailBreadcrumb
              homePath={breadcrumbHomePath}
              listPath={breadcrumbListPath}
            />
            <section className="service-detail-section">
              <PublicErrorState
                description={errorMessage}
                eyebrow="Không khả dụng"
                title="Không tìm thấy tour"
              />
            </section>
          </>
        ) : null}

        {loading ? (
          <FullPageLoading />
        ) : null}
      </div>
    </div>
  )
}
