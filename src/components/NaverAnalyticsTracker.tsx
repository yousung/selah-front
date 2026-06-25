import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

declare global {
  interface Window {
    wcs_add?: Record<string, string>
    wcs?: object
    wcs_do?: () => void
  }
}

const NAVER_ANALYTICS_ID = '1a88efb37b01820'
const NAVER_SCRIPT_ID = 'naver-analytics-script'

export default function NaverAnalyticsTracker() {
  const location = useLocation()

  useEffect(() => {
    if (!import.meta.env.PROD) return

    const trackCurrentPage = () => {
      if (!window.wcs || !window.wcs_do) return
      window.wcs_add = window.wcs_add ?? {}
      window.wcs_add['wa'] = NAVER_ANALYTICS_ID
      window.wcs_add['url'] = location.pathname + location.search
      window.wcs_do()
    }

    window.wcs_add = window.wcs_add ?? {}
    window.wcs_add['wa'] = NAVER_ANALYTICS_ID

    if (document.getElementById(NAVER_SCRIPT_ID)) {
      trackCurrentPage()
      return
    }

    const script = document.createElement('script')
    script.id = NAVER_SCRIPT_ID
    script.src = 'https://wcs.pstatic.net/wcslog.js'
    script.async = true
    script.onload = trackCurrentPage
    document.body.appendChild(script)
  }, [location.pathname, location.search])

  return null
}
