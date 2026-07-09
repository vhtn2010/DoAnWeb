import {
  approveService as approveServiceWithApiAdapter,
  createAdminService as createAdminServiceWithApiAdapter,
  getAdminServiceById as getAdminServiceByIdWithApiAdapter,
  hideService as hideServiceWithApiAdapter,
  listAdminServices as listAdminServicesWithApiAdapter,
  rejectService as rejectServiceWithApiAdapter,
  restoreService as restoreServiceWithApiAdapter,
  softDeleteService as softDeleteServiceWithApiAdapter,
  submitServiceForReview as submitServiceForReviewWithApiAdapter,
  updateAdminService as updateAdminServiceWithApiAdapter,
  updateServiceStatus as updateServiceStatusWithApiAdapter,
} from '../adapters/api/adminServiceApiAdapter.js'

const adminServiceAdapter = {
  approveService: approveServiceWithApiAdapter,
  createAdminService: createAdminServiceWithApiAdapter,
  getAdminServiceById: getAdminServiceByIdWithApiAdapter,
  hideService: hideServiceWithApiAdapter,
  listAdminServices: listAdminServicesWithApiAdapter,
  rejectService: rejectServiceWithApiAdapter,
  restoreService: restoreServiceWithApiAdapter,
  softDeleteService: softDeleteServiceWithApiAdapter,
  submitServiceForReview: submitServiceForReviewWithApiAdapter,
  updateAdminService: updateAdminServiceWithApiAdapter,
  updateServiceStatus: updateServiceStatusWithApiAdapter,
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
