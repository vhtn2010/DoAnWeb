import { useEffect, useRef } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import AdminServiceFormModal from '../../components/admin/services/AdminServiceFormFigmaModal.jsx'
import { AdminPageHeader } from '../../components/admin/ui/index.js'
import { buildAdminPath } from '../../constants/adminRoutes.js'
import { buildServicePayloadFromForm } from '../../mappers/adminServiceMappers.js'
import { createAdminService } from '../../repositories/adminServiceRepository.js'

function translateServiceMessage(message) {
  if (message === 'Admin service created successfully') {
    return 'Tạo dịch vụ thành công.'
  }

  return message || 'Không thể tạo dịch vụ lúc này.'
}

function mapValidationDetails(details = []) {
  if (!Array.isArray(details)) {
    return {}
  }

  return details.reduce((result, item) => {
    if (!item?.field) {
      return result
    }

    result[item.field] = item.message || 'Thông tin chưa hợp lệ.'
    return result
  }, {})
}

function AdminServiceCreatePage() {
  const navigate = useNavigate()
  const { currentRole } = useOutletContext()
  const redirectTimerRef = useRef(null)

  useEffect(() => () => {
    if (redirectTimerRef.current) {
      window.clearTimeout(redirectTimerRef.current)
    }
  }, [])

  function returnToServiceList() {
    navigate(buildAdminPath('/admin/services', currentRole))
  }

  async function handleSave(formValues, submitIntent) {
    try {
      const payload = buildServicePayloadFromForm(formValues, { submitIntent })
      const response = await createAdminService(payload, { currentRole })

      if (!response?.success || !response?.data) {
        return {
          success: false,
          message: translateServiceMessage(response?.message),
        }
      }

      const imageWarning = response.data.image_upload_error
        ? ` Dịch vụ đã được tạo nhưng chưa thể gắn ảnh: ${response.data.image_upload_error}`
        : ''
      const message = `${translateServiceMessage(response.message)} Mã dịch vụ: ${response.data.service_code}.${imageWarning}`

      redirectTimerRef.current = window.setTimeout(returnToServiceList, 1200)

      return {
        data: response.data,
        message,
        success: true,
      }
    } catch (error) {
      return {
        fieldErrors: mapValidationDetails(error?.details),
        message: translateServiceMessage(error?.message),
        success: false,
      }
    }
  }

  return (
    <>
      <main className="admin-ops-page admin-service-create-page">
        <AdminPageHeader
          eyebrow="Quản lý Dịch vụ"
          title="Thêm Dịch vụ Mới"
          subtitle="Nhập đầy đủ thông tin theo từng loại dịch vụ. Dữ liệu sẽ được lưu trực tiếp vào hệ thống."
        />
      </main>

      <AdminServiceFormModal
        currentRole={currentRole}
        mode="add"
        service={null}
        onClose={returnToServiceList}
        onSave={handleSave}
      />
    </>
  )
}

export default AdminServiceCreatePage
