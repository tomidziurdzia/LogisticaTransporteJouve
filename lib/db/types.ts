export type AccountType =
  | "bank"
  | "cash"
  | "wallet"
  | "investment"
  | "checks"
  | "other";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  is_active: boolean;
  allow_negative: boolean;
  opening_balance: number;
  created_at: string;
  updated_at: string;
}

// --- Categories ---

export type TransactionType =
  | "income"
  | "expense"
  | "internal_transfer"
  | "adjustment";

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  created_at: string;
  updated_at: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}
