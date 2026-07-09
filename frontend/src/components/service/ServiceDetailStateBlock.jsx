import ServiceDetailBreadcrumb from './ServiceDetailBreadcrumb.jsx'
import { PublicErrorState, PublicLoadingBlock } from '../public/ui/index.js'

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
          <section className="service-detail-section">
            <PublicLoadingBlock
              description="Dữ liệu đang được đọc từ mock adapter theo API-ready pattern."
              rows={3}
              title="Chi tiết tour đang được chuẩn bị"
            />
          </section>
        ) : null}
      </div>
    </div>
  )
}
