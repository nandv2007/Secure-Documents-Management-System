import React from 'react';
import type { UploadedCaseFile } from '../../types/auth';
import { GitCommit, ShieldCheck, Cpu, Clock, CheckCircle2 } from 'lucide-react';

interface VersionHistoryTimelineProps {
  currentFile: UploadedCaseFile;
  allCaseFiles: UploadedCaseFile[];
  onSelectVersion: (file: UploadedCaseFile) => void;
}

export const VersionHistoryTimeline: React.FC<VersionHistoryTimelineProps> = ({
  currentFile,
  allCaseFiles,
  onSelectVersion
}) => {
  // Find all files belonging to the same document lineage family
  const lineageRootId = currentFile.parentFileId || currentFile.fileId;

  const lineageFiles = allCaseFiles.filter(f => {
    if (f.fileId === currentFile.fileId) return true;
    if (f.parentFileId === currentFile.fileId) return true;
    if (f.fileId === currentFile.parentFileId) return true;
    if (currentFile.parentFileId && f.parentFileId === currentFile.parentFileId) return true;
    if (f.parentFileId === lineageRootId || f.fileId === lineageRootId) return true;
    // Fallback match on category & exact file name
    return f.category === currentFile.category && f.fileName === currentFile.fileName;
  });

  // Deduplicate by fileId
  const uniqueLineage = Array.from(new Map(lineageFiles.map(f => [f.fileId, f])).values());

  // Sort descending by version number (or upload time)
  uniqueLineage.sort((a, b) => (b.versionNumber || 1.0) - (a.versionNumber || 1.0));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <GitCommit className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Document Version Control & Lineage</h3>
        </div>
        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
          {uniqueLineage.length} {uniqueLineage.length === 1 ? 'REVISION' : 'REVISIONS'} TOTAL
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-indigo-500 before:via-purple-500 before:to-slate-300">
        {uniqueLineage.map((verFile) => {
          const isSelected = verFile.fileId === currentFile.fileId;
          const isLatest = verFile.isLatestVersion || uniqueLineage[0].fileId === verFile.fileId;
          const verTag = verFile.version || `v${(verFile.versionNumber || 1.0).toFixed(1)}`;

          return (
            <div key={verFile.fileId} className="relative group">
              {/* Timeline Node Icon */}
              <div
                className={`absolute -left-[23px] top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-200 ring-4 ring-indigo-100 text-white'
                    : isLatest
                    ? 'bg-emerald-500 border-emerald-200 text-white'
                    : 'bg-white border-slate-300 text-slate-400 group-hover:border-indigo-400'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : isLatest ? 'bg-white' : 'bg-slate-400'}`} />
              </div>

              {/* Version Card */}
              <div
                onClick={() => onSelectVersion(verFile)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-300 shadow-sm ring-1 ring-indigo-200'
                    : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-xs'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-mono font-bold ${
                      isLatest ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-100'
                    }`}>
                      {verTag}
                    </span>
                    {isLatest && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> LATEST VERSION
                      </span>
                    )}
                    {isSelected && !isLatest && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                        ACTIVE VIEW
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {verFile.uploadTime}
                  </span>
                </div>

                {/* Change Summary / Revision Note */}
                <div className="text-xs font-medium text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-2">
                  <strong className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">REVISION SUMMARY:</strong>
                  {verFile.changeSummary || 'Initial document upload and cryptographic hash seal.'}
                </div>

                {/* Officer & Hashes Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono text-slate-500 pt-1">
                  <div>
                    <span className="text-slate-400">Author:</span>{' '}
                    <strong className="text-slate-800">{verFile.uploadedByOfficerName} ({verFile.uploadedByOfficerId})</strong>
                  </div>
                  <div className="truncate">
                    <span className="text-purple-700 font-bold">SHA-256:</span>{' '}
                    <span className="text-slate-700">{verFile.sha256Hash.substring(0, 16)}...</span>
                  </div>
                </div>

                {/* Blockchain Proof Badge */}
                {verFile.txHash && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-purple-900 flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-purple-600" />
                      Tx: {verFile.txHash.substring(0, 18)}...
                    </span>
                    <span className="text-indigo-800 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> PKI SIGNED
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
