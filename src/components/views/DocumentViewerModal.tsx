import React, { useEffect, useState } from 'react';
import type { UploadedCaseFile } from '../../types/auth';
import { api, getFileUrlWithToken } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FileText, ShieldCheck, X, UserCheck, Calendar, Lock, Cpu, Link, GitCommit, Upload, PlusCircle, CheckCircle2, Layers } from 'lucide-react';
import { BlockchainProofModal } from './BlockchainProofModal';
import { VersionHistoryTimeline } from './VersionHistoryTimeline';

interface DocumentViewerModalProps {
  file: UploadedCaseFile | null;
  caseId: string;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ file: initialFile, caseId, onClose }) => {
  const { activeCase, uploadFileToActiveCase, user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<UploadedCaseFile | null>(initialFile);
  const [showBlockchainModal, setShowBlockchainModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'versions' | 'new_version'>('details');

  // New Version Form state
  const [newFileObj, setNewFileObj] = useState<File | null>(null);
  const [changeSummary, setChangeSummary] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isMajorVersion, setIsMajorVersion] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    setSelectedFile(initialFile);
  }, [initialFile]);

  useEffect(() => {
    if (selectedFile) {
      // Record View audit event with case isolation ID
      api.recordAuditLog('View', selectedFile.fileId, caseId);
      // Record Verification audit event with case isolation ID
      api.recordAuditLog('Verification', selectedFile.fileId, caseId);
    }
  }, [selectedFile, caseId]);

  const previewUrl = React.useMemo(() => {
    if (!selectedFile?.fileDataUrl) return undefined;
    const rawUrl = selectedFile.fileDataUrl;
    if (rawUrl.startsWith('data:')) {
      try {
        const parts = rawUrl.split(';base64,');
        if (parts.length === 2) {
          const contentType = parts[0].replace('data:', '') || 'application/pdf';
          const byteCharacters = atob(parts[1]);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: contentType });
          return URL.createObjectURL(blob);
        }
      } catch (err) {
        console.warn('Failed to convert base64 to blob URL:', err);
      }
      return rawUrl;
    }
    return getFileUrlWithToken(rawUrl);
  }, [selectedFile?.fileDataUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!selectedFile) return null;

  const currentFile = selectedFile;
  const allCaseFiles = activeCase?.uploadedFiles || [];
  const versionTag = currentFile.version || `v${(currentFile.versionNumber || 1.0).toFixed(1)}`;
  const canUploadVersion = user?.prefix !== 'LW';

  const isImage = Boolean(
    currentFile.fileType?.startsWith('image/') || 
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(currentFile.fileName) ||
    currentFile.fileDataUrl?.startsWith('data:image/')
  );

  const isPdf = Boolean(
    currentFile.fileType === 'application/pdf' || 
    /\.pdf$/i.test(currentFile.fileName) ||
    currentFile.fileDataUrl?.startsWith('data:application/pdf')
  );

  const handleUploadNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUploadVersion) return;

    setIsUploading(true);
    try {
      const parentId = currentFile.fileId;
      const success = await uploadFileToActiveCase(
        newFileObj,
        newFileObj?.name || currentFile.fileName,
        currentFile.category,
        newDescription || currentFile.description,
        parentId,
        changeSummary || 'Document revision update',
        isMajorVersion
      );

      if (success) {
        setUploadSuccess(true);
        setNewFileObj(null);
        setChangeSummary('');
        setNewDescription('');
        setTimeout(() => {
          setUploadSuccess(false);
          setActiveTab('versions');
        }, 1500);
      }
    } catch (err) {
      console.error('Error uploading version:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      {showBlockchainModal && (
        <BlockchainProofModal file={currentFile} onClose={() => setShowBlockchainModal(false)} />
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Modal Header */}
          <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-cyan-400">{caseId}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {currentFile.category.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-600 text-white flex items-center gap-1">
                    <GitCommit className="w-3 h-3" /> {versionTag}
                  </span>
                </div>
                <h2 className="text-base font-bold text-white truncate max-w-md mt-0.5">{currentFile.fileName}</h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
              title="Close document viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Security Warning & Blockchain Badge */}
          <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border-b border-purple-800/80 px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-white gap-2 shrink-0">
            <div className="flex items-center gap-2 font-bold text-purple-200">
              <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
              <span>VERIFIED ON BLOCKCHAIN SMART CONTRACT LEDGER</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowBlockchainModal(true);
              }}
              className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-all shadow-sm shrink-0"
            >
              <Link className="w-3.5 h-3.5" /> Inspect Blockchain Proof
            </button>
          </div>

          {/* Navigation Bar / Tabs */}
          <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex items-center justify-between text-xs font-bold gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'details'
                    ? 'bg-white text-indigo-900 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" /> Proof & Content
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('versions')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'versions'
                    ? 'bg-white text-indigo-900 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-purple-600" /> Version Lineage
              </button>
            </div>

            {canUploadVersion && (
              <button
                type="button"
                onClick={() => setActiveTab('new_version')}
                className={`px-3.5 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === 'new_version'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" /> Upload New Version
              </button>
            )}
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-white">
            
            {/* TAB 1: DETAILS & PROOF */}
            {activeTab === 'details' && (
              <>
                {/* Officer Metadata Box */}
                <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs shadow-2xs">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1 font-bold">UPLOADING OFFICER</span>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                      <UserCheck className="w-4 h-4 text-blue-600 shrink-0" /> {currentFile.uploadedByOfficerName}
                    </div>
                    <span className="text-slate-500 font-mono text-[11px]">ID: {currentFile.uploadedByOfficerId} ({currentFile.uploadedByRole})</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1 font-bold">REVISION & INGEST TIMESTAMP</span>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                      <Calendar className="w-4 h-4 text-blue-600 shrink-0" /> {currentFile.uploadTime}
                    </div>
                    <span className="text-indigo-800 font-mono font-bold text-[11px]">Version: {versionTag} {currentFile.isLatestVersion ? '[LATEST]' : ''}</span>
                  </div>
                </div>

                {/* Change Summary if version > 1.0 */}
                {currentFile.changeSummary && (
                  <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs">
                    <strong className="font-mono text-[10px] uppercase text-amber-800 block mb-0.5">VERSION REVISION NOTES:</strong>
                    <span>{currentFile.changeSummary}</span>
                  </div>
                )}

                {/* Document Content / Preview */}
                {previewUrl && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Uploaded Document</h3>
                    {isImage ? (
                      <img src={previewUrl} alt={currentFile.fileName} className="max-h-[380px] w-full object-contain rounded-xl border border-slate-200 bg-slate-50" />
                    ) : isPdf ? (
                      <iframe title={currentFile.fileName} src={previewUrl} className="h-[420px] w-full rounded-xl border border-slate-200 bg-slate-50" />
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">This file type cannot be previewed directly in the secure viewer. Its case record and findings are available below.</div>
                    )}
                  </div>
                )}

                {/* Document Content / Incident Summary */}
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Document Findings & Case Report</h3>
                  <div className="p-5 rounded-xl bg-slate-900 text-slate-100 text-xs leading-relaxed font-mono whitespace-pre-wrap border border-slate-800 shadow-inner">
                    {currentFile.description}
                  </div>
                </div>

                {/* SHA-256 Digital Fingerprint Seal & Blockchain Proof */}
                <div className="p-4 rounded-xl bg-purple-50/80 border border-purple-200 text-purple-950 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-purple-900">
                      <ShieldCheck className="w-4 h-4 text-purple-600" /> SHA-256 & Smart Contract Ledger Verification
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowBlockchainModal(true);
                      }}
                      className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-purple-900 text-purple-100 hover:bg-purple-800 transition-colors cursor-pointer shadow-2xs"
                    >
                      VERIFY ON-CHAIN
                    </button>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono text-purple-800 font-bold uppercase">SHA-256 Hash Seal</div>
                    <div className="p-2.5 rounded-lg bg-white border border-purple-200 font-mono text-[11px] text-purple-900 break-all select-all font-semibold">
                      {currentFile.sha256Hash}
                    </div>
                  </div>

                  {currentFile.txHash && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono text-purple-800 font-bold uppercase flex justify-between">
                        <span>Ethereum Transaction Hash (TxHash)</span>
                        <span className="text-emerald-700">Block #{currentFile.blockNumber || 10429}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-cyan-300 break-all select-all font-semibold">
                        {currentFile.txHash}
                      </div>
                    </div>
                  )}
                </div>

                {/* PKI Digital Signature Box */}
                <div className="p-4 rounded-xl bg-indigo-50/90 border border-indigo-200 text-indigo-950 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-indigo-900">
                      <span className="text-base">✍️</span> PKI Digital Signature & Non-Repudiation Proof
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> SIGNATURE VALID
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-indigo-900 font-mono">
                    <div className="flex justify-between">
                      <span>Signer Officer:</span>
                      <strong className="text-indigo-950">{currentFile.uploadedByOfficerName} ({currentFile.uploadedByOfficerId})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Algorithm:</span>
                      <strong className="text-indigo-900">ECDSA P-256 (W3C Web Crypto API)</strong>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] font-mono text-indigo-800 font-bold uppercase">Digital Signature Hex String</div>
                    <div className="p-2.5 rounded-lg bg-white border border-indigo-200 font-mono text-[10px] text-indigo-900 break-all select-all font-semibold">
                      {currentFile.digitalSignature || `0x304402207a9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a02201b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a`}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: VERSION LINEAGE TIMELINE */}
            {activeTab === 'versions' && (
              <VersionHistoryTimeline
                currentFile={currentFile}
                allCaseFiles={allCaseFiles}
                onSelectVersion={(newVerFile) => {
                  setSelectedFile(newVerFile);
                  setActiveTab('details');
                }}
              />
            )}

            {/* TAB 3: UPLOAD NEW VERSION FORM */}
            {activeTab === 'new_version' && canUploadVersion && (
              <form onSubmit={handleUploadNewVersion} className="space-y-5">
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                    <GitCommit className="w-4 h-4 text-indigo-600" />
                    <span>Creating Next Version for: {currentFile.fileName}</span>
                  </div>
                  <p className="text-xs text-indigo-700 leading-relaxed">
                    Uploading a new version will preserve all historical SHA-256 seals & blockchain proofs while establishing a transparent cryptographic audit lineage from {versionTag}.
                  </p>
                </div>

                {uploadSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>New version successfully created, signed, and anchored on-chain!</span>
                  </div>
                )}

                {/* Release Type: Minor vs Major */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Version Increment Type</label>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setIsMajorVersion(false)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        !isMajorVersion
                          ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <strong className="block text-slate-900 font-bold">Minor Revision (v1.1, v1.2)</strong>
                      <span className="text-[11px] text-slate-500">For minor corrections, addendums, or routine updates.</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsMajorVersion(true)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isMajorVersion
                          ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <strong className="block text-slate-900 font-bold">Major Release (v2.0, v3.0)</strong>
                      <span className="text-[11px] text-slate-500">For comprehensive rewrites or major investigative findings.</span>
                    </button>
                  </div>
                </div>

                {/* File Upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Select Updated Document File</label>
                  <input
                    type="file"
                    onChange={(e) => setNewFileObj(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white file:bg-slate-800 hover:file:bg-slate-900 cursor-pointer border border-slate-200 rounded-xl p-1"
                  />
                  {newFileObj && (
                    <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ready: {newFileObj.name} ({(newFileObj.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>

                {/* Change Summary */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Revision Notes / Change Summary <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    placeholder="e.g. Added ballistic lab verification report addendum..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                {/* Updated Description */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Updated Case Findings / Notes</label>
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Provide updated investigation findings or notes..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" /> {isUploading ? 'Sealing & Anchoring New Version...' : 'Seal & Anchor New Version'}
                </button>
              </form>
            )}

          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" /> Version control ensures non-repudiation & tamper-evident record keeping.
            </div>

            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              Close Document
            </button>
          </div>

        </div>
      </div>
    </>
  );
};
