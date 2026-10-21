import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { AuditLog } from '../../types';
import { ScrollText, Search, ShieldCheck } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const { data, isLoading, error } = useQuery<{ logs: AuditLog[]; totalCount: number }>({
    queryKey: ['auditLogsList', search, page, limit],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('limit', String(limit));
      return apiClient<{ logs: AuditLog[]; totalCount: number }>(`/audit-logs?${params.toString()}`);
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / limit)) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white border border-[#e5e7eb] shadow-card rounded-none">
        <div>
          <h2 className="text-base font-bold uppercase tracking-wider text-black flex items-center space-x-2">
            <ScrollText className="w-4 h-4 text-black" />
            <span>Immutable Audit Trails & Security Logs</span>
          </h2>
          <p className="text-xs text-[#6b7280] font-mono mt-0.5">
            Trace critical user authorizations, transactional ledger mutations, and security events
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search action, actor, entity..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black font-mono bg-white"
          />
          <Search className="w-3.5 h-3.5 text-[#9ca3af] absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-[#e5e7eb] shadow-card rounded-none overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-mono text-[#6b7280]">Loading audit logs...</div>
        ) : error ? (
          <div className="p-6 text-center text-xs font-mono text-black">
            Error loading audit trail: {(error as any).message}
          </div>
        ) : data?.logs.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-[#6b7280]">No audit events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f9fafb] border-b border-[#e5e7eb] text-[10px] uppercase font-mono text-[#6b7280]">
                <tr>
                  <th className="py-2.5 px-4">Timestamp (IST)</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Entity</th>
                  <th className="py-2.5 px-4">Metadata Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f4f6]">
                {data?.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#f9fafb]">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-[#4b5563]">
                      {new Date(log.timestamp).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-black">{log.actorEmail}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase border border-[#e5e7eb] bg-[#f9fafb] text-[#4b5563]">
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-black">{log.action}</td>
                    <td className="py-2.5 px-4 font-mono text-[#6b7280]">
                      {log.entityType}
                      {log.entityId && (
                        <span className="text-[10px] text-[#9ca3af] block">
                          ID: {log.entityId.slice(0, 8)}...
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-[#4b5563]">
                      {log.metadata ? (
                        <div className="bg-[#f9fafb] p-1.5 border border-[#e5e7eb] max-w-xs truncate text-[10px]">
                          {JSON.stringify(log.metadata)}
                        </div>
                      ) : (
                        <span className="text-[#9ca3af]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {data && (
          <div className="p-3 border-t border-[#e5e7eb] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[#6b7280] bg-[#f9fafb]">
            <div className="flex items-center space-x-3">
              <span>
                Showing {data.totalCount === 0 ? 0 : (page - 1) * limit + 1} to{' '}
                {Math.min(page * limit, data.totalCount)} of {data.totalCount} audit entries
              </span>
              <span className="text-[#d1d5db]">|</span>
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] text-[#4b5563]">Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 text-xs border border-[#d1d5db] bg-white text-black font-mono focus:outline-none focus:border-black rounded-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(1)}
                className="px-2 py-1 border border-[#d1d5db] bg-white text-black text-[11px] disabled:opacity-40 hover:bg-[#f3f4f6]"
                title="First Page"
              >
                &laquo; First
              </button>
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 border border-[#d1d5db] bg-white text-black text-[11px] disabled:opacity-40 hover:bg-[#f3f4f6]"
              >
                Previous
              </button>

              <span className="px-3 py-1 font-semibold text-black bg-[#f3f4f6] border border-[#d1d5db]">
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 border border-[#d1d5db] bg-white text-black text-[11px] disabled:opacity-40 hover:bg-[#f3f4f6]"
              >
                Next
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                className="px-2 py-1 border border-[#d1d5db] bg-white text-black text-[11px] disabled:opacity-40 hover:bg-[#f3f4f6]"
                title="Last Page"
              >
                Last &raquo;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
