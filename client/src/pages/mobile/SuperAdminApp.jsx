import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Store, Users, Plus, LogOut, ChevronRight, RefreshCw, AlertTriangle, CheckCircle, Loader, QrCode, Calendar } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL;

export default function SuperAdminApp() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('restaurants');
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newRest, setNewRest] = useState({ name: '', slug: '', phone: '', email: '', adminName: '', adminEmail: '', adminPassword: '', plan: 'trial', expiryDays: 30 });

  const token = localStorage.getItem('dineflow_token');
  const headers = { Authorization: `Bearer ${token}` };

  const loadData = async () => {
    try {
      const [restRes, statsRes] = await Promise.all([
        axios.get(`${API}/superadmin/restaurants`, { headers }),
        axios.get(`${API}/superadmin/stats`, { headers }),
      ]);
      setRestaurants(restRes.data);
      setStats(statsRes.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const createRestaurant = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/superadmin/restaurants`, newRest, { headers });
      toast.success('Restaurant created!');
      setShowAdd(false);
      setNewRest({ name: '', slug: '', phone: '', email: '', adminName: '', adminEmail: '', adminPassword: '', plan: 'trial', expiryDays: 30 });
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const extendSubscription = async (id, days) => {
    try {
      await axios.put(`${API}/superadmin/restaurants/${id}/subscription`, { expiryDays: days, status: 'active' }, { headers });
      toast.success(`Extended by ${days} days!`);
      loadData();
    } catch { toast.error('Failed'); }
  };

  const inputClass = "w-full bg-stone-100 border border-stone-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-purple-400";

  const getDaysColor = (days) => {
    if (days <= 0) return 'text-red-500';
    if (days <= 7) return 'text-orange-500';
    if (days <= 30) return 'text-amber-500';
    return 'text-green-500';
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* Header */}
      <div className="bg-purple-700 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-base">Super Admin</p>
              <p className="text-purple-200 text-xs">{user?.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={loadData} className="p-2 text-white/60"><RefreshCw className="w-5 h-5" /></button>
            <button onClick={() => { logout(); navigate('/superadmin-app/login'); }} className="p-2 text-white/60"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-3 mt-4">
          {[
            { label: 'Total', value: stats.totalRestaurants || 0 },
            { label: 'Active', value: stats.activeRestaurants || 0 },
            { label: 'Expired', value: stats.expiredRestaurants || 0 },
          ].map(({ label, value }) => (
            <div key={label} className="flex-1 bg-white/10 rounded-2xl p-3 text-center">
              <p className="text-white font-black text-2xl">{value}</p>
              <p className="text-purple-200 text-xs font-semibold">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Add Restaurant Form */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-black text-stone-800 text-lg">New Restaurant</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-stone-100 rounded-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <input className={inputClass} placeholder="Restaurant Name *" value={newRest.name}
                onChange={(e) => setNewRest({ ...newRest, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} />
              <input className={inputClass} placeholder="Slug (URL) e.g. pizza-palace *" value={newRest.slug}
                onChange={(e) => setNewRest({ ...newRest, slug: e.target.value })} />
              <input className={inputClass} placeholder="Phone" value={newRest.phone}
                onChange={(e) => setNewRest({ ...newRest, phone: e.target.value })} />
              <input className={inputClass} placeholder="Email" value={newRest.email}
                onChange={(e) => setNewRest({ ...newRest, email: e.target.value })} />
              <div className="bg-stone-50 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-black text-stone-500">ADMIN ACCOUNT</p>
                <input className={inputClass} placeholder="Admin Name *" value={newRest.adminName}
                  onChange={(e) => setNewRest({ ...newRest, adminName: e.target.value })} />
                <input className={inputClass} placeholder="Admin Email *" value={newRest.adminEmail}
                  onChange={(e) => setNewRest({ ...newRest, adminEmail: e.target.value })} />
                <input className={inputClass} placeholder="Password *" value={newRest.adminPassword}
                  onChange={(e) => setNewRest({ ...newRest, adminPassword: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select className={inputClass} value={newRest.plan} onChange={(e) => setNewRest({ ...newRest, plan: e.target.value })}>
                  <option value="trial">Trial</option>
                  <option value="basic">Basic</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
                <input className={inputClass} type="number" placeholder="Days" value={newRest.expiryDays}
                  onChange={(e) => setNewRest({ ...newRest, expiryDays: e.target.value })} />
              </div>
              <button onClick={createRestaurant} disabled={submitting}
                className="w-full bg-purple-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting ? <Loader className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Create Restaurant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restaurant List */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-stone-800 text-lg">Restaurants</h2>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-2xl font-bold text-sm">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-3">🏪</div>
            <p className="text-stone-400 font-bold">No restaurants yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {restaurants.map((r) => {
              const daysLeft = r.daysLeft;
              const isExpired = daysLeft <= 0;
              return (
                <div key={r._id} className="bg-white rounded-3xl border border-stone-100 shadow-sm p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-stone-800 text-base">{r.name}</p>
                        {isExpired && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Expired</span>}
                      </div>
                      <p className="text-xs text-stone-400">/{r.slug} · {r.staff?.length || 0} staff</p>
                    </div>
                    <span className={`font-black text-lg ${getDaysColor(daysLeft)}`}>{daysLeft <= 0 ? '0d' : `${daysLeft}d`}</span>
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-2 flex-wrap">
                    <a href={`/restaurant/${r.slug}?table=1`} target="_blank" rel="noreferrer"
                      className="text-xs bg-stone-100 text-stone-700 px-3 py-2 rounded-xl font-semibold">
                      🍽️ Menu
                    </a>
                    <button onClick={() => extendSubscription(r._id, 30)}
                      className="text-xs bg-purple-100 text-purple-700 px-3 py-2 rounded-xl font-semibold">
                      +30 days
                    </button>
                    <button onClick={() => extendSubscription(r._id, 365)}
                      className="text-xs bg-green-100 text-green-700 px-3 py-2 rounded-xl font-semibold">
                      +1 year
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
