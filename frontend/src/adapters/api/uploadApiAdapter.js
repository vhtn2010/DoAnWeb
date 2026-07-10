import { apiPost } from '../../services/apiClient.js'

async function uploadSignedAsset({
  file,
  signature,
}) {
  const formData = new FormData()

  formData.set('api_key', signature.api_key)
  formData.set('file', file)
  formData.set('folder', signature.folder)
  formData.set('resource_type', signature.resource_type)
  formData.set('signature', signature.signature)
  formData.set('timestamp', String(signature.timestamp))

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloud_name)}/${encodeURIComponent(signature.resource_type)}/upload`,
    {
      body: formData,
      method: 'POST',
    },
  )

  if (!response.ok) {
    throw new Error('Không thể tải ảnh chứng từ lên Cloudinary.')
  }

  return response.json()
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
