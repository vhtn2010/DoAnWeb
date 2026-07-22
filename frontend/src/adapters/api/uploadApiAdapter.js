import { apiPost } from '../../services/apiClient.js'

const CLOUDINARY_UPLOAD_TIMEOUT_MS = 30000
const PAYMENT_PROOF_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const SUPPORT_ATTACHMENT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const PAYMENT_PROOF_ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])
const SUPPORT_IMAGE_ALLOWED_MIME_TYPES = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
])

function validateSupportAttachment(file, { allowedMimeTypes = null, emptyMessage, invalidTypeMessage } = {}) {
  if (!file) {
    return emptyMessage || 'Vui lòng chọn tệp đính kèm trước khi tải lên.'
  }

  if (allowedMimeTypes && !allowedMimeTypes.has(file.type)) {
    return invalidTypeMessage || 'Tệp đính kèm không đúng định dạng được hỗ trợ.'
  }

  if (file.size > SUPPORT_ATTACHMENT_MAX_FILE_SIZE_BYTES) {
    return 'Tệp đính kèm không được vượt quá 10MB.'
  }

  return ''
}

export function validatePaymentProofFile(file) {
  if (!file) {
    return 'Vui lòng tải bill chuyển khoản trước khi gửi duyệt.'
  }

  if (!PAYMENT_PROOF_ALLOWED_MIME_TYPES.has(file.type)) {
    return 'Bill chuyển khoản phải là ảnh JPG, PNG hoặc WEBP.'
  }

  if (file.size > PAYMENT_PROOF_MAX_FILE_SIZE_BYTES) {
    return 'Bill chuyển khoản không được vượt quá 5MB.'
  }

  return ''
}

async function uploadSignedAsset({
  file,
  signature,
}) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), CLOUDINARY_UPLOAD_TIMEOUT_MS)
  const formData = new FormData()

  formData.set('api_key', signature.api_key)
  formData.set('file', file)
  formData.set('folder', signature.folder)
  formData.set('signature', signature.signature)
  formData.set('timestamp', String(signature.timestamp))

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloud_name)}/${encodeURIComponent(signature.resource_type)}/upload`,
      {
        body: formData,
        method: 'POST',
        signal: controller.signal,
      },
    )

    if (!response.ok) {
      throw new Error('Không thể tải ảnh lên Cloudinary. Vui lòng thử lại với ảnh nhỏ hơn hoặc kiểm tra kết nối mạng.')
    }

    return response.json()
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Tải ảnh lên quá lâu. Vui lòng thử lại với ảnh nhỏ hơn hoặc kiểm tra kết nối mạng.')
    }

    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export function createUploadSignature(payload = {}) {
  return apiPost('/uploads/signature', payload)
}

export function completeUpload(payload = {}) {
  return apiPost('/uploads/complete', payload)
}

export async function uploadPaymentProofAsset(file) {
  const validationError = validatePaymentProofFile(file)

  if (validationError) {
    throw new Error(validationError)
  }

  const signatureResponse = await createUploadSignature({
    folder: 'payments',
    resource_type: 'image',
  })

  const uploadedAsset = await uploadSignedAsset({
    file,
    signature: signatureResponse.data,
  })

  const completeResponse = await completeUpload({
    asset_url: uploadedAsset.secure_url,
    public_id: uploadedAsset.public_id,
    purpose: 'payment_proof',
    resource_type: 'image',
  })

  return {
    ...completeResponse,
    data: {
      ...completeResponse.data,
      original_filename: file.name,
    },
  }
}

export async function uploadAvatarAsset(file) {
  const signatureResponse = await createUploadSignature({
    folder: 'avatar',
    resource_type: 'image',
  })

  const uploadedAsset = await uploadSignedAsset({
    file,
    signature: signatureResponse.data,
  })

  const completeResponse = await completeUpload({
    asset_url: uploadedAsset.secure_url,
    public_id: uploadedAsset.public_id,
    purpose: 'avatar',
    resource_type: 'image',
  })

  return {
    ...completeResponse,
    data: {
      ...completeResponse.data,
      original_filename: file.name,
    },
  }
}

export async function uploadSupportReplyImageAsset(file) {
  const validationError = validateSupportAttachment(file, {
    allowedMimeTypes: SUPPORT_IMAGE_ALLOWED_MIME_TYPES,
    emptyMessage: 'Vui lòng chọn ảnh trước khi tải lên.',
    invalidTypeMessage: 'Ảnh đính kèm phải là GIF, JPG, PNG hoặc WEBP.',
  })

  if (validationError) {
    throw new Error(validationError)
  }

  const signatureResponse = await createUploadSignature({
    folder: 'support',
    resource_type: 'image',
  })

  const uploadedAsset = await uploadSignedAsset({
    file,
    signature: signatureResponse.data,
  })

  const completeResponse = await completeUpload({
    asset_url: uploadedAsset.secure_url,
    public_id: uploadedAsset.public_id,
    purpose: 'support_reply',
    resource_type: 'image',
  })

  return {
    ...completeResponse,
    data: {
      ...completeResponse.data,
      original_filename: file.name,
    },
  }
}

export async function uploadSupportReplyFileAsset(file) {
  const validationError = validateSupportAttachment(file, {
    emptyMessage: 'Vui lòng chọn tệp trước khi tải lên.',
  })

  if (validationError) {
    throw new Error(validationError)
  }

  const signatureResponse = await createUploadSignature({
    folder: 'support',
    resource_type: 'raw',
  })

  const uploadedAsset = await uploadSignedAsset({
    file,
    signature: signatureResponse.data,
  })

  const completeResponse = await completeUpload({
    asset_url: uploadedAsset.secure_url,
    public_id: uploadedAsset.public_id,
    purpose: 'support_reply',
    resource_type: 'raw',
  })

  return {
    ...completeResponse,
    data: {
      ...completeResponse.data,
      original_filename: file.name,
    },
  }
}

export async function uploadServiceImageAsset(file) {
  const signatureResponse = await createUploadSignature({
    folder: 'services',
    resource_type: 'image',
  })

  const uploadedAsset = await uploadSignedAsset({
    file,
    signature: signatureResponse.data,
  })

  const completeResponse = await completeUpload({
    asset_url: uploadedAsset.secure_url,
    public_id: uploadedAsset.public_id,
    purpose: 'service_image',
    resource_type: 'image',
  })

  return {
    ...completeResponse,
    data: {
      ...completeResponse.data,
      original_filename: file.name,
    },
  }
}

export async function uploadRefundEvidenceAsset(file) {
  const signatureResponse = await createUploadSignature({
    folder: 'refunds',
    resource_type: 'image',
  })

  const uploadedAsset = await uploadSignedAsset({
    file,
    signature: signatureResponse.data,
  })

  const completeResponse = await completeUpload({
    asset_url: uploadedAsset.secure_url,
    public_id: uploadedAsset.public_id,
    purpose: 'refund_evidence',
    resource_type: 'image',
  })

  return {
    ...completeResponse,
    data: {
      ...completeResponse.data,
      original_filename: file.name,
    },
  }
}
