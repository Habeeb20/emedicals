



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
import PharmacyDashboardPage from './pages/pharmacy/PharmacyDashboardpage.jsx';
import PharmacyLookupPage from './pages/pharmacy/PharmacyLookupPage.jsx';
import PharmacyAttendPage from './pages/pharmacy/PharmacyAttendPage.jsx';
import PharmacyPosPage from './pages/pharmacy/PharmacyPOSpAGE.jsx';
import PharmacyInventoryPage from './pages/pharmacy/PharmacyInventoryPage.jsx';
import PharmacySalesPage from './pages/pharmacy/PharmacySalesPage.jsx';
import PharmacyReportsPage from './pages/pharmacy/PharmacyReportPage.jsx';
import PharmacyChatPage from './pages/pharmacy/PharmacyChatPage.jsx';
import FindPharmacyPage from './pages/pharmacy/FindPharmacyPage.jsx';
import PharmacyProfilePage from './pages/pharmacy/PharmacyProfilePage.jsx';
import DashboardRedirect from './pages/DashboardRideirect.jsx';
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

<Route path="/dashboard" element={<Dashboard />} />

<Route path="/pharmacy" element={<DashboardRedirect tab="pharmacy-home" />} />
<Route path="/pharmacy/lookup" element={<DashboardRedirect tab="pharmacy-lookup" />} />
<Route path="/pharmacy/attend/:id" element={<DashboardRedirect tab="pharmacy-attend" />} />
<Route path="/pharmacy/pos" element={<DashboardRedirect tab="pharmacy-pos" />} />
<Route path="/pharmacy/inventory" element={<DashboardRedirect tab="pharmacy-inventory" />} />
<Route path="/pharmacy/sales" element={<DashboardRedirect tab="pharmacy-sales" />} />
<Route path="/pharmacy/reports" element={<DashboardRedirect tab="pharmacy-reports" />} />
<Route path="/pharmacy/chats" element={<DashboardRedirect tab="pharmacy-chats" />} />
<Route path="/pharmacy/chats/:roomId" element={<DashboardRedirect tab="pharmacy-chats" />} />

<Route path="/pharmacies" element={<DashboardRedirect tab="find-pharmacy" />} />
<Route path="/pharmacies/:id" element={<DashboardRedirect tab="pharmacy-profile" />} />
<Route path="/chat/pharmacy" element={<DashboardRedirect tab="pharmacy-chat" />} />
<Route path="/chat/pharmacy/:roomId" element={<DashboardRedirect tab="pharmacy-chat" />} />

      </Route>

      <Route element={<ProtectedRoute  />}>
  <Route path="/dashboard/super-admin" element={<SuperAdminDashboard />} />
</Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}




















