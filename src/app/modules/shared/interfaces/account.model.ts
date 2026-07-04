import { MAGUEY_USER_COLORS } from '@shared/services/maguey-palette';
import { ChartData } from '@shared/interfaces/shared.model';

export interface IAccount {
  id: string;
  name: string;
  currentAmount: number;
  value: number;
  showSection: boolean;
  colorPalette: string;
  // Admin management fields
  isPrimary: boolean;
  disable: boolean;
  ownerId: string;
  // Sections aggregate (GET /accounts)
  sectionsCount?: number;
  sectionsTotal?: number;
}

export interface ITransferDTO {
  sourceAccountId: string;
  destinyAccountId: string;
  amount: number;
  movementType: string;
  movementDate: string;
  comment?: string;
}

export interface IAccounts {
  rows: IAccount[];
  graphics: ChartData;
}

export interface IAccountSection {
  id: string;
  name: string;
  comments: string;
  currentAmount: number;
  targetAmount?: number | null;
}

export interface ICreateAccountSection {
  accountId: string;
  name: string;
  targetAmount?: number | null;
  initialDeposit?: number;
  movementDate?: string;
}

export interface IUpdateAccountSectionDetails {
  name?: string;
  targetAmount?: number | null;
}

export interface IAccountSectionDTO {
  accountId: string;
  amount: number;
  movementType: string;
  movementDate: string;
}

// Account Management interfaces
export interface IAccountCreate {
  name: string;
  currentAmount: number;
  colorPalette: string;
}

export interface IAccountUpdate {
  name?: string;
  colorPalette?: string;
}


export interface AccountsResponse {
  rows: IAccount[];
  count: number;
}

export interface MonthlyTrendDto {
  months: string[];
  incomes: number[];
  expenses: number[];
}

export const DEFAULT_ACCOUNT_COLORS = [...MAGUEY_USER_COLORS];
