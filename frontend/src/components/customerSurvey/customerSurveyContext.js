import { createContext, useContext } from 'react'

export const CustomerSurveyContext = createContext(null)

export function useCustomerSurveyPopup() {
  const context = useContext(CustomerSurveyContext)

  return context ?? {
    completed: false,
    isCustomer: false,
    isStatusLoading: false,
    openSurvey: () => {},
  }
}
