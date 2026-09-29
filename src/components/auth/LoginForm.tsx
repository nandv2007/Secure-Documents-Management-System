import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { OfficerRole, RolePrefix } from '../../types/auth';
import { ROLE_CONFIGS } from '../../data/mockUsers';
import { Shield, ArrowRight, AlertCircle, Eye, EyeOff, UserPlus } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const { login, registerOfficer } = useAuth();
  
  // Active Form Mode: 'LOGIN' or 'REGISTER'
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login Form States
  const [officerId, setOfficerId] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register Form States
  const [regName, setRegName] = useState('');
  const [regId, setRegId] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regRole, setRegRole] = useState<OfficerRole>('POLICE_OFFICER');
  const regDept = 'Crime Operations';
  const regStation = 'Central Precinct No. 4';

  // Auto-detect prefix
  const prefixMatch = officerId.trim().match(/^(PO|IN|FO|LW)/i);
  const detectedPrefix = prefixMatch ? (prefixMatch[0].toUpperCase() as keyof typeof ROLE_CONFIGS) : null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!officerId.trim() || !password.trim()) {
      setError('Please enter your Officer ID and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(officerId, password);
      if (res.status === 'NEW_OFFICER_REGISTRATION_REQUIRED') {
        setRegId(officerId.toUpperCase());
        setRegPass(password);
        setMode('REGISTER');
        setNotice(res.message || 'Officer ID not registered. Create your officer account below.');
        setError('');
      } else if (res.status !== 'SUCCESS') {
        setError(res.message || 'Login failed. Please verify credentials.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!regName.trim() || !regId.trim() || !regPass.trim()) {
      setError('Please complete all required fields for officer registration.');
      return;
    }

    const rolePrefixMap: Record<OfficerRole, RolePrefix> = {
      POLICE_OFFICER: 'PO',
      INVESTIGATOR: 'IN',
      FORENSIC_OFFICER: 'FO',
      LAWYER: 'LW'
    };

    const prefix = rolePrefixMap[regRole] || 'PO';

    setIsSubmitting(true);
    try {
      const res = await registerOfficer({
        id: regId.toUpperCase(),
        password: regPass,
        name: regName,
        rankTitle: ROLE_CONFIGS[prefix]?.title || 'Officer',
        role: regRole,
        department: regDept,
        station: regStation
      });

      if (res && !res.success) {
        setError(res.message || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error creating officer account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
      
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main White Card Container */}
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6 relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="relative inline-block">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto text-white shadow-lg shadow-blue-600/30">
              <Shield className="w-9 h-9" />
            </div>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
          </div>

          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-slate-900 tracking-wider">SI-PALMS</h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                v2.0 PRO
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Secure Document & Blockchain Asset Portal</p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200">
          <button
            type="button"
            onClick={() => { setMode('LOGIN'); setError(''); setNotice(''); }}
            className={`flex-1 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer ${
              mode === 'LOGIN'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Officer Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('REGISTER'); setError(''); setNotice(''); }}
            className={`flex-1 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer ${
              mode === 'REGISTER'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Register Account
          </button>
        </div>

        {notice && (
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-2 text-xs text-blue-900">
            <UserPlus className="w-4 h-4 shrink-0 text-blue-600" />
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-900">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Officer ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={officerId}
                  onChange={(e) => setOfficerId(e.target.value)}
                  placeholder="e.g. PO-1042, IN-8805, FO-4091, LW-9120"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                  required
                />
                {detectedPrefix && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${ROLE_CONFIGS[detectedPrefix].badgeColor}`}>
                      {detectedPrefix}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter officer password..."
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isSubmitting ? 'Authenticating...' : 'Authenticate Session'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'REGISTER' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Officer Full Name</label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. Inspector Ramesh Shah"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Officer ID (PO-, IN-, FO-, LW-)</label>
              <input
                type="text"
                value={regId}
                onChange={(e) => setRegId(e.target.value)}
                placeholder="e.g. PO-9901, IN-4020, FO-5011, LW-2010"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={regPass}
                onChange={(e) => setRegPass(e.target.value)}
                placeholder="Set officer password..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Officer Role Clearance</label>
              <select
                value={regRole}
                onChange={(e) => setRegRole(e.target.value as OfficerRole)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs"
              >
                <option value="POLICE_OFFICER">Police Officer (PO) - Case Details Upload</option>
                <option value="FORENSIC_OFFICER">Forensic Officer (FO) - Lab Report Upload</option>
                <option value="INVESTIGATOR">Investigator (IN) - Open & View Evidence</option>
                <option value="LAWYER">Lawyer / Prosecutor (LW) - Read-Only Court Vault</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating Account...' : 'Create Account & Log In'}</span>
            </button>
          </form>
        )}

      </div>

    </div>
  );
};
