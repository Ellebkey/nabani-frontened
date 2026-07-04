/**
 * Receipt Draft Models
 * Mirrors the backend receipt_drafts contract: a staged scan (items + match
 * candidates) that is verified, then confirmed into a draft expense.
 */

export type ReceiptDraftItemStatus = 'matched' | 'needs-review' | 'no-match' | 'new' | 'skipped';

export interface ReceiptDraftCandidate {
  articleId: number;
  concept: string;
  score: number;
}

export interface ReceiptDraftItem {
  name: string;
  unitPrice: number;
  quantity: number;
  barcode: string | null;
  sku: string | null;
  status: ReceiptDraftItemStatus;
  candidates: ReceiptDraftCandidate[];
  selectedArticleId: number | null;
  newArticle: { concept: string } | null;
  learnCode?: boolean;
  hasDiscount?: boolean;
  categoryId?: number | null;
  subcategoryId?: number | null;
}

export interface ReceiptDraftData {
  store: string | null;
  date: string | null;
  items: ReceiptDraftItem[];
  costcoMode?: boolean;
}

export interface ReceiptDraft {
  id: number;
  store: string | null;
  expenseDate: string | null;
  total: number;
  status: string;
  data: ReceiptDraftData;
}

export interface ReceiptDraftSummary {
  id: number;
  store: string | null;
  expenseDate: string | null;
  total: number;
  status: string;
  itemCount: number;
  verifiedItemCount?: number;
}

export interface CreateReceiptDraftItem {
  name: string;
  unitPrice: number;
  quantity?: number;
  barcode?: string | null;
  sku?: string | null;
}

export interface CreateReceiptDraftPayload {
  store?: string | null;
  date?: string | null;
  items: CreateReceiptDraftItem[];
}

export interface UpdateReceiptDraftPayload {
  store?: string | null;
  date?: string | null;
  items: ReceiptDraftItem[];
  costcoMode?: boolean;
}

export interface ConfirmReceiptDraftPayload {
  comment?: string;
}
