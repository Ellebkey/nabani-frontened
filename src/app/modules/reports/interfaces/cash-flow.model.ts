export interface SankeyNode {
  id: string;
  label: string;
  value: number;
  color?: string;
  categoryId?: number;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
}

export interface CashFlowQuery {
  startDate: string;
  endDate: string;
  tagIds?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface SubCategoryItem {
  x: string;  // subcategory name
  y: number;  // amount
  subcategoryId?: number;
}

export interface SubCategoryData {
  data: SubCategoryItem[];
}

export interface SelectedCategory {
  id: string;
  label: string;
  value: number;
  color: string;
  categoryId?: number;
}

export interface NodeClickEvent {
  type: 'total' | 'category';
  label: string;
  value: number;
  color: string;
  node?: SankeyNode;
}

export interface ExpenseItemByCategory {
  expenseId: number;
  articleId: number;
  expenseDate: string;
  recipientName: string;
  concept: string;
  categoryId: number;
  subcategoryId: number;
  categoryName: string;
  subcategoryName: string;
  subtotal: number;
  quantity: number;
  units: string;
  price: number;
}

export interface UpdateExpenseItemCategoryPayload {
  expenseId: number;
  articleId: number;
  categoryId: number;
  subcategoryId: number;
}

export interface ExpenseItemsByCategoryResponse {
  rows: ExpenseItemByCategory[];
  count: number;
  total: number;
}

export interface ExpenseItemsByCategoryQuery {
  startDate: string;
  endDate: string;
  categoryId: number;
  subcategoryId?: number;
  tagIds?: string;
  limit?: number;
  offset?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface CategoryComparisonQuery {
  startDate: string;
  endDate: string;
  categoryIds?: string;
  subcategoryIds?: string;
}

export interface ComparisonSubcategory {
  subcategoryId: number | null;
  subcategoryName: string;
  categoryId: number;
  categoryName: string;
  total: number;
}

export interface ComparisonExpense {
  id: number;
  expenseDate: string;
  recipientName: string;
  total: number;
}

export interface CategoryComparison {
  total: number;
  expenseCount: number;
  average: number;
  bySubcategory: ComparisonSubcategory[];
  expenses: ComparisonExpense[];
}

export interface CompareSelection {
  categoryIds: number[];
  subcategoryIds: number[];
}
