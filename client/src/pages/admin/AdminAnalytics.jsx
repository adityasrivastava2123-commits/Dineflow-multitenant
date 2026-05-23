import { useState, useEffect } from 'react';
import { TrendingUp, ShoppingBag, Clock, Star } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { getDashboard, getTopItems, getPeakHours, getRevenueTrend } from '../../services/api';
import toast from 'react-hot-toast';

// Simple bar chart component (no external library needed)
function BarChart({ data, valueKey, labelKey, color = 'bg-brand-500', maxLabel = '' }) {
  if (!data || data.length === 0) return <div className="text-center text-stone-400 py-8">No data available</div>;
  const max = Math.max(...data.map((d) => d[valueKey] || 0));
  return (
    <div className="space-y-2">
      {data.map((item, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <span className="text-xs text-stone-500 w-20 flex-shrink-0 text-right">{item[labelKey]}</span>
          <div className="flex-1 bg-stone-100 rounded-full h-5 overflow-hidden">
            <div
              className={`h-full ${color} rounded-full transition-all duration-700 flex items-center justify-end pr-2`}
              style={{ width: `${max ? ((item[valueKey] || 0) / max) * 100 : 0}%` }}
            >
              {item[valueKey] > 0 && (
                <span className="text-white text-xs font-bold">{typeof item[valueKey] === 'number' && item[valueKey] < 100 ? item[valueKey] : ''}</span>
              )}
            </div>
          </div>
          <span className="text-xs font-semibold text-stone-700 w-16 flex-shrink-0">
            {maxLabel === '₹' ? `₹${(item[valueKey] || 0).toFixed(0)}` : item[valueKey] || 0}
          </span>
        </div>
      ))}
    </div>
  );
}

function RevenueSparkline({ data }) {
  if (!data || data.length < 2) return <div className="text-center text-stone-400 py-4">Not enough data</div>;
  const values = data.map((d) => d.revenue || 0);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 600, H = 120;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / range) * (H - 20) - 10}`).join(' ');
  const areaPoints = `0,${H} ${points} ${W},${H}`;

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#sparkGrad)" />
        <polyline points={points} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="flex justify-between text-xs text-stone-400 mt-1">
        <span>{data[0]?._id}</span>
        <span>{data[data.length - 1]?._id}</span>
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [stats, setStats] = useState(null);
  const [topItems, setTopItems] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [s, t, p, r] = await Promise.all([getDashboard(), getTopItems({ limit: 10 }), getPeakHours(), getRevenueTrend()]);
      setStats(s.data);
      setTopItems(t.data);
      // Format peak hours for display
      const hours = p.data.filter((h) => h.orderCount > 0).map((h) => ({
        ...h,
        label: `${h.hour % 12 || 12}${h.hour < 12 ? 'am' : 'pm'}`,
      }));
      setPeakHours(hours);
      setRevenueTrend(r.data);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Analytics">
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl h-48 skeleton" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Orders', value: stats?.totalOrders || 0, icon: ShoppingBag, color: 'text-blue-500 bg-blue-50' },
              { label: 'Total Revenue', value: `₹${((stats?.totalRevenue || 0) / 1000).toFixed(1)}k`, icon: TrendingUp, color: 'text-green-500 bg-green-50' },
              { label: 'Avg Order Value', value: stats?.totalOrders ? `₹${((stats?.totalRevenue || 0) / stats.totalOrders).toFixed(0)}` : '₹0', icon: Star, color: 'text-amber-500 bg-amber-50' },
              { label: 'Payment Rate', value: stats?.totalOrders ? `${Math.round((stats?.paidOrders / stats.totalOrders) * 100)}%` : '0%', icon: Clock, color: 'text-purple-500 bg-purple-50' },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-2xl border border-stone-100 p-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-stone-900">{card.value}</p>
                <p className="text-xs text-stone-500 mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Revenue trend */}
          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <h2 className="font-bold text-stone-800 mb-1">Revenue Trend (Last 30 Days)</h2>
            <p className="text-xs text-stone-400 mb-4">Daily revenue from paid orders</p>
            <RevenueSparkline data={revenueTrend} />
            {revenueTrend.length > 0 && (
              <div className="mt-3 flex justify-between text-sm">
                <div>
                  <span className="text-stone-500">Best day: </span>
                  <span className="font-semibold text-stone-800">
                    ₹{Math.max(...revenueTrend.map((d) => d.revenue || 0)).toFixed(0)}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500">Today: </span>
                  <span className="font-semibold text-brand-600">₹{(stats?.todayRevenue || 0).toFixed(0)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Top items */}
            <div className="bg-white rounded-2xl border border-stone-100 p-5">
              <h2 className="font-bold text-stone-800 mb-1">Top Selling Items</h2>
              <p className="text-xs text-stone-400 mb-4">Last 30 days by quantity</p>
              <BarChart data={topItems} valueKey="totalQuantity" labelKey="_id" color="bg-brand-500" />
            </div>

            {/* Peak hours */}
            <div className="bg-white rounded-2xl border border-stone-100 p-5">
              <h2 className="font-bold text-stone-800 mb-1">Peak Hours</h2>
              <p className="text-xs text-stone-400 mb-4">Order volume by hour</p>
              <BarChart data={peakHours} valueKey="orderCount" labelKey="label" color="bg-purple-500" />
              {peakHours.length === 0 && (
                <p className="text-center text-stone-400 text-sm py-4">Collect more orders to see peak hours</p>
              )}
            </div>
          </div>

          {/* Top items table */}
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
            <div className="p-5 border-b border-stone-100">
              <h2 className="font-bold text-stone-800">Item Performance (30 Days)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 text-left">
                    <th className="px-5 py-3 font-semibold text-stone-500">#</th>
                    <th className="px-5 py-3 font-semibold text-stone-500">Item</th>
                    <th className="px-5 py-3 font-semibold text-stone-500 text-right">Qty Sold</th>
                    <th className="px-5 py-3 font-semibold text-stone-500 text-right">Revenue</th>
                    <th className="px-5 py-3 font-semibold text-stone-500 text-right">Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {topItems.map((item, idx) => (
                    <tr key={item._id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-5 py-3 text-stone-400">{idx + 1}</td>
                      <td className="px-5 py-3 font-semibold text-stone-800">{item._id}</td>
                      <td className="px-5 py-3 text-right font-semibold text-stone-700">{item.totalQuantity}</td>
                      <td className="px-5 py-3 text-right font-semibold text-green-600">₹{(item.totalRevenue || 0).toFixed(0)}</td>
                      <td className="px-5 py-3 text-right text-stone-500">{item.orderCount}</td>
                    </tr>
                  ))}
                  {topItems.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-stone-400">No data yet — start accepting orders!</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
