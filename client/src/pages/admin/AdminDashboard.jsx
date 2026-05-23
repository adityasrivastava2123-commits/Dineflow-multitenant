import { useState, useEffect } from 'react';
import { ShoppingBag, DollarSign, Users, TrendingUp, Bell, Clock } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { getDashboard, getOrders, getTopItems } from '../../services/api';
import { joinRestaurant, getSocket } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const StatCard = ({ label, value, icon: Icon, color, sub }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-stone-500 text-sm font-medium">{label}</p>
        <p className="text-3xl font-bold text-stone-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
);

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-blue-100 text-blue-700',
  preparing: 'bg-purple-100 text-purple-700',
  ready: 'bg-green-100 text-green-700',
  delivered: 'bg-stone-100 text-stone-600',
  cancelled: 'bg-red-100 text-red-700',
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const slug = user?.restaurant?.slug;
    if (slug) {
      joinRestaurant(slug);
      const socket = getSocket();
      socket.on('new-order', (order) => {
        toast('New order received! 🔔', { icon: '🍽️' });
        setRecentOrders((prev) => [order, ...prev.slice(0, 9)]);
        setStats((prev) => prev ? { ...prev, activeOrders: prev.activeOrders + 1, todayOrders: prev.todayOrders + 1 } : prev);
      });
      socket.on('payment-received', ({ orderNumber }) => {
        toast.success(`Payment received for ${orderNumber}!`);
      });
      return () => { socket.off('new-order'); socket.off('payment-received'); };
    }
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, ordersRes, itemsRes] = await Promise.all([
        getDashboard(),
        getOrders({ limit: 10 }),
        getTopItems({ limit: 5 }),
      ]);
      setStats(statsRes.data);
      setRecentOrders(ordersRes.data.orders);
      setTopItems(itemsRes.data);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const timeSince = (date) => {
    const mins = Math.floor((Date.now() - new Date(date)) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <AdminLayout title="Dashboard">
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 h-28 skeleton" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Today's Orders" value={stats?.todayOrders || 0} icon={ShoppingBag} color="bg-brand-100 text-brand-600" sub="vs yesterday" />
            <StatCard label="Today's Revenue" value={`₹${(stats?.todayRevenue || 0).toFixed(0)}`} icon={DollarSign} color="bg-green-100 text-green-600" />
            <StatCard label="Active Orders" value={stats?.activeOrders || 0} icon={Bell} color="bg-amber-100 text-amber-600" sub="awaiting action" />
            <StatCard label="Total Revenue" value={`₹${((stats?.totalRevenue || 0) / 1000).toFixed(1)}k`} icon={TrendingUp} color="bg-purple-100 text-purple-600" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent orders */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-stone-100 flex items-center justify-between">
                <h2 className="font-bold text-stone-800">Recent Orders</h2>
                <a href="/admin/orders" className="text-sm text-brand-500 font-semibold">View all →</a>
              </div>
              <div className="divide-y divide-stone-50">
                {recentOrders.map((order) => (
                  <div key={order._id} className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-stone-800">{order.orderNumber}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[order.status]}`}>{order.status}</span>
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">
                        Table {order.tableNumber} · {order.items.length} items · {timeSince(order.createdAt)}
                      </p>
                    </div>
                    <span className="font-bold text-stone-900 ml-4">₹{order.totalAmount?.toFixed(0)}</span>
                  </div>
                ))}
                {recentOrders.length === 0 && (
                  <div className="p-8 text-center text-stone-400">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No orders yet today</p>
                  </div>
                )}
              </div>
            </div>

            {/* Top items */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-stone-100">
                <h2 className="font-bold text-stone-800">Top Items (30d)</h2>
              </div>
              <div className="p-4 space-y-4">
                {topItems.map((item, idx) => (
                  <div key={item._id} className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500'}`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-800 truncate">{item._id}</p>
                      <p className="text-xs text-stone-400">{item.totalQuantity} sold · ₹{item.totalRevenue?.toFixed(0)}</p>
                    </div>
                  </div>
                ))}
                {topItems.length === 0 && <p className="text-stone-400 text-sm text-center py-4">No data yet</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
