import { useState, useEffect } from 'react';
import { Package, TrendingUp, IndianRupee, Loader2, Calendar } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface BusinessDashboardProps {
  viewOnlyBusinessId?: string;
}

export default function BusinessDashboard({ viewOnlyBusinessId }: BusinessDashboardProps) {
  const { businessId: myBusinessId, role } = useAuthStore();
  const navigate = useNavigate();
  
  const targetBusinessId = viewOnlyBusinessId || myBusinessId;
  const isViewOnly = !!viewOnlyBusinessId || role === 'Platform Admin';

  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [stats, setStats] = useState({
    periodSales: 0,
    totalProducts: 0,
    lowStock: 0,
    upcomingEvents: 0
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      if (!targetBusinessId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
        
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 30) {
          toast.error('Maximum 30 days duration allowed for custom dates.');
          setIsLoading(false);
          return;
        }
        if (start > end) {
          toast.error('Start date cannot be after end date.');
          setIsLoading(false);
          return;
        }

        // 1. Fetch Sales for the selected date range
        const { data: sales, error: salesError } = await supabase
          .from('sales')
          .select('*')
          .eq('business_id', targetBusinessId)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: false });
          
        if (salesError) throw salesError;
        
        const periodRevenue = sales?.reduce((sum, s) => sum + s.total_amount, 0) || 0;
        setRecentSales(sales?.slice(0, 5) || []); // keep 5 recent for UI

        // 2. Fetch Products Count
        const { count: productCount, error: pError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', targetBusinessId);
          
        if (pError) throw pError;

        // 3. Fetch Low Stock Items (< 20)
        const { data: inventoryData, error: invError } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('business_id', targetBusinessId);
          
        if (invError) throw invError;
        
        const lowStockCount = inventoryData?.filter(i => i.quantity < 20).length || 0;

        // 4. Fetch Upcoming Events
        const { count: eventsCount, error: eError } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', targetBusinessId)
          .eq('status', 'Upcoming');

        if (eError) throw eError;

        setStats({
          periodSales: periodRevenue,
          totalProducts: productCount || 0,
          lowStock: lowStockCount,
          upcomingEvents: eventsCount || 0
        });

      } catch (err) {
        console.error('Error loading dashboard:', err);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (dateRange.start && dateRange.end) {
      loadDashboard();
    }
  }, [targetBusinessId, dateRange.start, dateRange.end]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isViewOnly ? 'Business Dashboard' : 'Welcome back!'}</h1>
          <p className="text-gray-500 text-sm">
            {isViewOnly ? `Viewing stats for business ID: ${targetBusinessId}` : "Here's what's happening with your business."}
          </p>
        </div>
        
        {/* Date Filter */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
          <input 
            type="date" 
            value={dateRange.start} 
            onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))}
            className="text-sm border-none focus:ring-0 p-1 bg-transparent"
          />
          <span className="text-gray-400">to</span>
          <input 
            type="date" 
            value={dateRange.end} 
            onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))}
            className="text-sm border-none focus:ring-0 p-1 bg-transparent"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 flex items-center justify-center rounded-lg">
                <IndianRupee className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Period Revenue</p>
                <h3 className="text-2xl font-bold text-gray-900">₹{stats.periodSales}</h3>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 flex items-center justify-center rounded-lg">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Products</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.totalProducts}</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 flex items-center justify-center rounded-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Low Stock</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.lowStock}</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 flex items-center justify-center rounded-lg">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Events</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.upcomingEvents}</h3>
              </div>
            </div>
          </div>

          {!isViewOnly && (
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="flex gap-4">
                <button onClick={() => navigate('/business/sales')} className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium shadow-sm hover:bg-primary/90">
                  Open POS
                </button>
                <button onClick={() => navigate('/business/products')} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md font-medium shadow-sm hover:bg-secondary/80">
                  Manage Products
                </button>
              </div>
            </div>
          )}

          {/* Recent Sales Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Transactions for Period</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-600">
                    <th className="px-6 py-4">Receipt</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentSales.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No sales recorded for this period.</td>
                    </tr>
                  ) : recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{sale.receipt_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(sale.created_at).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">₹{sale.total_amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
