import React, { useState } from 'react';
import { Microscope, CheckCircle2, ArrowRight, AlertCircle, Files } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { CaseFileCategory } from '../../types/auth';
import { CategoryUploadCard } from './CategoryUploadCard';
import { ForensicReportList } from './ForensicReportList';

const CATEGORIES: Array<{ category: CaseFileCategory; title: string; documents: string }> = [
  { category: 'CASE_REGISTRATION', title: 'Case Registration', documents: 'FIR, complaint, case number, date/time of registration, police station details' },
  { category: 'VICTIM_DETAILS', title: 'Victim Details', documents: 'Victim statement, victim information, medical examination request' },
  { category: 'ACCUSED_DETAILS', title: 'Accused Details', documents: 'Accused information, arrest memo, interrogation records' },
  { category: 'WITNESSES', title: 'Witnesses', documents: 'Witness statements, witness details, contact information' },
  { category: 'CRIME_SCENE', title: 'Crime Scene', documents: 'Crime scene photographs, videos, scene inspection report, rough sketch' },
  { category: 'INITIAL_EVIDENCE', title: 'Initial Evidence', documents: 'Seizure mahazar/panchnama, property seizure records, evidence lists' },
  { category: 'COMMUNICATION_RECORDS', title: 'Communication Records', documents: 'CDR, SMS records, call logs, relevant communication records' },
  { category: 'FINANCIAL_RECORDS', title: 'Financial Records', documents: 'Bank transaction records, suspicious transaction reports, payment records' },
  { category: 'REPORTS', title: 'Reports', documents: 'Police investigation reports, preliminary reports, daily case diary entries' },
  { category: 'LEGAL_DOCUMENTS', title: 'Legal Documents', documents: 'Search warrant, arrest warrant, notices, court orders received' },
];

export const PoliceCategoryUploadView: React.FC = () => {
  const { user, activeCaseId, activeCase, sendCaseToForensic } = useAuth();
  const [dispatchStatusMsg, setDispatchStatusMsg] = useState<string | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSentToForensic = activeCase?.status === 'FORENSIC_REVIEW';

  const handleSendToForensic = async () => {
    if (!activeCaseId) return;
    setLoading(true);
    setDispatchError(null);
    setDispatchStatusMsg(null);

    const res = await sendCaseToForensic(activeCaseId);
    setLoading(false);

    if (res.success) {
      setDispatchStatusMsg(res.message || `Case ${activeCaseId} sent to Forensic Lab successfully!`);
    } else {
      setDispatchError(res.message || 'Failed to dispatch case to Forensic Lab.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span>Case workspace</span>
            <span className="text-slate-300">/</span>
            <span className="text-cyan-600 font-extrabold">{activeCaseId}</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">{activeCase?.title || `Case ${activeCaseId}`}</h1>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Managing Officer: <span className="font-bold text-slate-800">{user?.name}</span>
        </div>
      </div>

      {/* Forensic Dispatch Action Banner */}
      <div className={`rounded-3xl border p-5 transition-all shadow-sm ${
        isSentToForensic 
          ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-emerald-300 text-emerald-950' 
          : 'bg-gradient-to-r from-amber-50/90 via-orange-50/80 to-amber-50/90 border-amber-300 text-amber-950'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isSentToForensic ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
            }`}>
              <Microscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Forensic review</h3>
                <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md ${
                  isSentToForensic 
                    ? 'bg-emerald-200 text-emerald-900 border border-emerald-300' 
                    : 'bg-amber-200 text-amber-900 border border-amber-300'
                }`}>
                  {activeCase?.status || 'OPEN_INVESTIGATION'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1.5 max-w-xl leading-relaxed">
                {isSentToForensic
                  ? 'Case files are available to the forensic team for review.'
                  : 'Share this case with the forensic team for review.'}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {isSentToForensic ? (
              <div className="px-5 py-3 rounded-2xl bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>Dispatched to Forensic Lab</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSendToForensic}
                disabled={loading}
                className="px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Dispatching Case...' : 'Send Case to Forensic Lab'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {dispatchStatusMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-xs font-bold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>{dispatchStatusMsg}</span>
          </div>
        )}

        {dispatchError && (
          <div className="mt-4 p-3 rounded-xl bg-red-100 border border-red-300 text-xs font-bold text-red-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-700" />
            <span>{dispatchError}</span>
          </div>
        )}
      </div>

      <ForensicReportList />

      {/* Category Upload Cards Grid */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 pt-1 text-sm font-semibold text-slate-800">
        <Files className="h-4 w-4 text-slate-500" /> Case documents
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CATEGORIES.map((cat) => (
          <CategoryUploadCard
            key={cat.category}
            category={cat.category}
            title={cat.title}
            documents={cat.documents}
            tone="blue"
          />
        ))}
      </div>
    </div>
  );
};
