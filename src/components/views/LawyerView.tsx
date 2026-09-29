import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { UploadedCaseFile } from '../../types/auth';
import { DocumentViewerModal } from './DocumentViewerModal';
import { AuditTrailView } from './AuditTrailView';
import { FolderLock, FileText, Lock, Folder, AlertCircle, Eye, UserMinus, ShieldAlert } from 'lucide-react';

export const LawyerView: React.FC = () => {
  const { user, activeCaseId, activeCase, activeTab, giveUpCase } = useAuth();
  const [viewingFile, setViewingFile] = useState<UploadedCaseFile | null>(null);
  const [showConfirmGiveUp, setShowConfirmGiveUp] = useState(false);

  if (activeTab === 'lawyer_audit_trail') {
    return <AuditTrailView />;
  }

  const handleRelinquish = () => {
    if (activeCaseId) {
      giveUpCase(activeCaseId);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Modal Document Reader */}
      <DocumentViewerModal
        file={viewingFile}
        caseId={activeCaseId || 'CASE-102'}
        onClose={() => setViewingFile(null)}
      />

      {/* Confirmation Modal for Give Up Case */}
      {showConfirmGiveUp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <ShieldAlert className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Give Up Case {activeCaseId}?</h3>
                <p className="text-xs text-slate-500 font-mono">Relinquish Exclusive Lawyer Custody</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed bg-red-50 p-3.5 rounded-2xl border border-red-100 font-mono">
              Are you sure you want to give up custody of <strong className="text-slate-900">{activeCase?.title}</strong>? Once given up, another lawyer or prosecutor will be allowed to claim this case file.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmGiveUp(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRelinquish}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <UserMinus className="w-4 h-4" /> Yes, Give Up Case
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 bg-gradient-to-r from-purple-950 via-slate-900 to-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-purple-900 text-purple-200 border border-purple-800">
              LW PORTAL • ID: {user?.id}
            </span>
            <span className="text-xs font-mono text-purple-300 font-bold">CASE NO: {activeCaseId}</span>
          </div>
          <h1 className="text-2xl font-black tracking-wide">{activeCase?.title || `Case ${activeCaseId}`}</h1>
          <p className="text-xs text-slate-300 mt-1">Read-Only Court Disclosure Vault for assigned case {activeCaseId}. Inspect electronic evidence records on screen.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="px-3.5 py-2 rounded-2xl bg-slate-800 border border-slate-700 text-right font-mono">
            <div className="text-[9px] text-slate-400 uppercase">Clearance</div>
            <div className="text-xs font-bold text-purple-300">READ-ONLY COURT VAULT</div>
          </div>
          <button
            onClick={() => setShowConfirmGiveUp(true)}
            className="px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md"
            title="Relinquish access so another lawyer can take this case"
          >
            <UserMinus className="w-4 h-4" /> Give Up Case
          </button>
        </div>
      </div>

      {activeCase ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Read-Only Evidence Inspector */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div>
                  <span className="text-xs font-mono text-purple-700 font-bold">{activeCase.caseId}</span>
                  <h2 className="text-base font-bold text-slate-900">{activeCase.title}</h2>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> READ-ONLY VAULT
                </span>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Folder className="w-4 h-4 text-purple-600" /> Uploaded Case Records ({activeCase.uploadedFiles.length})
                </h3>

                {activeCase.uploadedFiles.length > 0 ? (
                  activeCase.uploadedFiles.map((file) => (
                    <div key={file.fileId} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-purple-600 shrink-0" /> {file.fileName}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-300">
                            {file.category}
                          </span>
                          <button
                            onClick={() => setViewingFile(file)}
                            className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5" /> Open Document
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed bg-white p-3 rounded-xl border border-slate-200 font-mono">
                        {file.description}
                      </p>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200 font-mono">
                        <span>Uploaded by: <strong className="text-purple-900">{file.uploadedByOfficerName} ({file.uploadedByOfficerId})</strong></span>
                        <span>{file.uploadTime}</span>
                      </div>
                      <div className="font-mono text-[9px] text-emerald-700 truncate">SHA-256 Seal: {file.sha256Hash}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-10 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center space-y-2 font-mono">
                    <Folder className="w-8 h-8 text-slate-400 mx-auto opacity-60" />
                    <div className="font-bold text-slate-800">No uploaded files for Case {activeCaseId} yet</div>
                    <p className="text-[11px]">When a Police Officer or Forensic Officer uploads a file for this case, it will appear here for court disclosure inspection.</p>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Right Column: Court Vault Information & Case Custody Controls */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5 font-mono">
                <FolderLock className="w-4 h-4 text-purple-600" /> Disclosure Controls
              </h2>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-purple-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">On-Screen Court Viewer</div>
                    <div className="text-[10px] text-slate-500 font-mono">Electronic Evidence Inspection</div>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-200 font-mono">
                  <div className="flex justify-between"><span>Case ID:</span> <strong className="text-blue-900">{activeCaseId}</strong></div>
                  <div className="flex justify-between"><span>Assigned Counsel:</span> <strong className="text-purple-800">{user?.name} ({user?.id})</strong></div>
                  <div className="flex justify-between"><span>Integrity Seal:</span> <strong className="text-emerald-700">IMMUTABLE (EVM)</strong></div>
                </div>
              </div>

              {/* Release Case Action Box */}
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3">
                <div className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                  <UserMinus className="w-4 h-4 text-red-600" /> Relinquish Case Custody
                </div>
                <p className="text-[11px] text-red-800 leading-relaxed font-mono">
                  Done reviewing this case? Give up custody of <strong>{activeCaseId}</strong> so another lawyer can take the case.
                </p>
                <button
                  type="button"
                  onClick={() => setShowConfirmGiveUp(true)}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserMinus className="w-4 h-4" /> Give Up Case
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-[11px] text-purple-900 leading-relaxed flex items-start gap-2.5 font-mono">
                <Lock className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                <span>As a Lawyer/Prosecutor, your access to Case {activeCaseId} is strictly read-only on screen. File downloads are restricted by security policy.</span>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center space-y-4 border border-slate-200 shadow-sm">
          <AlertCircle className="w-12 h-12 text-purple-600 mx-auto opacity-70" />
          <h2 className="text-lg font-bold text-slate-900">No Case Record Found for "{activeCaseId}"</h2>
        </div>
      )}

    </div>
  );
};
