import { IAccount } from '@shared/interfaces/account.model';
import { ITag } from '@shared/interfaces/tag.model';

export interface IExpense {
  id: number;
  expenseDate: string;
  totalAmount: number;
  isMonths: boolean;
  isPayout: boolean;
  isDraft?: boolean;
  remainingMonths: number;
  totalMonths: number;
  debtAmount: number;
  paymentMethodId: string;
  cardType: string;
  cardIcon: string;
  method: string;
  backgroundColor: string;
  recipientName: string;
  showDetail: boolean;
  articles: IExpenseArticles[];
  tags?: ITag[];
  firstArticleName: string | null;
  shortName: string;
  cardNumber: string | null;
}

export interface IExpenseArticles {
  articleId: number;
  quantity: number;
  units: string;
  articleName: string;
  price: number;
  subtotal: number;
  onDiscount: boolean;
  categoryId: number;
  subcategoryId: number;
  categoryName?: string;
  subcategoryName?: string;
}

export interface IExpenseDateGroup {
  dateLabel: string;
  expenses: IExpense[];
}

export interface PaymentMethod {
  id: string;
  method: string;
  name: string;
}

export interface CreditCard {
  id: string;
  shortName: string;
  accountId: string;
  backgroundColor: string | null;
}

// Re-export ICategory from common.model for backward compatibility
export { ICategory as Category, ISubcategory } from '@shared/interfaces/common.model';

export interface ExpenseGroup {
  totalSum: number;
  groupLabel: string;
}

export interface IExpenseDTO {
  id?: number;
  expenseDate: string;
  totalAmount: number;
  isMonths: boolean;
  // null while cloning from a template, until the user picks a payment method
  isPayout: boolean | null;
  isDraft?: boolean;
  remainingMonths: number | null;
  totalMonths: number;
  debtAmount: number | null;
  paymentMethodId: string;
  recipientId: string;
  comment: string;
  articles: IExpenseArticles[];
  tagIds?: number[];
}

export interface PaymentDataDTO {
  paymentMethodName: string;
  paymentMethodId: string;
  accountId: string;
  totalAmount: number;
  regularExpenses:  number[];
  creditExpenses: CreditExpense[];
  paymentDate?: Date | string;
}


interface BaseExpense {
  id: number;
  expenseDate: string;
  totalAmount: string;
  recipientName: string;
}


export interface RegularExpense extends BaseExpense {
  isMonths?: false;
}

export interface CreditExpense extends BaseExpense {
  isMonths: true;
  isPayout: boolean;
  calculateAmount: number;
  remainingMonths: number;
  totalMonths: number;
  debtAmount: number;
}

export type ExpenseCreditRecord = RegularExpense | CreditExpense;


export interface StatementResponse {
  regularExpenses: RegularExpense[];
  creditExpenses: CreditExpense[];
}


export interface CreditCardDetails {
  id: string;
  totalAprox: string;
  totalAmount: string;
  name: string;
  cardType: string;
  method: string;
  backgroundColor: string;
  cardIcon: string;
  cardNumber: string;
  // A card starts unlinked; the statement page links it to an account
  account?: IAccount;
}
