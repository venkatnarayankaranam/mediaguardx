import { Link } from 'react-router-dom';

export default function Navbar() {
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
            <Link
              to="/dashboard"
              className="text-gray-300 hover:text-primary-400 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              to="/camera"
              className="text-gray-300 hover:text-primary-400 transition-colors"
            >
              Live Camera
            </Link>
            <Link
              to="/admin"
              className="text-gray-300 hover:text-primary-400 transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
