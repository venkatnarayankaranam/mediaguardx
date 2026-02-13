import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import AuthLayout from '@/components/layouts/AuthLayout';
import { ShieldCheck, LogIn } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, loading, fetchProfile, profile } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      await fetchProfile();
      const currentProfile = useAuthStore.getState().profile;
      if (currentProfile?.role !== 'admin') {
        await useAuthStore.getState().logout();
        setError('Access denied. Admin credentials required.');
        return;
      }
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
    }
  };

  return (
    <AuthLayout variant="admin">
      <div className="card p-8 border-emerald-900/30">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-emerald-500/15 rounded-2xl flex items-center justify-center border border-emerald-500/20">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-center mb-2 text-gradient-admin">Admin Portal</h1>
        <p className="text-center text-slate-500 mb-8">Authorized personnel only</p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Admin Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="input-field focus:ring-emerald-500" placeholder="admin@mediaguardx.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="input-field focus:ring-emerald-500" placeholder="Enter admin password" />
          </div>
          <button type="submit" disabled={loading} className="w-full btn-admin py-3 gap-2">
            <LogIn className="w-4 h-4" />
            {loading ? 'Verifying...' : 'Access Admin Portal'}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
