// src/components/GuestRoute.jsx
// Wrap /login, /signup etc. with this. Replace your existing guest/public route with it
// (or copy the redirect logic into it) so logged-in users are sent to the right place.
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.jsx';
import { homeFor } from '@/lib/homeFor.js';

export default function GuestRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return children;

  const to =
    user.role === 'super_admin'
      ? homeFor(user)
      : location.state?.from?.pathname || homeFor(user);

  return <Navigate to={to} replace />;
}