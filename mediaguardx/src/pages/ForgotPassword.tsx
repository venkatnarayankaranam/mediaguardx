import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import AuthLayout from '@/components/layouts/AuthLayout';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const { resetPassword } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await resetPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    }
  };

  return (
    <AuthLayout>
      <div className="card p-8">
        {!submitted ? (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-indigo-500/15 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                <Mail className="w-8 h-8 text-indigo-400" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-center mb-2 text-gradient-brand">Reset Password</h1>
            <p className="text-center text-slate-500 mb-8">Enter your email to receive a reset link</p>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="input-field" placeholder="you@example.com" />
              </div>
              <button type="submit" className="w-full btn-primary py-3">Send Reset Link</button>
            </form>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-emerald-500/15 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-200 mb-2">Check your email</h2>
            <p className="text-slate-500 mb-6">We've sent a password reset link to <span className="text-slate-300">{email}</span></p>
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
