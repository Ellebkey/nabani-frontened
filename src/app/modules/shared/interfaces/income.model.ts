export interface IIncome {
  id: number;
  totalAmount: number;
  incomeDate: string;
  comment: string;
  concept: string;
  accountId: string;
  accountName: string;
  accountColor?: string;
}

export interface IncomeDTO {
  totalAmount: number;
  incomeDate: string;
  concept: string;
  accountId: string;
  incomeTime?: string;
  comment?: string | null;
}

export interface IIncomeStats {
  currentMonth: number;
  monthlyAverage: number;
  currentYear: number;
}
