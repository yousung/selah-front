import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

declare global {
  interface Window {
    wcs_add: Record<string, string>
    wcs?: object
    wcs_do?: () => void
  }
}

export default function NaverAnalyticsTracker() {
  const location = useLocation()

  useEffect(() => {
    if (import.meta.env.DEV) return
    if (!window.wcs || !window.wcs_do) return
    if (!window.wcs_add) window.wcs_add = {}
    window.wcs_add['url'] = location.pathname + location.search
    window.wcs_do()
  }, [location.pathname, location.search])

  return null
}
