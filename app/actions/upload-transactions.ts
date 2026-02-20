"use server";

import { createClient } from "@/lib/supabase/server";
import type { UploadTransaction } from "@/lib/db/types";
import { createTransaction } from "./transactions";
import { createMonthWithBalances } from "./months";

/** Solo devuelve pendientes y aprobadas; las procesadas se excluyen para que dejen de aparecer en la tabla. */
export async function getUploadTransactions(): Promise<UploadTransaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("upload_transaction")
    .select("*")
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as UploadTransaction[];
}

/** Obtiene el month_id para una fecha; crea el mes si no existe. */
export async function getOrCreateMonthIdForDate(
  date: string,
): Promise<string> {
  const supabase = await createClient();
  const [y, m] = date.split("-").map(Number);
  const year = y!;
  const month = m!;

  const { data: existing, error: findErr } = await supabase
    .from("months")
    .select("id")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (findErr) throw new Error(findErr.message);
  if (existing) return existing.id;

  const newMonth = await createMonthWithBalances(year, month, []);
  return newMonth.id;
}

export interface ApproveUploadTransactionInput {
  date?: string;
  type?: "income" | "expense";
  amount?: number;
  description?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  account_id: string; // cuenta donde va el monto
}

/** Crea la transacción en `transactions` + `transaction_amounts` y marca la fila en `upload_transaction` como procesada. Devuelve el monthId para invalidar la UI de ese mes. */
export async function approveUploadTransaction(
  uploadId: string,
  input: ApproveUploadTransactionInput,
): Promise<{ monthId: string }> {
  const supabase = await createClient();

  const { data: row, error: fetchErr } = await supabase
    .from("upload_transaction")
    .select("*")
    .eq("id", uploadId)
    .in("status", ["pending", "approved"])
    .single();

  if (fetchErr || !row) {
    throw new Error("Transacción pendiente o aprobada no encontrada.");
  }

  const date = input.date ?? row.date;
  const type = (input.type ?? row.type) as "income" | "expense";
  const amount = input.amount !== undefined ? Number(input.amount) : Number(row.amount);
  const category_id = input.category_id !== undefined ? input.category_id : row.category_id;
  const subcategory_id =
    input.subcategory_id !== undefined ? input.subcategory_id : row.subcategory_id;
  const account_id = input.account_id;

  const monthId = await getOrCreateMonthIdForDate(date);

  // Para expense el monto en transaction_amounts suele ser negativo
  const signedAmount =
    type === "expense" ? -Math.abs(amount) : Math.abs(amount);

  const description =
    input.description?.trim() ||
    row.description ||
    (row.tx_ref ? `[Upload] ${row.tx_ref}` : "[Upload]");

  // Marcar como procesado primero para evitar duplicados si el usuario reintenta
  const { data: updated, error: updateErr } = await supabase
    .from("upload_transaction")
    .update({ status: "processed" })
    .eq("id", uploadId)
    .in("status", ["pending", "approved"])
    .select("id")
    .maybeSingle();

  if (updateErr || !updated) {
    throw new Error("Transacción pendiente o aprobada no encontrada o ya procesada.");
  }

  await createTransaction({
    month_id: monthId,
    date,
    type,
    description,
    category_id: category_id || null,
    subcategory_id: subcategory_id || null,
    row_order: 0,
    amounts: [{ account_id, amount: signedAmount }],
  });

  return { monthId };
}
