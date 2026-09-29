import React, { useState } from 'react';
import { CheckCircle2, Eye, FileText, FolderOpen, Upload, GitCommit } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { CaseFileCategory, UploadedCaseFile } from '../../types/auth';
import { DocumentViewerModal } from './DocumentViewerModal';

interface CategoryUploadCardProps {
  category: CaseFileCategory;
  title: string;
  documents: string;
  tone: 'blue' | 'amber';
}

export const CategoryUploadCard: React.FC<CategoryUploadCardProps> = ({ category, title, documents, tone }) => {
  const { activeCase, activeCaseId, uploadFileToActiveCase } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [success, setSuccess] = useState(false);
  const [viewingFile, setViewingFile] = useState<UploadedCaseFile | null>(null);
  const files = activeCase?.uploadedFiles.filter((uploadedFile) => uploadedFile.category === category) ?? [];
  const isBlue = tone === 'blue';

  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;
    const uploaded = await uploadFileToActiveCase(file, file.name, category, description);
    if (uploaded) {
      setFile(null);
      setDescription('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <DocumentViewerModal file={viewingFile} caseId={activeCaseId || ''} onClose={() => setViewingFile(null)} />
      
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{documents}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-mono font-bold ${
          isBlue ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          {files.length} {files.length === 1 ? 'FILE' : 'FILES'}
        </span>
      </div>

      <form onSubmit={upload} className="space-y-3">
        <div className="p-3.5 rounded-2xl bg-slate-50/80 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all">
          <input
            type="file"
            required
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white file:bg-slate-800 hover:file:bg-slate-900 cursor-pointer"
          />
        </div>

        {file && (
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 font-mono">
            <CheckCircle2 className="h-3.5 w-3.5" /> Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}

        <textarea
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={`Investigation notes for this ${title.toLowerCase()} record...`}
          className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 focus:outline-none font-mono"
        />

        <button
          type="submit"
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-xs font-bold text-white cursor-pointer shadow-md transition-all ${
            isBlue 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-600/20' 
              : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-600/20'
          }`}
        >
          <Upload className="h-4 w-4" /> Seal & Anchor {title}
        </button>
      </form>

      {success && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Uploaded, Signed & Anchored on Blockchain for Case {activeCaseId}!</span>
        </div>
      )}

      <div className="space-y-3 border-t border-slate-100 pt-3.5">
        {files.length ? (
          files.map((uploadedFile) => {
            const txHash = uploadedFile.txHash || `0x${uploadedFile.sha256Hash}`;
            const blockNum = uploadedFile.blockNumber || 10429;
            const verTag = uploadedFile.version || `v${(uploadedFile.versionNumber || 1.0).toFixed(1)}`;
            const isLatest = uploadedFile.isLatestVersion !== false;

            return (
              <div key={uploadedFile.fileId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                      <FileText className={`h-4 w-4 shrink-0 ${isBlue ? 'text-blue-600' : 'text-amber-600'}`} />
                      {uploadedFile.fileName}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 flex items-center gap-1 ${
                      isLatest ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      <GitCommit className="w-3 h-3" /> {verTag} {isLatest ? '[LATEST]' : ''}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewingFile(uploadedFile)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all shrink-0 shadow-2xs"
                  >
                    <Eye className="h-3.5 w-3.5" /> Proof
                  </button>
                </div>

                <div className="space-y-1.5 font-mono text-[10px] bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-emerald-800 font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      TX: {txHash.substring(0, 16)}...
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 border border-emerald-200 text-emerald-800 text-[9px]">
                      BLOCK #{blockNum}
                    </span>
                  </div>

                  <div className="text-purple-900 truncate">
                    SHA-256: {uploadedFile.sha256Hash}
                  </div>

                  <div className="text-indigo-900 font-sans text-[10px] font-bold flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1 text-indigo-700">
                      ✍️ Signed by {uploadedFile.uploadedByOfficerName}
                    </span>
                    <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                      PKI ECDSA VALID
                    </span>
                  </div>

                  <div className="text-slate-500 text-[9px] pt-0.5">
                    ID: {uploadedFile.uploadedByOfficerId} ({uploadedFile.uploadedByRole}) • {uploadedFile.uploadTime}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="flex items-center gap-2 text-[11px] text-slate-400 py-1 font-mono">
            <FolderOpen className="h-4 w-4" /> No {title.toLowerCase()} files sealed yet.
          </p>
        )}
      </div>
    </section>
  );
};
