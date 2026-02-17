"use server";

import { createClient } from "@/lib/supabase/server";
import type { TransactionType } from "@/lib/db/types";

export interface CreateTransactionInput {
  month_id: string;
  date: string;
  type: TransactionType;
  description: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  row_order?: number;
  amounts: { account_id: string; amount: number }[];
}

export async function createTransaction(
  input: CreateTransactionInput
): Promise<string> {
  const supabase = await createClient();

  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .insert({
      month_id: input.month_id,
      date: input.date,
      type: input.type,
      description: input.description,
      category_id: input.category_id ?? null,
      subcategory_id: input.subcategory_id ?? null,
      row_order: input.row_order ?? 0,
    })
    .select("id")
    .single();

  if (txErr) throw new Error(txErr.message);

  // Insert amounts (only non-zero)
  const nonZero = input.amounts.filter((a) => a.amount !== 0);
  if (nonZero.length > 0) {
    const rows = nonZero.map((a) => ({
      transaction_id: tx.id,
      account_id: a.account_id,
      amount: a.amount,
    }));

    const { error: amtErr } = await supabase
      .from("transaction_amounts")
      .insert(rows);

    if (amtErr) throw new Error(amtErr.message);
  }

  return tx.id;
}

export interface UpdateTransactionInput {
  id: string;
  date?: string;
  type?: TransactionType;
  description?: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  row_order?: number;
  amounts?: { account_id: string; amount: number }[];
}

export async function updateTransaction(
  input: UpdateTransactionInput
): Promise<void> {
  const supabase = await createClient();

  // Build update fields
  const fields: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.date !== undefined) fields.date = input.date;
  if (input.type !== undefined) fields.type = input.type;
  if (input.description !== undefined) fields.description = input.description;
  if (input.category_id !== undefined) fields.category_id = input.category_id;
  if (input.subcategory_id !== undefined)
    fields.subcategory_id = input.subcategory_id;
  if (input.row_order !== undefined) fields.row_order = input.row_order;

  const { error: txErr } = await supabase
    .from("transactions")
    .update(fields)
    .eq("id", input.id);

  if (txErr) throw new Error(txErr.message);

  // Replace amounts if provided
  if (input.amounts !== undefined) {
    // Delete old amounts
    const { error: delErr } = await supabase
      .from("transaction_amounts")
      .delete()
      .eq("transaction_id", input.id);

    if (delErr) throw new Error(delErr.message);

    // Insert new amounts (only non-zero)
    const nonZero = input.amounts.filter((a) => a.amount !== 0);
    if (nonZero.length > 0) {
      const rows = nonZero.map((a) => ({
        transaction_id: input.id,
        account_id: a.account_id,
        amount: a.amount,
      }));

      const { error: amtErr } = await supabase
        .from("transaction_amounts")
        .insert(rows);

      if (amtErr) throw new Error(amtErr.message);
    }
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) throw new Error(error.message);
}
