import { useEffect, useMemo, useState } from 'react'
import {
  getAdminRevenueRangeOptions,
  mapAdminRevenueReportData,
} from '../mappers/adminRevenueReportMappers.js'
import {
  downloadRevenueReportFile,
  exportRevenueReport,
  getRevenueReport,
} from '../repositories/adminRevenueReportRepository.js'
import {
  formatRevenueDateParam,
  formatRevenueDateRangeLabel,
  getDefaultRevenueDateRange,
  normalizeRevenueDateRange,
} from '../utils/adminRevenueDateRange.js'

const RANGE_GROUP_BY = Object.freeze({
  day: 'day',
  month: 'week',
  year: 'month',
})

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

export default function useAdminRevenueReportEnhanced() {
  const [range, setRange] = useState('month')
  const [dateRange, setDateRange] = useState(() => getDefaultRevenueDateRange('month'))
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [exportingFormat, setExportingFormat] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const queryParams = useMemo(() => {
    const normalizedRange = normalizeRevenueDateRange(dateRange, range)

    return {
      from: formatRevenueDateParam(normalizedRange.startDate),
      group_by: RANGE_GROUP_BY[range] ?? RANGE_GROUP_BY.month,
      to: formatRevenueDateParam(normalizedRange.endDate),
    }
  }, [dateRange, range])

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

        const mappedReport = mapAdminRevenueReportData(response.data, { range })

        mappedReport.period = formatRevenueDateRangeLabel(dateRange, range)
        setReport(mappedReport)
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
  }, [dateRange, queryParams, range, reloadKey])

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
    dateRange,
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
    setDateRange: (nextRange) => {
      setDateRange(normalizeRevenueDateRange(nextRange, range))
    },
    setRange: (nextRange) => {
      setRange(nextRange)
      setDateRange(getDefaultRevenueDateRange(nextRange))
    },
  }
}
