import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import EquipmentProfilePage from '../../equipment/pages/EquipmentProfilePage'

export default function FieldEquipmentDetailPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>
      <EquipmentProfilePage />
    </div>
  )
}
