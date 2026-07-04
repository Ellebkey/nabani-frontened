export interface ITransaction {
  id: number;
  movementDate: string;
  amount: string;
  movementType: string;
  accountLatestAmount: number;
  expenseId: number;
  incomeId: number;
  accountName: string;
}
