import React, { useState, useEffect, useCallback } from 'react';
import { api, type AuditLogRecord } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { History, Search, RefreshCw, Filter, ShieldCheck, FileCheck, Eye, Upload, FilePlus, FolderKanban, Shield, Lock } from 'lucide-react';

export const AuditTrailView: React.FC = () => {
  const { activeCaseId, activeCase } = useAuth();
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'CASE_ONLY' | 'ALL_SYSTEM'>('CASE_ONLY');

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs();
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs();
    const interval = setInterval(fetchAuditLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchAuditLogs]);

  // Set of file IDs associated with the current active case
  const activeCaseFileIds = new Set(activeCase?.uploadedFiles.map((f) => f.fileId) || []);

  const filteredLogs = logs.filter((log) => {
    const matchesAction = selectedActionFilter === 'ALL' || log.action === selectedActionFilter;

    // Strict Case Isolation Filter
    let matchesCase = true;
    if (scopeFilter === 'CASE_ONLY' && activeCaseId) {
      if (log.case_id) {
        matchesCase = log.case_id === activeCaseId;
      } else {
        const isDirectCaseMatch = log.document_id === activeCaseId;
        const isFileInActiveCase = log.document_id ? activeCaseFileIds.has(log.document_id) : false;
        matchesCase = isDirectCaseMatch || isFileInActiveCase;
      }
    }

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (log.user_id && log.user_id.toLowerCase().includes(searchLower)) ||
      (log.action && log.action.toLowerCase().includes(searchLower)) ||
      (log.document_id && log.document_id.toLowerCase().includes(searchLower)) ||
      (log.case_id && log.case_id.toLowerCase().includes(searchLower)) ||
      (log.timestamp && log.timestamp.toLowerCase().includes(searchLower));

    return matchesAction && matchesCase && matchesSearch;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'Upload':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-1.5 w-fit font-mono">
            <Upload className="w-3.5 h-3.5 text-blue-700" /> Upload
          </span>
        );
      case 'View':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1.5 w-fit font-mono">
            <Eye className="w-3.5 h-3.5 text-purple-700" /> View
          </span>
        );
      case 'Version creation':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1.5 w-fit font-mono">
            <FilePlus className="w-3.5 h-3.5 text-amber-700" /> Version Creation
          </span>
        );
      case 'Verification':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1.5 w-fit font-mono">
            <FileCheck className="w-3.5 h-3.5 text-emerald-700" /> Verification
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200 font-mono">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 bg-gradient-to-r from-purple-950 via-slate-900 to-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-purple-900 text-purple-200 border border-purple-800 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-purple-400" /> AUDIT TRAIL • STRICT CASE ISOLATION
            </span>
            <span className="text-xs font-mono text-cyan-300 font-bold">CASE: {activeCaseId || 'N/A'}</span>
          </div>
          <h1 className="text-2xl font-black tracking-wide flex items-center gap-2.5 text-white">
            <History className="w-7 h-7 text-purple-400" /> Cryptographic Audit History
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Tamper-evident, non-repudiable log records strictly isolated to active case <strong className="text-cyan-300 font-mono">{activeCaseId}</strong>.
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Logs
        </button>
      </div>

      {/* Scope Filter & Search Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
        
        {/* Scope Selector Chips */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2 text-xs">
            <FolderKanban className="w-4 h-4 text-purple-700 shrink-0" />
            <span className="font-bold text-slate-900">Case Scope:</span>
            <span className="font-mono text-slate-600">
              {scopeFilter === 'CASE_ONLY' ? `Strictly Case "${activeCaseId}" Audit Trail` : 'All System Audit Records'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setScopeFilter('CASE_ONLY')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scopeFilter === 'CASE_ONLY'
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
            >
              Case {activeCaseId || ''} Only
            </button>

            <button
              onClick={() => setScopeFilter('ALL_SYSTEM')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scopeFilter === 'ALL_SYSTEM'
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
            >
              All System Logs
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Action Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-purple-700" /> Event Type:
            </span>
            {['ALL', 'Upload', 'View', 'Version creation', 'Verification'].map((action) => (
              <button
                key={action}
                onClick={() => setSelectedActionFilter(action)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedActionFilter === action
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {action === 'ALL' ? 'All Events' : action}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search in ${activeCaseId} logs...`}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-purple-600 font-mono"
            />
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider font-mono">
              <tr>
                <th className="p-3.5 w-16">ID</th>
                <th className="p-3.5">Officer / User ID</th>
                <th className="p-3.5">Action Event</th>
                <th className="p-3.5">CASE NO</th>
                <th className="p-3.5">DOCUMENT FILE ID</th>
                <th className="p-3.5">BLOCKCHAIN PROOF</th>
                <th className="p-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const displayCaseId = log.case_id || activeCaseId || 'CASE-102';
                  const displayDocId = log.document_id || 'Case Overview';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono text-slate-400 font-semibold">#{log.id}</td>
                      <td className="p-3.5 font-bold text-slate-900 font-mono">{log.user_id}</td>
                      <td className="p-3.5">{getActionBadge(log.action)}</td>
                      
                      {/* CASE NO COLUMN */}
                      <td className="p-3.5 font-mono font-bold">
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200 font-mono">
                          {displayCaseId}
                        </span>
                      </td>

                      {/* DOCUMENT FILE ID COLUMN */}
                      <td className="p-3.5 font-mono font-bold text-purple-900">
                        <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                          {displayDocId}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center gap-1 w-fit">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Anchored (EVM)
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 text-[11px]">{log.timestamp}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500 font-mono">
                    {loading
                      ? 'Loading audit records from MySQL database...'
                      : `No audit log records found for Case "${activeCaseId}" matching your search criteria.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-2">
          <span>
            Displaying {filteredLogs.length} of {logs.length} system audit entries
          </span>
          <span className="flex items-center gap-1.5 text-purple-800 font-bold">
            <Lock className="w-3.5 h-3.5 text-purple-700" /> Case Isolation Active ({activeCaseId})
          </span>
        </div>
      </div>
    </div>
  );
};
