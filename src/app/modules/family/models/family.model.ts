export interface IPartnershipMember {
  id: string;
  userId: string;
  role: 'owner' | 'partner';
  status: string;
  username?: string;
  fullname?: string | null;
  email?: string;
}

export interface IFamilyCategoryRef {
  categoryId: number;
  name: string;
  colorPalette?: string;
}

export type IExcludedCategory = IFamilyCategoryRef;

export interface IPartnership {
  id: string;
  name?: string;
  status: string;
  members: IPartnershipMember[];
  excludedCategories: IExcludedCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface IPartnershipInvite {
  id: string;
  partnershipId: string;
  inviteeEmail: string;
  status: string;
  expiresAt?: string;
  createdAt: string;
}

export interface IPartnershipInviteCreated extends IPartnershipInvite {
  token: string;
}

export interface ISharedCategorySpend {
  categoryId: number;
  categoryName: string;
  colorPalette?: string;
  total: number;
}

export interface ISharedSpending {
  rows: ISharedCategorySpend[];
  total: number;
}

export interface ISharedTicketItem {
  articleId: number;
  articleName: string;
  categoryId: number;
  categoryName: string;
  subtotal: number;
}

export interface ISharedTicket {
  expenseId: number;
  expenseDate: string;
  userId: string;
  recipientName: string;
  pendingSettlement?: boolean;
  items: ISharedTicketItem[];
  ticketTotal: number;
}

export interface IFamilyBudget {
  id: string;
  categoryId: number;
  categoryName?: string;
  amount: number;
  periodMonth: string;
  createdAt: string;
  updatedAt: string;
}

export interface IBudgetStatusRow {
  categoryId: number;
  categoryName: string;
  colorPalette?: string;
  budgeted: number;
  spent: number;
  remaining: number;
}

export interface IBudgetStatus {
  rows: IBudgetStatusRow[];
  totalBudgeted: number;
  totalSpent: number;
}

export interface IFamilyBudgetCreate {
  categoryId: number;
  amount: number;
  periodMonth: string;
}
