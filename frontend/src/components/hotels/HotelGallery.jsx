function HotelGallery({ images, selectedImage, title, onSelectImage }) {
  const galleryImages = Array.isArray(images) ? images.filter(Boolean) : []
  const featuredImage = selectedImage || galleryImages[0] || ''
  const thumbnailImages = galleryImages.slice(1, 5)
  const remainingCount = Math.max(galleryImages.length - 5, 0)

  return (
    <section aria-label="Bo suu tap anh khach san" className="hotel-detail-gallery">
      <div className="hotel-detail-gallery__featured">
        <img alt={title} className="hotel-detail-gallery__featured-image" src={featuredImage} />
      </div>

      <div className="hotel-detail-gallery__grid">
        {thumbnailImages.map((imageUrl, index) => {
          const isActive = featuredImage === imageUrl
          const shouldShowOverlay = remainingCount > 0 && index === thumbnailImages.length - 1

          return (
            <button
              aria-label={`Xem anh ${index + 2} cua ${title}`}
              className={`hotel-detail-gallery__thumb ${
                isActive ? 'hotel-detail-gallery__thumb--active' : ''
              } ${shouldShowOverlay ? 'hotel-detail-gallery__thumb--more' : ''}`}
              key={`${imageUrl}-${index}`}
              type="button"
              onClick={() => onSelectImage(imageUrl)}
            >
              <img alt={`${title} ${index + 2}`} src={imageUrl} />
              {shouldShowOverlay ? (
                <span className="hotel-detail-gallery__thumb-overlay">+{remainingCount} anh</span>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default HotelGallery
