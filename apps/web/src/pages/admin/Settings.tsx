import { useAuthStore } from '../../store/useAuthStore';

export default function Settings() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-gray-500 text-sm">Manage global configurations for the MyBizz platform.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Admin Profile</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Admin Email</label>
            <div className="mt-1">
              <input type="text" disabled value={user?.email || ''} className="bg-gray-50 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-500 sm:text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Platform Maintenance Mode</label>
            <div className="mt-2 flex items-center gap-2">
               <input type="checkbox" id="maintenance" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" />
               <label htmlFor="maintenance" className="text-sm text-gray-700">Enable Maintenance Mode (Suspends all business logins)</label>
            </div>
          </div>
          <div className="pt-4">
            <button className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm font-medium">
              Save Platform Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
