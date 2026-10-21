import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { User, Role, UserStatus } from '../../types';
import {
  Users2,
  CheckCircle,
  ShieldAlert,
  UserCheck,
  UserX,
  UserPlus,
  X,
  AlertCircle,
  Shield,
} from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Create Worker Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SALES_OPERATOR' as Role,
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Action Confirmation Modal state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'role' | 'status';
    user: User;
    newRole?: Role;
    newStatus?: UserStatus;
  } | null>(null);

  const [modalError, setModalError] = useState<string | null>(null);

  // Query users
  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ['adminUsersList'],
    queryFn: () => apiClient<User[]>('/users'),
  });

  // Create Worker Mutation
  const createWorkerMutation = useMutation({
    mutationFn: (data: { name: string; email: string; password: string; role: Role }) =>
      apiClient('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
      setIsCreateOpen(false);
      setCreateForm({ name: '', email: '', password: '', role: 'SALES_OPERATOR' });
      setCreateError(null);
      setCreateSuccess(`Operator account for ${res?.data?.name || 'worker'} created successfully.`);
      setTimeout(() => setCreateSuccess(null), 5000);
    },
    onError: (err: any) => setCreateError(err.message || 'Failed to create worker account'),
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      apiClient(`/users/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
      setConfirmAction(null);
      setModalError(null);
    },
    onError: (err: any) => setModalError(err.message || 'Approval failed'),
  });

  // Role Mutation
  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      apiClient(`/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
      setConfirmAction(null);
      setModalError(null);
    },
    onError: (err: any) => setModalError(err.message || 'Role change failed'),
  });

  // Status Mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      apiClient(`/users/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsersList'] });
      setConfirmAction(null);
      setModalError(null);
    },
    onError: (err: any) => setModalError(err.message || 'Status change failed'),
  });

  const handleExecuteAction = () => {
    if (!confirmAction) return;

    if (confirmAction.type === 'approve' && confirmAction.newRole) {
      approveMutation.mutate({ id: confirmAction.user.id, role: confirmAction.newRole });
    } else if (confirmAction.type === 'role' && confirmAction.newRole) {
      roleMutation.mutate({ id: confirmAction.user.id, role: confirmAction.newRole });
    } else if (confirmAction.type === 'status' && confirmAction.newStatus) {
      statusMutation.mutate({ id: confirmAction.user.id, status: confirmAction.newStatus });
    }
  };

  const isPendingMut =
    approveMutation.isPending || roleMutation.isPending || statusMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Success banner */}
      {createSuccess && (
        <div className="p-3 border border-black bg-[#f3f4f6] text-black text-xs font-mono flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-black" />
            <span>{createSuccess}</span>
          </div>
          <button onClick={() => setCreateSuccess(null)} className="text-[#6b7280] hover:text-black">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white border border-[#e5e7eb] shadow-card rounded-none">
        <div>
          <h2 className="text-base font-bold uppercase tracking-wider text-black flex items-center space-x-2">
            <Users2 className="w-4 h-4 text-black" />
            <span>Operational User Management & Role Authorization</span>
          </h2>
          <p className="text-xs text-[#6b7280] font-mono mt-0.5">
            Administer system operators, provision new worker credentials, and enforce role separation
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreateOpen(true);
            setCreateError(null);
          }}
          className="px-3.5 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-[#1f2937] transition-colors flex items-center space-x-2 rounded-none shadow-subtle self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision Worker ID</span>
        </button>
      </div>

      {/* User Table */}
      <div className="bg-white border border-[#e5e7eb] shadow-card rounded-none overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-mono text-[#6b7280]">Loading users...</div>
        ) : error ? (
          <div className="p-6 text-center text-xs font-mono text-black">
            Error loading user list: {(error as any).message}
          </div>
        ) : users?.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-[#6b7280]">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f9fafb] border-b border-[#e5e7eb] text-[10px] uppercase font-mono text-[#6b7280]">
                <tr>
                  <th className="py-2.5 px-4">Operator Name</th>
                  <th className="py-2.5 px-4">Work Email</th>
                  <th className="py-2.5 px-4">Assigned Role</th>
                  <th className="py-2.5 px-4 text-center">Account Status</th>
                  <th className="py-2.5 px-4 font-mono">Registered Date</th>
                  <th className="py-2.5 px-4 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f4f6]">
                {users?.map((u) => (
                  <tr key={u.id} className="hover:bg-[#f9fafb]">
                    <td className="py-3 px-4 font-semibold text-black">{u.name}</td>
                    <td className="py-3 px-4 font-mono text-[#4b5563]">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-white border border-[#d1d5db] text-black">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 text-[9px] font-mono uppercase ${
                          u.status === 'ACTIVE'
                            ? 'bg-[#f3f4f6] border border-[#d1d5db] text-black'
                            : u.status === 'PENDING'
                            ? 'bg-black text-white'
                            : 'bg-[#9ca3af] text-white'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#6b7280]">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {/* If pending approval */}
                      {u.status === 'PENDING' && (
                        <button
                          onClick={() =>
                            setConfirmAction({
                              type: 'approve',
                              user: u,
                              newRole: 'SALES_OPERATOR',
                            })
                          }
                          className="px-2.5 py-1 text-[11px] font-bold uppercase bg-black text-white hover:bg-[#1f2937] rounded-none"
                        >
                          Approve Account
                        </button>
                      )}

                      {/* If Active */}
                      {u.status === 'ACTIVE' && (
                        <>
                          {/* Role Change Selector */}
                          <select
                            value={u.role}
                            onChange={(e) =>
                              setConfirmAction({
                                type: 'role',
                                user: u,
                                newRole: e.target.value as Role,
                              })
                            }
                            className="px-2 py-1 text-[11px] border border-[#d1d5db] bg-white font-mono rounded-none focus:outline-none focus:border-black"
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="SALES_OPERATOR">SALES_OPERATOR</option>
                            <option value="BOULDER_OPERATOR">BOULDER_OPERATOR</option>
                          </select>

                          {/* Disable Button */}
                          <button
                            onClick={() =>
                              setConfirmAction({
                                type: 'status',
                                user: u,
                                newStatus: 'DISABLED',
                              })
                            }
                            className="px-2 py-1 text-[11px] font-semibold border border-[#d1d5db] text-[#4b5563] hover:text-black bg-white hover:bg-[#f3f4f6] rounded-none"
                          >
                            Disable
                          </button>
                        </>
                      )}

                      {/* If Disabled */}
                      {u.status === 'DISABLED' && (
                        <button
                          onClick={() =>
                            setConfirmAction({
                              type: 'status',
                              user: u,
                              newStatus: 'ACTIVE',
                            })
                          }
                          className="px-2.5 py-1 text-[11px] font-semibold border border-black bg-white text-black hover:bg-[#f9fafb] rounded-none"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white border border-[#e5e7eb] max-w-sm w-full p-6 shadow-elevated rounded-none">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e7eb] mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-black flex items-center space-x-1.5">
                <Shield className="w-4 h-4 text-black" />
                <span>Confirm User Action</span>
              </h3>
              <button
                onClick={() => {
                  setConfirmAction(null);
                  setModalError(null);
                }}
                className="text-[#9ca3af] hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-2.5 border border-black bg-[#f3f4f6] text-black text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-3 mb-5">
              <div className="p-3 bg-[#f9fafb] border border-[#e5e7eb] text-xs font-mono">
                <div>User: {confirmAction.user.name}</div>
                <div>Email: {confirmAction.user.email}</div>
                <div>Current Role: {confirmAction.user.role}</div>
                <div>Current Status: {confirmAction.user.status}</div>
              </div>

              {confirmAction.type === 'approve' && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-black mb-1">
                    Assign Operational Role
                  </label>
                  <select
                    value={confirmAction.newRole}
                    onChange={(e) =>
                      setConfirmAction({
                        ...confirmAction,
                        newRole: e.target.value as Role,
                      })
                    }
                    className="w-full p-2 text-xs border border-[#d1d5db] bg-white font-mono rounded-none"
                  >
                    <option value="SALES_OPERATOR">SALES_OPERATOR</option>
                    <option value="BOULDER_OPERATOR">BOULDER_OPERATOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              )}

              {confirmAction.type === 'role' && (
                <p className="text-xs text-[#4b5563]">
                  Are you sure you want to change this operator's role to{' '}
                  <strong className="text-black font-mono">{confirmAction.newRole}</strong>?
                </p>
              )}

              {confirmAction.type === 'status' && (
                <p className="text-xs text-[#4b5563]">
                  Are you sure you want to update this account status to{' '}
                  <strong className="text-black font-mono">{confirmAction.newStatus}</strong>?
                  {confirmAction.newStatus === 'DISABLED' &&
                    ' All active sessions for this operator will be invalidated immediately.'}
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmAction(null);
                  setModalError(null);
                }}
                className="px-3 py-1.5 border border-[#d1d5db] text-xs font-semibold text-black hover:bg-[#f3f4f6]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPendingMut}
                onClick={handleExecuteAction}
                className="px-4 py-1.5 bg-black text-white text-xs font-bold uppercase hover:bg-[#1f2937] disabled:opacity-50"
              >
                {isPendingMut ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Worker Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white border border-[#e5e7eb] max-w-md w-full p-6 shadow-elevated rounded-none">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e7eb] mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-black flex items-center space-x-1.5">
                <UserPlus className="w-4 h-4 text-black" />
                <span>Provision New Worker / Operator</span>
              </h3>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setCreateError(null);
                }}
                className="text-[#9ca3af] hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-2.5 border border-black bg-[#f3f4f6] text-black text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setCreateError(null);
                createWorkerMutation.mutate(createForm);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[11px] font-semibold uppercase text-black mb-1">
                  Worker Name / Designation
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 text-xs border border-[#d1d5db] bg-white rounded-none focus:outline-none focus:border-black font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-black mb-1">
                  Work Email (Operator Login ID)
                </label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="operator.wb1@bms.local"
                  className="w-full px-3 py-2 text-xs border border-[#d1d5db] bg-white rounded-none focus:outline-none focus:border-black font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-black mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs border border-[#d1d5db] bg-white rounded-none focus:outline-none focus:border-black font-mono"
                />
                <p className="text-[10px] text-[#6b7280] font-mono mt-1">
                  Min 8 chars, at least 1 uppercase letter and 1 number (e.g. Operator@2026).
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-black mb-1">
                  Assigned Operational Role
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as Role })}
                  className="w-full px-3 py-2 text-xs border border-[#d1d5db] bg-white rounded-none focus:outline-none focus:border-black font-mono"
                >
                  <option value="SALES_OPERATOR">SALES_OPERATOR (Material Weighbridge, Billing, Sales)</option>
                  <option value="BOULDER_OPERATOR">BOULDER_OPERATOR (Raw Material Inward & Boulder Trips)</option>
                  <option value="ADMIN">ADMIN (Full System Administration & Financials)</option>
                </select>
                <p className="text-[10px] text-[#6b7280] font-mono mt-1">
                  Account is immediately active upon creation; worker can sign in right away.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#e5e7eb]">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setCreateError(null);
                  }}
                  className="px-3 py-1.5 border border-[#d1d5db] text-xs font-semibold text-black hover:bg-[#f3f4f6] rounded-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createWorkerMutation.isPending}
                  className="px-4 py-1.5 bg-black text-white text-xs font-bold uppercase hover:bg-[#1f2937] disabled:opacity-50 rounded-none shadow-subtle"
                >
                  {createWorkerMutation.isPending ? 'Provisioning...' : 'Create Worker Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
