import { useState } from 'react'
import { Link } from 'react-router-dom'
import usePublicCollectionPage from '../../hooks/usePublicCollectionPage.js'
import usePublicSession from '../../hooks/usePublicSession.js'
import { buildPublicAuthPath } from '../../utils/publicNavigation.js'

const HELP_CATEGORIES = Object.freeze([
  {
    id: 'booking',
    title: 'Đặt dịch vụ',
    description: 'Các bước đặt tour, vé và khách sạn trên hệ thống.',
  },
  {
    id: 'payment',
    title: 'Thanh toán',
    description: 'Phương thức thanh toán, xác nhận giao dịch và hóa đơn.',
  },
  {
    id: 'changes',
    title: 'Thay đổi và hoàn hủy',
    description: 'Đổi lịch, hủy đơn, hoàn tiền và điều kiện áp dụng.',
  },
  {
    id: 'account',
    title: 'Tài khoản',
    description: 'Đăng nhập, ưu đãi thành viên và cài đặt tài khoản.',
  },
])

const HELP_ARTICLES = Object.freeze([
  {
    id: 'faq-booking-confirmation',
    category: 'booking',
    title: 'Bao lâu sau khi đặt thì đơn hàng được xác nhận?',
    summary: 'Thời gian xác nhận thay đổi theo từng loại dịch vụ và đối tác.',
    content:
      'Với dịch vụ có sẵn tồn kho, hệ thống thường phản hồi gần như tức thì. Riêng các sản phẩm cần đối soát thủ công như tour riêng, đổi lịch hoặc yêu cầu đặc biệt có thể cần thêm thời gian để đội vận hành xác nhận lại với đối tác.',
  },
  {
    id: 'faq-booking-special-request',
    category: 'booking',
    title: 'Tôi có thể thêm yêu cầu đặc biệt khi đặt tour hoặc khách sạn không?',
    summary: 'Có, nhưng khả năng đáp ứng sẽ phụ thuộc từng nhà cung cấp.',
    content:
      'Bạn có thể ghi chú nhu cầu như giường đôi, đưa đón sân bay hoặc hỗ trợ người lớn tuổi trong quá trình đặt. Hệ thống sẽ chuyển thông tin đến bộ phận vận hành và đối tác để kiểm tra khả năng đáp ứng trước khi chốt.',
  },
  {
    id: 'faq-payment-failed',
    category: 'payment',
    title: 'Thanh toán thất bại nhưng tiền đã bị trừ thì xử lý thế nào?',
    summary: 'Đây thường là trạng thái treo giao dịch và cần đối soát.',
    content:
      'Nếu tài khoản đã bị trừ tiền nhưng đơn chưa cập nhật thành công, bạn hãy lưu lại mã giao dịch hoặc ảnh chụp thanh toán. Bộ phận hỗ trợ sẽ kiểm tra trạng thái đối soát với cổng thanh toán trước khi xác nhận giữ chỗ hoặc hoàn tiền.',
  },
  {
    id: 'faq-payment-invoice',
    category: 'payment',
    title: 'Làm sao để xuất hóa đơn VAT?',
    summary: 'Bạn có thể yêu cầu xuất hóa đơn ngay sau khi thanh toán.',
    content:
      'Hãy chuẩn bị thông tin xuất hóa đơn gồm tên công ty, mã số thuế và email nhận hóa đơn. Với một số dịch vụ do đối tác trực tiếp cung cấp, hóa đơn sẽ được phát hành sau khi đơn hoàn tất hoặc sau ngày sử dụng dịch vụ.',
  },
  {
    id: 'faq-refund-timeline',
    category: 'changes',
    title: 'Thời gian hoàn tiền thường mất bao lâu?',
    summary: 'Tùy phương thức thanh toán và chính sách của từng dịch vụ.',
    content:
      'Hoàn tiền thẻ nội địa hoặc ví điện tử thường cần vài ngày làm việc, trong khi một số giao dịch quốc tế có thể lâu hơn. Hệ thống sẽ ưu tiên cung cấp trạng thái xử lý và mốc thời gian dự kiến sau khi yêu cầu hủy được chấp thuận.',
  },
  {
    id: 'faq-reschedule-policy',
    category: 'changes',
    title: 'Có thể đổi ngày đi sau khi đã thanh toán không?',
    summary: 'Có thể, nếu dịch vụ còn điều kiện đổi và còn chỗ.',
    content:
      'Khả năng đổi ngày phụ thuộc vào loại dịch vụ, hạng vé, chính sách khách sạn hoặc tour và thời điểm bạn gửi yêu cầu. Bạn nên cung cấp mã đơn cùng ngày mong muốn để hệ thống kiểm tra phương án thay thế nhanh nhất.',
  },
  {
    id: 'faq-account-preview',
    category: 'account',
    title: 'Tôi có cần đăng nhập để xem lịch sử đơn hàng không?',
    summary: 'Có, lịch sử đơn và tiện ích cá nhân yêu cầu phiên người dùng.',
    content:
      'Các khu vực như hồ sơ, lịch sử booking, ưu đãi thành viên và hỗ trợ theo ngữ cảnh đơn hàng sẽ cần phiên đăng nhập. Điều này giúp hệ thống hiển thị đúng dữ liệu và giảm rủi ro tra cứu nhầm thông tin.',
  },
  {
    id: 'faq-account-voucher',
    category: 'account',
    title: 'Ưu đãi thành viên được áp dụng như thế nào?',
    summary: 'Tùy chiến dịch và cấp độ thành viên trong tài khoản của bạn.',
    content:
      'Một số ưu đãi được tự động áp dụng tại bước thanh toán, số khác cần nhập mã hoặc đáp ứng điều kiện về ngày đi, loại dịch vụ hay số tiền tối thiểu. Trung tâm trợ giúp và trang chat hỗ trợ đều có thể hướng dẫn bạn kiểm tra nhanh.',
  },
])

function matchesHelpCategory(article, selectedCategory) {
  return article.category === selectedCategory
}

function getHelpSearchText(article) {
  return `${article.title} ${article.summary} ${article.content}`
}

function HelpCenterPage() {
  const { isCustomer } = usePublicSession()
  const [expandedArticleId, setExpandedArticleId] = useState(HELP_ARTICLES[0].id)
  const {
    filteredItems: filteredArticles,
    query,
    selectedFilter: selectedCategory,
    setQuery,
    setSelectedFilter: setSelectedCategory,
  } = usePublicCollectionPage({
    filterItem: matchesHelpCategory,
    getSearchText: getHelpSearchText,
    items: HELP_ARTICLES,
  })

  const backToProfilePath = buildPublicAuthPath('/profile', isCustomer)
  const customerCarePath = buildPublicAuthPath('/customer-care', isCustomer)

  return (
    <div className="help-center-page">
      <section className="help-center-hero">
        <div className="help-center-hero__copy">
          <p className="help-center-hero__eyebrow">Trung tâm trợ giúp</p>
          <h1>Tìm câu trả lời trước khi cần chuyển sang hỗ trợ trực tiếp</h1>
          <p>
            Tra cứu nhanh hướng dẫn về đặt dịch vụ, thanh toán, hoàn hủy và tài khoản. Khi
            chưa đủ thông tin, bạn có thể tiếp tục sang trang chăm sóc khách hàng để chat với
            hệ thống.
          </p>

          <div className="help-center-hero__actions">
            <Link className="help-center-hero__button" to={customerCarePath}>
              Sang chat hỗ trợ
            </Link>
            <Link
              className="help-center-hero__button help-center-hero__button--secondary"
              to={backToProfilePath}
            >
              Quay về tài khoản
            </Link>
          </div>
        </div>

        <div className="help-center-hero__aside">
          <span className="help-center-hero__pill">Self-service FAQ</span>
          <strong>{filteredArticles.length} bài viết phù hợp với lựa chọn hiện tại</strong>
          <p>
            Các câu hỏi được sắp theo từng nhóm để bạn tra cứu nhanh và chuyển sang chat
            hỗ trợ khi cần.
          </p>
        </div>
      </section>

      <div className="help-center-layout">
        <aside className="help-center-sidebar">
          <section className="help-center-panel">
            <header className="help-center-panel__header">
              <p className="help-center-panel__eyebrow">Tìm kiếm nhanh</p>
              <h2>Tôi đang cần hỗ trợ điều gì?</h2>
            </header>

            <label className="help-center-search">
              <span className="help-center-search__label">Từ khóa</span>
              <input
                className="help-center-search__input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ví dụ: hoàn tiền, đổi ngày đi, hóa đơn VAT..."
              />
            </label>

            <div className="help-center-category-list" role="tablist" aria-label="Nhóm chủ đề trợ giúp">
              <button
                className={
                  selectedCategory === 'all'
                    ? 'help-center-category help-center-category--active'
                    : 'help-center-category'
                }
                type="button"
                onClick={() => setSelectedCategory('all')}
              >
                <strong>Tất cả</strong>
                <span>Xem toàn bộ câu hỏi phổ biến</span>
              </button>

              {HELP_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  className={
                    selectedCategory === category.id
                      ? 'help-center-category help-center-category--active'
                      : 'help-center-category'
                  }
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <strong>{category.title}</strong>
                  <span>{category.description}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="help-center-content">
          <header className="help-center-results">
            <div>
              <p className="help-center-results__eyebrow">Bài viết gợi ý</p>
              <h2>Hướng dẫn và câu hỏi thường gặp</h2>
            </div>
            <span className="help-center-results__count">
              {filteredArticles.length} kết quả
            </span>
          </header>

          {filteredArticles.length ? (
            <div className="help-center-article-list">
              {filteredArticles.map((article) => {
                const isExpanded = expandedArticleId === article.id

                return (
                  <article
                    className={
                      isExpanded
                        ? 'help-center-article help-center-article--expanded'
                        : 'help-center-article'
                    }
                    key={article.id}
                  >
                    <button
                      className="help-center-article__trigger"
                      type="button"
                      onClick={() =>
                        setExpandedArticleId((currentId) =>
                          currentId === article.id ? null : article.id,
                        )
                      }
                    >
                      <span className="help-center-article__copy">
                        <strong>{article.title}</strong>
                        <small>{article.summary}</small>
                      </span>
                      <span className="help-center-article__icon" aria-hidden="true">
                        {isExpanded ? '−' : '+'}
                      </span>
                    </button>

                    {isExpanded ? (
                      <div className="help-center-article__body">
                        <p>{article.content}</p>
                        <Link className="help-center-article__link" to={customerCarePath}>
                          Vẫn cần hỗ trợ thêm? Chuyển sang chat với hệ thống
                        </Link>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="help-center-empty" role="status">
              <strong>Chưa tìm thấy bài viết phù hợp</strong>
              <p>
                Bạn có thể đổi từ khóa, chọn lại nhóm chủ đề hoặc chuyển sang chat để hệ thống
                hỗ trợ theo ngữ cảnh chi tiết hơn.
              </p>
              <Link className="help-center-empty__link" to={customerCarePath}>
                Mở chăm sóc khách hàng
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default HelpCenterPage
