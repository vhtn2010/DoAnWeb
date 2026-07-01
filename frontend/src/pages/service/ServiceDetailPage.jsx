import { useParams } from 'react-router-dom'

function ServiceDetailPage() {
  const { slug } = useParams()

  return (
    <main>
      <h1>ServiceDetailPage</h1>
      <p>Placeholder route for /services/:slug</p>
      <p>Slug: {slug}</p>
    </main>
  )
}

export default ServiceDetailPage
