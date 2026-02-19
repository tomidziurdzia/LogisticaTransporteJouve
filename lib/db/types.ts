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

// --- Months / Periods ---

export interface Month {
  id: string;
  year: number;
  month: number;
  label: string;
  is_closed: boolean;
  created_at: string;
}

export interface OpeningBalance {
  id: string;
  month_id: string;
  account_id: string;
  amount: number;
  created_at: string;
}

// --- Transactions ---

export interface Transaction {
  id: string;
  month_id: string;
  date: string;
  type: TransactionType;
  description: string;
  category_id: string | null;
  subcategory_id: string | null;
  is_operational: boolean;
  accrual_month_id: string | null;
  row_order: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionAmount {
  id: string;
  transaction_id: string;
  account_id: string;
  amount: number;
  created_at: string;
}

export interface TransactionWithAmounts extends Transaction {
  transaction_amounts: TransactionAmount[];
}

export interface MonthData {
  month: Month;
  opening_balances: OpeningBalance[];
  transactions: TransactionWithAmounts[];
}

// --- Upload transactions (desde WhatsApp/n8n, pendientes de aprobar) ---

export type UploadTransactionStatus =
  | "pending"
  | "approved"
  | "cancelled"
  | "processed";

export interface UploadTransaction {
  id: string;
  created_at: string;
  date: string;
  type: "income" | "expense";
  amount: number;
  category_id: string | null;
  subcategory_id: string | null;
  tx_ref: string | null;
  status: UploadTransactionStatus;
  wa_id: string | null;
}
