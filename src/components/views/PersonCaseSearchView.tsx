import React, { useState, useRef } from 'react';
import { api, type PersonRecord } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, 
  X, 
  User, 
  FileText, 
  ArrowRight, 
  MapPin, 
  BadgeCheck, 
  FolderKanban,
  Users,
  Filter
} from 'lucide-react';
import { DocumentViewerModal } from './DocumentViewerModal';
import type { UploadedCaseFile } from '../../types/auth';

export const PersonCaseSearchView: React.FC = () => {
  const { openAssignedCase, activeCaseId } = useAuth();
  const [query, setQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);
  const [persons, setPersons] = useState<PersonRecord[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<PersonRecord | null>(null);
  const [viewingFile, setViewingFile] = useState<UploadedCaseFile | null>(null);
  const [error, setError] = useState('');
  const requestNumber = useRef(0);

  const fetchPersons = async (searchTerm: string) => {
    const cleanTerm = searchTerm.trim();
    if (!cleanTerm) {
      setPersons([]); setSelectedPerson(null); setError('Enter a name, officer ID, case number, or evidence keyword.');
      return;
    }
    const currentRequest = ++requestNumber.current;
    setLoading(true);
    setError('');
    try {
      const res = await api.searchPersons(cleanTerm);
      if (currentRequest === requestNumber.current) {
        setPersons(res.results);
        setSelectedPerson(res.results[0] || null);
      }
    } catch (err) {
      if (currentRequest === requestNumber.current) setError(err instanceof Error ? err.message : 'Search failed. Check the server connection and try again.');
    } finally {
      if (currentRequest === requestNumber.current) setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPersons(query);
  };

  const filteredPersons = persons.filter((p) => {
    if (filterCategory === 'ALL') return true;
    if (filterCategory === 'OFFICIAL') return p.category === 'Official Personnel';
    if (filterCategory === 'DOCUMENT') return p.category === 'Document references';
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Modal viewer if viewing file directly */}
      <DocumentViewerModal 
        file={viewingFile} 
        caseId={activeCaseId || ''} 
        onClose={() => setViewingFile(null)} 
      />

      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-slate-950">Entity & Case Search</h1>
        <p className="mt-1 text-sm text-slate-500">Search personnel, subjects, and evidence across cases you are authorized to access.</p>
      </div>

      {/* Search Input & Filtering Control Panel */}
      <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, officer ID, case number, or evidence keyword"
              className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 transition-all shadow-2xs"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); fetchPersons(''); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-mono flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all shrink-0"
          >
            <Search className="w-4 h-4" /> Search
          </button>
        </form>

        {/* Filters & Quick Chips */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600 font-mono flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-600" /> Filter Role:
            </span>
            {[
              { id: 'ALL', label: 'All results' },
              { id: 'OFFICIAL', label: 'Personnel' },
              { id: 'DOCUMENT', label: 'Document matches' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterCategory(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterCategory === f.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* Main Results Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Person Directory List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-600 border-b border-slate-100 pb-2">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" /> SEARCH RESULTS ({filteredPersons.length})
              </span>
              {loading && <span className="text-blue-600 animate-pulse">Loading...</span>}
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
              {filteredPersons.length > 0 ? (
                filteredPersons.map((person) => {
                  const isSelected = selectedPerson?.id === person.id;
                  const isOfficer = person.category === 'Official Personnel';
                  const isSuspect = person.category.toLowerCase().includes('suspect') || person.role.toLowerCase().includes('accused');
                  const isWitness = person.category.toLowerCase().includes('witness');

                  return (
                    <div
                      key={person.id}
                      onClick={() => setSelectedPerson(person)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                          : 'bg-white border-slate-200 hover:bg-slate-50 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${
                            isOfficer ? 'bg-blue-600 text-white' : isSuspect ? 'bg-amber-600 text-white' : isWitness ? 'bg-emerald-600 text-white' : 'bg-purple-600 text-white'
                          }`}>
                            <User className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 truncate">{person.name}</h4>
                            <p className="text-xs text-slate-500 font-mono truncate">{person.rankTitle}</p>
                          </div>
                        </div>

                        <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full shrink-0 border ${
                          isOfficer
                            ? 'bg-blue-100 text-blue-900 border-blue-200'
                            : isSuspect
                            ? 'bg-amber-100 text-amber-950 border-amber-300'
                            : 'bg-emerald-100 text-emerald-950 border-emerald-300'
                        }`}>
                          {person.cases.length} CASE{person.cases.length === 1 ? '' : 'S'}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
                        <span>Badge / Ref: <strong className="text-slate-800">{person.badgeNumber}</strong></span>
                        <span className="text-blue-700 font-bold flex items-center gap-1">
                          View Cases <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 space-y-2 font-mono">
                  <Users className="w-10 h-10 text-slate-300 mx-auto" />
                  <p>No persons matched query "{query}".</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Case Involvement Details */}
        <div className="lg:col-span-7 space-y-6">
          {selectedPerson ? (
            <div className="space-y-6">
              
              {/* Profile Card Banner */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-md ${
                      selectedPerson.category === 'Official Personnel'
                        ? 'bg-blue-600'
                        : selectedPerson.category.toLowerCase().includes('suspect')
                        ? 'bg-amber-600'
                        : 'bg-emerald-600'
                    }`}>
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-slate-900">{selectedPerson.name}</h3>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {selectedPerson.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-mono font-bold">{selectedPerson.rankTitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="px-3.5 py-1.5 rounded-2xl bg-blue-50 border border-blue-200 text-right">
                      <div className="text-[10px] font-mono uppercase text-blue-700 font-bold">Total Cases Involved</div>
                      <div className="text-sm font-bold text-blue-950 font-mono">{selectedPerson.totalCasesInvolved} Case(s)</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Role / Category</span>
                    <span className="font-bold text-slate-800">{selectedPerson.category}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Department / Unit</span>
                    <span className="font-bold text-slate-800">{selectedPerson.department}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Badge / Reference</span>
                    <span className="font-bold text-slate-800">{selectedPerson.badgeNumber}</span>
                  </div>
                </div>
              </div>

              {/* Cases List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FolderKanban className="w-5 h-5 text-blue-600" />
                    Cases Involved In ({selectedPerson.cases.length})
                  </h3>
                </div>

                {selectedPerson.cases.length > 0 ? (
                  <div className="space-y-4">
                    {selectedPerson.cases.map((c, idx) => (
                      <div
                        key={c.caseId + idx}
                        className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-blue-700">{c.caseId}</span>
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                {c.status.replace('_', ' ')}
                              </span>
                            </div>
                            <h4 className="text-base font-bold text-slate-900 mt-0.5">{c.title}</h4>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" /> {c.incidentLocation}
                            </p>
                          </div>

                          <button
                            onClick={() => openAssignedCase(c.caseId)}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                          >
                            Open Case <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Person Role in Case */}
                        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                          <div className="text-[10px] font-mono font-bold uppercase text-amber-900 flex items-center gap-1.5">
                            <BadgeCheck className="w-4 h-4 text-amber-600" /> Direct Involvement: {c.roleInCase}
                          </div>
                          {c.matchReason && (
                            <p className="text-slate-700 font-sans text-xs leading-relaxed pl-5">
                              {c.matchReason}
                            </p>
                          )}
                        </div>

                        {/* Matching Evidence Files */}
                        {c.matchingFiles && c.matchingFiles.length > 0 && (
                          <div className="space-y-2 pt-1">
                            <div className="text-[11px] font-mono font-bold text-slate-500 uppercase flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-blue-600" /> Associated Evidence Records ({c.matchingFiles.length})
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {c.matchingFiles.map((file) => (
                                <div key={file.fileId} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                                      <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                      <span className="truncate">{file.fileName}</span>
                                    </span>
                                  </div>
                                  <p className="text-[10px] font-mono text-slate-500">Category: {file.category}</p>
                                  <p className="text-[11px] text-slate-600 line-clamp-2 italic bg-white p-2 rounded border border-slate-200">
                                    {file.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl p-8 text-center text-xs text-slate-500 border border-slate-200">
                    No active case files found for this individual.
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-400 font-mono text-xs border border-slate-200 shadow-sm">
                {query ? `No matching records found for “${query}”.` : 'Search by name, ID, case number, or evidence keyword.'}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
