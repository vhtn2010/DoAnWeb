import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import usePublicSession from '../../hooks/usePublicSession.js'
import { createPublicTourComment } from '../../repositories/commentRepository.js'
import { renderServiceStars } from '../service/ServiceDetailStars.jsx'

function buildInitials(name = '') {
  return String(name || 'K')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function normalizeReview(review = {}, index = 0) {
  const authorName = review.author_name || review.name || 'Khách hàng'

  return {
    author_initials: review.author_initials || review.initials || buildInitials(authorName),
    author_name: authorName,
    content: review.content || review.comment || '',
    id: review.id || `${authorName}-${review.month_label || review.stayed_text || index}`,
    month_label: review.month_label || review.stayed_text || 'Gần đây',
    rating_value: Number(review.rating_value ?? review.rating ?? 0),
  }
}

function HotelReviews({ rating, reviewCount, reviews }) {
  return (
    <section className="service-detail-reviews" id="hotel-detail-reviews">
      <div className="service-detail-reviews__header">
        <div>
          <span className="service-detail-reviews__eyebrow">Trải nghiệm thực tế</span>
          <h2 className="service-detail-reviews__title">Đánh giá khách sạn</h2>
        </div>
        <span className="service-detail-reviews__link">
          {reviewCount} đánh giá đã xác thực
        </span>
      </div>

      <div className="service-detail-reviews__overview">
        <div className="service-detail-reviews__rating">
          <strong>{rating.toFixed(1)}</strong>
          <div className="service-detail-review-card__stars">
            {renderServiceStars(rating)}
          </div>
          <span>{reviewCount} đánh giá</span>
        </div>
        <div className="service-detail-reviews__guide">
          <p>
            Điểm sao và đánh giá chỉ đến từ khách đã đặt, lưu trú và hoàn thành dịch vụ
            tại khách sạn này.
          </p>
          <Link to="/profile/orders">Bạn đã lưu trú tại đây? Đánh giá trong đơn hàng</Link>
        </div>
      </div>

      <div className="service-detail-reviews__list">
        {reviews.length ? (
          reviews.map((review) => (
            <article className="service-detail-review-card" key={review.id}>
              <div className="service-detail-review-card__top">
                <div className="service-detail-review-card__identity">
                  <span className="service-detail-review-card__avatar">
                    {review.author_initials}
                  </span>
                  <div>
                    <p className="service-detail-review-card__name">{review.author_name}</p>
                    <p className="service-detail-review-card__date">{review.month_label}</p>
                  </div>
                </div>

                <div className="service-detail-review-card__stars">
                  {renderServiceStars(review.rating_value)}
                </div>
              </div>

              {review.content ? (
                <p className="service-detail-review-card__content">“{review.content}”</p>
              ) : null}
            </article>
          ))
        ) : (
          <div className="service-detail-reviews__empty">
            <strong>Chưa có đánh giá nào</strong>
            <p>Khách đã hoàn thành lưu trú có thể gửi đánh giá từ trang đơn hàng.</p>
          </div>
        )}
      </div>
    </section>
  )
}

function HotelComments({ hotel }) {
  const { currentUser, isAuthenticated } = usePublicSession()
  const [comments, setComments] = useState(
    Array.isArray(hotel?.comment_samples) ? hotel.comment_samples : [],
  )
  const [commentCount, setCommentCount] = useState(
    Number(hotel?.comment_summary?.comment_count || hotel?.comment_samples?.length || 0),
  )
  const [content, setContent] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setComments(Array.isArray(hotel?.comment_samples) ? hotel.comment_samples : [])
    setCommentCount(
      Number(hotel?.comment_summary?.comment_count || hotel?.comment_samples?.length || 0),
    )
    setContent('')
    setErrorMessage('')
    setSuccessMessage('')
  }, [hotel?.id, hotel?.comment_samples, hotel?.comment_summary?.comment_count])

  async function submitComment(event) {
    event.preventDefault()

    if (submitting) {
      return
    }

    const normalizedContent = content.trim()
    const normalizedDisplayName = displayName.trim()

    if (!hotel?.id) {
      setErrorMessage('Không thể xác định khách sạn để đăng bình luận.')
      return
    }

    if (!isAuthenticated && normalizedDisplayName.length < 2) {
      setErrorMessage('Vui lòng nhập tên hiển thị có ít nhất 2 ký tự.')
      return
    }

    if (normalizedContent.length < 2) {
      setErrorMessage('Bình luận cần ít nhất 2 ký tự.')
      return
    }

    setSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await createPublicTourComment(hotel.id, {
        content: normalizedContent,
        ...(!isAuthenticated ? { display_name: normalizedDisplayName } : {}),
      })
      const createdComment = response.data

      setComments((currentComments) => [createdComment, ...currentComments])
      setCommentCount((currentCount) => currentCount + 1)
      setContent('')
      setSuccessMessage('Bình luận của bạn đã được đăng.')
    } catch (commentError) {
      setErrorMessage(commentError?.message || 'Không thể đăng bình luận lúc này.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="service-detail-comments" id="hotel-detail-comments">
      <div className="service-detail-comments__header">
        <div>
          <span>Trao đổi công khai</span>
          <h2>Bình luận và thảo luận</h2>
        </div>
        <strong>{commentCount} bình luận</strong>
      </div>

      <form className="service-detail-comments__form" onSubmit={submitComment}>
        <div className="service-detail-comments__form-heading">
          <div className="service-detail-comment__avatar" aria-hidden="true">
            {(currentUser?.full_name || displayName || 'K').trim().slice(0, 1).toUpperCase()}
          </div>
          <div>
            <strong>
              {isAuthenticated
                ? currentUser?.full_name || 'Tài khoản của bạn'
                : 'Tham gia thảo luận'}
            </strong>
            <p>Không cần đặt phòng để đặt câu hỏi hoặc chia sẻ thông tin.</p>
          </div>
        </div>

        {!isAuthenticated ? (
          <label>
            <span>Tên hiển thị</span>
            <input
              maxLength={80}
              placeholder="Ví dụ: Minh Anh"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
        ) : null}

        <label>
          <span>Nội dung bình luận</span>
          <textarea
            maxLength={1000}
            placeholder="Đặt câu hỏi hoặc chia sẻ điều bạn biết về khách sạn này..."
            rows={4}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
          <small>{content.trim().length}/1000 ký tự</small>
        </label>

        {errorMessage ? (
          <p className="service-detail-comments__error" role="alert">{errorMessage}</p>
        ) : null}
        {successMessage ? (
          <p className="service-detail-comments__success" role="status">{successMessage}</p>
        ) : null}

        <div className="service-detail-comments__form-actions">
          <button disabled={submitting} type="submit">
            {submitting ? 'Đang đăng...' : 'Đăng bình luận'}
          </button>
        </div>
      </form>

      <div className="service-detail-comments__list">
        {comments.length ? (
          comments.map((comment) => (
            <article className="service-detail-comment" key={comment.id}>
              <div className="service-detail-comment__avatar">{comment.author_initials}</div>
              <div className="service-detail-comment__body">
                <div className="service-detail-comment__meta">
                  <strong>{comment.author_name}</strong>
                  {comment.is_registered ? <span>Thành viên</span> : <span>Khách</span>}
                  <time>{comment.date_label}</time>
                </div>
                <p>{comment.content}</p>
              </div>
            </article>
          ))
        ) : (
          <div className="service-detail-comments__empty">
            <strong>Chưa có cuộc thảo luận nào</strong>
            <p>Bạn có thể đặt câu hỏi đầu tiên về phòng, tiện nghi hoặc ngày lưu trú.</p>
          </div>
        )}
      </div>
    </section>
  )
}

function HotelReviewSummary({ hotel, rating = 0, reviewCount = 0, reviews = [] }) {
  const normalizedReviews = (
    Array.isArray(hotel?.review_samples) && hotel.review_samples.length
      ? hotel.review_samples
      : reviews
  ).map(normalizeReview)
  const normalizedRating = Number(hotel?.rating ?? rating ?? 0)
  const normalizedReviewCount = Number(
    hotel?.review_count ?? reviewCount ?? normalizedReviews.length ?? 0,
  )

  return (
    <>
      <HotelReviews
        rating={normalizedRating}
        reviewCount={normalizedReviewCount}
        reviews={normalizedReviews}
      />
      <HotelComments hotel={hotel} />
    </>
  )
}

export default HotelReviewSummary
