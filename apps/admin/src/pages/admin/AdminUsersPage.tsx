import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/apiClient';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (roleFilter) q.set('role', roleFilter);
      if (search) q.set('q', search);
      const data = await apiRequest<any[]>(`/admin/users?${q.toString()}`);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      setMessage('User role updated successfully.');
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Could not update user role.');
    }
  };

  const handleToggleStatus = async (userId: string, currentActive: boolean) => {
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentActive }),
      });
      setMessage(`User account ${!currentActive ? 'activated' : 'suspended'}.`);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Could not toggle user status.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">User & Seller Management</h2>
          <p className="text-sm text-slate-600 mt-1">
            Review accounts, assign authorized RBAC roles, and activate or suspend platform access.
          </p>
        </div>
        <Link
          to="/admin/moderation"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 self-start sm:self-auto"
        >
          Review Seller KYC Applications &rarr;
        </Link>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
      {message && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-semibold">{message}</div>}

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs w-64"
            />
            <button
              onClick={loadUsers}
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
            >
              Search
            </button>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
          >
            <option value="">All Roles</option>
            <option value="customer">Customer</option>
            <option value="seller">Seller</option>
            <option value="support_staff">Support Staff</option>
            <option value="catalogue_manager">Catalogue Manager</option>
            <option value="administrator">Administrator</option>
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading user accounts...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-slate-500">No matching user accounts found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Current Role</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Assign Role</th>
                  <th className="py-2">Account Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u._id}>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{u.fullName}</td>
                    <td className="py-3 pr-4 text-xs text-slate-600">{u.email}</td>
                    <td className="py-3 pr-4">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-bold uppercase text-slate-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        className="px-2 py-1 rounded border border-slate-300 text-xs"
                      >
                        <option value="customer">customer</option>
                        <option value="seller">seller</option>
                        <option value="support_staff">support_staff</option>
                        <option value="catalogue_manager">catalogue_manager</option>
                        <option value="administrator">administrator</option>
                      </select>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleToggleStatus(u._id, u.isActive)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${u.isActive ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                      >
                        {u.isActive ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

