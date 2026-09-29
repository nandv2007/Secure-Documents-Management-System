export type OfficerRole = 'POLICE_OFFICER' | 'INVESTIGATOR' | 'FORENSIC_OFFICER' | 'LAWYER';

export type RolePrefix = 'PO' | 'IN' | 'FO' | 'LW';

export interface RoleConfig {
  role: OfficerRole;
  title: string;
  prefix: RolePrefix;
  clearanceLevel: string;
  badgeColor: string;
  accentBorder: string;
  iconName: string;
  description: string;
  allowedWorkspaces: WorkspaceTab[];
  primaryActions: string[];
}

export type WorkspaceTab = 
  | 'police_case_upload'
  | 'police_integrity'
  | 'police_audit_trail'
  | 'investigator_case_search'
  | 'investigator_integrity'
  | 'investigator_graph'
  | 'forensic_lab_upload'
  | 'forensic_integrity'
  | 'lawyer_read_vault'
  | 'lawyer_integrity'
  | 'lawyer_audit_trail';

export type CaseFileCategory =
  | 'CASE_REGISTRATION'
  | 'VICTIM_DETAILS'
  | 'ACCUSED_DETAILS'
  | 'WITNESSES'
  | 'CRIME_SCENE'
  | 'INITIAL_EVIDENCE'
  | 'COMMUNICATION_RECORDS'
  | 'FINANCIAL_RECORDS'
  | 'REPORTS'
  | 'LEGAL_DOCUMENTS'
  | 'INVESTIGATION_REPORTS'
  | 'STATEMENTS'
  | 'EVIDENCE'
  | 'DIGITAL_EVIDENCE'
  | 'CDR_ANALYSIS'
  | 'FINANCIAL_INVESTIGATION'
  | 'SUSPECT_ANALYSIS'
  | 'LOCATION_EVIDENCE'
  | 'SURVEILLANCE'
  | 'INVESTIGATION_FINDINGS'
  | 'COURT_SUBMISSION'
  | 'FORENSIC_LAB'
  | 'SEIZURE_MEMO';

export interface UserProfile {
  id: string; // e.g. PO-1042
  password: string;
  name: string;
  rankTitle: string;
  role: OfficerRole;
  prefix: RolePrefix;
  department: string;
  station: string;
  badgeNumber: string;
  clearance: string;
  assignedCaseIds: string[]; // List of authorized Case Numbers, e.g. ['CASE-102', 'CASE-104']
}

export interface UploadedCaseFile {
  fileId: string;
  fileName: string;
  fileSize?: string;
  fileType?: string; // e.g. 'application/pdf', 'image/png', 'text/plain'
  fileDataUrl?: string; // Base64 Data URL for real PDF / Image rendering
  uploadedByOfficerId: string;
  uploadedByOfficerName: string;
  uploadedByRole: OfficerRole;
  uploadTime: string;
  category: CaseFileCategory;
  sha256Hash: string;
  description: string;
  txHash?: string;
  blockNumber?: number;
  blockHash?: string;
  blockchainVerified?: boolean;
  digitalSignature?: string;
  signerPublicKey?: string;
  signatureTimestamp?: string;
  signatureVerified?: boolean;
  version?: string; // e.g. 'v1.0', 'v1.1', 'v2.0'
  versionNumber?: number; // e.g. 1.0, 1.1, 2.0
  parentFileId?: string | null;
  changeSummary?: string;
  isLatestVersion?: boolean;
}

export interface CaseRecord {
  caseId: string; // e.g. CASE-102
  title: string;
  incidentLocation: string;
  status: 'OPEN_INVESTIGATION' | 'FORENSIC_REVIEW' | 'COURT_READY';
  assignedOfficerIds: string[]; // List of authorized officer IDs
  assignedLawyerId?: string | null; // Unique assigned Lawyer ID (only 1 lawyer allowed per case)
  assignedLawyerName?: string | null; // Name of assigned Lawyer
  uploadedFiles: UploadedCaseFile[];
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  officerId: string;
  caseId: string;
  action: string;
  status: 'SUCCESS' | 'RESTRICTED' | 'WARNING';
  details: string;
}
