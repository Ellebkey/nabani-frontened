import { MAGUEY_USER_PALETTE } from '@shared/services/maguey-palette';
import { IAccount } from '@shared/interfaces/account.model';

export interface IPaymentMethod {
  id: string;
  shortName: string;
  method: string;
  cardType: string | null;
  backgroundColor: string | null;
  cardIcon: string | null;
  cardNumber: string | null;
  cardCVV: string | null;
  cardExpiry: string | null;
  creditLimit: number | null;
  cutOffDay: number | null;
  isActive: boolean;
  accountId: string;
  accountName?: string;
  account?: IAccount;
}

export interface IPaymentMethodCreate {
  shortName: string;
  method: string;
  cardType?: string;
  backgroundColor?: string;
  cardIcon?: string;
  cardNumber?: string;
  cardCVV?: string;
  cardExpiry?: string;
  creditLimit?: number;
  cutOffDay?: number;
  isActive?: boolean;
  accountId: string;
}

export interface IPaymentMethodUpdate extends IPaymentMethodCreate {
  id: string;
}

export interface PaymentMethodsResponse {
  rows: IPaymentMethod[];
  count: number;
}

// Payment Method Types - unified values used by both frontend and backend
export const PAYMENT_METHODS = {
  CREDIT_CARD: 'credit',
  DEBIT_CARD: 'debit',
  CASH: 'cash',
  BANK_TRANSFER: 'transfer',
  DIGITAL_WALLET: 'wallet'
} as const;

export type PaymentMethodType = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

// Card Types
export const CARD_TYPES = {
  VISA: 'visa',
  MASTERCARD: 'mastercard',
  AMEX: 'amex',
  DISCOVER: 'discover',
  JCB: 'jcb'
} as const;

export type CardType = typeof CARD_TYPES[keyof typeof CARD_TYPES];

// Premium gradient color options for cards
export interface CardGradient {
  name: string;
  gradient: string;
  primary: string;
  secondary: string;
}

export const CARD_GRADIENTS: CardGradient[] = MAGUEY_USER_PALETTE.map(({ name, hex }) => ({
  name,
  primary: hex,
  secondary: hex,
  gradient: `linear-gradient(135deg, color-mix(in srgb, ${hex} 82%, #fff) 0%, ${hex} 48%, color-mix(in srgb, ${hex} 68%, #000) 100%)`,
}));

// Card brand colors and icons
export const CARD_BRAND_STYLES = {
  visa: {
    colors: ['#1a1f71', '#ffffff'],
    icon: '💳'
  },
  mastercard: {
    colors: ['#eb001b', '#f79e1b'],
    icon: '💳'
  },
  amex: {
    colors: ['#006fcf', '#ffffff'],
    icon: '💳'
  },
  discover: {
    colors: ['#ff6000', '#ffffff'],
    icon: '💳'
  },
  jcb: {
    colors: ['#005da6', '#ffffff'],
    icon: '💳'
  }
} as const;

// Payment method icons
export const PAYMENT_METHOD_ICONS = {
  [PAYMENT_METHODS.CREDIT_CARD]: 'credit_card',
  [PAYMENT_METHODS.DEBIT_CARD]: 'payment',
  [PAYMENT_METHODS.CASH]: 'payments',
  [PAYMENT_METHODS.BANK_TRANSFER]: 'account_balance',
  [PAYMENT_METHODS.DIGITAL_WALLET]: 'account_balance_wallet'
} as const;

// Default payment method colors
export const DEFAULT_PAYMENT_METHOD_COLORS = CARD_GRADIENTS.map(g => g.primary);

// Form step types for multi-step modal
export interface FormStep {
  id: number;
  label: string;
  icon: string;
  completed: boolean;
}

export const FORM_STEPS: FormStep[] = [
  { id: 1, label: 'Basic Info', icon: 'info', completed: false },
  { id: 2, label: 'Card Details', icon: 'credit_card', completed: false },
  { id: 3, label: 'Customization', icon: 'palette', completed: false }
];
