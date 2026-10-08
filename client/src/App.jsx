



import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Signup from './pages/auth/Signup.jsx';
import Login from './pages/auth/Login.jsx';
import SendOtp from './pages/auth/SendOtp.jsx';
import VerifyOtp from './pages/auth/VerifyOtp.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards.jsx';
import SuperAdminDashboard from "./pages/superAdmin/SuperAdminDashboard.jsx"
import SuperAdminLogin from './pages/superAdmin/AdminLogin.jsx';
import NotificationBell from './pages/appointments/NotificationBell.jsx';
const NotFound = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
    <h1 className="text-5xl font-bold text-primary-600">404</h1>
    <p className="text-gray-600">We couldn't find that page.</p>
    <Link to="/" className="btn-primary">Back home</Link>
  </div>
);

export default function App() {
  return (
    <Routes>
     
      <Route path="/" element={<Home />} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<SuperAdminLogin />} />
        <Route path="/send-otp" element={<SendOtp />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />

      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />

      </Route>

      <Route element={<ProtectedRoute  />}>
  <Route path="/dashboard/super-admin" element={<SuperAdminDashboard />} />
</Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}








