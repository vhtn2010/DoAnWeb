export default function ServiceDetailGallery({
  selectedImage,
  service,
  onImageError,
  onSelectImage,
}) {
  return (
    <section aria-label="Bộ sưu tập ảnh tour" className="service-detail-gallery">
      <div className="service-detail-gallery__featured">
        <img alt={service.title} src={selectedImage} onError={onImageError} />
      </div>

      <div className="service-detail-gallery__grid">
        {service.gallery_images.slice(1, 5).map((imageUrl, index) => {
          const isLastThumb = index === 3 && service.extra_gallery_count > 0
          const isActive = selectedImage === imageUrl

          return (
            <button
              className={`service-detail-gallery__thumb ${
                isActive ? 'service-detail-gallery__thumb--active' : ''
              }`}
              key={imageUrl}
              type="button"
              onClick={() => onSelectImage(imageUrl)}
            >
              <img
                alt={`${service.title} ${index + 2}`}
                src={imageUrl}
                onError={onImageError}
              />
              {isLastThumb ? (
                <span className="service-detail-gallery__overlay">
                  +{service.extra_gallery_count} ảnh
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}
