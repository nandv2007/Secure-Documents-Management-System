import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_CONFIGS } from '../../data/mockUsers';
import { 
  Shield, 
  LogOut, 
  FolderKanban, 
  Search, 
  UserCheck, 
  ChevronDown, 
  LayoutDashboard
} from 'lucide-react';
import { PersonCaseSearchModal } from '../views/PersonCaseSearchModal';

export const AppHeader: React.FC = () => {
  const { user, activeCaseId, setActiveCaseId, openAssignedCase, logout } = useAuth();
  const [showPersonSearch, setShowPersonSearch] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowPersonSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!user) return null;

  const roleCfg = ROLE_CONFIGS[user.prefix];

  return (
    <>
      <PersonCaseSearchModal 
        isOpen={showPersonSearch} 
        onClose={() => setShowPersonSearch(false)} 
      />

      <header className="bg-slate-950 text-white sticky top-0 z-30 border-b border-slate-800/80 px-4 md:px-6 py-2.5 shadow-lg shadow-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Brand & Platform Identifier */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 border border-blue-400/30 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-white tracking-tight">SI-PALMS</span>
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60 uppercase">
                  SECURE VAULT
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Evidence Management & Chain of Custody</p>
            </div>
          </div>

          {/* Center Navigation & Active Case Selector */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 w-full md:w-auto">
            
            {/* Global Search Button */}
            <button
              onClick={() => setShowPersonSearch(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-inner group"
              title="Search entities, subjects, officer IDs or cases"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              <span>Entity & Case Search</span>
              <kbd className="hidden sm:inline-block text-[9px] font-mono bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800 ml-1">⌘K</kbd>
            </button>

            {/* Active Case Selector */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 shadow-inner">
              <FolderKanban className="w-4 h-4 text-cyan-400 shrink-0" />
              
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Active Case:</span>
                
                {user.prefix !== 'FO' && user.assignedCaseIds.length > 0 ? (
                  <div className="relative flex items-center">
                    <select
                      value={activeCaseId || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          openAssignedCase(e.target.value);
                        } else {
                          setActiveCaseId('');
                        }
                      }}
                      className="bg-slate-950 text-cyan-300 font-bold font-mono text-xs pl-2.5 pr-6 py-0.5 rounded-lg border border-slate-800 cursor-pointer focus:outline-none focus:border-cyan-500/50 hover:bg-slate-900 transition-colors appearance-none"
                    >
                      <option value="" className="text-slate-400 font-normal">Select Case...</option>
                      {user.assignedCaseIds.map(cId => (
                        <option key={cId} value={cId} className="bg-slate-900 text-cyan-200">{cId}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-cyan-400 absolute right-1.5 pointer-events-none" />
                  </div>
                ) : (
                  <span className="font-bold text-cyan-300 font-mono tracking-wide">
                    {activeCaseId || 'None'}
                  </span>
                )}

                {activeCaseId && (
                  <button
                    onClick={() => setActiveCaseId('')}
                    className="ml-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded-md border border-slate-700 cursor-pointer transition-colors font-semibold flex items-center gap-1 shadow-2xs"
                    title="Return to case selection dashboard"
                  >
                    <LayoutDashboard className="w-3 h-3 text-cyan-400" />
                    Dashboard
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Authenticated Officer Badge & Logout */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-2.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 shrink-0">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <div className="text-right leading-tight">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-xs font-bold text-slate-100">{user.name}</span>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${roleCfg.badgeColor}`}>
                    {user.id}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {user.rankTitle} • <span className="text-cyan-400 font-semibold">{user.station}</span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800/80 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium"
              title="Logout session"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

        </div>
      </header>
    </>
  );
};
