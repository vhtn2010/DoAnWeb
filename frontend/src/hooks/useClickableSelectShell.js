import { useCallback, useRef } from 'react'

export default function useClickableSelectShell(disabled = false) {
  const selectRef = useRef(null)

  const handlePointerDown = useCallback((event) => {
    if (disabled) {
      return
    }

    const selectElement = selectRef.current

    if (!selectElement || event.target === selectElement) {
      return
    }

    event.preventDefault()

    if (typeof selectElement.showPicker === 'function') {
      selectElement.showPicker()
      return
    }

    selectElement.focus()
    selectElement.click()
  }, [disabled])

  return {
    handlePointerDown,
    selectRef,
  }
}
