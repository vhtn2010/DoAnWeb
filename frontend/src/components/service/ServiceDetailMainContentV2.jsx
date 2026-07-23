import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import usePublicSession from '../../hooks/usePublicSession.js'
import { createPublicTourComment } from '../../repositories/commentRepository.js'
import { CheckIcon, CrossIcon } from './ServiceDetailIcons.jsx'
import ServiceDetailInfoStrip from './ServiceDetailInfoStrip.jsx'
import { renderServiceStars } from './ServiceDetailStars.jsx'

function ServiceDetailSectionTitle({ title }) {
  return (
    <div className="service-detail-section-title">
      <span aria-hidden="true" className="service-detail-section-title__icon" />
      <h2 className="service-detail-section-title__text">{title}</h2>
    </div>
  )
}

function ServiceDetailItinerary({ itinerary }) {
  if (!itinerary.length) {
    return null
  }

  return (
    <section className="service-detail-itinerary">
      <ServiceDetailSectionTitle title="Lịch trình chi tiết" />

      <div className="service-detail-timeline">
        {itinerary.map((day) => (
          <article className="service-detail-day" key={day.day_number}>
            <div className="service-detail-day__marker">
              <span>{day.day_number}</span>
            </div>

            <div className="service-detail-day__body">
              <h3 className="service-detail-day__title">{day.title}</h3>
              <p className="service-detail-day__summary">{day.summary}</p>

              <div className="service-detail-day__highlights">
                {(Array.isArray(day.highlights) ? day.highlights : []).map((highlight) => (
                  <p className="service-detail-day__highlight" key={highlight}>
                    <span aria-hidden="true" className="service-detail-day__dot" />
                    <span>{highlight}</span>
                  </p>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function ServiceDetailInclusions({ excludedServices, includedServices }) {
  return (
    <section className="service-detail-inclusions">
      <article className="service-detail-inclusions__card service-detail-inclusions__card--included">
        <div className="service-detail-inclusions__heading">
          <span className="service-detail-inclusions__icon">
            <CheckIcon />
          </span>
          <h2>Bao gồm</h2>
        </div>

        <ul className="service-detail-inclusions__list">
          {includedServices.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>

      <article className="service-detail-inclusions__card service-detail-inclusions__card--excluded">
        <div className="service-detail-inclusions__heading">
          <span className="service-detail-inclusions__icon">
            <CrossIcon />
          </span>
          <h2>Không bao gồm</h2>
        </div>

        <ul className="service-detail-inclusions__list">
          {excludedServices.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
    </section>
  )
}

function ServiceDetailReviews({ service }) {
  const reviewSamples = Array.isArray(service.review_samples)
    ? service.review_samples
    : []

  return (
    <section className="service-detail-reviews" id="service-detail-reviews">
      <div className="service-detail-reviews__header">
        <div>
          <span className="service-detail-reviews__eyebrow">Trải nghiệm thực tế</span>
          <h2 className="service-detail-reviews__title">Đánh giá tour</h2>
        </div>
        <span className="service-detail-reviews__link">
          {service.review_count} đánh giá đã xác thực
        </span>
      </div>

      <div className="service-detail-reviews__overview">
        <div className="service-detail-reviews__rating">
          <strong>{service.rating_value.toFixed(1)}</strong>
          <div className="service-detail-review-card__stars">
            {renderServiceStars(service.rating_value)}
          </div>
          <span>{service.review_count} đánh giá</span>
        </div>
        <div className="service-detail-reviews__guide">
          <p>
            Điểm sao và đánh giá chỉ đến từ khách đã đặt, trải nghiệm và hoàn thành
            tour này.
          </p>
          <Link to="/profile/orders">Bạn đã đi tour này? Đánh giá trong đơn hàng</Link>
        </div>
      </div>

      <div className="service-detail-reviews__list">
        {reviewSamples.length ? (
          reviewSamples.map((review) => (
            <article
              className="service-detail-review-card"
              key={`${review.author_name}-${review.month_label}`}
            >
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

              <p className="service-detail-review-card__content">“{review.content}”</p>
            </article>
          ))
        ) : (
          <div className="service-detail-reviews__empty">
            <strong>Chưa có đánh giá nào</strong>
            <p>Khách đã hoàn thành tour có thể gửi đánh giá từ trang đơn hàng.</p>
          </div>
        )}
      </div>
    </section>
  )
}

function ServiceDetailComments({ service }) {
  const { currentUser, isAuthenticated } = usePublicSession()
  const [comments, setComments] = useState(
    Array.isArray(service.comment_samples) ? service.comment_samples : [],
  )
  const [commentCount, setCommentCount] = useState(
    Number(service.comment_summary?.comment_count || service.comment_samples?.length || 0),
  )
  const [content, setContent] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setComments(Array.isArray(service.comment_samples) ? service.comment_samples : [])
    setCommentCount(
      Number(service.comment_summary?.comment_count || service.comment_samples?.length || 0),
    )
    setContent('')
    setErrorMessage('')
    setSuccessMessage('')
  }, [service.id, service.comment_samples, service.comment_summary?.comment_count])

  async function submitComment(event) {
    event.preventDefault()

    if (submitting) {
      return
    }

    const normalizedContent = content.trim()
    const normalizedDisplayName = displayName.trim()

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
      const response = await createPublicTourComment(service.id, {
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
    <section className="service-detail-comments" id="service-detail-comments">
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
            <p>Không cần mua tour để đặt câu hỏi hoặc chia sẻ thông tin.</p>
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
            placeholder="Đặt câu hỏi hoặc chia sẻ điều bạn biết về tour này..."
            rows={4}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
          <small>{content.trim().length}/1000 ký tự</small>
        </label>

        {errorMessage ? <p className="service-detail-comments__error" role="alert">{errorMessage}</p> : null}
        {successMessage ? <p className="service-detail-comments__success" role="status">{successMessage}</p> : null}

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
            <p>Bạn có thể đặt câu hỏi đầu tiên về lịch trình, dịch vụ hoặc ngày khởi hành.</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default function ServiceDetailMainContentV2({ infoItems, service }) {
  const itinerary = Array.isArray(service?.details?.itinerary) ? service.details.itinerary : []
  const includedServices = Array.isArray(service?.details?.included_services)
    ? service.details.included_services
    : []
  const excludedServices = Array.isArray(service?.details?.excluded_services)
    ? service.details.excluded_services
    : []

  return (
    <div className="service-detail-page__main">
      <ServiceDetailInfoStrip infoItems={infoItems} />
      <ServiceDetailItinerary itinerary={itinerary} />
      <ServiceDetailInclusions
        excludedServices={excludedServices}
        includedServices={includedServices}
      />
      <ServiceDetailReviews service={service} />
      <ServiceDetailComments service={service} />
    </div>
  )
}
