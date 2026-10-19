import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import AdminLayout from './layouts/AdminLayout';
import BusinessLayout from './layouts/BusinessLayout';

// Lazy Loaded Pages
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminBusinesses = lazy(() => import('./pages/admin/Businesses'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminEvents = lazy(() => import('./pages/admin/Events'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminBusinessView = lazy(() => import('./pages/admin/AdminBusinessView'));

const BusinessDashboard = lazy(() => import('./pages/BusinessDashboard'));
const Products = lazy(() => import('./pages/business/Products'));
const SalesPOS = lazy(() => import('./pages/business/Sales'));
const Events = lazy(() => import('./pages/business/Events'));
const Inventory = lazy(() => import('./pages/business/Inventory'));
const Settings = lazy(() => import('./pages/business/Settings'));

function PageFallback() {
  return (
    <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-gray-500 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <span className="text-sm font-medium">Loading view...</span>
    </div>
  );
}

function App() {
  const { user, role, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-600 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <span className="text-sm font-medium tracking-wide">Starting MyBizz...</span>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Toaster position="bottom-right" />
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
            </Route>

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="businesses" element={<AdminBusinesses />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="businesses/:id" element={<AdminBusinessView />} />
              <Route path="events" element={<AdminEvents />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            <Route path="/business" element={<BusinessLayout />}>
              <Route index element={<BusinessDashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="sales" element={<SalesPOS />} />
              <Route path="events" element={<Events />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route 
              path="*" 
              element={
                user 
                  ? <Navigate to={role === 'Platform Admin' ? '/admin' : '/business'} replace />
                  : <Navigate to="/login" replace />
              } 
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
