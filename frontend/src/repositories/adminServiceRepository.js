import {
  approveService as approveServiceWithMockAdapter,
  createAdminService as createAdminServiceWithMockAdapter,
  getAdminServiceById as getAdminServiceByIdWithMockAdapter,
  hideService as hideServiceWithMockAdapter,
  listAdminServices as listAdminServicesWithMockAdapter,
  rejectService as rejectServiceWithMockAdapter,
  restoreService as restoreServiceWithMockAdapter,
  softDeleteService as softDeleteServiceWithMockAdapter,
  submitServiceForReview as submitServiceForReviewWithMockAdapter,
  updateAdminService as updateAdminServiceWithMockAdapter,
  updateServiceStatus as updateServiceStatusWithMockAdapter,
} from '../adapters/mock/adminServiceMockAdapter.js'

const adminServiceAdapter = {
  approveService: approveServiceWithMockAdapter,
  createAdminService: createAdminServiceWithMockAdapter,
  getAdminServiceById: getAdminServiceByIdWithMockAdapter,
  hideService: hideServiceWithMockAdapter,
  listAdminServices: listAdminServicesWithMockAdapter,
  rejectService: rejectServiceWithMockAdapter,
  restoreService: restoreServiceWithMockAdapter,
  softDeleteService: softDeleteServiceWithMockAdapter,
  submitServiceForReview: submitServiceForReviewWithMockAdapter,
  updateAdminService: updateAdminServiceWithMockAdapter,
  updateServiceStatus: updateServiceStatusWithMockAdapter,
}

export function listAdminServices(params) {
  return adminServiceAdapter.listAdminServices(params)
}

export function getAdminServiceById(serviceId) {
  return adminServiceAdapter.getAdminServiceById(serviceId)
}

export function createAdminService(payload, options) {
  return adminServiceAdapter.createAdminService(payload, options)
}

export function updateAdminService(serviceId, payload, options) {
  return adminServiceAdapter.updateAdminService(serviceId, payload, options)
}

export function submitServiceForReview(serviceId, payload, options) {
  return adminServiceAdapter.submitServiceForReview(serviceId, payload, options)
}

export function approveService(serviceId, payload, options) {
  return adminServiceAdapter.approveService(serviceId, payload, options)
}

export function rejectService(serviceId, payload, options) {
  return adminServiceAdapter.rejectService(serviceId, payload, options)
}

export function hideService(serviceId, payload, options) {
  return adminServiceAdapter.hideService(serviceId, payload, options)
}

export function restoreService(serviceId, payload, options) {
  return adminServiceAdapter.restoreService(serviceId, payload, options)
}

export function softDeleteService(serviceId, payload, options) {
  return adminServiceAdapter.softDeleteService(serviceId, payload, options)
}

export function updateServiceStatus(serviceId, payload, options) {
  return adminServiceAdapter.updateServiceStatus(serviceId, payload, options)
}
