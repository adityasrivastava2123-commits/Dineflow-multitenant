import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, BarChart2, LogOut, CheckCircle, Clock, ChefHat, Bell, Truck, X, RefreshCw, TrendingUp, Users, DollarSign } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getOrders, updateOrderStatus, getDashboard, getMenu, toggleMenuItem } from '../../services/api';
import { joinKitchen, getSocket } from '../../services/socket';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  accepted: 'bg-blue-100 text-blue-700 border-blue-200',
  preparing: 'bg-purple-100 text-purple-700 border-purple-200',
  ready: 'bg-green-100 text-green-700 border-green-200',
  delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_NEXT = {
  pending: { label: '✅ Accept', next: 'accepted', color: 'bg-blue-500' },
  accepted: { label: '👨‍🍳 Start Cooking', next: 'preparing', color: 'bg-purple-500' },
  preparing: { label: '🔔 Mark Ready', next: 'ready', color: 'bg-green-500' },
  ready: { label: '🚀 Deliver', next: 'delivered', color: 'bg-emerald-500' },
};

function OrderCard({ order, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const next = STATUS_NEXT[order.status];

  const handleUpdate = async () => {
    if (!next) return;
    setLoading(true);
    try {
      await updateOrderStatus(order._id, { status: next.next });
      onUpdate(order._id, next.next);
      toast.success(`Order ${order.orderNumber} → ${next.next}`);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this order?')) return;
    setLoading(true);
    try {
      await updateOrderStatus(order._id, { status: 'cancelled' });
      onUpdate(order._id, 'cancelled');
      toast.success('Order cancelled');
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-4 mb-3">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-black text-stone-800 text-base">{order.orderNumber}</p>
          <p className="text-sm text-stone-500">Table {order.tableNumber} · {order.customerName}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${STATUS_COLORS[order.status] || 'bg-stone-100'}`}>
            {order.status}
          </span>
          {order.paymentStatus === 'paid' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">PAID</span>}
        </div>
      </div>

      <div className="space-y-1 mb-3">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-stone-700">{item.name} <span className="text-stone-400">×{item.quantity}</span></span>
            <span className="font-semibold">₹{(item.price * item.quantity).toFixed(0)}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-stone-100 pt-3">
        <span className="font-black text-stone-900 text-lg">₹{order.totalAmount?.toFixed(0)}</span>
        <div className="flex gap-2">
          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <button onClick={handleCancel} disabled={loading}
              className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 active:scale-95 transition-transform">
              <X className="w-4 h-4" />
            </button>
          )}
          {next && (
            <button onClick={handleUpdate} disabled={loading}
              className={`${next.color} text-white px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-50`}>
              {loading ? '...' : next.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ stats }) {
  return (
    <div className="space-y-4 p-4">
      <h2 className="font-black text-stone-800 text-xl">Today's Summary</h2>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Revenue', value: `₹${stats.todayRevenue?.toFixed(0) || 0}`, icon: DollarSign, color: 'bg-green-100 text-green-600' },
          { label: 'Orders', value: stats.todayOrders || 0, icon: ShoppingBag, color: 'bg-blue-100 text-blue-600' },
          { label: 'Avg Order', value: `₹${stats.avgOrderValue?.toFixed(0) || 0}`, icon: TrendingUp, color: 'bg-purple-100 text-purple-600' },
          { label: 'Customers', value: stats.todayCustomers || 0, icon: Users, color: 'bg-amber-100 text-amber-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-3xl border border-stone-100 p-4 shadow-sm">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-stone-800">{value}</p>
            <p className="text-xs text-stone-500 font-semibold mt-1">{label}</p>
          </div>
        ))}
      </div>

      {stats.recentOrders?.length > 0 && (
        <div>
          <h3 className="font-bold text-stone-700 mb-3">Recent Orders</h3>
          {stats.recentOrders.slice(0, 3).map((order) => (
            <div key={order._id} className="bg-white rounded-2xl border border-stone-100 p-3 mb-2 flex justify-between items-center">
              <div>
                <p className="font-bold text-stone-800 text-sm">{order.orderNumber}</p>
                <p className="text-xs text-stone-400">Table {order.tableNumber}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-stone-800">₹{order.totalAmount?.toFixed(0)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${STATUS_COLORS[order.status] || ''}`}>{order.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuTab({ restaurantSlug }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMenu(restaurantSlug).then(({ data }) => setItems(data.menu)).finally(() => setLoading(false));
  }, []);

  const handleToggle = async (id) => {
    try {
      const { data } = await toggleMenuItem(id);
      setItems((prev) => prev.map((i) => i._id === id ? data : i));
    } catch { toast.error('Failed'); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="p-4 space-y-4">
      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat}>
          <h3 className="font-bold text-stone-700 mb-2 text-sm uppercase tracking-wide">{cat}</h3>
          <div className="space-y-2">
            {catItems.map((item) => (
              <div key={item._id} className={`bg-white rounded-2xl border border-stone-100 p-3 flex items-center gap-3 ${!item.available ? 'opacity-50' : ''}`}>
                {item.image && <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" onError={(e) => e.target.style.display = 'none'} />}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-800 text-sm truncate">{item.name}</p>
                  <p className="text-stone-600 font-semibold text-sm">₹{item.price}</p>
                </div>
                <button onClick={() => handleToggle(item._id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {item.available ? 'In Stock' : 'Out'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminApp() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState('active');

  const loadOrders = async () => {
    try {
      const { data } = await getOrders({ status: 'all', limit: 50 });
      setOrders(data.orders || data);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  };

  const loadStats = async () => {
    try {
      const { data } = await getDashboard();
      setStats(data);
    } catch {}
  };

  useEffect(() => {
    loadOrders();
    loadStats();
    const slug = user?.restaurant?.slug;
    if (slug) {
      joinKitchen(slug);
      const socket = getSocket();
      socket.on('new-order', (order) => {
        setOrders((prev) => [order, ...prev]);
        toast('🔔 New order!', { icon: '🍽️' });
      });
      return () => socket.off('new-order');
    }
  }, []);

  const handleOrderUpdate = (id, status) => {
    setOrders((prev) => prev.map((o) => o._id === id ? { ...o, status } : o));
  };

  const filteredOrders = orders.filter((o) => {
    if (orderFilter === 'active') return ['pending', 'accepted', 'preparing', 'ready'].includes(o.status);
    if (orderFilter === 'done') return ['delivered', 'cancelled'].includes(o.status);
    return true;
  });

  const pendingCount = orders.filter((o) => o.status === 'pending').length;

  const TABS = [
    { key: 'dashboard', icon: LayoutDashboard, label: 'Home' },
    { key: 'orders', icon: ShoppingBag, label: 'Orders', badge: pendingCount },
    { key: 'menu', icon: UtensilsCrossed, label: 'Menu' },
  ];

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-3 border-b border-stone-100 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-black text-stone-800 text-lg">{user?.restaurant?.name}</p>
            <p className="text-xs text-stone-400">Admin · {user?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { loadOrders(); loadStats(); }} className="p-2 text-stone-400">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={() => { logout(); navigate('/admin-app/login'); }} className="p-2 text-stone-400">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {tab === 'dashboard' && <Dashboard stats={stats} />}

      {tab === 'orders' && (
        <div className="p-4">
          <div className="flex gap-2 mb-4">
            {['active', 'done', 'all'].map((f) => (
              <button key={f} onClick={() => setOrderFilter(f)}
                className={`flex-1 py-2.5 rounded-2xl font-bold text-sm capitalize transition-colors ${orderFilter === f ? 'bg-stone-800 text-white' : 'bg-white text-stone-500 border border-stone-200'}`}>
                {f}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-3">📭</div>
              <p className="text-stone-400 font-bold">No orders found</p>
            </div>
          ) : filteredOrders.map((order) => (
            <OrderCard key={order._id} order={order} onUpdate={handleOrderUpdate} />
          ))}
        </div>
      )}

      {tab === 'menu' && <MenuTab restaurantSlug={user?.restaurant?.slug} />}

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 px-2 py-2 flex">
        {TABS.map(({ key, icon: Icon, label, badge }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-colors relative ${tab === key ? 'text-orange-500' : 'text-stone-400'}`}>
            <Icon className="w-6 h-6" />
            <span className="text-xs font-bold">{label}</span>
            {badge > 0 && (
              <span className="absolute top-1 right-1/4 w-5 h-5 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center">{badge}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
