import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

function TrainDetailComingSoonPage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const isCustomer = searchParams.get('auth') === 'customer'

  function handleBack() {
    navigate(isCustomer ? '/trains?auth=customer' : '/trains')
  }

  return (
    <div className="train-detail-coming-soon">
      <div className="train-detail-coming-soon__card">
        <p className="train-detail-coming-soon__eyebrow">Train Detail Placeholder</p>
        <h1>Màn chi tiết vé tàu sẽ được hoàn thiện ở task tiếp theo.</h1>
        {slug ? <p className="train-detail-coming-soon__slug">Slug đang mở: {slug}</p> : null}
        <button className="train-detail-coming-soon__back" type="button" onClick={handleBack}>
          Quay lại danh sách vé tàu
        </button>
      </div>
    </div>
  )
}

export default TrainDetailComingSoonPage
