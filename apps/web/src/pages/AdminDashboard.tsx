import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import { Loader2, Store, Users, Calendar as CalendarIcon, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Business {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    totalEvents: 0,
    totalUsers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPlatformData() {
      try {
        // Fetch total businesses
        const { data: bData, count: bCount, error: bError } = await supabase
          .from('businesses')
          .select('id, name, slug, status', { count: 'exact' });
          
        if (bError) throw bError;
        setBusinesses(bData || []);

        // Fetch total events
        const { count: eCount, error: eError } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true });
          
        if (eError) throw eError;

        // Fetch total platform users
        const { count: uCount, error: uError } = await supabase
          .from('platform_users')
          .select('*', { count: 'exact', head: true });
          
        if (uError) throw uError;

        setStats({
          totalBusinesses: bCount || 0,
          totalEvents: eCount || 0,
          totalUsers: uCount || 0,
        });

      } catch (err) {
        console.error('Failed to load admin data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchPlatformData();
  }, []);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Admin</h1>
        <p className="text-gray-500 text-sm">Monitor all businesses and global platform health.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 flex items-center justify-center rounded-lg">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Businesses</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.totalBusinesses}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 flex items-center justify-center rounded-lg">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Events</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 flex items-center justify-center rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Users</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 flex items-center justify-center rounded-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
            <p className="text-2xl font-bold text-green-600">Healthy</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Active Businesses</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-600">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {businesses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No businesses onboarded.</td>
                </tr>
              ) : businesses.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{b.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{b.slug}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${b.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/admin/businesses/${b.id}`} className="text-primary hover:text-primary/80 font-medium text-sm">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
