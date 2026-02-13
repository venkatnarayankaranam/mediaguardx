import { useState, useEffect, useCallback } from 'react';
import { Users, Trash2, AlertTriangle } from 'lucide-react';
import { getAdminUsers, updateUserRole, updateUserStatus, deleteUser } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const ROLE_OPTIONS = ['user', 'investigator', 'admin'] as const;

function getRoleBadgeVariant(role: string): 'info' | 'warning' | 'danger' | 'neutral' {
  if (role === 'admin') return 'danger';
  if (role === 'investigator') return 'warning';
  return 'neutral';
}

export default function UserManagement() {
  const toast = useToast();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await getAdminUsers(100, 0);
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleRoleChange(userId: string, newRole: string): Promise<void> {
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
      toast.success(`User role updated to ${newRole}.`);
    } catch (err) {
      console.error('Failed to update user role:', err);
      toast.error('Failed to update user role.');
    }
  }

  async function handleStatusToggle(userId: string, currentStatus: boolean): Promise<void> {
    const newStatus = !currentStatus;
    try {
      await updateUserStatus(userId, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: newStatus } : u)),
      );
      toast.success(`User ${newStatus ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      console.error('Failed to update user status:', err);
      toast.error('Failed to update user status.');
    }
  }

  async function handleDeleteConfirm(): Promise<void> {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteUser(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      toast.success(`User ${deleteTarget.email} deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
      toast.error('Failed to delete user.');
    } finally {
      setIsDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Skeleton className="h-9 w-56 mb-2" variant="text" />
          <Skeleton className="h-5 w-40" variant="text" />
        </div>
        <div className="card rounded-xl p-6">
          <Skeleton className="h-6 w-40 mb-6" variant="text" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-800/50">
              <Skeleton className="h-4 w-28" variant="text" />
              <Skeleton className="h-4 w-44" variant="text" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-6 w-14" />
              <Skeleton className="h-8 w-8" variant="circular" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-200 mb-2 flex items-center gap-3">
          <Users className="w-8 h-8 text-emerald-400" />
          User Management
        </h1>
        <p className="text-slate-400">Manage user accounts, roles, and access permissions</p>
      </div>

      {/* Users Table */}
      <div className="card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Joined
                </th>
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 text-lg font-medium">No users found</p>
                  </td>
                </tr>
              )}

              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-5">
                    <span className="text-sm text-slate-200 font-medium">{user.name}</span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="text-sm text-slate-400">{user.email}</span>
                  </td>
                  <td className="py-3.5 px-5">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer"
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3.5 px-5">
                    <button
                      onClick={() => handleStatusToggle(user.id, user.is_active)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                        user.is_active ? 'bg-emerald-600' : 'bg-slate-600'
                      }`}
                      title={user.is_active ? 'Active - Click to deactivate' : 'Inactive - Click to activate'}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                          user.is_active ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="text-sm text-slate-500">
                      {new Date(user.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <button
                      onClick={() => setDeleteTarget(user)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-slate-200">
                Are you sure you want to delete the user{' '}
                <span className="font-semibold text-red-400">{deleteTarget?.email}</span>?
              </p>
              <p className="text-xs text-slate-400 mt-1">
                This action cannot be undone. All associated data will be permanently removed.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="btn-secondary"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="btn-danger"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete User'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
