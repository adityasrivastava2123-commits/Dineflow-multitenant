import { useState, useEffect } from 'react';
import { ChefHat, Clock, CheckCircle, X, Volume2, VolumeX } from 'lucide-react';
import { getKitchenOrders, updateOrderStatus } from '../../services/api';
import { joinKitchen, getSocket } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const KDS_STATUS = {
  accepted: { label: 'To Prepare', color: 'bg-blue-50 border-blue-200', badge: 'bg-blue-500', icon: '🟦' },
  preparing: { label: 'In Progress', color: 'bg-purple-50 border-purple-200', badge: 'bg-purple-500', icon: '🟪' },
  ready: { label: 'Ready for Pickup', color: 'bg-green-50 border-green-200', badge: 'bg-green-500', icon: '🟩' },
};

function OrderCard({ order, onStatusChange }) {
  const [loading, setLoading] = useState(false);
  const startTime = new Date(order.createdAt);
  const minutes = Math.floor((Date.now() - startTime) / 60000);

  const handleMarkPreparing = async () => {
    setLoading(true);
    try {
      await updateOrderStatus(order._id, { status: 'preparing' });
      onStatusChange(order._id, 'preparing');
      toast.success(`Order ${order.orderNumber} → Preparing`);
      playSound();
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReady = async () => {
    setLoading(true);
    try {
      await updateOrderStatus(order._id, { status: 'ready' });
      onStatusChange(order._id, 'ready');
      toast.success(`Order ${order.orderNumber} → Ready! 🔔`);
      playSound();
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const playSound = () => {
    try { new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==').play(); } catch {}
  };

  const cfg = KDS_STATUS[order.status];
  const isLate = order.status === 'preparing' && minutes > 25;
  const isUrgent = order.status === 'accepted' && minutes > 5;

  return (
    <div className={`rounded-3xl border-2 p-6 ${cfg.color} ${isLate || isUrgent ? 'ring-4 ring-red-400' : ''} transition-all`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-4xl">{cfg.icon}</span>
            <div>
              <p className="font-display text-3xl font-bold text-stone-800">{order.orderNumber}</p>
              <p className={`text-sm font-semibold ${cfg.badge === 'bg-blue-500' ? 'text-blue-600' : cfg.badge === 'bg-purple-500' ? 'text-purple-600' : 'text-green-600'}`}>
                {cfg.label}
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-4xl font-display font-bold ${isLate || isUrgent ? 'text-red-600' : 'text-stone-800'}`}>
            {minutes}
          </p>
          <p className="text-xs text-stone-500">min ago</p>
        </div>
      </div>

      {/* Table and timing */}
      <div className="flex items-center gap-4 mb-4 pb-4 border-b-2 border-current border-opacity-20">
        <div className="text-center flex-1">
          <p className="text-xs text-stone-500 font-semibold mb-1">TABLE</p>
          <p className="text-3xl font-bold text-stone-800">{order.tableNumber}</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-xs text-stone-500 font-semibold mb-1">EST. READY</p>
          <p className="text-lg font-bold text-stone-800">
            {new Date(order.estimatedReadyAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </p>
        </div>
        <div className="text-center flex-1">
          <p className="text-xs text-stone-500 font-semibold mb-1">ITEMS</p>
          <p className="text-3xl font-bold text-stone-800">{order.items.length}</p>
        </div>
      </div>

      {/* Items */}
      <div className="mb-4 space-y-2">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-3 bg-white/70 rounded-2xl p-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-stone-700 flex-shrink-0 border-2 border-current border-opacity-30">
              {item.quantity}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-stone-800 leading-tight">{item.name}</p>
              {item.specialInstructions && (
                <p className="text-xs text-stone-500 italic mt-1">
                  📝 {item.specialInstructions}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        {order.status === 'accepted' && (
          <button
            onClick={handleMarkPreparing}
            disabled={loading}
            className="btn-primary col-span-2 flex items-center justify-center gap-2 py-4 text-lg font-bold disabled:opacity-50"
          >
            <ChefHat className="w-5 h-5" /> Start Cooking
          </button>
        )}
        {order.status === 'preparing' && (
          <button
            onClick={handleMarkReady}
            disabled={loading}
            className="btn-primary col-span-2 flex items-center justify-center gap-2 py-4 text-lg font-bold disabled:opacity-50"
          >
            <CheckCircle className="w-5 h-5" /> Mark Ready
          </button>
        )}
        {order.status === 'ready' && (
          <div className="col-span-2 bg-green-500 text-white rounded-2xl py-4 flex items-center justify-center gap-2 font-bold text-lg animate-pulse">
            <CheckCircle className="w-5 h-5" /> READY!
          </div>
        )}
      </div>

      {/* Alert indicators */}
      {isLate && (
        <div className="mt-3 bg-red-500/20 border-2 border-red-500 rounded-2xl px-3 py-2 flex items-center gap-2 text-red-700 font-bold text-sm">
          <Clock className="w-4 h-4" /> Taking too long! {minutes - 25}+ min over
        </div>
      )}
      {isUrgent && order.status === 'accepted' && (
        <div className="mt-3 bg-amber-500/20 border-2 border-amber-500 rounded-2xl px-3 py-2 flex items-center gap-2 text-amber-700 font-bold text-sm">
          <Clock className="w-4 h-4" /> Start cooking now!
        </div>
      )}
    </div>
  );
}

export default function KitchenDisplay() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [view, setView] = useState('all'); // all, accepting, preparing, ready

  useEffect(() => {
    loadOrders();
    const slug = user?.restaurant?.slug;
    if (slug) {
      joinKitchen(slug);
      const socket = getSocket();
      socket.on('new-order', (order) => {
        if (order.status === 'accepted') {
          setOrders((prev) => [order, ...prev]);
          if (soundEnabled) playAlert();
        }
      });
      socket.on('order-accepted', (order) => {
        setOrders((prev) => [order, ...prev.filter((o) => o._id !== order._id)]);
        if (soundEnabled) playAlert();
      });
      return () => { socket.off('new-order'); socket.off('order-accepted'); };
    }
  }, [soundEnabled]);

  const loadOrders = async () => {
    try {
      const { data } = await getKitchenOrders();
      setOrders(data);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const playAlert = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  };

  const handleStatusChange = (orderId, newStatus) => {
    setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status: newStatus } : o));
  };

  const filteredOrders = orders.filter((o) => {
    if (view === 'all') return ['accepted', 'preparing', 'ready'].includes(o.status);
    return o.status === view;
  });

  const acceptedCount = orders.filter((o) => o.status === 'accepted').length;
  const preparingCount = orders.filter((o) => o.status === 'preparing').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;

  return (
    <div className="min-h-screen bg-stone-950 p-2 lg:p-4">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-3xl p-6 mb-4 border-2 border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-display text-3xl font-bold">Kitchen Display</h1>
              <p className="text-stone-400 text-sm">{user?.restaurant?.name}</p>
            </div>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-3 rounded-2xl transition-colors ${soundEnabled ? 'bg-green-500/20 text-green-500' : 'bg-stone-700 text-stone-400'}`}
            title={soundEnabled ? 'Sound On' : 'Sound Off'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

        {/* View tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {[
            { key: 'accepting', label: 'To Prepare', count: acceptedCount, color: 'bg-blue-500' },
            { key: 'preparing', label: 'In Progress', count: preparingCount, color: 'bg-purple-500' },
            { key: 'ready', label: 'Ready', count: readyCount, color: 'bg-green-500' },
            { key: 'all', label: 'All', count: filteredOrders.length, color: 'bg-stone-600' },
          ].map(({ key, label, count, color }) => (
            <button
              key={key}
              onClick={() => setView(key === 'accepting' ? 'accepted' : key === 'all' ? 'all' : key)}
              className={`px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all ${
                (key === 'accepting' && view === 'accepted') || (key !== 'accepting' && view === key)
                  ? `${color} text-white shadow-lg`
                  : 'bg-stone-800 text-stone-400 border-2 border-stone-700'
              }`}
            >
              {label}
              {count > 0 && (
                <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-sm font-bold">{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Orders grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-3xl border-2 border-stone-700 h-64 skeleton" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-8xl mb-4">🍽️</div>
            <p className="text-stone-400 font-bold text-xl">No orders to prepare</p>
            <p className="text-stone-500 mt-2">Check back when new orders arrive</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-max">
            {/* Accepted orders (high priority) */}
            {view === 'all' || view === 'accepted' ? (
              filteredOrders
                .filter((o) => o.status === 'accepted')
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                .map((order) => <OrderCard key={order._id} order={order} onStatusChange={handleStatusChange} />)
            ) : null}

            {/* Preparing orders */}
            {view === 'all' || view === 'preparing' ? (
              filteredOrders
                .filter((o) => o.status === 'preparing')
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                .map((order) => <OrderCard key={order._id} order={order} onStatusChange={handleStatusChange} />)
            ) : null}

            {/* Ready orders */}
            {view === 'all' || view === 'ready' ? (
              filteredOrders
                .filter((o) => o.status === 'ready')
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map((order) => <OrderCard key={order._id} order={order} onStatusChange={handleStatusChange} />)
            ) : null}

            {/* Other statuses in all view */}
            {view === 'all' &&
              filteredOrders
                .filter((o) => !['accepted', 'preparing', 'ready'].includes(o.status))
                .map((order) => <OrderCard key={order._id} order={order} onStatusChange={handleStatusChange} />)}
          </div>
        )}
      </div>
    </div>
  );
}
