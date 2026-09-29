import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Microscope, ShieldCheck, Upload, CheckCircle2 } from 'lucide-react';
import { ForensicReportList } from './ForensicReportList';

export const ForensicView: React.FC = () => {
  const { user, activeCaseId, activeCase, uploadFileToActiveCase } = useAuth();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportDescription, setReportDescription] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleForensicUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    const fileName = selectedFile.name;

    const success = await uploadFileToActiveCase(selectedFile, fileName, 'FORENSIC_LAB', reportDescription);
    if (success) {
      setUploadSuccess(`Forensic Analysis Report "${fileName}" successfully uploaded to Case ${activeCaseId}! SHA-256 seal bound.`);
      setSelectedFile(null);
      setReportDescription('');
      setTimeout(() => setUploadSuccess(null), 6000);
    }
  };

  return (
    <div className="space-y-6">

      {/* Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-800 text-emerald-200 border border-emerald-700">
              FO PORTAL • ID: {user?.id}
            </span>
            <span className="text-xs font-mono text-emerald-300 font-bold">CASE NO: {activeCaseId}</span>
          </div>
          <h1 className="text-2xl font-black tracking-wide">{activeCase?.title || `Case ${activeCaseId}`}</h1>
          <p className="text-xs text-slate-300 mt-1">Upload the completed forensic laboratory report for assigned case {activeCaseId}.</p>
        </div>

        <div className="px-3.5 py-2 rounded-2xl bg-slate-800 border border-slate-700 text-right font-mono">
          <div className="text-[9px] text-slate-400 uppercase">Clearance</div>
          <div className="text-xs font-bold text-emerald-400">FO LAB UPLOAD AUTHORIZED</div>
        </div>
      </div>

      {uploadSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-3 shadow-2xs">
          <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
          <span className="text-xs font-medium">{uploadSuccess}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Working Forensic File Upload */}
        <div className="lg:col-span-12 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Microscope className="w-5 h-5 text-emerald-600" /> Upload Forensic Report ({activeCaseId})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Attach laboratory evidence reports to active case file {activeCaseId}</p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                FO UPLOAD ACCESS
              </span>
            </div>

            <form onSubmit={handleForensicUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Active Case Number
                </label>
                <input
                  type="text"
                  value={activeCaseId || ''}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-emerald-900 font-mono text-xs font-bold opacity-90"
                />
              </div>

              {/* REAL FILE CHOOSER INPUT */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Lab Analysis Report File
                </label>
                <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-emerald-400 text-center space-y-2 hover:bg-emerald-50/50 transition-colors">
                  <Upload className="w-6 h-6 text-emerald-600 mx-auto" />
                  <div className="text-xs text-slate-700">
                    <input
                      type="file"
                      required
                      onChange={handleFileChange}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white file:bg-slate-700 hover:file:bg-slate-800 cursor-pointer"
                    />
                  </div>
                </div>
                {selectedFile && (
                  <p className="text-xs text-emerald-700 font-medium mt-1.5 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Selected File: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Forensic Findings & Case Summary
                </label>
                <textarea
                  rows={4}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Enter detailed laboratory analysis findings..."
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" /> Seal & Anchor Forensic Report
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Existing Reports List */}
      <ForensicReportList />
    </div>
  );
};
