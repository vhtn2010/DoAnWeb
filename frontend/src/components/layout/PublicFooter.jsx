function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer__shell">
        <div className="public-footer__top">
          <div className="public-footer__brand">
            <img
              alt="Nét Việt Travel"
              className="public-footer__logo"
              src="/assets/template/brand/logo.png"
            />
            <p className="public-footer__copy">
              Hành trình từ tâm, nâng tầm trải nghiệm Việt. Khám phá vẻ đẹp bất
              tận của mảnh đất chữ S cùng chúng tôi.
            </p>
            <div aria-hidden="true" className="public-footer__socials">
              <span className="public-footer__social" />
              <span className="public-footer__social" />
              <span className="public-footer__social" />
            </div>
          </div>

          <section className="public-footer__group">
            <h2 className="public-footer__heading">Về công ty</h2>
            <ul className="public-footer__list">
              <li>Câu chuyện thương hiệu</li>
              <li>Tin tức & sự kiện</li>
              <li>Cơ hội nghề nghiệp</li>
              <li>Đối tác chiến lược</li>
            </ul>
          </section>

          <section className="public-footer__group">
            <h2 className="public-footer__heading">Hỗ trợ khách hàng</h2>
            <ul className="public-footer__list">
              <li>Chính sách bảo mật</li>
              <li>Điều khoản sử dụng</li>
              <li>Câu hỏi thường gặp</li>
              <li>Hotline 24/7</li>
            </ul>
          </section>

          <section className="public-footer__group">
            <h2 className="public-footer__heading">Liên hệ</h2>
            <ul className="public-footer__list">
              <li>Trụ sở: Nét Việt, Q1, TP. Hồ Chí Minh</li>
              <li>hellonetviet@gmail.com</li>
              <li>1990 888 999</li>
            </ul>
          </section>
        </div>

        <div className="public-footer__bottom">
          <span>© 2026 Nét Việt.</span>
          <div className="public-footer__bottom-links">
            <span>Chính sách</span>
            <span>Cài đặt</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default PublicFooter
