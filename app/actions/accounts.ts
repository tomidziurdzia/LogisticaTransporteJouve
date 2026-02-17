"use server";

import { createClient } from "@/lib/supabase/server";
import type { Account, AccountType } from "@/lib/db/types";

export async function getAccounts(): Promise<Account[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Account[];
}

export async function createAccount(
  name: string,
  type: AccountType,
  openingBalance: number = 0,
  allowNegative: boolean = false
): Promise<Account> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      name,
      type,
      opening_balance: openingBalance,
      allow_negative: allowNegative,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Account;
}

export async function updateAccount(
  id: string,
  fields: {
    name?: string;
    type?: AccountType;
    opening_balance?: number;
    allow_negative?: boolean;
  }
): Promise<Account> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Account;
}

export async function deleteAccount(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").delete().eq("id", id);

  if (error) throw new Error(error.message);
}
