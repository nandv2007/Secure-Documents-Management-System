import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserProfile, WorkspaceTab, CaseRecord, RolePrefix, OfficerRole, CaseFileCategory, UploadedCaseFile } from '../types/auth';
import { INITIAL_USERS, INITIAL_CASES, ROLE_CONFIGS } from '../data/mockUsers';
import { api, setAuthToken, getAuthToken } from '../services/api';
import { pkiService } from '../services/pki';

export type LoginResultStatus = 
  | 'SUCCESS' 
  | 'NEW_OFFICER_REGISTRATION_REQUIRED' 
  | 'INVALID_PASSWORD';

interface AuthContextType {
  user: UserProfile | null;
  activeCaseId: string | null;
  setActiveCaseId: (caseId: string) => void;
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  
  login: (officerId: string, pass: string) => Promise<{ status: LoginResultStatus; message?: string }> | { status: LoginResultStatus; message?: string };
  openAssignedCase: (caseNumber: string) => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string };
  registerOfficer: (newOfficer: Omit<UserProfile, 'prefix' | 'badgeNumber' | 'clearance' | 'assignedCaseIds'>) => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string };
  addCaseToPortal: (caseNumber: string) => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string };
  giveUpCase: (caseId: string) => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string };
  logout: () => void;
  canAccess: (tab: WorkspaceTab) => boolean;

  // Case Repository API
  cases: Record<string, CaseRecord>;
  activeCase: CaseRecord | null;
  uploadFileToActiveCase: (file: File | null, fallbackFileName: string, category: CaseFileCategory, description: string, parentFileId?: string, changeSummary?: string, isMajorVersion?: boolean) => Promise<boolean>;
  sendCaseToForensic: (caseId: string) => Promise<{ success: boolean; message?: string }>;
  refreshData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Users Store
  const [users, setUsers] = useState<Record<string, UserProfile>>(() => {
    const savedUsers = localStorage.getItem('sipalms_users_v3');
    return savedUsers ? JSON.parse(savedUsers) : INITIAL_USERS;
  });

  // Cases Store
  const [cases, setCases] = useState<Record<string, CaseRecord>>(() => {
    const savedCases = localStorage.getItem('sipalms_cases_v3');
    return savedCases ? JSON.parse(savedCases) : INITIAL_CASES;
  });

  // Active Session State
  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedSession = localStorage.getItem('sipalms_user_v3');
    return savedSession ? JSON.parse(savedSession) : null;
  });

  const [activeCaseId, setActiveCaseId] = useState<string | null>(() => {
    const savedCaseId = localStorage.getItem('sipalms_case_id_v3');
    return savedCaseId || null;
  });

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('police_case_upload');

  // Sync Data with Backend Server
  const refreshData = useCallback(async () => {
    try {
      const serverCases = await api.getCases();
      if (serverCases) {
        setCases(serverCases);
      }
      if (getAuthToken()) {
        const { user: me } = await api.getMe();
        if (me) {
          setUser(me);
        }
      }
    } catch {
      // Backend unreachable, fallback to localStorage/mock data
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Persistence Sync (Local Fallback)
  useEffect(() => {
    localStorage.setItem('sipalms_users_v3', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('sipalms_cases_v3', JSON.stringify(cases));
  }, [cases]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('sipalms_user_v3', JSON.stringify(user));
    } else {
      localStorage.removeItem('sipalms_user_v3');
    }
  }, [user]);

  useEffect(() => {
    if (activeCaseId) {
      localStorage.setItem('sipalms_case_id_v3', activeCaseId);
    } else {
      localStorage.removeItem('sipalms_case_id_v3');
    }
  }, [activeCaseId]);

  // LOGIN ENGINE
  const login = async (officerId: string, pass: string) => {
    try {
      const res = await api.login(officerId, pass);
      if (res.status === 'SUCCESS' && res.user) {
        setUser(res.user);
        setActiveCaseId(null);
        setActiveTab(ROLE_CONFIGS[res.user.prefix].allowedWorkspaces[0]);
        await refreshData();
        return { status: 'SUCCESS' as LoginResultStatus };
      }
      return { status: res.status, message: res.message };
    } catch (err: any) {
      // Fallback local authentication if backend is offline
      const cleanId = officerId.trim().toUpperCase();
      const cleanPass = pass.trim();
      const existingOfficer = users[cleanId];

      if (!existingOfficer) {
        return {
          status: 'NEW_OFFICER_REGISTRATION_REQUIRED' as LoginResultStatus,
          message: `Officer ID "${cleanId}" is not registered in SI-PALMS. Please create an officer account below.`
        };
      }

      if (existingOfficer.password !== cleanPass) {
        return {
          status: 'INVALID_PASSWORD' as LoginResultStatus,
          message: `Incorrect password for Officer ID "${cleanId}".`
        };
      }

      setUser(existingOfficer);
      setActiveCaseId(null);
      setActiveTab(ROLE_CONFIGS[existingOfficer.prefix].allowedWorkspaces[0]);
      return { status: 'SUCCESS' as LoginResultStatus };
    }
  };

  const openAssignedCase = async (caseNumber: string) => {
    if (!user) return { success: false, message: 'Please sign in first.' };
    const cleanCaseId = caseNumber.trim().toUpperCase();

    try {
      const res = await api.openCase(cleanCaseId);
      if (res.success) {
        setActiveCaseId(cleanCaseId);
        await refreshData();
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err: any) {
      // Local fallback
      const targetCase = cases[cleanCaseId];
      if (!targetCase) {
        return { success: false, message: `Case Number "${cleanCaseId}" was not found.` };
      }

      if (user.prefix === 'LW') {
        if (targetCase.assignedLawyerId && targetCase.assignedLawyerId !== user.id) {
          const lawyerDisplay = targetCase.assignedLawyerName 
            ? `${targetCase.assignedLawyerName} (${targetCase.assignedLawyerId})` 
            : targetCase.assignedLawyerId;
          return {
            success: false,
            message: `Case ${cleanCaseId} is currently being handled by Lawyer ${lawyerDisplay}. You cannot view or access this case file.`
          };
        }

        if (!targetCase.assignedLawyerId) {
          const updatedCase: CaseRecord = {
            ...targetCase,
            assignedLawyerId: user.id,
            assignedLawyerName: user.name,
            assignedOfficerIds: Array.from(new Set([...targetCase.assignedOfficerIds, user.id]))
          };
          setCases(prev => ({ ...prev, [cleanCaseId]: updatedCase }));

          const updatedUser = {
            ...user,
            assignedCaseIds: Array.from(new Set([...user.assignedCaseIds, cleanCaseId]))
          };
          setUsers(prev => ({ ...prev, [user.id]: updatedUser }));
          setUser(updatedUser);
        }
      } else {
        const isOfficerAssignedToCase =
          user.assignedCaseIds.includes(cleanCaseId) || targetCase.assignedOfficerIds.includes(user.id);
        if (!isOfficerAssignedToCase) {
          return { success: false, message: `You are not authorized to access Case ${cleanCaseId}.` };
        }
      }

      setActiveCaseId(cleanCaseId);
      return { success: true };
    }
  };

  // NEW OFFICER ACCOUNT CREATION REGISTRATION
  const registerOfficer = async (
    newOfficerData: Omit<UserProfile, 'prefix' | 'badgeNumber' | 'clearance' | 'assignedCaseIds'>
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await api.register(newOfficerData);
      if (res.user) {
        setUser(res.user);
        setActiveCaseId(null);
        setActiveTab(ROLE_CONFIGS[res.user.prefix].allowedWorkspaces[0]);
        await refreshData();
        return { success: true };
      }
      return { success: false, message: 'Registration failed.' };
    } catch (err: any) {
      // Local fallback
      const cleanId = newOfficerData.id.trim().toUpperCase();
      const rolePrefixMap: Record<OfficerRole, RolePrefix> = {
        POLICE_OFFICER: 'PO',
        INVESTIGATOR: 'IN',
        FORENSIC_OFFICER: 'FO',
        LAWYER: 'LW'
      };

      const prefix = rolePrefixMap[newOfficerData.role] || 'PO';
      const existingOfficer = users[cleanId];
      const fullOfficerProfile: UserProfile = existingOfficer
        ? { ...existingOfficer }
        : {
            ...newOfficerData,
            id: cleanId,
            prefix,
            badgeNumber: `${prefix}-REG-${Math.floor(1000 + Math.random() * 9000)}`,
            clearance: ROLE_CONFIGS[prefix].clearanceLevel,
            assignedCaseIds: []
          };

      setUsers(prev => ({ ...prev, [cleanId]: fullOfficerProfile }));
      setUser(fullOfficerProfile);
      setActiveCaseId(null);
      setActiveTab(ROLE_CONFIGS[prefix].allowedWorkspaces[0]);
      return { success: true };
    }
  };

  const addCaseToPortal = async (caseNumber: string) => {
    if (!user) return { success: false, message: 'Please sign in first.' };
    const cleanCaseId = caseNumber.trim().toUpperCase();
    if (!cleanCaseId) return { success: false, message: 'Enter a case number.' };

    try {
      const res = await api.addCase(cleanCaseId);
      if (res.success) {
        setActiveCaseId(cleanCaseId);
        await refreshData();
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err: any) {
      // Local fallback
      const existingCase = cases[cleanCaseId];
      if (!existingCase && user.prefix !== 'PO') {
        return { success: false, message: `Case ${cleanCaseId} has not been created by a Police Officer yet.` };
      }

      if (user.prefix === 'LW' && existingCase) {
        if (existingCase.assignedLawyerId && existingCase.assignedLawyerId !== user.id) {
          const lawyerDisplay = existingCase.assignedLawyerName 
            ? `${existingCase.assignedLawyerName} (${existingCase.assignedLawyerId})` 
            : existingCase.assignedLawyerId;
          return {
            success: false,
            message: `Case ${cleanCaseId} is currently being handled by Lawyer ${lawyerDisplay}. You cannot view or access this case file.`
          };
        }
      }

      const caseRecord: CaseRecord = existingCase || {
        caseId: cleanCaseId,
        title: `Case Investigation File ${cleanCaseId}`,
        incidentLocation: 'Metro Division Precinct',
        status: 'OPEN_INVESTIGATION',
        assignedOfficerIds: [],
        uploadedFiles: []
      };

      const updatedCaseRecord: CaseRecord = {
        ...caseRecord,
        assignedOfficerIds: Array.from(new Set([...caseRecord.assignedOfficerIds, user.id])),
        ...(user.prefix === 'LW' ? {
          assignedLawyerId: user.id,
          assignedLawyerName: user.name
        } : {})
      };

      setCases(prev => ({ ...prev, [cleanCaseId]: updatedCaseRecord }));

      const updatedUser = {
        ...user,
        assignedCaseIds: Array.from(new Set([...user.assignedCaseIds, cleanCaseId]))
      };
      setUsers(prev => ({ ...prev, [user.id]: updatedUser }));
      setUser(updatedUser);
      setActiveCaseId(cleanCaseId);
      return { success: true };
    }
  };

  // RELINQUISH LAWYER CASE ASSIGNMENT
  const giveUpCase = async (caseId: string) => {
    if (!user) return { success: false, message: 'Please sign in first.' };
    if (user.prefix !== 'LW') return { success: false, message: 'Only lawyers can give up a case assignment.' };

    const cleanCaseId = caseId.trim().toUpperCase();

    try {
      const res = await api.relinquishCase(cleanCaseId);
      if (res.success) {
        if (activeCaseId === cleanCaseId) {
          setActiveCaseId(null);
        }
        await refreshData();
        return { success: true, message: res.message || `You have given up Case ${cleanCaseId}. It is now available for other lawyers.` };
      }
      return { success: false, message: res.message };
    } catch (err: any) {
      // Local fallback
      const targetCase = cases[cleanCaseId];

      if (!targetCase) {
        return { success: false, message: `Case ${cleanCaseId} was not found.` };
      }

      if (targetCase.assignedLawyerId !== user.id) {
        return { success: false, message: `You are not the assigned lawyer for Case ${cleanCaseId}.` };
      }

      const updatedCase: CaseRecord = {
        ...targetCase,
        assignedLawyerId: null,
        assignedLawyerName: null,
        assignedOfficerIds: targetCase.assignedOfficerIds.filter(id => id !== user.id)
      };

      setCases(prev => ({ ...prev, [cleanCaseId]: updatedCase }));

      const updatedUser = {
        ...user,
        assignedCaseIds: user.assignedCaseIds.filter(id => id !== cleanCaseId)
      };
      setUsers(prev => ({ ...prev, [user.id]: updatedUser }));
      setUser(updatedUser);

      if (activeCaseId === cleanCaseId) {
        setActiveCaseId(null);
      }

      return { success: true, message: `You have given up Case ${cleanCaseId}. It is now available for other lawyers.` };
    }
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setActiveCaseId(null);
  };

  const canAccess = (tab: WorkspaceTab): boolean => {
    if (!user) return false;
    const allowed = ROLE_CONFIGS[user.prefix].allowedWorkspaces;
    return allowed.includes(tab);
  };

  const activeCase = activeCaseId && cases[activeCaseId] ? cases[activeCaseId] : null;

  // UPLOAD FILE TO ACTIVE CASE
  const uploadFileToActiveCase = async (
    file: File | null,
    fallbackFileName: string,
    category: CaseFileCategory,
    description: string,
    parentFileId?: string,
    changeSummary?: string,
    isMajorVersion?: boolean
  ): Promise<boolean> => {
    if (!user || !activeCaseId || !cases[activeCaseId]) return false;

    const tempHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    let digitalSigHex = '';
    let pubKeyHex = '';

    try {
      const pkiResult = await pkiService.signDocumentHash(user.id, tempHash);
      digitalSigHex = pkiResult.signatureHex;
      pubKeyHex = pkiResult.publicKeyHex;
    } catch (e) {
      console.warn('PKI signature generation fallback:', e);
    }

    try {
      const res = await api.uploadFile(
        activeCaseId,
        file,
        fallbackFileName,
        category,
        description,
        digitalSigHex,
        pubKeyHex,
        parentFileId,
        changeSummary,
        isMajorVersion
      );
      if (res.success) {
        await refreshData();
        return true;
      }
      return false;
    } catch {
      // Local fallback
      if (user.prefix === 'LW') return false;
      if (user.prefix === 'FO' && category !== 'FORENSIC_LAB') return false;
      if (user.prefix === 'PO' && category === 'FORENSIC_LAB') return false;

      let versionStr = 'v1.0';
      let versionNum = 1.0;
      const finalSummary = changeSummary || (parentFileId ? 'Document revision update' : 'Initial document seal');

      const existingFiles = cases[activeCaseId].uploadedFiles;
      if (parentFileId) {
        const parentFile = existingFiles.find(f => f.fileId === parentFileId);
        if (parentFile) {
          const parentNum = parentFile.versionNumber || 1.0;
          if (isMajorVersion) {
            versionNum = Math.floor(parentNum) + 1.0;
          } else {
            versionNum = Math.round((parentNum + 0.1) * 10) / 10;
          }
          versionStr = `v${versionNum.toFixed(1)}`;
        }
      }

      const fileDataUrl = file ? await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Unable to read the selected file.'));
        reader.readAsDataURL(file);
      }) : undefined;

      const fileName = file?.name || fallbackFileName;
      const sha256Hash = tempHash;
      const blockNumber = 10429 + Math.floor(Math.random() * 50);
      const txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const blockHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      const newFile: UploadedCaseFile = {
        fileId: `FILE-${user.prefix}-${Math.floor(1000 + Math.random() * 9000)}`,
        fileName,
        fileSize: file ? `${(file.size / 1024).toFixed(1)} KB` : undefined,
        fileType: file?.type,
        fileDataUrl,
        uploadedByOfficerId: user.id,
        uploadedByOfficerName: user.name,
        uploadedByRole: user.role,
        uploadTime: new Date().toLocaleString() + ' IST',
        category,
        sha256Hash,
        description,
        txHash,
        blockNumber,
        blockHash,
        blockchainVerified: true,
        digitalSignature: digitalSigHex || `0x30440220${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        signerPublicKey: pubKeyHex || `0x04${Array.from({ length: 128 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        signatureTimestamp: new Date().toLocaleString() + ' IST',
        signatureVerified: true,
        version: versionStr,
        versionNumber: versionNum,
        parentFileId: parentFileId || null,
        changeSummary: finalSummary,
        isLatestVersion: true
      };

      setCases(prev => {
        const targetCase = prev[activeCaseId];
        if (!targetCase) return prev;

        const updatedFiles = targetCase.uploadedFiles.map(f => {
          if (parentFileId && (f.fileId === parentFileId || f.parentFileId === parentFileId)) {
            return { ...f, isLatestVersion: false };
          }
          return f;
        });

        return {
          ...prev,
          [activeCaseId]: {
            ...targetCase,
            uploadedFiles: [newFile, ...updatedFiles]
          }
        };
      });

      return true;
    }
  };

  const sendCaseToForensic = async (caseId: string) => {
    if (!user) return { success: false, message: 'Please sign in first.' };
    const cleanCaseId = caseId.trim().toUpperCase();

    try {
      const res = await api.sendCaseToForensic(cleanCaseId);
      if (res.success) {
        await refreshData();
        return { success: true, message: res.message };
      }
      return { success: false, message: res.message };
    } catch (err: any) {
      // Local fallback
      const targetCase = cases[cleanCaseId];
      if (!targetCase) {
        return { success: false, message: `Case ${cleanCaseId} was not found.` };
      }

      const updatedCase: CaseRecord = {
        ...targetCase,
        status: 'FORENSIC_REVIEW'
      };

      setCases(prev => ({ ...prev, [cleanCaseId]: updatedCase }));
      return { success: true, message: `Case ${cleanCaseId} sent to Forensic Lab.` };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      activeCaseId,
      setActiveCaseId,
      activeTab,
      setActiveTab,
      login,
      openAssignedCase,
      registerOfficer,
      addCaseToPortal,
      giveUpCase,
      logout,
      canAccess,
      cases,
      activeCase,
      uploadFileToActiveCase,
      sendCaseToForensic,
      refreshData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
