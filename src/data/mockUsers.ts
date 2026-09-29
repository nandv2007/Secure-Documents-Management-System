import type { UserProfile, RolePrefix, RoleConfig, CaseRecord } from '../types/auth';

export const ROLE_CONFIGS: Record<RolePrefix, RoleConfig> = {
  PO: {
    role: 'POLICE_OFFICER',
    title: 'Police Officer',
    prefix: 'PO',
    clearanceLevel: 'Level 1 - Case Details & Evidence Upload Access',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    accentBorder: 'border-blue-500',
    iconName: 'Shield',
    description: 'Upload case file details & evidence anytime for assigned cases.',
    allowedWorkspaces: ['police_case_upload', 'police_integrity', 'police_audit_trail'],
    primaryActions: [
      'Upload New Case Details & Files',
      'Attach Incident Reports & Seizure Memos',
      'Manage Station Equipment Pools'
    ]
  },
  IN: {
    role: 'INVESTIGATOR',
    title: 'Investigator',
    prefix: 'IN',
    clearanceLevel: 'Level 2 - Case Evidence & Relational Intelligence',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    accentBorder: 'border-amber-500',
    iconName: 'Search',
    description: 'Open & view uploaded case files, traverse evidence graphs, and review officer custody histories.',
    allowedWorkspaces: ['investigator_case_search', 'investigator_integrity', 'investigator_graph'],
    primaryActions: [
      'Open & Inspect Uploaded Case Files',
      'Inspect Case Relational Link Graph',
      'Review Officer Custody Logs'
    ]
  },
  FO: {
    role: 'FORENSIC_OFFICER',
    title: 'Forensic Officer',
    prefix: 'FO',
    clearanceLevel: 'Level 3 - Forensic Lab Report Upload',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    accentBorder: 'border-emerald-500',
    iconName: 'Microscope',
    description: 'Upload completed forensic lab analysis reports for assigned cases.',
    allowedWorkspaces: ['forensic_lab_upload', 'forensic_integrity'],
    primaryActions: [
      'Upload Laboratory Analysis Reports'
    ]
  },
  LW: {
    role: 'LAWYER',
    title: 'Lawyer / Prosecutor',
    prefix: 'LW',
    clearanceLevel: 'Level 4 - Read-Only Court Evidence Disclosure Vault',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    accentBorder: 'border-purple-500',
    iconName: 'Scale',
    description: 'Strict Read-Only Vault. Open & view uploaded case documents for court disclosure. Cannot upload or edit files.',
    allowedWorkspaces: ['lawyer_read_vault', 'lawyer_integrity', 'lawyer_audit_trail'],
    primaryActions: [
      'Open & View Uploaded Case Documents',
      'Verify Cryptographic SHA-256 Seals',
      'Export Certified Court Disclosure PDF'
    ]
  }
};

export const INITIAL_CASES: Record<string, CaseRecord> = {
  'CASE-102': {
    caseId: 'CASE-102',
    title: 'State vs. Sector 14 High-Value Robbery Incident',
    incidentLocation: 'Sector 14 Financial Quarter',
    status: 'OPEN_INVESTIGATION',
    assignedOfficerIds: ['PO-1042', 'IN-8805', 'FO-4091', 'LW-9120'],
    assignedLawyerId: 'LW-9120',
    assignedLawyerName: 'Advocate Meera Deshmukh',
    uploadedFiles: [] // START CLEAN WITH ZERO PRE-FILLED FILES
  },
  'CASE-103': {
    caseId: 'CASE-103',
    title: 'Downtown Commercial Financial Fraud',
    incidentLocation: 'Metro Bank Tower #02',
    status: 'FORENSIC_REVIEW',
    assignedOfficerIds: ['PO-2055', 'IN-8805', 'FO-4091'],
    assignedLawyerId: null,
    assignedLawyerName: null,
    uploadedFiles: [] // START CLEAN WITH ZERO PRE-FILLED FILES
  },
  'CASE-104': {
    caseId: 'CASE-104',
    title: 'High-Tech Cyber Intrusion & Ransomware',
    incidentLocation: 'State Server Data Center',
    status: 'OPEN_INVESTIGATION',
    assignedOfficerIds: ['PO-1042', 'IN-8805'],
    assignedLawyerId: null,
    assignedLawyerName: null,
    uploadedFiles: [] // START CLEAN WITH ZERO PRE-FILLED FILES
  }
};

export const INITIAL_USERS: Record<string, UserProfile> = {
  'PO-1042': {
    id: 'PO-1042',
    password: 'police1042',
    name: 'Inspector Rajesh Kumar',
    rankTitle: 'Station Officer & Case Registrar',
    role: 'POLICE_OFFICER',
    prefix: 'PO',
    department: 'Armoury & Case Operations',
    station: 'Central Precinct No. 4',
    badgeNumber: 'PO-IND-8821',
    clearance: 'Level 1 - Case Details Upload',
    assignedCaseIds: ['CASE-102', 'CASE-104']
  },
  'PO-2055': {
    id: 'PO-2055',
    password: 'police2055',
    name: 'Officer Suresh Verma',
    rankTitle: 'Commercial Crime Officer',
    role: 'POLICE_OFFICER',
    prefix: 'PO',
    department: 'Financial Crime Taskforce',
    station: 'Metro Division #02',
    badgeNumber: 'PO-IND-2055',
    clearance: 'Level 1 - Case Details Upload',
    assignedCaseIds: ['CASE-103']
  },
  'IN-8805': {
    id: 'IN-8805',
    password: 'invest8805',
    name: 'Senior Det. Anita Sharma',
    rankTitle: 'Lead Case Investigator',
    role: 'INVESTIGATOR',
    prefix: 'IN',
    department: 'Special Crime Branch',
    station: 'District HQ Command',
    badgeNumber: 'IN-IND-3042',
    clearance: 'Level 2 - Case Evidence Intelligence',
    assignedCaseIds: ['CASE-102', 'CASE-103', 'CASE-104']
  },
  'FO-4091': {
    id: 'FO-4091',
    password: 'forensic4091',
    name: 'Dr. Vikramaditya Roy',
    rankTitle: 'Chief Forensic Specialist',
    role: 'FORENSIC_OFFICER',
    prefix: 'FO',
    department: 'Digital & Ballistics Forensic Lab',
    station: 'State Crime Lab Annex',
    badgeNumber: 'FO-IND-9102',
    clearance: 'Level 3 - Forensic Lab Upload',
    assignedCaseIds: ['CASE-102', 'CASE-103']
  },
  'LW-9120': {
    id: 'LW-9120',
    password: 'lawyer9120',
    name: 'Advocate Meera Deshmukh',
    rankTitle: 'Public Prosecutor',
    role: 'LAWYER',
    prefix: 'LW',
    department: 'State Legal Cell',
    station: 'High Court Directorate',
    badgeNumber: 'LW-IND-5011',
    clearance: 'Level 4 - Read-Only Court Vault',
    assignedCaseIds: ['CASE-102', 'CASE-103', 'CASE-104']
  }
};
