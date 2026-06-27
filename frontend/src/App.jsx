import { useEffect, useState } from 'react'
import './App.css'

const apiUrl = import.meta.env.VITE_API_URL || '/api'

function App() {
  const [apiStatus, setApiStatus] = useState('dang kiem tra')
  const [tours, setTours] = useState([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [healthResponse, toursResponse] = await Promise.all([
          fetch(`${apiUrl}/health`),
          fetch(`${apiUrl}/tours`),
        ])

        if (!healthResponse.ok || !toursResponse.ok) {
          throw new Error('API request failed')
        }

        const health = await healthResponse.json()
        const tourResult = await toursResponse.json()

        setApiStatus(health.status)
        setTours(tourResult.data)
      } catch {
        setApiStatus('chua ket noi')
        setTours([])
      }
    }

    loadData()
  }, [])

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Net Viet Travel</p>
          <h1>Tour Viet Nam duoc sap xep ro rang tu ngay dau.</h1>
          <p className="hero-copy">
            Nen tang frontend va backend da san sang de phat trien cac luong
            dat tour, quan ly hanh trinh va tich hop du lieu thuc te.
          </p>
          <div className="actions">
            <a href="#tours" className="primary-action">
              Xem tour mau
            </a>
            <span className={`status ${apiStatus === 'ok' ? 'online' : ''}`}>
              API: {apiStatus}
            </span>
          </div>
        </div>
      </section>

      <section id="tours" className="tour-section">
        <div className="section-heading">
          <p className="eyebrow">Du lieu API</p>
          <h2>Tour dang hien thi</h2>
        </div>

        <div className="tour-grid">
          {tours.length > 0 ? (
            tours.map((tour) => (
              <article className="tour-card" key={tour.id}>
                <p>{tour.location}</p>
                <h3>{tour.title}</h3>
                <div className="tour-meta">
                  <span>{tour.duration}</span>
                  <strong>{tour.priceFrom.toLocaleString('vi-VN')} VND</strong>
                </div>
              </article>
            ))
          ) : (
            <p className="empty-state">
              Chua doc duoc du lieu tour. Hay chay backend tai cong 3000.
            </p>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
