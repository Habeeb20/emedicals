import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Signup from './pages/auth/Signup.jsx';
import Login from './pages/auth/Login.jsx';
import SendOtp from './pages/auth/SendOtp.jsx';
import VerifyOtp from './pages/auth/VerifyOtp.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards.jsx';
import SuperAdminDashboard from './pages/superAdmin/SuperAdminDashboard.jsx';
import SuperAdminLogin from './pages/superAdmin/AdminLogin.jsx';
import DashboardRedirect from './pages/DashboardRideirect.jsx';
import ShopPage from './pages/pharmacy/shop/ShopPage.jsx';
import DrugPage from './pages/pharmacy/shop/DrugPage.jsx';
import CartPage from './pages/pharmacy/shop/CartPage.jsx';
import CheckoutPage from './pages/pharmacy/shop/Checkoutpage.jsx';
import { ShopOrderPage, ShopOrdersPage } from './pages/pharmacy/shop/OrderPage.jsx';
import PharmacyOrdersPage from './pages/pharmacy/PharmacyOrderPage.jsx';
import Navbar from './components/Navbar.jsx';
import MyBookingsPage from './pages/memorial/MyBookingsPage.jsx';
import MemorialDirectoryPage from './pages/memorial/MemorialDirectoryPage.jsx';
import MemorialProfilePage from './pages/memorial/MemorialProfilePage.jsx';
import LabDirectory from './pages/Lab/LabDirectory.jsx';
import LabOrderDetail from './pages/Lab/LabOrderdetail.jsx';

const NotFound = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
    <h1 className="text-5xl font-bold text-primary-600">404</h1>
    <p className="text-gray-600">We couldn't find that page.</p>
    <Link to="/" className="btn-primary">Back home</Link>
  </div>
);

export default function App() {
  return (
    <>
      {/* Navbar goes OUTSIDE <Routes>: only <Route> elements may live inside it */}
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Shop: open to everyone, guests and logged-in users alike */}
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/shop/drugs/:id" element={<DrugPage />} />
        <Route path="/shop/cart" element={<CartPage />} />
        <Route path="/shop/checkout" element={<CheckoutPage />} /> {/* sends guests to /login?next=... itself */}
        <Route path="/memorial" element={<MemorialDirectoryPage />} />
        <Route path="/labs" element={<LabDirectory />} />
        <Route path="/labs/:id" element={<LabOrderDetail />} />
        <Route path="/memorial/:id" element={<MemorialProfilePage />} />
        <Route path="/memorial/bookings" element={<MyBookingsPage />} />  
        <Route element={<PublicOnlyRoute />}>
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<SuperAdminLogin />} />
          <Route path="/send-otp" element={<SendOtp />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
     
 {/* keep above :id */}

{/* <Route path="/dashboard/memorial" element={<OwnerDashboard />} />   */}

        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/super-admin" element={<SuperAdminDashboard />} />

          {/* Customer orders (Paystack returns to /shop/orders/:id) */}
          <Route path="/shop/orders" element={<ShopOrdersPage />} />
          <Route path="/shop/orders/:id" element={<ShopOrderPage />} />

          {/* Pharmacy staff */}
          <Route path="/pharmacy/orders" element={<PharmacyOrdersPage />} />
          <Route path="/pharmacy" element={<DashboardRedirect tab="pharmacy-home" />} />
          <Route path="/pharmacy/lookup" element={<DashboardRedirect tab="pharmacy-lookup" />} />
          <Route path="/pharmacy/attend/:id" element={<DashboardRedirect tab="pharmacy-attend" />} />
          <Route path="/pharmacy/pos" element={<DashboardRedirect tab="pharmacy-pos" />} />
          <Route path="/pharmacy/inventory" element={<DashboardRedirect tab="pharmacy-inventory" />} />
          <Route path="/pharmacy/sales" element={<DashboardRedirect tab="pharmacy-sales" />} />
          <Route path="/pharmacy/add-drugs" element={<DashboardRedirect tab="pharmacy-add-drugs" />} />
          <Route path="/pharmacy/reports" element={<DashboardRedirect tab="pharmacy-reports" />} />
          <Route path="/pharmacy/chats" element={<DashboardRedirect tab="pharmacy-chats" />} />
          <Route path="/pharmacy/chats/:roomId" element={<DashboardRedirect tab="pharmacy-chats" />} />

          <Route path="/pharmacies" element={<DashboardRedirect tab="find-pharmacy" />} />
          <Route path="/pharmacies/:id" element={<DashboardRedirect tab="pharmacy-profile" />} />
          <Route path="/chat/pharmacy" element={<DashboardRedirect tab="pharmacy-chat" />} />
          <Route path="/chat/pharmacy/:roomId" element={<DashboardRedirect tab="pharmacy-chat" />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}