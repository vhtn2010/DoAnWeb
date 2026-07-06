import { useEffect, useMemo, useState } from 'react'
import {
  getAdminRevenueReportQuery,
  getAdminRevenueRangeOptions,
  mapAdminRevenueReportData,
} from '../mappers/adminRevenueReportMappers.js'
import {
  downloadRevenueReportFile,
  exportRevenueReport,
  getRevenueReport,
} from '../repositories/adminRevenueReportRepository.js'

function getFallbackFileName({
  format,
  from,
  to,
}) {
  return `revenue-report-${from}-${to}.${format}`
}

function getFileNameFromUrl(fileUrl, fallbackFileName) {
  try {
    const parsedUrl = new URL(fileUrl, window.location.origin)
    const fileName = decodeURIComponent(parsedUrl.pathname.split('/').filter(Boolean).pop() ?? '')

    return fileName || fallbackFileName
  } catch {
    return fallbackFileName
  }
}

function triggerBrowserDownload(blob, fileName) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  const objectUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(objectUrl)
}

export default function useAdminRevenueReport() {
  const [range, setRange] = useState('month')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [exportingFormat, setExportingFormat] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const queryParams = useMemo(() => getAdminRevenueReportQuery(range), [range])

  useEffect(() => {
    let isActive = true

    async function loadRevenueReport() {
      setLoading(true)
      setError('')
      setFeedback('')

      try {
        const response = await getRevenueReport(queryParams)

        if (!isActive) {
          return
        }

        if (!response.success || !response.data) {
          throw new Error(response.message || 'Không thể tải báo cáo doanh thu lúc này.')
        }

        setReport(mapAdminRevenueReportData(response.data, { range }))
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setError(loadError?.message ?? 'Không thể tải báo cáo doanh thu lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadRevenueReport()

    return () => {
      isActive = false
    }
  }, [queryParams, range, reloadKey])

  async function handleExport(format) {
    setExportingFormat(format)
    setFeedback('')

    try {
      const response = await exportRevenueReport({
        format,
        from: queryParams.from,
        groupBy: queryParams.group_by,
        to: queryParams.to,
      })
      const fileUrl = response.data?.file_url

      if (!response.success || !fileUrl) {
        throw new Error(response.message || 'Không thể xuất báo cáo doanh thu lúc này.')
      }

      const fallbackFileName = getFallbackFileName({
        format,
        from: queryParams.from,
        to: queryParams.to,
      })
      const blob = await downloadRevenueReportFile(fileUrl)

      triggerBrowserDownload(blob, getFileNameFromUrl(fileUrl, fallbackFileName))
      setFeedback(`Đã xuất báo cáo doanh thu dạng ${format === 'pdf' ? 'PDF' : 'Excel'}.`)
    } catch (exportError) {
      setFeedback(exportError?.message ?? 'Không thể xuất báo cáo doanh thu lúc này.')
    } finally {
      setExportingFormat('')
    }
  }

  return {
    error,
    exportReport: handleExport,
    exportingFormat,
    feedback,
    hasReport: Boolean(report),
    loading,
    range,
    rangeOptions: getAdminRevenueRangeOptions(),
    reloadReport: () => setReloadKey((currentValue) => currentValue + 1),
    report,
    setRange,
  }
}
