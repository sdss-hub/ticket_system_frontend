import { Outlet, Link, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from './state/AuthContext';
import { UserRole } from './api/types';

export default function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100">
      <header className="border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-semibold text-primary-700">
              Ticket System
            </Link>
            <nav className="hidden sm:flex items-center gap-4 text-sm">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  isActive ? 'text-primary-700 font-medium' : 'text-gray-600 hover:text-gray-900'
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/tickets"
                className={({ isActive }) =>
                  isActive ? 'text-primary-700 font-medium' : 'text-gray-600 hover:text-gray-900'
                }
              >
                Tickets
              </NavLink>
              <NavLink
                to="/tickets/new"
                className={({ isActive }) =>
                  isActive ? 'text-primary-700 font-medium' : 'text-gray-600 hover:text-gray-900'
                }
              >
                New Ticket
              </NavLink>
              {user?.role === UserRole.Admin && (
                <NavLink
                  to="/users"
                  className={({ isActive }) =>
                    isActive ? 'text-primary-700 font-medium' : 'text-gray-600 hover:text-gray-900'
                  }
                >
                  Users
                </NavLink>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {user?.fullName || user?.email}
              {user && (
                <span className="ml-2 inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700 ring-1 ring-inset ring-gray-300">
                  {UserRole[user.role]}
                </span>
              )}
            </span>
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
