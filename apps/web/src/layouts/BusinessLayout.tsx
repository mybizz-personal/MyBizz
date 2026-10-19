import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { LayoutDashboard, Package, ShoppingCart, Calendar, Settings, LogOut, ArrowLeftRight, Menu, X, Bell, CheckCircle, Loader2, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export default function BusinessLayout() {
  const { user, role, signOut, businessId } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [businessName, setBusinessName] = useState<string>('Business Dashboard');
  const [businessLogo, setBusinessLogo] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (businessId) {
      supabase.from('businesses').select('name, logo_url').eq('id', businessId).single().then(({data}) => {
        if (data) {
          setBusinessName(data.name);
          setBusinessLogo(data.logo_url);
        }
      });
    }
  }, [businessId]);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const [selectedNotif, setSelectedNotif] = useState<any | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notification_recipients')
      .select('id, is_read, created_at, notifications(title, message)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setNotifications(data);
  }, [user]);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user, fetchNotifications]);

  async function fetchAllHistory() {
    if (!user) return;
    setIsLoadingHistory(true);
    const { data } = await supabase
      .from('notification_recipients')
      .select('id, is_read, created_at, notifications(title, message)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setAllNotifications(data);
    setIsLoadingHistory(false);
  }

  const handleOpenHistory = () => {
    setShowNotifMenu(false);
    setIsHistoryModalOpen(true);
    fetchAllHistory();
  };

  const markAsRead = async (recipientId: string) => {
    await supabase.from('notification_recipients').update({ is_read: true }).eq('id', recipientId);
    fetchNotifications();
    if (isHistoryModalOpen) fetchAllHistory();
  };

  const handleViewNotif = (notif: any) => {
    setSelectedNotif(notif);
    if (!notif.is_read) {
      markAsRead(notif.id);
      // Optimistically update local state for the clicked item
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      setAllNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
  };

  // Close sidebar on route change on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  if (!user || role !== 'Business Owner') {
    return <Navigate to="/login" replace />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/business' },
    { name: 'POS / Sales', icon: ShoppingCart, path: '/business/sales' },
    { name: 'Products', icon: Package, path: '/business/products' },
    { name: 'Inventory', icon: ArrowLeftRight, path: '/business/inventory' },
    { name: 'Events', icon: Calendar, path: '/business/events' },
    { name: 'Settings', icon: Settings, path: '/business/settings' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col shadow-xl lg:shadow-sm lg:static transform transition-transform duration-200 ease-in-out",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="h-16 p-4 text-xl font-bold border-b border-gray-100 flex items-center justify-between text-primary">
          <span>MyBizz</span>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-900">
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/business' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-3 rounded-md transition-colors text-left font-medium",
                  isActive 
                    ? "bg-primary/10 text-primary hover:bg-primary/15" 
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-gray-500")} />
                {item.name}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-2 rounded-md hover:bg-red-50 text-red-600 transition-colors text-left font-medium"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 shadow-sm shrink-0">
          <div className="flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="mr-4 lg:hidden text-gray-500 hover:text-gray-900 p-1"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              {businessLogo && (
                <img 
                  src={businessLogo} 
                  alt="Business Logo" 
                  className="w-8 h-8 rounded-full object-cover border border-gray-200"
                />
              )}
              <h1 className="text-lg sm:text-xl font-semibold text-gray-800 truncate">{businessName}</h1>
            </div>
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-2 text-gray-500 hover:text-gray-900 relative transition-colors"
            >
              <Bell className="w-6 h-6" />
              {notifications.some(n => !n.is_read) && (
                <span className="absolute top-1 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            
            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                <div className="p-4 border-b border-gray-100 font-semibold text-gray-800 bg-gray-50/50">
                  Notifications
                </div>
                <div className="max-h-[28rem] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm flex flex-col items-center">
                      <Bell className="w-8 h-8 text-gray-200 mb-2" />
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        onClick={() => { setShowNotifMenu(false); handleViewNotif(notif); }}
                        className={cn("p-4 border-b border-gray-50 flex gap-3 items-start transition-colors cursor-pointer hover:bg-gray-50", !notif.is_read ? "bg-primary/5" : "")}
                      >
                        <div className="mt-1 shrink-0" onClick={e => e.stopPropagation()}>
                          {notif.is_read ? (
                            <CheckCircle className="w-5 h-5 text-gray-300" />
                          ) : (
                            <button onClick={() => markAsRead(notif.id)} title="Mark as read">
                              <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary/20 hover:bg-primary transition-colors cursor-pointer" />
                            </button>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={cn("text-sm break-words", !notif.is_read ? "font-bold text-gray-900" : "font-medium text-gray-700")}>
                            {notif.notifications?.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2 break-words">{notif.notifications?.message}</p>
                          <span className="text-[10px] text-gray-400 mt-2 block">
                            {new Date(notif.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="shrink-0 mt-2 text-gray-300">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="p-3 border-t border-gray-100 bg-gray-50/50">
                    <button 
                      onClick={handleOpenHistory}
                      className="w-full text-center text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      View All History
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <Outlet />
        </main>
      </div>

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">Notifications History</h3>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
              {isLoadingHistory ? (
                <div className="flex justify-center items-center py-12 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : allNotifications.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No notifications found.</div>
              ) : (
                <div className="space-y-4">
                  {allNotifications.map(notif => (
                    <div 
                      key={notif.id} 
                      onClick={() => handleViewNotif(notif)}
                      className={cn("bg-white p-4 rounded-lg shadow-sm border transition-colors cursor-pointer hover:bg-gray-50", !notif.is_read ? "border-primary/30 bg-primary/5" : "border-gray-200")}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="mt-1 shrink-0" onClick={e => e.stopPropagation()}>
                          {notif.is_read ? (
                            <CheckCircle className="w-5 h-5 text-gray-300" />
                          ) : (
                            <button onClick={() => markAsRead(notif.id)} title="Mark as read">
                              <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary/20 hover:bg-primary transition-colors cursor-pointer" />
                            </button>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={cn("text-base break-words", !notif.is_read ? "font-bold text-gray-900" : "font-medium text-gray-700")}>
                            {notif.notifications?.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2 break-words">{notif.notifications?.message}</p>
                          <span className="text-[10px] text-gray-400 mt-2 block">
                            {new Date(notif.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="shrink-0 mt-2 text-gray-300">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedNotif && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 truncate">Notification Detail</h3>
              <button onClick={() => setSelectedNotif(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <h4 className="text-xl font-bold text-gray-900 mb-2 break-words">
                {selectedNotif.notifications?.title}
              </h4>
              <span className="text-xs text-gray-400 block mb-6 font-medium">
                Received: {new Date(selectedNotif.created_at).toLocaleString()}
              </span>
              <div className="text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                {selectedNotif.notifications?.message}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
              <button 
                onClick={() => setSelectedNotif(null)}
                className="w-full bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
