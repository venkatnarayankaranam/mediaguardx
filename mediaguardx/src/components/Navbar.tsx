import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useDetectionStore } from '../store/detectionStore';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { clearHistory } = useDetectionStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    clearHistory(); // Clear detection history on logout
    navigate('/login');
  };

  return (
    <nav className="glass-strong border-b border-dark-700 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              MediaGuardX
            </span>
          </Link>

          <div className="flex items-center space-x-6">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-gray-300 hover:text-primary-400 transition-colors"
                >
                  Dashboard
                </Link>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="text-gray-300 hover:text-primary-400 transition-colors"
                  >
                    Admin
                  </Link>
                )}
                {user?.role === 'investigator' && (
                  <Link
                    to="/investigator"
                    className="text-gray-300 hover:text-primary-400 transition-colors"
                  >
                    Investigator
                  </Link>
                )}
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-400">{user?.name}</span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-300 hover:text-primary-400 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

