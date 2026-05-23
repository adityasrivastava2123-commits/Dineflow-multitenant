import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader, UtensilsCrossed } from 'lucide-react';
import { login as loginApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill all fields'); return; }
    setLoading(true);
    try {
      const { data } = await loginApi({ email, password });
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      if (data.user.role === 'kitchen') navigate('/kitchen');
      else navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-brand-500/40">
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-3xl text-white font-bold">DineFlow</h1>
          <p className="text-stone-400 mt-1 text-sm">Restaurant Management</p>
        </div>

        {/* Login card */}
        <form onSubmit={handleLogin} className="bg-stone-800/50 backdrop-blur border border-stone-700/50 rounded-3xl p-6 space-y-4">
          <h2 className="text-white font-semibold text-lg">Sign In</h2>

          <div>
            <label className="text-xs font-semibold text-stone-400 mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@restaurant.com"
              className="w-full bg-stone-900/50 border border-stone-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500 transition-colors placeholder:text-stone-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-400 mb-1.5 block">Password</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-stone-900/50 border border-stone-700 text-white rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:border-brand-500 transition-colors placeholder:text-stone-600"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : null}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {/* Demo credentials hint */}
          <div className="text-center text-xs text-stone-500 pt-2">
            <p>Demo: admin@spicegarden.in / admin123</p>
          </div>
        </form>
      </div>
    </div>
  );
}
