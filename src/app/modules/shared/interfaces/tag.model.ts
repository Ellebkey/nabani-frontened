export interface ITag {
  id: number;
  name: string;
  color: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ITagSummary {
  id: number;
  name: string;
  color: string;
  totalAmount: number;
  expenseCount: number;
  firstExpenseDate?: string | null;
  lastExpenseDate?: string | null;
}

export interface CreateTagDto {
  name: string;
  color: string;
  description?: string;
}

export interface UpdateTagDto {
  name?: string;
  color?: string;
  description?: string;
}

export interface TagFilterDto {
  searchText?: string;
  offset?: number;
  limit?: number;
  fetchAll?: boolean;
}

export interface TagSummaryFilterDto {
  startDate?: string;
  endDate?: string;
}

export interface TagListResponse {
  rows: ITag[];
  count: number;
}
