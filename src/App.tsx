import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from './state/AuthContext';

export default function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100">
      <header className="border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold text-primary-700">
            Ticket System
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user?.username}</span>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="rounded-md bg-primary-600 text-white px-3 py-1.5 text-sm hover:bg-primary-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
