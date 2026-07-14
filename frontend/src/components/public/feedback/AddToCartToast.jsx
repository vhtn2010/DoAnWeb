import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AddToCartToastContext } from './addToCartToastContext.js'

const ADD_TO_CART_TOAST_DURATION_MS = 15000

export function AddToCartToastProvider({ children }) {
  const hideTimerRef = useRef(null)
  const [toastState, setToastState] = useState({
    id: 0,
    isVisible: false,
  })

  const hideToast = useCallback(() => {
    setToastState((currentState) => ({
      ...currentState,
      isVisible: false,
    }))
  }, [])

  const showAddToCartToast = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current)
    }

    setToastState((currentState) => ({
      id: currentState.id + 1,
      isVisible: true,
    }))

    hideTimerRef.current = window.setTimeout(hideToast, ADD_TO_CART_TOAST_DURATION_MS)
  }, [hideToast])

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current)
      }
    }
  }, [])

  const contextValue = useMemo(
    () => ({
      showAddToCartToast,
    }),
    [showAddToCartToast],
  )

  return (
    <AddToCartToastContext.Provider value={contextValue}>
      {children}
      {toastState.isVisible ? (
        <div
          key={toastState.id}
          aria-live="polite"
          className="public-add-cart-toast"
          role="status"
        >
          <strong>Đã lưu thành công.</strong>
          <p>Cập nhật dịch vụ thành công.</p>
          <div className="public-add-cart-toast__progress" aria-hidden="true">
            <span className="public-add-cart-toast__progress-bar" />
          </div>
        </div>
      ) : null}
    </AddToCartToastContext.Provider>
  )
}
