import { useParams, useNavigate } from 'react-router-dom';
import BusinessDashboard from '../BusinessDashboard';
import { ArrowLeft } from 'lucide-react';

export default function AdminBusinessView() {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 font-medium">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Businesses
      </button>
      <div className="pt-2">
        <BusinessDashboard viewOnlyBusinessId={id} />
      </div>
    </div>
  );
}
