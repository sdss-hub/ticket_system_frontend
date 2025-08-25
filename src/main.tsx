import { StrictMode, lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './state/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import { UserRole } from './api/types';
import Loading from './components/Loading';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const TicketsList = lazy(() => import('./pages/TicketsList'));
const TicketDetail = lazy(() => import('./pages/TicketDetail'));
const TicketNew = lazy(() => import('./pages/TicketNew'));
const Users = lazy(() => import('./pages/Users'));

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<Loading />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<Loading />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: 'tickets',
        element: (
          <RoleRoute allow={[UserRole.Admin]}>
            <Suspense fallback={<Loading />}>
              <TicketsList />
            </Suspense>
          </RoleRoute>
        ),
      },
      {
        path: 'tickets/assigned',
        element: (
          <RoleRoute allow={[UserRole.Agent]}>
            <Suspense fallback={<Loading />}>
              <TicketsList />
            </Suspense>
          </RoleRoute>
        ),
      },
      {
        path: 'tickets/available',
        element: (
          <RoleRoute allow={[UserRole.Agent]}>
            <Suspense fallback={<Loading />}>
              <TicketsList />
            </Suspense>
          </RoleRoute>
        ),
      },
      {
        path: 'tickets/new',
        element: (
          <Suspense fallback={<Loading />}>
            <TicketNew />
          </Suspense>
        ),
      },
      {
        path: 'tickets/:id',
        element: (
          <Suspense fallback={<Loading />}>
            <TicketDetail />
          </Suspense>
        ),
      },
      {
        path: 'users',
        element: (
          <RoleRoute allow={[UserRole.Admin]}>
            <Suspense fallback={<Loading />}>
              <Users />
            </Suspense>
          </RoleRoute>
        ),
      },
    ],
  },
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);
