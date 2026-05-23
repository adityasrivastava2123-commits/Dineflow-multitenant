import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, Trash2, Users, Store, ChevronDown, ChevronUp, Loader, LogOut, QrCode, Download, Calendar, AlertTriangle, CheckCircle, X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL;
const BASE_URL = import.meta.env.VITE_APP_URL || window.location.origin;

const PLANS = [
  { key: 'trial', label: 'Trial', price: 0, color: 'bg-stone-100 text-stone-700' },
  { key: 'basic', label: 'Basic ₹999/mo', price: 999, color: 'bg-blue-100 text-blue-700' },
  { key: 'standard', label: 'Standard ₹1999/mo', price: 1999, color: 'bg-purple-100 text-purple-700' },
  { key: 'premium', label: 'Premium ₹3999/mo', price: 3999, color: 'bg-amber-100 text-amber-700' },
];

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [showNewRestaurant, setShowNewRestaurant] = useState(false);
  const [showNewStaff, setShowNewStaff] = useState(null);
  const [showQR, setShowQR] = useState(null);
  const [showSubscription, setShowSubscription] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newRest, setNewRest] = useState({ name: '', slug: '', description: '', phone: '', email: '', taxRate: 5, adminName: '', adminEmail: '', adminPassword: '', plan: 'trial', expiryDays: 30 });
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '', role: 'kitchen' });
  const [subForm, setSubForm] = useState({ plan: 'basic', expiryDays: 30, status: 'active' });

  const token = localStorage.getItem('dineflow_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [restRes, statsRes] = await Promise.all([
        axios.get(`${API}/superadmin/restaurants`, { headers }),
        axios.get(`${API}/superadmin/stats`, { headers }),
      ]);
      setRestaurants(restRes.data);
      setStats(statsRes.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const createRestaurant = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/superadmin/restaurants`, newRest, { headers });
      toast.success('Restaurant created!');
      setShowNewRestaurant(false);
      setNewRest({ name: '', slug: '', description: '', phone: '', email: '', taxRate: 5, adminName: '', adminEmail: '', adminPassword: '', plan: 'trial', expiryDays: 30 });
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const addStaff = async (e, restaurantId) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/superadmin/restaurants/${restaurantId}/staff`, newStaff, { headers });
      toast.success('Staff added!');
      setShowNewStaff(null);
      setNewStaff({ name: '', email: '', password: '', role: 'kitchen' });
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const updateSubscription = async (e, restaurantId) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.put(`${API}/superadmin/restaurants/${restaurantId}/subscription`, subForm, { headers });
      toast.success('Subscription updated!');
      setShowSubscription(null);
      loadData();
    } catch (err) { toast.error('Failed to update'); }
    finally { setSubmitting(false); }
  };

  const loadQRCodes = async (restaurantId) => {
    setQrLoading(true);
    setShowQR(restaurantId);
    try {
      const { data } = await axios.get(`${API}/superadmin/restaurants/${restaurantId}/qrcodes?baseUrl=${BASE_URL}`, { headers });
      setQrData(data);
    } catch { toast.error('Failed to load QR codes'); }
    finally { setQrLoading(false); }
  };

  const downloadQR = (qr, tableNumber, restaurantName) => {
    const link = document.createElement('a');
    link.href = qr;
    link.download = `${restaurantName}-Table${tableNumber}-QR.png`;
    link.click();
  };

  const downloadAllQRs = () => {
    if (!qrData) return;
    qrData.qrCodes.forEach(({ qr, tableNumber }) => {
      setTimeout(() => downloadQR(qr, tableNumber, qrData.restaurant.name), tableNumber * 200);
    });
    toast.success(`Downloading ${qrData.qrCodes.length} QR codes!`);
  };

  const deleteRestaurant = async (id, name) => {
    if (!window.confirm(`Delete "${name}" and all its data?`)) return;
    try {
      await axios.delete(`${API}/superadmin/restaurants/${id}`, { headers });
      toast.success('Restaurant deleted');
      loadData();
    } catch { toast.error('Failed to delete'); }
  };

  const handleLogout = () => { logout(); navigate('/superadmin/login'); };

  const inputClass = "w-full bg-stone-100 border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-500 transition-colors";

  const getDaysLeftColor = (days) => {
    if (days <= 0) return 'text-red-600 bg-red-50';
    if (days <= 7) return 'text-orange-600 bg-orange-50';
    if (days <= 30) return 'text-amber-600 bg-amber-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-stone-900">DineFlow Super Admin</h1>
            <p className="text-xs text-stone-400">{user?.name}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-stone-500 hover:text-stone-800 text-sm">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: stats.totalRestaurants || 0, icon: Store, color: 'bg-purple-100 text-purple-600' },
            { label: 'Active', value: stats.activeRestaurants || 0, icon: CheckCircle, color: 'bg-green-100 text-green-600' },
            { label: 'Expired', value: stats.expiredRestaurants || 0, icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
            { label: 'Users', value: stats.totalUsers || 0, icon: Users, color: 'bg-blue-100 text-blue-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-stone-500 text-xs">{label}</p>
                  <p className="text-xl font-bold text-stone-900">{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-stone-800 text-lg">Restaurants</h2>
          <button onClick={() => setShowNewRestaurant(!showNewRestaurant)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Add Restaurant
          </button>
        </div>

        {/* New Restaurant Form */}
        {showNewRestaurant && (
          <div className="bg-white rounded-2xl border border-purple-200 shadow-sm p-6 mb-4">
            <h3 className="font-bold text-stone-800 mb-4">New Restaurant</h3>
            <form onSubmit={createRestaurant} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-500 mb-1 block">Restaurant Name *</label>
                  <input className={inputClass} placeholder="Pizza Palace" value={newRest.name}
                    onChange={(e) => setNewRest({ ...newRest, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-500 mb-1 block">Slug (URL) *</label>
                  <input className={inputClass} placeholder="pizza-palace" value={newRest.slug}
                    onChange={(e) => setNewRest({ ...newRest, slug: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-500 mb-1 block">Phone</label>
                  <input className={inputClass} placeholder="+91 98765 43210" value={newRest.phone}
                    onChange={(e) => setNewRest({ ...newRest, phone: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-500 mb-1 block">Email</label>
                  <input className={inputClass} placeholder="info@pizzapalace.in" value={newRest.email}
                    onChange={(e) => setNewRest({ ...newRest, email: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-500 mb-1 block">Plan</label>
                  <select className={inputClass} value={newRest.plan} onChange={(e) => setNewRest({ ...newRest, plan: e.target.value })}>
                    {PLANS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-500 mb-1 block">Trial Days</label>
                  <input className={inputClass} type="number" min="1" value={newRest.expiryDays}
                    onChange={(e) => setNewRest({ ...newRest, expiryDays: e.target.value })} />
                </div>
              </div>
              <div className="border-t border-stone-100 pt-3">
                <p className="text-xs font-bold text-stone-500 mb-3">ADMIN ACCOUNT</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-stone-500 mb-1 block">Admin Name *</label>
                    <input className={inputClass} placeholder="John Doe" value={newRest.adminName}
                      onChange={(e) => setNewRest({ ...newRest, adminName: e.target.value })} required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-stone-500 mb-1 block">Admin Email *</label>
                    <input className={inputClass} placeholder="admin@pizza.in" value={newRest.adminEmail}
                      onChange={(e) => setNewRest({ ...newRest, adminEmail: e.target.value })} required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-stone-500 mb-1 block">Password *</label>
                    <input className={inputClass} placeholder="admin123" value={newRest.adminPassword}
                      onChange={(e) => setNewRest({ ...newRest, adminPassword: e.target.value })} required />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
                  {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
                </button>
                <button type="button" onClick={() => setShowNewRestaurant(false)}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-stone-600 border border-stone-200 hover:bg-stone-50">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* QR Modal */}
        {showQR && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b">
                <h3 className="font-bold text-stone-800 flex items-center gap-2"><QrCode className="w-5 h-5" /> QR Codes — {qrData?.restaurant?.name}</h3>
                <button onClick={() => { setShowQR(null); setQrData(null); }} className="p-2 hover:bg-stone-100 rounded-xl"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {qrLoading ? (
                  <div className="flex items-center justify-center py-16"><Loader className="w-8 h-8 animate-spin text-purple-600" /></div>
                ) : qrData ? (
                  <>
                    <button onClick={downloadAllQRs}
                      className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-2xl font-semibold mb-5 hover:bg-purple-700">
                      <Download className="w-4 h-4" /> Download All {qrData.qrCodes.length} QR Codes
                    </button>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {qrData.qrCodes.map(({ tableNumber, qr, url }) => (
                        <div key={tableNumber} className="text-center">
                          <div className="bg-stone-50 rounded-2xl p-2 mb-2">
                            <img src={qr} alt={`Table ${tableNumber}`} className="w-full aspect-square" />
                          </div>
                          <p className="text-xs font-bold text-stone-700 mb-1">Table {tableNumber}</p>
                          <button onClick={() => downloadQR(qr, tableNumber, qrData.restaurant.name)}
                            className="text-xs text-purple-600 font-semibold hover:underline">Download</button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Restaurant List */}
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader className="w-8 h-8 animate-spin text-purple-600" /></div>
        ) : restaurants.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center">
            <Store className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500">No restaurants yet. Add your first one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {restaurants.map((r) => {
              const daysLeft = r.daysLeft;
              const isExpired = daysLeft <= 0 || r.subscription?.status === 'expired';
              const plan = PLANS.find((p) => p.key === r.subscription?.plan) || PLANS[0];

              return (
                <div key={r._id} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                  <div className="p-5 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
                          <Store className="w-5 h-5 text-stone-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-stone-900">{r.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${plan.color}`}>{plan.label.split(' ')[0]}</span>
                            {isExpired && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Expired</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <p className="text-xs text-stone-400">/{r.slug}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getDaysLeftColor(daysLeft)}`}>
                              {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => loadQRCodes(r._id)}
                        className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors" title="QR Codes">
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setShowSubscription(r._id); setSubForm({ plan: r.subscription?.plan || 'basic', expiryDays: 30, status: r.subscription?.status || 'active' }); }}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Subscription">
                        <Calendar className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteRestaurant(r._id, r.name)}
                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setExpanded(expanded === r._id ? null : r._id)}
                        className="p-2 text-stone-400 hover:bg-stone-50 rounded-lg transition-colors">
                        {expanded === r._id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Subscription Form */}
                  {showSubscription === r._id && (
                    <div className="border-t border-stone-100 bg-blue-50 p-5">
                      <h4 className="font-bold text-stone-800 mb-3 flex items-center gap-2"><Calendar className="w-4 h-4" /> Update Subscription</h4>
                      <form onSubmit={(e) => updateSubscription(e, r._id)} className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-stone-500 mb-1 block">Plan</label>
                            <select className={inputClass} value={subForm.plan} onChange={(e) => setSubForm({ ...subForm, plan: e.target.value })}>
                              {PLANS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-stone-500 mb-1 block">Extend (days)</label>
                            <input className={inputClass} type="number" min="1" value={subForm.expiryDays}
                              onChange={(e) => setSubForm({ ...subForm, expiryDays: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-stone-500 mb-1 block">Status</label>
                            <select className={inputClass} value={subForm.status} onChange={(e) => setSubForm({ ...subForm, status: e.target.value })}>
                              <option value="active">Active</option>
                              <option value="expired">Expired</option>
                              <option value="disabled">Disabled</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button type="submit" disabled={submitting}
                            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50">
                            {submitting ? <Loader className="w-4 h-4 animate-spin" /> : null} Update
                          </button>
                          <button type="button" onClick={() => setShowSubscription(null)}
                            className="px-5 py-2 rounded-xl text-sm text-stone-600 border border-stone-200 hover:bg-stone-50">Cancel</button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Expanded staff section */}
                  {expanded === r._id && (
                    <div className="border-t border-stone-100 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-bold text-stone-600">Staff</p>
                        <button onClick={() => setShowNewStaff(showNewStaff === r._id ? null : r._id)}
                          className="flex items-center gap-1 text-xs text-purple-600 font-semibold hover:underline">
                          <Plus className="w-3 h-3" /> Add Staff
                        </button>
                      </div>
                      {showNewStaff === r._id && (
                        <form onSubmit={(e) => addStaff(e, r._id)} className="bg-stone-50 rounded-xl p-4 mb-3 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-stone-500 mb-1 block">Name</label>
                              <input className={inputClass} placeholder="Staff Name" value={newStaff.name}
                                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} required />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-stone-500 mb-1 block">Role</label>
                              <select className={inputClass} value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}>
                                <option value="kitchen">Kitchen</option>
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-stone-500 mb-1 block">Email</label>
                              <input className={inputClass} placeholder="staff@restaurant.in" value={newStaff.email}
                                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} required />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-stone-500 mb-1 block">Password</label>
                              <input className={inputClass} placeholder="staff123" value={newStaff.password}
                                onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} required />
                            </div>
                          </div>
                          <button type="submit" disabled={submitting}
                            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50">
                            {submitting ? <Loader className="w-3 h-3 animate-spin" /> : null} Add Staff
                          </button>
                        </form>
                      )}
                      {r.staff?.length === 0 ? (
                        <p className="text-sm text-stone-400">No staff added yet</p>
                      ) : (
                        <div className="space-y-2">
                          {r.staff?.map((s) => (
                            <div key={s._id} className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-2.5">
                              <div>
                                <p className="text-sm font-semibold text-stone-800">{s.name}</p>
                                <p className="text-xs text-stone-400">{s.email}</p>
                              </div>
                              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${s.role === 'admin' ? 'bg-purple-100 text-purple-700' : s.role === 'kitchen' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                {s.role}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-4 pt-4 border-t border-stone-100">
                        <p className="text-xs font-bold text-stone-500 mb-2">QUICK LINKS</p>
                        <div className="flex gap-2 flex-wrap">
                          <a href={`/restaurant/${r.slug}?table=1`} target="_blank" rel="noreferrer"
                            className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-lg transition-colors">Customer Menu</a>
                          <a href="/admin/login" target="_blank" rel="noreferrer"
                            className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-lg transition-colors">Admin Login</a>
                          <a href="/kitchen" target="_blank" rel="noreferrer"
                            className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-lg transition-colors">Kitchen Display</a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
