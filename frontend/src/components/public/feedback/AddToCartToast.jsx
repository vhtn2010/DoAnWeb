import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AddToCartToastContext } from './addToCartToastContext.js'

const ADD_TO_CART_TOAST_DURATION_MS = 3500

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
          className="public-add-cart-toast public-add-cart-toast--success"
          role="status"
        >
          <button
            aria-label="Đóng thông báo"
            className="public-add-cart-toast__close"
            type="button"
            onClick={hideToast}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16">
              <path
                d="m4 4 8 8M12 4 4 12"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>
          <strong>Đã thêm vào giỏ hàng.</strong>
          <p>Dịch vụ đã được thêm vào giỏ hàng của bạn.</p>
          <div className="public-add-cart-toast__progress" aria-hidden="true">
            <span className="public-add-cart-toast__progress-bar" />
          </div>
        </div>
      ) : null}
    </AddToCartToastContext.Provider>
  )
}
