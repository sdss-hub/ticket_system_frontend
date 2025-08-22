import { useEffect, useState } from 'react';
import { UserRole, type UserDto } from '../api/types';
import { UsersApi } from '../api/users';
import Loading from '../components/Loading';
import ErrorState from '../components/ErrorState';

export default function Users() {
  const [role, setRole] = useState<UserRole | ''>('');
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await UsersApi.list(role === '' ? undefined : (role as UserRole));
      setUsers(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
      <div className="card p-4 flex items-center gap-4">
        <select
          className="input w-56"
          value={role}
          onChange={(e) =>
            setRole(e.target.value === '' ? '' : (Number(e.target.value) as UserRole))
          }
        >
          <option value="">All Roles</option>
          <option value={UserRole.Customer}>Customer</option>
          <option value={UserRole.Agent}>Agent</option>
          <option value={UserRole.Admin}>Admin</option>
        </select>
        <button className="btn-primary" onClick={load}>
          Refresh
        </button>
      </div>
      {loading && <Loading label="Loading users..." />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <div className="card p-0 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">{u.fullName}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{u.email}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{UserRole[u.role]}</td>
                  <td className="px-4 py-2 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}
                    >
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <div className="p-4 text-sm text-gray-600">No users found.</div>}
        </div>
      )}
    </div>
  );
}
