import React, { useState, useEffect, useRef } from 'react';
import { api, type PersonRecord } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, 
  X, 
  User, 
  FileText, 
  ShieldCheck, 
  ArrowRight, 
  MapPin, 
  BadgeCheck, 
  FolderKanban,
  Users
} from 'lucide-react';

interface PersonCaseSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onSelectCase?: (caseId: string) => void;
}

export const PersonCaseSearchModal: React.FC<PersonCaseSearchModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  onSelectCase
}) => {
  const { openAssignedCase } = useAuth();
  const [query, setQuery] = useState(initialQuery);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);
  const [persons, setPersons] = useState<PersonRecord[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<PersonRecord | null>(null);
  const [error, setError] = useState('');
  const requestNumber = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      if (initialQuery.trim()) fetchPersons(initialQuery);
      else { setPersons([]); setSelectedPerson(null); setError(''); }
    }
  }, [isOpen, initialQuery]);

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

  const handleOpenCaseWorkspace = async (caseId: string) => {
    if (onSelectCase) {
      onSelectCase(caseId);
    } else {
      await openAssignedCase(caseId);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-5xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-purple-950 text-white p-6 border-b border-slate-800 flex items-start justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-600/30 text-cyan-300 border border-blue-500/40 text-[10px] font-mono font-bold flex items-center gap-1.5 uppercase tracking-wider">
                Entity & Case Search
              </span>
            </div>
            <h2 className="text-xl font-black tracking-wide flex items-center gap-2">
              Search case records
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl font-sans">
              Search authorized personnel by name or ID, or case records by case number and evidence text.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Filters */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 space-y-4 shrink-0">
          <form onSubmit={handleSearchSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, officer ID, case number, or evidence keyword"
                className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 shadow-2xs"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); fetchPersons(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-mono flex items-center gap-2 cursor-pointer shadow-md transition-all shrink-0"
            >
              <Search className="w-4 h-4" /> Search
            </button>
          </form>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 font-mono uppercase">Filter Role:</span>
              {[
                { id: 'ALL', label: 'All results' },
                { id: 'OFFICIAL', label: 'Personnel' },
                { id: 'DOCUMENT', label: 'Document matches' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterCategory(f.id)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    filterCategory === f.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Content Body: Split View (List of Persons on Left, Detailed Case Involvement on Right) */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-[420px]">
          
          {/* Left Panel: Person Cards List */}
          <div className="w-full md:w-80 border-r border-slate-200 bg-white p-4 overflow-y-auto space-y-3 shrink-0">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500 uppercase px-1">
              <span>PERSONS FOUND ({filteredPersons.length})</span>
              {loading && <span className="text-blue-600 animate-pulse">Searching...</span>}
            </div>

            {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-800">{error}</p>}
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
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isOfficer ? 'bg-blue-600 text-white' : isSuspect ? 'bg-amber-600 text-white' : isWitness ? 'bg-emerald-600 text-white' : 'bg-purple-600 text-white'
                        }`}>
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 truncate">
                          <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">{person.name}</h4>
                          <p className="text-[10px] text-slate-500 font-mono truncate">{person.rankTitle}</p>
                        </div>
                      </div>

                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                        isOfficer
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : isSuspect
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      }`}>
                        {person.cases.length} CASE{person.cases.length === 1 ? '' : 'S'}
                      </span>
                    </div>

                    <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                      <span>ID: {person.id}</span>
                      <span className="font-bold text-slate-700">{person.badgeNumber}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2 font-mono">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p>{query ? `No matching records found for “${query}”.` : 'Search by name, ID, case number, or evidence keyword.'}</p>
              </div>
            )}
          </div>

          {/* Right Panel: Case Involvement Intelligence Details */}
          <div className="flex-1 bg-slate-50/50 p-6 overflow-y-auto space-y-6">
            {selectedPerson ? (
              <div className="space-y-6">
                
                {/* Person Profile Banner */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
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
                          <h3 className="text-lg font-black text-slate-900">{selectedPerson.name}</h3>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {selectedPerson.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-mono font-semibold">{selectedPerson.rankTitle}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-right">
                      <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-right">
                        <div className="text-[9px] font-mono uppercase text-purple-700 font-bold">Category</div>
                        <div className="text-xs font-bold text-purple-950 font-mono">{selectedPerson.category}</div>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-right">
                        <div className="text-[9px] font-mono uppercase text-blue-700 font-bold">Total Linked Cases</div>
                        <div className="text-xs font-bold text-blue-950 font-mono">{selectedPerson.totalCasesInvolved} Case(s)</div>
                      </div>
                    </div>
                  </div>

                  {/* Profile Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Department / Org</span>
                      <span className="font-bold text-slate-800">{selectedPerson.department}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Jurisdiction / Station</span>
                      <span className="font-bold text-slate-800">{selectedPerson.station}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Badge / Reference ID</span>
                      <span className="font-bold text-slate-800">{selectedPerson.badgeNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Cases Involved Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FolderKanban className="w-4 h-4 text-blue-600" />
                      Cases Involved In ({selectedPerson.cases.length})
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500">
                      Click any case card below to launch into the case workspace
                    </span>
                  </div>

                  {selectedPerson.cases.length > 0 ? (
                    <div className="space-y-4">
                      {selectedPerson.cases.map((c, idx) => (
                        <div
                          key={c.caseId + idx}
                          className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-4 group"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-blue-700">{c.caseId}</span>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  {c.status.replace('_', ' ')}
                                </span>
                              </div>
                              <h5 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors mt-0.5">
                                {c.title}
                              </h5>
                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {c.incidentLocation}
                              </p>
                            </div>

                            <button
                              onClick={() => handleOpenCaseWorkspace(c.caseId)}
                              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs font-mono flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                            >
                              Open Case Workspace <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Specific Person Role in this Case */}
                          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-1">
                            <div className="text-[10px] font-mono font-bold uppercase text-amber-800 flex items-center gap-1.5">
                              <BadgeCheck className="w-4 h-4 text-amber-600" /> Role in Case: {c.roleInCase}
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
                                <FileText className="w-3.5 h-3.5 text-blue-600" /> Matching Case Evidence ({c.matchingFiles.length})
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {c.matchingFiles.map((file) => (
                                  <div key={file.fileId} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                                    <div className="font-bold text-slate-900 truncate flex items-center gap-1">
                                      <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                      <span className="truncate">{file.fileName}</span>
                                    </div>
                                    <p className="text-[10px] font-mono text-slate-500">Category: {file.category}</p>
                                    <p className="text-[11px] text-slate-600 line-clamp-2 italic">{file.description}</p>
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
                      No case records linked to this individual yet.
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-12 text-center text-slate-400 font-mono text-xs">
                Select a person from the list on the left to inspect case involvement details.
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-900 text-slate-400 px-6 py-3.5 border-t border-slate-800 flex items-center justify-between text-xs font-mono shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Cryptographic Chain-of-Custody & Cross-Case Entity Mapper</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-colors"
          >
            Close Copilot
          </button>
        </div>

      </div>
    </div>
  );
};
