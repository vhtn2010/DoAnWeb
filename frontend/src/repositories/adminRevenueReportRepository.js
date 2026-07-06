import {
  downloadRevenueReportFile as downloadRevenueReportFileWithApiAdapter,
  exportRevenueReport as exportRevenueReportWithApiAdapter,
  getRevenueReport as getRevenueReportWithApiAdapter,
} from '../adapters/api/adminRevenueReportApiAdapter.js'

const adminRevenueReportAdapter = {
  downloadRevenueReportFile: downloadRevenueReportFileWithApiAdapter,
  exportRevenueReport: exportRevenueReportWithApiAdapter,
  getRevenueReport: getRevenueReportWithApiAdapter,
}

export function getRevenueReport(params) {
  return adminRevenueReportAdapter.getRevenueReport(params)
}

export function exportRevenueReport(payload) {
  return adminRevenueReportAdapter.exportRevenueReport(payload)
}

export function downloadRevenueReportFile(fileUrl) {
  return adminRevenueReportAdapter.downloadRevenueReportFile(fileUrl)
}
