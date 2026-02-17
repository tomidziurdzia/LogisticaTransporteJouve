"use server";

import { createClient } from "@/lib/supabase/server";
import type { Month, MonthData, TransactionWithAmounts } from "@/lib/db/types";

const MONTH_NAMES = [
  "",
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export async function getMonths(): Promise<Month[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("months")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Month[];
}

export async function getMonthData(
  monthId: string
): Promise<MonthData | null> {
  const supabase = await createClient();

  // Fetch month
  const { data: month, error: monthErr } = await supabase
    .from("months")
    .select("*")
    .eq("id", monthId)
    .single();

  if (monthErr) throw new Error(monthErr.message);
  if (!month) return null;

  // Fetch opening balances
  const { data: balances, error: balErr } = await supabase
    .from("opening_balances")
    .select("*")
    .eq("month_id", monthId);

  if (balErr) throw new Error(balErr.message);

  // Fetch transactions with amounts
  const { data: transactions, error: txErr } = await supabase
    .from("transactions")
    .select("*, transaction_amounts(*)")
    .eq("month_id", monthId)
    .order("date", { ascending: true })
    .order("row_order", { ascending: true });

  if (txErr) throw new Error(txErr.message);

  return {
    month: month as Month,
    opening_balances: balances ?? [],
    transactions: (transactions ?? []) as TransactionWithAmounts[],
  };
}

export async function getPreviousMonthClosingBalances(
  year: number,
  month: number
): Promise<{ account_id: string; account_name: string; balance: number }[]> {
  const supabase = await createClient();

  // Calculate previous month
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  // Find the previous month record
  const { data: prevMonthData } = await supabase
    .from("months")
    .select("id")
    .eq("year", prevYear)
    .eq("month", prevMonth)
    .single();

  // Get all active accounts
  const { data: accounts, error: accErr } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  if (accErr) throw new Error(accErr.message);

  if (!prevMonthData || !accounts) {
    // No previous month — return accounts with 0 balance
    return (accounts ?? []).map((a) => ({
      account_id: a.id,
      account_name: a.name,
      balance: 0,
    }));
  }

  // Get opening balances of previous month
  const { data: openingBalances } = await supabase
    .from("opening_balances")
    .select("account_id, amount")
    .eq("month_id", prevMonthData.id);

  // Get sum of transaction amounts per account for previous month
  const { data: txAmounts } = await supabase
    .from("transaction_amounts")
    .select("account_id, amount, transactions!inner(month_id)")
    .eq("transactions.month_id", prevMonthData.id);

  const openingMap = new Map<string, number>();
  for (const ob of openingBalances ?? []) {
    openingMap.set(ob.account_id, Number(ob.amount));
  }

  const txMap = new Map<string, number>();
  for (const ta of txAmounts ?? []) {
    const prev = txMap.get(ta.account_id) ?? 0;
    txMap.set(ta.account_id, prev + Number(ta.amount));
  }

  return accounts.map((a) => ({
    account_id: a.id,
    account_name: a.name,
    balance: (openingMap.get(a.id) ?? 0) + (txMap.get(a.id) ?? 0),
  }));
}

export async function createMonthWithBalances(
  year: number,
  month: number,
  balances: { account_id: string; amount: number }[],
  label?: string
): Promise<Month> {
  const supabase = await createClient();

  const monthLabel = label ?? `${MONTH_NAMES[month]} ${year}`;

  // Create month
  const { data: newMonth, error: monthErr } = await supabase
    .from("months")
    .insert({ year, month, label: monthLabel })
    .select()
    .single();

  if (monthErr) throw new Error(monthErr.message);

  // Insert opening balances (only non-zero)
  const nonZeroBalances = balances.filter((b) => b.amount !== 0);
  if (nonZeroBalances.length > 0) {
    const rows = nonZeroBalances.map((b) => ({
      month_id: newMonth.id,
      account_id: b.account_id,
      amount: b.amount,
    }));

    const { error: balErr } = await supabase
      .from("opening_balances")
      .insert(rows);

    if (balErr) throw new Error(balErr.message);
  }

  return newMonth as Month;
}
