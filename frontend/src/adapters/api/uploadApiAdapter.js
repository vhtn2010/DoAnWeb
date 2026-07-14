import { apiPost } from '../../services/apiClient.js'

const CLOUDINARY_UPLOAD_TIMEOUT_MS = 30000

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
