import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ChefHat, Bell, Truck, RefreshCw, Filter } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { getOrders, updateOrderStatus, deliverOrder } from '../../services/api';
import { joinRestaurant, getSocket } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending:   { color: 'bg-amber-50 border-amber-200',  badge: 'bg-amber-100 text-amber-700',   label: 'Pending' },
  accepted:  { color: 'bg-blue-50 border-blue-200',    badge: 'bg-blue-100 text-blue-700',     label: 'Accepted' },
  preparing: { color: 'bg-purple-50 border-purple-200',badge: 'bg-purple-100 text-purple-700', label: 'Preparing' },
  ready:     { color: 'bg-green-50 border-green-200',  badge: 'bg-green-100 text-green-700',   label: 'Ready' },
  delivered: { color: 'bg-stone-50 border-stone-200',  badge: 'bg-stone-100 text-stone-500',   label: 'Delivered' },
  cancelled: { color: 'bg-red-50 border-red-200',      badge: 'bg-red-100 text-red-700',       label: 'Cancelled' },
};

const FILTERS = ['all', 'pending', 'accepted', 'preparing', 'ready', 'delivered'];

function OrderCard({ order, onStatusUpdate }) {
  const [loading, setLoading] = useState(false);
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

  const timeSince = (date) => {
    const mins = Math.floor((Date.now() - new Date(date)) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  const handleAction = async (status) => {
    setLoading(true);
    try {
      if (status === 'delivered') {
        await deliverOrder(order._id);
      } else {
        await updateOrderStatus(order._id, { status });
      }
      onStatusUpdate(order._id, status);
      toast.success(`Order ${order.orderNumber} → ${status}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-2xl border-2 p-4 ${cfg.color} transition-all`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-800">{order.orderNumber}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
            {order.paymentStatus === 'paid' && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">PAID</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
            <span className="font-semibold text-stone-700">Table {order.tableNumber}</span>
            <span>{timeSince(order.createdAt)}</span>
            {order.customerName && <span>{order.customerName}</span>}
          </div>
        </div>
        <span className="font-bold text-stone-900 text-lg">₹{order.totalAmount?.toFixed(0)}</span>
      </div>

      {/* Items */}
      <div className="space-y-1 mb-4 bg-white/60 rounded-xl p-3">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span className="text-stone-700">
              {item.name}
              {item.specialInstructions && (
                <span className="text-xs text-stone-400 ml-1 italic">({item.specialInstructions})</span>
              )}
            </span>
            <span className="font-semibold text-stone-800 ml-2">×{item.quantity}</span>
          </div>
        ))}
        {order.notes && (
          <p className="text-xs text-stone-400 italic mt-1 pt-1 border-t border-stone-200">
            Note: {order.notes}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        {order.status === 'pending' && (
          <>
            <button
              onClick={() => handleAction('accepted')}
              disabled={loading}
              className="flex-1 bg-green-500 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" /> Accept
            </button>
            <button
              onClick={() => handleAction('cancelled')}
              disabled={loading}
              className="flex-1 bg-red-500 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" /> Reject
            </button>
          </>
        )}
        {order.status === 'accepted' && (
          <button
            onClick={() => handleAction('preparing')}
            disabled={loading}
            className="flex-1 bg-purple-500 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform disabled:opacity-50"
          >
            <ChefHat className="w-4 h-4" /> Mark Preparing
          </button>
        )}
        {order.status === 'preparing' && (
          <button
            onClick={() => handleAction('ready')}
            disabled={loading}
            className="flex-1 bg-green-500 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform disabled:opacity-50"
          >
            <Bell className="w-4 h-4" /> Mark Ready
          </button>
        )}
        {order.status === 'ready' && (
          <button
            onClick={() => handleAction('delivered')}
            disabled={loading}
            className="flex-1 bg-stone-700 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform disabled:opacity-50"
          >
            <Truck className="w-4 h-4" /> Mark Delivered
          </button>
        )}
        {(order.status === 'delivered' || order.status === 'cancelled') && (
          <span className="text-xs text-stone-400 py-2">
            {order.status === 'delivered' ? '✓ Completed' : '✗ Cancelled'}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
    const slug = user?.restaurant?.slug;
    if (slug) {
      joinRestaurant(slug);
      const socket = getSocket();
      socket.on('new-order', (order) => {
        setOrders((prev) => [order, ...prev]);
        toast('🔔 New order!', { duration: 4000 });
        // Play notification sound if available
        try { new Audio('/notification.mp3').play(); } catch {}
      });
      socket.on('order-updated', (updated) => {
        setOrders((prev) => prev.map((o) => o._id === updated._id ? updated : o));
      });
      return () => { socket.off('new-order'); socket.off('order-updated'); };
    }
  }, []);

  const loadOrders = async () => {
    try {
      const { data } = await getOrders({ limit: 100 });
      setOrders(data.orders);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
  };

  const handleStatusUpdate = (orderId, newStatus) => {
    setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status: newStatus } : o));
  };

  const filteredOrders = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  const pendingCount = orders.filter((o) => o.status === 'pending').length;

  return (
    <AdminLayout title="Orders">
      {/* Top controls */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-stone-700">{filteredOrders.length} orders</h2>
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
              {pendingCount} pending
            </span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 text-sm text-stone-600 bg-white border border-stone-200 px-4 py-2 rounded-xl hover:bg-stone-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-4">
        {FILTERS.map((f) => {
          const count = f === 'all' ? orders.length : orders.filter((o) => o.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                filter === f ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              <span className="capitalize">{f}</span>
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${filter === f ? 'bg-white/20' : 'bg-stone-100'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Orders grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl border-2 border-stone-100 h-48 skeleton" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <div className="text-5xl mb-3">📋</div>
          <p className="font-medium">No {filter !== 'all' ? filter : ''} orders</p>
          <p className="text-sm mt-1">Orders will appear here in real-time</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <OrderCard key={order._id} order={order} onStatusUpdate={handleStatusUpdate} />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
