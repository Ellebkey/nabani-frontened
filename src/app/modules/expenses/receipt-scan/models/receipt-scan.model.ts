/**
 * Receipt Scan Models
 * TypeScript interfaces for receipt scanning feature
 */

export interface ParsedReceiptItem {
  rawText: string;
  name: string;
  price: number;
  quantity: number;
  confidence: number;
}

export interface FuzzyMatchResult {
  articleId: number;
  concept: string;
  brand: string | null;
  barcode: string | null;
  score: number;
  matchedOn: 'concept' | 'brand' | 'barcode';
}

export interface ReceiptItemWithMatches extends ParsedReceiptItem {
  matches: FuzzyMatchResult[];
  bestMatch?: FuzzyMatchResult;
  status: 'matched' | 'needs-review' | 'no-match';
}

export interface ProcessedReceipt {
  items: ReceiptItemWithMatches[];
  total?: number;
  date?: string;
  rawText: string;
}

export interface CreateDraftExpenseDto {
  expenseDate: string;
  totalAmount: number;
  recipientId?: number;
  paymentMethodId?: string;
  items: DraftExpenseItem[];
  comment?: string;
}

export interface DraftExpenseItem {
  articleId?: number;
  newArticle?: {
    concept: string;
    barcode?: string;
    brand?: string;
  };
  quantity: number;
  price: number;
  subtotal: number;
  categoryId?: number;
  subcategoryId?: number;
}

export interface CompleteDraftDto {
  paymentMethodId: string;
  recipientId: number;
  expenseDate?: string;
  comment?: string;
  tagIds?: number[];
}

export interface ReviewableItem {
  ocrText: string;
  extractedName: string;
  extractedPrice: number;
  quantity: number;
  matchedArticle: FuzzyMatchResult | null;
  matchConfidence: number;
  alternativeMatches: FuzzyMatchResult[];
  status: 'matched' | 'needs-review' | 'no-match';
  categoryId?: number;
  subcategoryId?: number;
  // For new article creation
  isCreatingNew?: boolean;
  newArticleName?: string;
  newArticleBarcode?: string;
}
