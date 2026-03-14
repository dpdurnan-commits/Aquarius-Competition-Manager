// Transaction types
export interface TransactionRecord {
  id?: number;
  date: string;
  time: string;
  till: string;
  type: string;
  member: string;
  player: string;
  competition: string;
  price: string;
  discount: string;
  subtotal: string;
  vat: string;
  total: string;
  sourceRowIndex: number;
  isComplete: boolean;
  isWinning?: boolean;
  winningCompetitionId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ImportResult {
  imported: number;
  errors: ImportError[];
}

export interface ImportError {
  record: TransactionRecord;
  message: string;
}

// Presentation Season types
export interface PresentationSeason {
  id: number;
  name: string;
  startYear: number;
  endYear: number;
  isActive: boolean;
  allCompetitionsAdded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSeasonDTO {
  name: string;
  startYear: number;
  endYear: number;
}

export interface UpdateSeasonDTO {
  name?: string;
  startYear?: number;
  endYear?: number;
  isActive?: boolean;
  allCompetitionsAdded?: boolean;
}

// Competition types
export interface Competition {
  id: number;
  name: string;
  date: string;
  type: 'singles' | 'doubles';
  seasonId: number;
  description: string;
  prizeStructure: string;
  finished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompetitionDTO {
  name: string;
  date: string;
  type: 'singles' | 'doubles';
  seasonId: number;
  description?: string;
  prizeStructure?: string;
}

export interface UpdateCompetitionDTO {
  name?: string;
  date?: string;
  type?: 'singles' | 'doubles';
  seasonId?: number;
  description?: string;
  prizeStructure?: string;
  finished?: boolean;
}

export interface GetCompetitionsOptions {
  seasonId?: number;
  finished?: boolean;
}

export interface CompetitionWithResults extends Competition {
  results: CompetitionResult[];
}

// Competition Result types
export interface CompetitionResult {
  id: number;
  competitionId: number;
  finishingPosition: number;
  playerName: string;
  grossScore: number | null;
  handicap: number | null;
  nettScore: number | null;
  entryPaid: number;
  competitionRefund: number;
  swindleMoneyPaid: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateResultDTO {
  competitionId: number;
  finishingPosition: number;
  playerName: string;
  grossScore?: number;
  handicap?: number;
  nettScore?: number;
  entryPaid?: number;
  competitionRefund?: number;
  swindleMoneyPaid?: number;
}

export interface UpdateResultDTO {
  finishingPosition?: number;
  playerName?: string;
  grossScore?: number;
  handicap?: number;
  nettScore?: number;
  entryPaid?: number;
  competitionRefund?: number;
  swindleMoneyPaid?: number;
}

export interface BulkResultResponse {
  created: number;
  errors: ResultError[];
}

export interface ResultError {
  row: number;
  message: string;
  data: any;
}

export interface ReconciliationSummary {
  nameCorrections: number;
  dnpEntriesAdded: number;
  totalValueReconciled: number;
  errors: string[];
}

// CSV Parsing types
export interface SinglesRow {
  pos: string;
  name: string;
  gross: string;
  hcp: string;
  nett: string;
}

export interface DoublesRow {
  pos: string;
  name: string;
  nett: string;
}

export interface ParsedResult<T> {
  valid: boolean;
  data: T[];
  errors: ParseError[];
}

export interface ParseError {
  row: number;
  field: string;
  message: string;
}

// Name Matching types
export interface NameMatchResult {
  found: boolean;
  result: CompetitionResult | null;
  confidence: 'exact' | 'variation' | 'none';
}

// Swindle Money types
export interface PopulateResult {
  success: boolean;
  resultId: number | null;
  message: string;
}

// Flagged transaction types
export interface FlaggedTransaction {
  id: number;
  transactionId: number;
  competitionId: number | null;
  flaggedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FlaggedTransactionWithDetails extends FlaggedTransaction {
  transaction: TransactionRecord;
}

// Summary types
export interface WeeklySummary {
  fromDate: string;
  toDate: string;
  startingPurse: number;
  purseApplicationTopUp: number;
  purseTillTopUp: number;
  competitionEntries: number;
  competitionRefunds: number;
  finalPurse: number;
  startingPot: number;
  winningsPaid: number;
  competitionCosts: number;
  finalPot: number;
}

// User types
export interface User {
  id: number;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDTO {
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
  };
}

// Validation types
export interface ValidationResult {
  valid: boolean;
  error?: string;
  earliestNew?: { date: string; time: string };
  latestExisting?: { date: string; time: string };
}

// Last week info types
export interface LastWeekInfo {
  startDate: string;  // Monday date in YYYY-MM-DD format
  endDate: string;    // Sunday date in YYYY-MM-DD format
  count: number;      // Number of transactions in the week
}

// Pagination types
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationMetadata {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

// Server configuration
export interface ServerConfig {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  corsOrigins: string[];
  nodeEnv: 'development' | 'production' | 'test';
  maxFileSize: number;
  dbPoolMin: number;
  dbPoolMax: number;
}

// Distribution types
export interface PresentationNightDistribution {
  id: number;
  seasonId: number;
  transactionId: number | null;
  totalAmount: number;
  transactionDate: string;
  isVoided: boolean;
  voidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DistributionAssignment {
  id: number;
  distributionId: number;
  competitionId: number;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDistributionDTO {
  seasonId: number;
  assignments: {
    competitionId: number;
    amount: number;
  }[];
  transactionDate: string;
}

export interface SeasonWinner {
  competitionId: number;
  competitionName: string;
  competitionDate: string;
  competitionType: 'singles' | 'doubles';
  winners: {
    resultId: number;
    playerName: string;
    finishingPosition: number;
  }[];
}

export interface DistributionWithAssignments extends PresentationNightDistribution {
  assignments: DistributionAssignment[];
}

export interface CompetitionCost {
  id: number;
  description: string;
  amount: number;
  transactionId: number | null;
  transactionDate: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompetitionCostDTO {
  description: string;
  amount: number;
  transactionDate?: string; // Optional, defaults to current date if not provided
}

export interface CompetitionCostSummary {
  costs: CompetitionCost[];
  total: number;
}
