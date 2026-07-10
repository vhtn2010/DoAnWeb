import { useNavigate } from 'react-router-dom'
import {
  PublicButton,
  PublicCard,
  PublicEmptyState,
  PublicPageHeader,
} from '../../components/public/ui/index.js'
import useFavorites from '../../hooks/useFavorites.js'
import usePublicSession from '../../hooks/usePublicSession.js'
import { buildPublicAuthPath } from '../../utils/publicNavigation.js'

function FavoriteTypeBadge({ label }) {
  return <span className="favorites-page__type-badge">{label}</span>
}

function FavoriteListItem({ item, onOpen, onRemove }) {
  return (
    <article className="favorites-page__item">
      <button className="favorites-page__item-open" type="button" onClick={() => onOpen(item)}>
        <img
          alt={item.title}
          className="favorites-page__item-image"
          src={item.image_url || '/assets/template/home/v39_1669.png'}
        />
        <div className="favorites-page__item-copy">
          <div className="favorites-page__item-meta">
            <FavoriteTypeBadge label={item.source_label} />
            {item.location_text ? <span>{item.location_text}</span> : null}
          </div>
          <h2>{item.title}</h2>
          {item.summary ? <p>{item.summary}</p> : null}
          <span className="favorites-page__item-origin">Mở lại đúng trang bạn đã lưu</span>
        </div>
      </button>

      <div className="favorites-page__item-actions">
        <PublicButton type="button" variant="ghost" onClick={() => onOpen(item)}>
          Mở lại
        </PublicButton>
        <PublicButton type="button" variant="secondary" onClick={() => onRemove(item.favorite_key)}>
          Bỏ thích
        </PublicButton>
      </div>
    </article>
  )
}

export default function FavoritesPage() {
  const navigate = useNavigate()
  const { currentUser, isCustomer } = usePublicSession()
  const { favorites, removeFavorite } = useFavorites({ currentUser })

  function openFavorite(item) {
    navigate(buildPublicAuthPath(item.source_path || item.detail_path || '/', isCustomer))
  }

  return (
    <div className="favorites-page">
      <PublicPageHeader
        eyebrow="Yêu thích"
        subtitle="Danh sách này chỉ lưu các dịch vụ bạn đã bấm tim. Không giữ ghế, phòng, hành khách hay lựa chọn đặt chỗ như giỏ hàng."
        title="Danh sách yêu thích"
      >
        <p className="favorites-page__header-count">
          {favorites.length ? `${favorites.length} mục đang được lưu` : 'Chưa có mục nào được lưu'}
        </p>
      </PublicPageHeader>

      {favorites.length ? (
        <section className="favorites-page__list" aria-label="Danh sách dịch vụ yêu thích">
          {favorites.map((item) => (
            <PublicCard className="favorites-page__card" key={item.favorite_key} padding="sm">
              <FavoriteListItem item={item} onOpen={openFavorite} onRemove={removeFavorite} />
            </PublicCard>
          ))}
        </section>
      ) : (
        <PublicEmptyState
          action={
            <PublicButton
              type="button"
              variant="secondary"
              onClick={() => navigate(buildPublicAuthPath('/services', isCustomer))}
            >
              Khám phá dịch vụ
            </PublicButton>
          }
          className="favorites-page__empty"
          description="Bấm vào biểu tượng trái tim ở các trang công khai để lưu lại dịch vụ bạn muốn xem lại sau."
          eyebrow="Danh sách trống"
          title="Bạn chưa có mục yêu thích nào"
        />
      )}
    </div>
  )
}
