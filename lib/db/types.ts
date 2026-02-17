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
