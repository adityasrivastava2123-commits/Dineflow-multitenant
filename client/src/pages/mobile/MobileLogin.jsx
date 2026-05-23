import { useState } from 'react';
import { Eye, EyeOff, Loader } from 'lucide-react';
import { login as loginApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const APP_CONFIG = {
  kitchen: {
    title: 'Kitchen Staff',
    subtitle: 'DineFlow Kitchen App',
    emoji: '👨‍🍳',
    color: 'from-orange-600 to-amber-500',
    btnColor: 'bg-orange-500 hover:bg-orange-600',
    allowedRoles: ['kitchen', 'admin', 'manager'],
    redirectTo: '/kitchen-app',
    hint: 'Login with your kitchen credentials',
  },
  admin: {
    title: 'Restaurant Admin',
    subtitle: 'DineFlow Admin App',
    emoji: '🍽️',
    color: 'from-stone-800 to-stone-700',
    btnColor: 'bg-stone-800 hover:bg-stone-900',
    allowedRoles: ['admin', 'manager'],
    redirectTo: '/admin-app',
    hint: 'Login with your admin credentials',
  },
  superadmin: {
    title: 'Super Admin',
    subtitle: 'DineFlow Control Panel',
    emoji: '🛡️',
    color: 'from-purple-700 to-purple-600',
    btnColor: 'bg-purple-600 hover:bg-purple-700',
    allowedRoles: ['superadmin'],
    redirectTo: '/superadmin-app',
    hint: 'superadmin@dineflow.in / superadmin123',
  },
};

export default function MobileLogin({ appType = 'kitchen' }) {
  const config = APP_CONFIG[appType] || APP_CONFIG.kitchen;
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Fill all fields'); return; }
    setLoading(true);
    try {
      const { data } = await loginApi({ email, password });
      if (!config.allowedRoles.includes(data.user.role)) {
        toast.error(`This login is for ${config.title} only`);
        return;
      }
      login(data.token, data.user);
      toast.success(`Welcome, ${data.user.name}!`);
      navigate(config.redirectTo);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.color} flex flex-col items-center justify-center p-6`}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-4">{config.emoji}</div>
          <h1 className="text-white font-black text-3xl">{config.title}</h1>
          <p className="text-white/60 text-sm mt-1">{config.subtitle}</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-stone-500 mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com" autoComplete="email"
                className="w-full bg-stone-100 border border-stone-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-stone-400 transition-colors" />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-500 mb-1.5 block">Password</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  className="w-full bg-stone-100 border border-stone-200 rounded-2xl px-4 py-3.5 pr-12 text-sm outline-none focus:border-stone-400 transition-colors" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className={`w-full ${config.btnColor} text-white font-black py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-lg mt-2`}>
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-xs text-stone-400 mt-4">{config.hint}</p>
        </div>

        {/* Install hint */}
        <p className="text-center text-white/40 text-xs mt-6">
          📱 Tip: Add to home screen for app-like experience
        </p>
      </div>
    </div>
  );
}
