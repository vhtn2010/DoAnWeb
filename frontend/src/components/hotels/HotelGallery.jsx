function HotelGallery({ images, selectedImage, title, onSelectImage }) {
  const galleryImages = Array.isArray(images) ? images : []

  return (
    <section aria-label="Bộ sưu tập ảnh khách sạn" className="hotel-detail-gallery">
      <div className="hotel-detail-gallery__featured">
        <img alt={title} className="hotel-detail-gallery__featured-image" src={selectedImage} />
      </div>

      <div className="hotel-detail-gallery__grid">
        {galleryImages.map((imageUrl, index) => {
          const isActive = selectedImage === imageUrl

          return (
            <button
              aria-label={`Xem ảnh ${index + 1} của ${title}`}
              className={`hotel-detail-gallery__thumb ${
                isActive ? 'hotel-detail-gallery__thumb--active' : ''
              }`}
              key={`${imageUrl}-${index}`}
              type="button"
              onClick={() => onSelectImage(imageUrl)}
            >
              <img alt={`${title} ${index + 1}`} src={imageUrl} />
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default HotelGallery
