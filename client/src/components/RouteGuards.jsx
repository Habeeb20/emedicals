// import { Navigate, Outlet, useLocation } from 'react-router-dom';
// import { LoaderCircle } from 'lucide-react';
// import { useAuth } from '@/context/AuthContext.jsx';

// const FullScreenSpinner = () => (
//   <div className="flex min-h-screen items-center justify-center">
//     <LoaderCircle className="h-8 w-8 animate-spin text-primary-600" />
//   </div>
// );

// // Pages only for logged-in users
// export function ProtectedRoute() {
//   const { user, loading } = useAuth();
//   const location = useLocation();
//   if (loading) return <FullScreenSpinner />;
//   return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
// }

// // Login, signup, OTP pages: logged-in users go straight to the dashboard
// export function PublicOnlyRoute() {
//   const { user, loading } = useAuth();
//   if (loading) return <FullScreenSpinner />;
//   if (user && user.role === 'super-admin') {
//     return <Navigate to="/dashboard/super-admin" replace />;
//   } else {
//     return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
//   }
 
// }





import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext.jsx';

const FullScreenSpinner = () => (
  <div
    role="status"
    aria-label="Loading"
    className="flex min-h-screen items-center justify-center"
  >
    <LoaderCircle className="h-8 w-8 animate-spin text-primary-600" />
  </div>
);

const getDashboardPath = (role) =>
  role === 'super_admin' ? '/dashboard/super-admin' : '/dashboard';

// Pages only for logged-in users
// Optional: pass allowedRoles={['super-admin']} to restrict by role
export function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenSpinner />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <Outlet />;
}

// Login, signup, OTP pages: logged-in users go straight to their dashboard
export function PublicOnlyRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenSpinner />;

  if (user) {
    const redirectTo = location.state?.from?.pathname ?? getDashboardPath(user.role);
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
































