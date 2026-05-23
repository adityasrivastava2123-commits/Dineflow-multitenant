import { useState, useEffect, useRef } from 'react';
import { ChefHat, CheckCircle, Clock, LogOut, Volume2, VolumeX, Wifi, WifiOff, RefreshCw, Bell } from 'lucide-react';
import { getKitchenOrders, updateOrderStatus } from '../../services/api';
import { joinKitchen, getSocket } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  accepted: { label: 'New Order', bg: 'bg-amber-400', card: 'bg-amber-50 border-amber-300', text: 'text-amber-800', btn: 'bg-amber-500 hover:bg-amber-600', btnLabel: '👨‍🍳 Start Cooking' },
  preparing: { label: 'Cooking', bg: 'bg-purple-500', card: 'bg-purple-50 border-purple-300', text: 'text-purple-800', btn: 'bg-green-500 hover:bg-green-600', btnLabel: '✅ Mark Ready' },
  ready: { label: 'Ready!', bg: 'bg-green-500', card: 'bg-green-50 border-green-300', text: 'text-green-800', btn: null, btnLabel: null },
};

function OrderCard({ order, onStatusChange, soundEnabled }) {
  const [loading, setLoading] = useState(false);
  const minutes = Math.floor((Date.now() - new Date(order.createdAt)) / 60000);
  const cfg = STATUS_CONFIG[order.status];
  const isLate = order.status === 'preparing' && minutes > 25;
  const isUrgent = order.status === 'accepted' && minutes > 5;

  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; osc.type = 'sine';
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    } catch {}
  };

  const handleAction = async () => {
    if (!cfg.btn) return;
    const nextStatus = order.status === 'accepted' ? 'preparing' : 'ready';
    setLoading(true);
    try {
      await updateOrderStatus(order._id, { status: nextStatus });
      onStatusChange(order._id, nextStatus);
      playBeep();
      toast.success(nextStatus === 'ready' ? '🔔 Order Ready!' : '👨‍🍳 Cooking started');
    } catch { toast.error('Failed to update'); }
    finally { setLoading(false); }
  };

  return (
    <div className={`rounded-3xl border-2 p-5 ${cfg.card} ${(isLate || isUrgent) ? 'ring-4 ring-red-400 animate-pulse' : ''} mb-4`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white mb-1 ${cfg.bg}`}>{cfg.label}</span>
          <p className="text-2xl font-black text-stone-800">{order.orderNumber}</p>
        </div>
        <div className="text-right">
          <p className={`text-5xl font-black ${isLate || isUrgent ? 'text-red-600' : 'text-stone-700'}`}>{minutes}</p>
          <p className="text-xs text-stone-500 font-semibold">min ago</p>
        </div>
      </div>

      {/* Table badge */}
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-white rounded-2xl px-4 py-2 flex items-center gap-2 shadow-sm border border-stone-200">
          <span className="text-lg">🪑</span>
          <span className="font-black text-stone-800 text-xl">Table {order.tableNumber}</span>
        </div>
        {order.customerName && (
          <div className="bg-white rounded-2xl px-4 py-2 shadow-sm border border-stone-200">
            <span className="font-semibold text-stone-600 text-sm">{order.customerName}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="space-y-2 mb-4">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-stone-100">
            <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center font-black text-stone-800 text-xl flex-shrink-0">
              {item.quantity}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-stone-800 text-base leading-tight">{item.name}</p>
              {item.specialInstructions && (
                <p className="text-xs text-orange-600 font-semibold mt-0.5">📝 {item.specialInstructions}</p>
              )}
            </div>
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
        ))}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-2 mb-4">
          <p className="text-xs font-bold text-yellow-700">📋 Note: {order.notes}</p>
        </div>
      )}

      {/* Action button */}
      {cfg.btn ? (
        <button onClick={handleAction} disabled={loading}
          className={`w-full ${cfg.btn} text-white font-black text-xl py-5 rounded-2xl transition-colors disabled:opacity-50 active:scale-95 transition-transform`}>
          {loading ? '...' : cfg.btnLabel}
        </button>
      ) : (
        <div className="w-full bg-green-500 text-white font-black text-xl py-5 rounded-2xl text-center animate-pulse">
          ✅ READY FOR PICKUP
        </div>
      )}

      {/* Alerts */}
      {isLate && <div className="mt-3 bg-red-100 border-2 border-red-400 rounded-2xl px-4 py-2 text-red-700 font-bold text-sm text-center">⚠️ {minutes - 25} min overdue!</div>}
      {isUrgent && !isLate && <div className="mt-3 bg-amber-100 border-2 border-amber-400 rounded-2xl px-4 py-2 text-amber-700 font-bold text-sm text-center">⏰ Start cooking!</div>}
    </div>
  );
}

export default function KitchenApp() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [connected, setConnected] = useState(true);
  const [tab, setTab] = useState('active');
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const intervalRef = useRef(null);

  const loadOrders = async () => {
    try {
      const { data } = await getKitchenOrders();
      setOrders(data);
      setConnected(true);
    } catch { setConnected(false); }
    finally { setLoading(false); }
  };

  const playNewOrderAlert = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [600, 800, 1000].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.3);
      });
    } catch {}
  };

  useEffect(() => {
    loadOrders();
    intervalRef.current = setInterval(loadOrders, 30000); // auto-refresh every 30s
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    const slug = user?.restaurant?.slug;
    if (!slug) return;
    joinKitchen(slug);
    const socket = getSocket();
    socket.on('new-order', (order) => {
      setOrders((prev) => [order, ...prev.filter((o) => o._id !== order._id)]);
      setNewOrderAlert(true);
      playNewOrderAlert();
      setTimeout(() => setNewOrderAlert(false), 3000);
    });
    socket.on('order-accepted', (order) => {
      setOrders((prev) => [order, ...prev.filter((o) => o._id !== order._id)]);
      playNewOrderAlert();
    });
    return () => { socket.off('new-order'); socket.off('order-accepted'); };
  }, [user, soundEnabled]);

  const handleStatusChange = (id, status) => {
    setOrders((prev) => prev.map((o) => o._id === id ? { ...o, status } : o));
    if (status === 'ready') {
      setTimeout(() => setOrders((prev) => prev.filter((o) => !(o._id === id && o.status === 'ready'))), 60000);
    }
  };

  const activeOrders = orders.filter((o) => ['accepted', 'preparing'].includes(o.status))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const readyOrders = orders.filter((o) => o.status === 'ready');

  return (
    <div className="min-h-screen bg-stone-950 pb-24">
      {/* New order flash */}
      {newOrderAlert && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-4 font-black text-xl animate-bounce">
          🔔 NEW ORDER!
        </div>
      )}

      {/* Header */}
      <div className="bg-stone-900 px-4 pt-12 pb-4 flex items-center justify-between sticky top-0 z-40 border-b border-stone-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">{user?.restaurant?.name || 'Kitchen'}</p>
            <div className="flex items-center gap-1.5">
              {connected ? <Wifi className="w-3 h-3 text-green-400" /> : <WifiOff className="w-3 h-3 text-red-400" />}
              <p className="text-xs text-stone-400">{connected ? 'Live' : 'Offline'}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadOrders} className="p-2 text-stone-400 hover:text-white">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl ${soundEnabled ? 'text-green-400' : 'text-stone-500'}`}>
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button onClick={() => { logout(); navigate('/kitchen-app/login'); }}
            className="p-2 text-stone-400 hover:text-red-400">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-4">
        <button onClick={() => setTab('active')}
          className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-colors ${tab === 'active' ? 'bg-orange-500 text-white' : 'bg-stone-800 text-stone-400'}`}>
          🍳 Active ({activeOrders.length})
        </button>
        <button onClick={() => setTab('ready')}
          className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-colors ${tab === 'ready' ? 'bg-green-500 text-white' : 'bg-stone-800 text-stone-400'}`}>
          ✅ Ready ({readyOrders.length})
        </button>
      </div>

      {/* Orders */}
      <div className="px-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'active' ? (
          activeOrders.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-7xl mb-4">😴</div>
              <p className="text-stone-400 font-bold text-xl">No active orders</p>
              <p className="text-stone-500 text-sm mt-2">New orders will appear here</p>
            </div>
          ) : activeOrders.map((order) => (
            <OrderCard key={order._id} order={order} onStatusChange={handleStatusChange} soundEnabled={soundEnabled} />
          ))
        ) : (
          readyOrders.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-7xl mb-4">👌</div>
              <p className="text-stone-400 font-bold text-xl">No ready orders</p>
            </div>
          ) : readyOrders.map((order) => (
            <OrderCard key={order._id} order={order} onStatusChange={handleStatusChange} soundEnabled={soundEnabled} />
          ))
        )}
      </div>

      {/* Bottom stats bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-stone-900 border-t border-stone-800 px-4 py-3 flex justify-around">
        <div className="text-center">
          <p className="text-amber-400 font-black text-2xl">{activeOrders.filter(o => o.status === 'accepted').length}</p>
          <p className="text-stone-500 text-xs font-semibold">New</p>
        </div>
        <div className="text-center">
          <p className="text-purple-400 font-black text-2xl">{activeOrders.filter(o => o.status === 'preparing').length}</p>
          <p className="text-stone-500 text-xs font-semibold">Cooking</p>
        </div>
        <div className="text-center">
          <p className="text-green-400 font-black text-2xl">{readyOrders.length}</p>
          <p className="text-stone-500 text-xs font-semibold">Ready</p>
        </div>
        <div className="text-center">
          <p className="text-stone-300 font-black text-2xl">{orders.filter(o => o.status === 'delivered').length}</p>
          <p className="text-stone-500 text-xs font-semibold">Done</p>
        </div>
      </div>
    </div>
  );
}
