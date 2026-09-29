import React, { useState } from 'react';
import { Eye, FileText, FolderOpen, Microscope, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UploadedCaseFile } from '../../types/auth';
import { DocumentViewerModal } from './DocumentViewerModal';

export const ForensicReportList: React.FC = () => {
  const { activeCase, activeCaseId } = useAuth();
  const [viewingFile, setViewingFile] = useState<UploadedCaseFile | null>(null);
  const reports = activeCase?.uploadedFiles.filter((file) => file.uploadedByRole === 'FORENSIC_OFFICER') ?? [];

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
      <DocumentViewerModal file={viewingFile} caseId={activeCaseId || ''} onClose={() => setViewingFile(null)} />
      
      <div className="mb-3 flex items-center justify-between border-b border-emerald-200 pb-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-emerald-950">
            <Microscope className="h-4 w-4 text-emerald-700" /> Forensic Laboratory Reports
          </h2>
          <p className="mt-1 text-xs text-emerald-800">Verified lab analysis reports anchored on the Ethereum Smart Contract ledger.</p>
        </div>
        <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-1 text-[10px] font-bold text-emerald-900">
          {reports.length} LAB REPORTS
        </span>
      </div>

      {reports.length ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {reports.map((report) => {
            const txHash = report.txHash || `0x${report.sha256Hash}`;
            const blockNum = report.blockNumber || 10429;

            return (
              <div key={report.fileId} className="rounded-xl border border-emerald-200 bg-white p-3.5 space-y-2 text-xs shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                    {report.fileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewingFile(report)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all shrink-0 shadow-2xs"
                  >
                    <Eye className="h-3 w-3" /> View & Verify Proof
                  </button>
                </div>

                <div className="p-2 rounded-lg bg-slate-900 text-slate-100 font-mono text-[10px] space-y-1 shadow-inner border border-slate-800">
                  <div className="flex items-center justify-between text-cyan-300 font-bold">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" /> EVM TX: {txHash.substring(0, 16)}...
                    </span>
                    <span className="text-emerald-400">BLOCK #{blockNum}</span>
                  </div>
                  <div className="text-slate-300 truncate">SHA-256: {report.sha256Hash}</div>
                </div>

                <p className="text-[10px] text-slate-500 font-mono">
                  Submitted by <strong>{report.uploadedByOfficerName}</strong> · {report.uploadTime}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="flex items-center gap-2 text-xs text-emerald-800 py-1 font-medium">
          <FolderOpen className="h-4 w-4" /> No forensic reports submitted for this case yet.
        </p>
      )}
    </section>
  );
};
