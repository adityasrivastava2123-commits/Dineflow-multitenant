import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';

// Customer pages
import MenuPage from './pages/customer/MenuPage';
import CartPage from './pages/customer/CartPage';
import OrderStatusPage from './pages/customer/OrderStatusPage';
import CheckoutPage from './pages/customer/CheckoutPage';

// Admin pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminMenu from './pages/admin/AdminMenu';
import AdminAnalytics from './pages/admin/AdminAnalytics';

// Kitchen
import KitchenDisplay from './pages/kitchen/KitchenDisplay';

// Super Admin
import SuperAdminLogin from './pages/superadmin/SuperAdminLogin';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';

// Mobile Apps
import MobileLogin from './pages/mobile/MobileLogin';
import KitchenApp from './pages/mobile/KitchenApp';
import AdminApp from './pages/mobile/AdminApp';
import SuperAdminApp from './pages/mobile/SuperAdminApp';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  const path = window.location.pathname;
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (!user) {
    if (path.startsWith('/kitchen-app')) return <Navigate to="/kitchen-app/login" replace />;
    if (path.startsWith('/admin-app')) return <Navigate to="/admin-app/login" replace />;
    if (path.startsWith('/superadmin-app')) return <Navigate to="/superadmin-app/login" replace />;
    return <Navigate to="/admin/login" replace />;
  }
  if (roles && !roles.includes(user.role)) return <Navigate to="/admin/dashboard" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Toaster
            position="top-center"
            toastOptions={{
              style: { borderRadius: '16px', fontFamily: 'Outfit, sans-serif', fontWeight: 500 },
              success: { style: { background: '#16a34a', color: '#fff' } },
              error: { style: { background: '#dc2626', color: '#fff' } },
            }}
          />
          <Routes>
            {/* Customer routes */}
            <Route path="/restaurant/:slug" element={<MenuPage />} />
            <Route path="/restaurant/:slug/cart" element={<CartPage />} />
            <Route path="/restaurant/:slug/checkout" element={<CheckoutPage />} />
            <Route path="/order/:orderId" element={<OrderStatusPage />} />

            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<ProtectedRoute roles={['admin', 'manager']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/orders" element={<ProtectedRoute roles={['admin', 'manager']}><AdminOrders /></ProtectedRoute>} />
            <Route path="/admin/menu" element={<ProtectedRoute roles={['admin', 'manager']}><AdminMenu /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute roles={['admin', 'manager']}><AdminAnalytics /></ProtectedRoute>} />

            {/* Kitchen */}
            <Route path="/kitchen" element={<ProtectedRoute roles={['admin', 'manager', 'kitchen']}><KitchenDisplay /></ProtectedRoute>} />

            {/* Super Admin */}
            <Route path="/superadmin/login" element={<SuperAdminLogin />} />
            <Route path="/superadmin/dashboard" element={<ProtectedRoute roles={['superadmin']}><SuperAdminDashboard /></ProtectedRoute>} />

            {/* Mobile Apps */}
            <Route path="/kitchen-app/login" element={<MobileLogin appType="kitchen" />} />
            <Route path="/kitchen-app" element={<ProtectedRoute roles={['kitchen', 'admin', 'manager']}><KitchenApp /></ProtectedRoute>} />

            <Route path="/admin-app/login" element={<MobileLogin appType="admin" />} />
            <Route path="/admin-app" element={<ProtectedRoute roles={['admin', 'manager']}><AdminApp /></ProtectedRoute>} />

            <Route path="/superadmin-app/login" element={<MobileLogin appType="superadmin" />} />
            <Route path="/superadmin-app" element={<ProtectedRoute roles={['superadmin']}><SuperAdminApp /></ProtectedRoute>} />

            {/* Default */}
            <Route path="/" element={<Navigate to="/admin/login" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
