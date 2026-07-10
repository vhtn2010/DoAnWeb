import { Link } from 'react-router-dom'
import usePublicAccessGate from '../../../hooks/usePublicAccessGate.js'
import usePublicSession from '../../../hooks/usePublicSession.js'

function PublicCustomerLink({
  ariaLabel,
  children,
  className,
  description,
  eyebrow,
  title,
  to,
}) {
  const { isCustomerPreview } = usePublicSession()
  const { navigateWithCustomerGate } = usePublicAccessGate()

  if (isCustomerPreview) {
    return (
      <Link aria-label={ariaLabel} className={className} to={to}>
        {children}
      </Link>
    )
  }

  return (
    <button
      aria-label={ariaLabel}
      className={className}
      type="button"
      onClick={() =>
        navigateWithCustomerGate(to, {
          description,
          eyebrow,
          title,
        })
      }
    >
      {children}
    </button>
  )
}

export default PublicCustomerLink
