import { createContext, useContext } from 'react'

export const AddToCartToastContext = createContext({
  showAddToCartToast: () => {},
})

export function useAddToCartToast() {
  return useContext(AddToCartToastContext)
}
