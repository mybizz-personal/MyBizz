import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { LayoutDashboard, Users, Store, Settings, LogOut, Menu, X, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';

export default function AdminLayout() {
  const { user, role, signOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar on route change on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  if (!user || role !== 'Platform Admin') {
    return <Navigate to="/login" replace />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { name: 'Businesses', icon: Store, path: '/admin/businesses' },
    { name: 'Users', icon: Users, path: '/admin/users' },
    { name: 'Events', icon: CalendarIcon, path: '/admin/events' },
    { name: 'Settings', icon: Settings, path: '/admin/settings' },
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
        "fixed inset-y-0 left-0 z-50 w-64 bg-primary text-primary-foreground flex flex-col shadow-xl lg:shadow-none lg:static transform transition-transform duration-200 ease-in-out",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="h-16 p-4 text-xl font-bold border-b border-primary-foreground/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-6 h-6" />
            MyBizz Admin
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-primary-foreground/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-2 rounded-md transition-colors text-left",
                  isActive 
                    ? "bg-primary-foreground/20 text-white font-medium" 
                    : "hover:bg-primary-foreground/10 text-primary-foreground/80 hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-primary-foreground/10">
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-2 rounded-md hover:bg-red-500/20 text-red-400 transition-colors text-left"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 sm:px-8 shadow-sm shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="mr-4 lg:hidden text-gray-500 hover:text-gray-900 p-1"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg sm:text-xl font-semibold text-gray-800 truncate">Platform Admin</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
