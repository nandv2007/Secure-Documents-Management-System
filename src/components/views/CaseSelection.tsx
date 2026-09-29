import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_CONFIGS } from '../../data/mockUsers';
import { ArrowRight, FolderKanban, PlusCircle, Search, X, UserCheck, CheckCircle2, ShieldLock, Layers, FileText, Lock, Sparkles } from 'lucide-react';
import { PersonCaseSearchModal } from './PersonCaseSearchModal';

export const CaseSelection: React.FC = () => {
  const { user, cases, openAssignedCase, addCaseToPortal, giveUpCase } = useAuth();
  const [caseNumber, setCaseNumber] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [showPersonSearchModal, setShowPersonSearchModal] = useState(false);

  if (!user) return null;

  const isLawyer = user.prefix === 'LW';
  const isForensicOfficer = user.prefix === 'FO';

  // For Lawyers: ONLY list cases currently handled by this lawyer!
  const myHandlingCases = Object.values(cases).filter(
    (caseRecord) => caseRecord.assignedLawyerId === user.id
  );
  
  // For Forensic Officers: ONLY list cases dispatched for forensic review by a Police Officer!
  const forensicDispatchedCases = Object.values(cases).filter(
    (caseRecord) => caseRecord.status === 'FORENSIC_REVIEW' && (user.assignedCaseIds.includes(caseRecord.caseId) || caseRecord.assignedOfficerIds.includes(user.id))
  );

  // For standard officers: list assigned cases
  const assignedCases = Object.values(cases).filter((caseRecord) =>
    user.assignedCaseIds.includes(caseRecord.caseId) || caseRecord.assignedOfficerIds.includes(user.id)
  );

  const displayedCases = isLawyer ? myHandlingCases : isForensicOfficer ? forensicDispatchedCases : assignedCases;

  const openCase = async (targetCaseId: string) => {
    setError('');
    setSuccessMsg('');
    const result = await openAssignedCase(targetCaseId);
    if (!result.success) {
      setError(result.message || 'Unable to open case.');
    }
  };

  const handleGiveUpCase = async (event: React.MouseEvent, targetCaseId: string) => {
    event.stopPropagation();
    setError('');
    setSuccessMsg('');
    const result = await giveUpCase(targetCaseId);
    if (result.success) {
      setSuccessMsg(result.message || `You have given up Case ${targetCaseId}.`);
    } else {
      setError(result.message || 'Failed to give up case.');
    }
  };

  const handleForensicSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!caseNumber.trim()) {
      setError('Enter the assigned case number for the forensic report.');
      return;
    }
    const result = await addCaseToPortal(caseNumber);
    if (!result.success) {
      setError(result.message || '');
    }
  };

  const handleAddCase = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccessMsg('');
    const result = await addCaseToPortal(caseNumber);
    if (!result.success) {
      setError(result.message || '');
    } else {
      setCaseNumber('');
      setShowCaseForm(false);
    }
  };

  return (
    <>
      <PersonCaseSearchModal 
        isOpen={showPersonSearchModal} 
        onClose={() => setShowPersonSearchModal(false)} 
      />

      <main className="min-h-[calc(100vh-4rem)] max-w-6xl mx-auto p-6 flex items-center">
        <section className="w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-8">
          
          {/* Top Header Banner */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border ${ROLE_CONFIGS[user.prefix].badgeColor}`}>
                  {user.id} ({user.prefix})
                </span>
                <span className="text-xs font-mono text-blue-700 font-bold uppercase tracking-wider">
                  {ROLE_CONFIGS[user.prefix].clearanceLevel}
                </span>
              </div>

              <h1 className="text-3xl font-black text-slate-900 tracking-wider">
                {isForensicOfficer ? 'Forensic Lab Portal' : isLawyer ? 'Lawyer Disclosure Portal' : 'Case Workspace Selection'}
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                {isForensicOfficer
                  ? 'Select or search a case dispatched to the Forensic Lab by a Police Officer to upload lab findings.'
                  : isLawyer
                  ? 'Access active court disclosure vaults assigned to your officer profile or claim an unassigned case.'
                  : 'Manage case files, evidence assets, digital signatures, and blockchain transaction receipts.'}
              </p>
            </div>

            {/* AI Person Search Banner Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPersonSearchModal(true)}
                className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-950 text-white border border-blue-700/50 shadow-md hover:shadow-xl transition-all cursor-pointer text-left space-y-1 group"
              >
                <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-cyan-300 uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" /> Entity & Case Search
                </div>
                <div className="text-xs font-black text-white group-hover:text-cyan-200 flex items-center gap-2">
                  Search Person → Find Cases <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              </button>

              <div className="shrink-0 rounded-2xl bg-purple-50 border border-purple-200 p-4 text-center min-w-[150px] shadow-2xs">
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-700">
                  {isLawyer ? 'Active Handling' : isForensicOfficer ? 'Lab Dispatches' : 'Authorized Cases'}
                </div>
                <div className="text-3xl leading-none mt-1 font-black text-purple-950">
                  {displayedCases.length}
                </div>
                <div className="text-[10px] text-purple-700 mt-1 font-mono">
                  {isLawyer ? 'Exclusive Vaults' : isForensicOfficer ? 'Ready for Report' : 'Portal Workspaces'}
                </div>
              </div>
            </div>
          </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-3 shadow-2xs">
            <ShieldLock className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="font-semibold leading-relaxed">{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-3 shadow-2xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="font-semibold">{successMsg}</div>
          </div>
        )}

        {/* FORENSIC OFFICER PORTAL */}
        {isForensicOfficer ? (
          <div className="space-y-6">
            <form onSubmit={handleForensicSubmit} className="space-y-3 p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider">Search Dispatched Case Number</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    value={caseNumber}
                    onChange={(event) => setCaseNumber(event.target.value)}
                    placeholder="e.g. CASE-102 or CASE-103"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>
                <button type="submit" className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all">
                  Open Case <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-slate-600 flex items-center gap-1 font-mono pt-1">
                <Lock className="w-3.5 h-3.5 text-amber-600" /> Only cases explicitly dispatched by a Police Officer to FORENSIC_REVIEW can be accessed.
              </p>
            </form>

            {forensicDispatchedCases.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-700 font-mono">Dispatched Cases Ready for Lab Report Upload</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {forensicDispatchedCases.map((c) => (
                    <div
                      key={c.caseId}
                      onClick={() => openCase(c.caseId)}
                      className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 transition-all cursor-pointer flex flex-col justify-between shadow-2xs group"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-emerald-800">{c.caseId}</span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 border border-emerald-300">
                            {c.status}
                          </span>
                        </div>
                        <h3 className="mt-2 text-sm font-bold text-slate-900 group-hover:text-emerald-950 transition-colors">{c.title}</h3>
                        <p className="mt-1 text-xs text-slate-500">{c.incidentLocation}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); openCase(c.caseId); }}
                        className="mt-4 text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer pt-3 border-t border-emerald-200"
                      >
                        Upload Lab Report <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs font-bold text-slate-700 font-mono">
                {isLawyer ? 'Active Case Disclosure Vaults' : 'Authorized Case Workspaces'}
              </div>
              <button 
                onClick={() => { setShowCaseForm(!showCaseForm); setError(''); setSuccessMsg(''); setCaseNumber(''); }} 
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                {showCaseForm ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                {showCaseForm ? 'Cancel' : user.prefix === 'PO' ? 'Create New Case' : 'Claim / Add Case Number'}
              </button>
            </div>

            {showCaseForm && (
              <form onSubmit={handleAddCase} className="p-5 rounded-2xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-purple-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    value={caseNumber} 
                    onChange={(event) => setCaseNumber(event.target.value)} 
                    placeholder="Enter case number, e.g. CASE-103" 
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-purple-200 text-slate-900 font-mono text-xs focus:outline-none focus:border-purple-600" 
                    required 
                  />
                </div>
                <button type="submit" className="px-6 py-3 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold cursor-pointer shadow-sm">
                  {user.prefix === 'PO' ? 'Create & Launch Case' : 'Claim Case Handling'}
                </button>
              </form>
            )}

            {displayedCases.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {displayedCases.map((caseRecord) => (
                  <div 
                    key={caseRecord.caseId} 
                    onClick={() => openCase(caseRecord.caseId)} 
                    className="p-6 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between shadow-2xs group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white border border-blue-100 flex items-center justify-center transition-all shrink-0">
                          <FolderKanban className="w-5 h-5" />
                        </div>
                        
                        {isLawyer ? (
                          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-purple-700 text-white flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5" /> LAWYER CLAIMED
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {caseRecord.status.replace('_', ' ')}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 text-xs font-mono font-bold text-blue-700">{caseRecord.caseId}</div>
                      <h2 className="mt-1 text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{caseRecord.title}</h2>
                      <p className="mt-1.5 text-xs text-slate-500">{caseRecord.incidentLocation}</p>

                      <div className="mt-3 flex items-center gap-3 text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-100">
                        <span className="flex items-center gap-1 text-slate-600">
                          <FileText className="w-3 h-3 text-blue-600" /> {caseRecord.uploadedFiles?.length || 0} Files
                        </span>
                        <span className="flex items-center gap-1 text-slate-600">
                          <Layers className="w-3 h-3 text-purple-600" /> {caseRecord.assignedOfficerIds?.length || 1} Officers
                        </span>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openCase(caseRecord.caseId); }}
                        className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1.5 cursor-pointer"
                      >
                        Open Workspace <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      {isLawyer && (
                        <button
                          onClick={(e) => handleGiveUpCase(e, caseRecord.caseId)}
                          className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold cursor-pointer transition-all shadow-2xs"
                          title="Relinquish lawyer custody of this case"
                        >
                          Give Up Case
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500 space-y-2 font-sans">
                <div className="font-bold text-slate-800 text-sm">No cases currently linked to your officer profile</div>
                <p className="text-slate-500 max-w-md mx-auto">
                  Use <strong>Create / Add Case Number</strong> above to launch or claim a case workspace.
                </p>
              </div>
            )}
          </div>
        )}

      </section>
    </main>
    </>
  );
};
