import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dineflow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dineflow_token');
      localStorage.removeItem('dineflow_user');
      if (window.location.pathname.startsWith('/superadmin')) {
        window.location.href = '/superadmin/login';
      } else if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const customerIdentify = (data) => api.post('/auth/customer-identify', data);
export const getMe = () => api.get('/auth/me');

// Menu
export const getMenu = (slug) => api.get(`/menu/${slug}`);
export const createMenuItem = (data) => api.post('/menu', data);
export const updateMenuItem = (id, data) => api.put(`/menu/${id}`, data);
export const toggleMenuItem = (id) => api.patch(`/menu/${id}/toggle`);
export const deleteMenuItem = (id) => api.delete(`/menu/${id}`);
export const bulkCreateMenu = (items) => api.post('/menu/bulk', { items });

// Orders
export const createOrder = (data) => api.post('/orders', data);
export const getOrders = (params) => api.get('/orders', { params });
export const getOrder = (id) => api.get(`/orders/${id}`);
export const updateOrderStatus = (id, data) => api.patch(`/orders/${id}/status`, data);
export const deliverOrder = (id) => api.patch(`/orders/${id}/deliver`);
export const getKitchenOrders = () => api.get('/orders/kitchen/live');

// Restaurant
export const getRestaurant = (slug) => api.get(`/restaurant/${slug}`);
export const getAdminRestaurant = () => api.get('/restaurant/admin/details');
export const updateRestaurant = (data) => api.put('/restaurant', data);
export const validateOffer = (slug, data) => api.post(`/restaurant/${slug}/validate-offer`, data);

// Payment
export const createRazorpayOrder = (orderId) => api.post('/payment/create-order', { orderId });
export const verifyPayment = (data) => api.post('/payment/verify', data);
export const getInvoice = (orderId) => api.get(`/payment/invoice/${orderId}`);

// Analytics
export const getDashboard = () => api.get('/analytics/dashboard');
export const getTopItems = (params) => api.get('/analytics/top-items', { params });
export const getPeakHours = (params) => api.get('/analytics/peak-hours', { params });
export const getRevenueTrend = () => api.get('/analytics/revenue-trend');

export default api;
