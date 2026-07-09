import { useNavigate, useParams } from 'react-router-dom'
import usePublicSession from '../../hooks/usePublicSession.js'
import { buildPublicAuthPath } from '../../utils/publicNavigation.js'

function TrainDetailComingSoonPage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const { isCustomer } = usePublicSession()

  function handleBack() {
    navigate(buildPublicAuthPath('/trains', isCustomer))
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
