import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_CONFIGS } from '../../data/mockUsers';
import type { WorkspaceTab, RolePrefix } from '../../types/auth';
import { 
  PlusCircle, 
  Search, 
  Network, 
  Microscope, 
  Scale, 
  History,
  ShieldCheck,
  Fingerprint,
  ChevronRight,
  Shield
} from 'lucide-react';

interface TabItem {
  id: WorkspaceTab;
  label: string;
  rolePrefix: RolePrefix;
  icon: React.ElementType;
}

const ALL_TABS: TabItem[] = [
  // PO Tabs (Police Officer Only)
  { id: 'police_case_upload', label: 'Upload Case File Details', rolePrefix: 'PO', icon: PlusCircle },
  { id: 'police_integrity', label: 'Evidence Integrity Check', rolePrefix: 'PO', icon: Fingerprint },
  { id: 'police_audit_trail', label: 'Cryptographic Audit History', rolePrefix: 'PO', icon: History },

  // FO Tabs (Forensic Officer Only)
  { id: 'forensic_lab_upload', label: 'Upload Forensic Report', rolePrefix: 'FO', icon: Microscope },
  { id: 'forensic_integrity', label: 'Evidence Integrity Check', rolePrefix: 'FO', icon: Fingerprint },

  // IN Tabs (Investigator Only)
  { id: 'investigator_case_search', label: 'Entity & Case Search', rolePrefix: 'IN', icon: Search },
  { id: 'investigator_integrity', label: 'Evidence Integrity Check', rolePrefix: 'IN', icon: Fingerprint },
  { id: 'investigator_graph', label: 'Evidence Relational Graph', rolePrefix: 'IN', icon: Network },

  // LW Tabs (Lawyer / Prosecutor Only - Read Only)
  { id: 'lawyer_read_vault', label: 'Read-Only Case Disclosure Vault', rolePrefix: 'LW', icon: Scale },
  { id: 'lawyer_integrity', label: 'Evidence Integrity Check', rolePrefix: 'LW', icon: Fingerprint },
  { id: 'lawyer_audit_trail', label: 'Cryptographic Audit History', rolePrefix: 'LW', icon: History }
];

export const Sidebar: React.FC = () => {
  const { user, activeTab, setActiveTab } = useAuth();

  if (!user) return null;

  const currentRoleCfg = ROLE_CONFIGS[user.prefix];
  const roleAccessibleTabs = ALL_TABS.filter(t => t.rolePrefix === user.prefix);

  return (
    <aside className="w-full md:w-64 shrink-0 bg-white rounded-3xl p-4.5 border border-slate-200/90 flex flex-col justify-between h-auto md:h-[calc(100vh-6rem)] md:sticky top-20 shadow-sm">
      
      <div className="space-y-5">
        
        {/* Active Officer Workspace Header Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 text-white shadow-md border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
              {user.prefix} WORKSPACE
            </span>
            <Shield className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white leading-snug">{currentRoleCfg.title}</h3>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{user.station}</p>
          </div>
        </div>

        {/* Dynamic Navigation Tabs */}
        <div className="space-y-1.5">
          <div className="px-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </div>
          {roleAccessibleTabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full px-3.5 py-3 rounded-2xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer group ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25 border border-blue-500/30'
                    : 'text-slate-700 hover:bg-slate-100/90 hover:text-slate-950 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <div className={`p-1.5 rounded-xl transition-colors ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900'
                  }`}>
                    <Icon className="w-4 h-4 shrink-0" />
                  </div>
                  <span className="truncate">{tab.label}</span>
                </div>
                {isSelected && (
                  <ChevronRight className="w-3.5 h-3.5 text-blue-200 shrink-0 ml-1" />
                )}
              </button>
            );
          })}
        </div>

      </div>

      {/* System Status Security Badge */}
      <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <span className="flex items-center gap-1.5 font-bold text-slate-700">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Security Seal Active
        </span>
        <span className="text-[9px] text-slate-400 font-semibold">v2.4</span>
      </div>

    </aside>
  );
};
