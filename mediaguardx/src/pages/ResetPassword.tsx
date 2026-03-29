import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '@/components/layouts/AuthLayout';
import { supabase, isDemoMode } from '@/lib/supabase';
import { Eye, EyeOff, KeyRound, CheckCircle, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="card p-8">
        {isDemoMode ? (
          <div className="text-center py-6">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-amber-500/15 rounded-2xl flex items-center justify-center border border-amber-500/20">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-200 mb-2">Not Available in Demo</h2>
            <p className="text-slate-500 mb-6">
              Password reset is not available in demo mode. Supabase must be configured to use this feature.
            </p>
          </div>
        ) : !success ? (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-indigo-500/15 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                <KeyRound className="w-8 h-8 text-indigo-400" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-center mb-2 text-gradient-brand">Set New Password</h1>
            <p className="text-center text-slate-500 mb-8">Enter your new password below</p>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                    className="input-field pr-12" placeholder="Enter new password" minLength={8} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">Must be at least 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                    className="input-field pr-12" placeholder="Confirm new password" minLength={8} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full btn-primary py-3 gap-2">
                <KeyRound className="w-4 h-4" />
                {loading ? 'Updating...' : 'Reset Password'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-emerald-500/15 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-200 mb-2">Password Updated</h2>
            <p className="text-slate-500 mb-6">Your password has been successfully reset. You can now sign in with your new password.</p>
          </div>
        )}

        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
