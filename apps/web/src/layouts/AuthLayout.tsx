import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function AuthLayout() {
  const { user, role } = useAuthStore();

  if (user) {
    if (role === 'Platform Admin') return <Navigate to="/admin" replace />;
    if (role === 'Business Owner') return <Navigate to="/business" replace />;
  }

  return <Outlet />;
}
