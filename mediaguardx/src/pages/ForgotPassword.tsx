import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import Layout from '../components/Layout';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock submission
    setSubmitted(true);
  };

  return (
    <Layout showSidebar={false}>
      <div className="max-w-md mx-auto mt-20">
        <div className="glass rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary-400" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              Reset Password
            </h1>
          </div>

          {!submitted ? (
            <>
              <p className="text-center text-gray-400 mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-gray-300 focus:outline-none focus:border-primary-500"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-primary-600 hover:bg-primary-500 rounded-lg font-medium transition-colors"
                >
                  Send Reset Link
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-200 mb-2">
                Check your email
              </h2>
              <p className="text-gray-400 mb-6">
                We've sent a password reset link to {email}
              </p>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-gray-400">
            <Link to="/login" className="text-primary-400 hover:text-primary-300">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}

