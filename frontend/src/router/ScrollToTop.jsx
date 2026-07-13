import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const SCROLL_CONTAINER_SELECTORS = [
  '.public-layout__main',
  '.public-layout__content',
  '.admin-layout__main',
  '.admin-layout__body',
  '.admin-layout__surface',
]

const SMOOTH_SCROLL_PATH_PATTERNS = [
  /^\/$/,
  /^\/services(?:\/|$)/,
  /^\/flights(?:\/|$)/,
  /^\/trains(?:\/|$)/,
  /^\/hotels(?:\/|$)/,
]

function shouldUseSmoothScroll(pathname = '') {
  return SMOOTH_SCROLL_PATH_PATTERNS.some((pattern) => pattern.test(pathname))
}

function scrollElementToTop(element, behavior = 'auto') {
  if (!element) {
    return
  }

  if (element === window) {
    window.scrollTo({
      behavior,
      left: 0,
      top: 0,
    })
    return
  }

  if (typeof element.scrollTo === 'function') {
    element.scrollTo({
      behavior,
      left: 0,
      top: 0,
    })
    return
  }

  element.scrollTop = 0
  element.scrollLeft = 0
}

function withInstantScroll(callback) {
  const html = document.documentElement
  const body = document.body
  const previousHtmlScrollBehavior = html.style.scrollBehavior
  const previousBodyScrollBehavior = body.style.scrollBehavior

  html.style.scrollBehavior = 'auto'
  body.style.scrollBehavior = 'auto'

  try {
    callback()
  } finally {
    html.style.scrollBehavior = previousHtmlScrollBehavior
    body.style.scrollBehavior = previousBodyScrollBehavior
  }
}

function ScrollToTop() {
  const { pathname, search } = useLocation()
  const isInitialRenderRef = useRef(true)

  useEffect(() => {
    if (!window.history?.scrollRestoration) {
      return undefined
    }

    const previousScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'

    return () => {
      window.history.scrollRestoration = previousScrollRestoration
    }
  }, [])

  useLayoutEffect(() => {
    const shouldScrollSmoothly = !isInitialRenderRef.current && shouldUseSmoothScroll(pathname)
    isInitialRenderRef.current = false

    if (shouldScrollSmoothly) {
      scrollElementToTop(window, 'smooth')
      scrollElementToTop(document.documentElement, 'smooth')
      scrollElementToTop(document.body, 'smooth')
      scrollElementToTop(document.scrollingElement, 'smooth')

      SCROLL_CONTAINER_SELECTORS.forEach((selector) => {
        scrollElementToTop(document.querySelector(selector), 'smooth')
      })
      return
    }

    withInstantScroll(() => {
      scrollElementToTop(window, 'auto')
      scrollElementToTop(document.documentElement, 'auto')
      scrollElementToTop(document.body, 'auto')
      scrollElementToTop(document.scrollingElement, 'auto')

      SCROLL_CONTAINER_SELECTORS.forEach((selector) => {
        scrollElementToTop(document.querySelector(selector), 'auto')
      })
    })
  }, [pathname, search])

  return null
}

export default ScrollToTop
