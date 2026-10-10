// ============================================================
// COMMON / SHARED TYPES
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message?: string;
  data: {
    items?: T[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type Classification = 'GREEN' | 'YELLOW' | 'RED' | 'BLACK';
export type Verification = 'VERIFIED' | 'UNVERIFIED';
export type VoteStatus = 'PENDING' | 'DONE';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type VolunteerStatus = 'ACTIVE' | 'INACTIVE';
export type BoothStatus = 'NOT_STARTED' | 'VOTING_STARTED' | 'PROBLEM';

// ============================================================
// AUTH
// ============================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    user: AuthUser;
  };
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: UserStatus;
}

// ============================================================
// ASSEMBLY
// ============================================================

export interface Assembly {
  id: string;
  assemblyNumber?: number;
  number?: string | number;
  assemblyName?: string;
  name?: string;
  district: string;
  electionYear: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    booths: number;
    voters: number;
  };
}

// ============================================================
// BOOTH
// ============================================================

export interface Booth {
  id: string;
  boothNumber: number | string;
  boothName?: string;
  name?: string;
  village?: string;
  assemblyId: string;
  status: BoothStatus;
  createdAt: string;
  updatedAt: string;
  assembly?: Assembly;
  volunteer?: Volunteer | null;
  _count?: {
    voters: number;
  };
}

// ============================================================
// VOTER
// ============================================================

export interface Voter {
  id: string;
  epic: string;
  name: string;
  nameHindi?: string;
  fatherName?: string;
  fatherNameHindi?: string;
  motherName?: string;
  husbandName?: string;
  gender?: string;
  age?: number;
  dateOfBirth?: string;
  mobile?: string;
  houseNumber?: string;
  partNumber?: number | string;
  partSerial?: number | string;
  serialNumber?: number | string;
  pollingStationName?: string;
  assemblyId: string;
  boothId?: string;
  classification?: Classification;
  verification: Verification;
  voteStatus: VoteStatus;
  createdAt: string;
  updatedAt: string;
  assembly?: Assembly;
  booth?: Booth;
  classificationHistory?: Array<{
    id: string;
    oldValue?: Classification | null;
    newValue: Classification;
    changedAt: string;
    changedBy?: { name: string } | null;
    changedByUser?: { name: string } | null;
  }>;
}

// ============================================================
// VOLUNTEER
// ============================================================

export interface Volunteer {
  id: string;
  name: string;
  mobile: string;
  status: VolunteerStatus;
  boothId?: string;
  createdAt: string;
  updatedAt: string;
  booth?: Booth | null;
}

// ============================================================
// USER
// ============================================================

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// ANALYTICS
// ============================================================

export interface OverviewAnalytics {
  selectedBooth?: {
    id: string;
    boothNumber: number | string;
    name?: string;
    village?: string;
    volunteer?: {
      id: string;
      name: string;
      mobile?: string;
      status?: string;
    } | null;
  } | null;
  analysis?: {
    greenStrength?: string;
    yellowOpportunity?: string;
    dataConfidence?: string;
  };
  totalVoters: number;
  verifiedVoters: number;
  unverifiedVoters: number;
  classifiedVoters: number;
  unclassifiedVoters: number;
  totalBooths: number;
  totalVolunteers: number;
  classification: {
    green: { count: number; percentage: number };
    yellow: { count: number; percentage: number };
    red: { count: number; percentage: number };
    black: { count: number; percentage: number };
    unclassified: { count: number; percentage: number };
  };
  verification: {
    verified: { count: number; percentage: number };
    unverified: { count: number; percentage: number };
  };
  booths: {
    total: number;
    strong: number;
    weak: number;
    opportunity: number;
    highConfidence: number;
  };
}

export interface ClassificationAnalytics {
  totalVoters: number;
  classifiedVoters: number;
  unclassifiedVoters: number;
  green: { count: number; percentage: number };
  yellow: { count: number; percentage: number };
  red: { count: number; percentage: number };
  black: { count: number; percentage: number };
}

export interface VerificationAnalytics {
  totalVoters: number;
  verified: { count: number; percentage: number };
  unverified: { count: number; percentage: number };
}

export interface BoothAnalyticsRow {
  id: string;
  boothNumber: number;
  boothName: string;
  totalVoters: number;
  greenPercent: number;
  yellowPercent: number;
  redPercent: number;
  blackPercent: number;
  unclassifiedPercent: number;
  verifiedPercent: number;
  strength?: string;
  opportunity?: string;
  confidence?: string;
}

export interface SingleBoothAnalytics {
  booth: Booth;
  totalVoters: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
  blackCount: number;
  unclassifiedCount: number;
  greenPercent: number;
  yellowPercent: number;
  redPercent: number;
  blackPercent: number;
  unclassifiedPercent: number;
  verifiedCount: number;
  unverifiedCount: number;
  verifiedPercent: number;
  strength: string;
  opportunity: string;
  confidence: string;
}

// ============================================================
// CLASSIFICATION
// ============================================================

export interface ClassificationSummary {
  totalVoters: number;
  classifiedVoters: number;
  unclassifiedVoters: number;
  green: { count: number; percentage: number };
  yellow: { count: number; percentage: number };
  red: { count: number; percentage: number };
  black: { count: number; percentage: number };
}

// ============================================================
// SETTINGS
// ============================================================

export interface SystemSettings {
  id: string;
  strongGreenPercent: number;
  moderateGreenPercent: number;
  highOpportunityYellow: number;
  mediumOpportunityYellow: number;
  highVerification: number;
  mediumVerification: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// IMPORT
// ============================================================

export interface ImportResult {
  totalRows: number;
  validRows: number;
  importedRows: number;
  duplicateRows: number;
  errorRows: number;
  newBoothsCreated?: number;
  errors?: ImportError[];
}

export interface ImportError {
  row: number;
  error: string;
  data?: Record<string, unknown>;
}

// ============================================================
// REPORTS
// ============================================================

export interface ReportSummary {
  assembly?: Assembly;
  totalVoters: number;
  classifiedVoters: number;
  unclassifiedVoters: number;
  verifiedVoters: number;
  unverifiedVoters: number;
  green: { count: number; percentage: number };
  yellow: { count: number; percentage: number };
  red: { count: number; percentage: number };
  black: { count: number; percentage: number };
  totalBooths: number;
  totalVolunteers: number;
}

// ============================================================
// VOTER FILTERS
// ============================================================

export interface VoterFilters {
  page?: number;
  limit?: number;
  search?: string;
  assemblyId?: string;
  boothId?: string;
  classification?: Classification | '';
  verification?: Verification | '';
  voteStatus?: VoteStatus | '';
  gender?: string;
  ageFrom?: number | '';
  ageTo?: number | '';
}

export interface BoothAnalysisFilters {
  page?: number;
  limit?: number;
  search?: string;
}

// ============================================================
// AUDIT LOGS
// ============================================================

export interface AuditLogUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuditLogVolunteer {
  id: string;
  name: string;
  mobile: string;
  status: string;
}

export interface AuditLogVoter {
  id: string;
  epic: string;
  name: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  userId?: string | null;
  volunteerId?: string | null;
  voterId?: string | null;
  user?: AuditLogUser | null;
  volunteer?: AuditLogVolunteer | null;
  voter?: AuditLogVoter | null;
  targetUser?: AuditLogUser | null;
  targetBooth?: { id: string; boothNumber: string | number; name?: string } | null;
  targetAssembly?: { id: string; name: string; code?: string } | null;
  createdAt: string;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  entity?: string;
  userId?: string;
  volunteerId?: string;
  voterId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AuditLogPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditLogsResponse {
  success: boolean;
  message?: string;
  data: AuditLog[];
  pagination: AuditLogPagination;
}
