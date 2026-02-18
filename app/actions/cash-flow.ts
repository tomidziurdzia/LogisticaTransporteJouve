"use server";

import { createClient } from "@/lib/supabase/server";

// ─── Types ───────────────────────────────────────────

export type CashFlowRow = {
  id: string;
  label: string;
  values: Record<string, number>; // monthId → amount
};

export type CashFlowSection = {
  label: string;
  rows: CashFlowRow[];
  subtotals: Record<string, number>; // monthId → subtotal
};

export type CashFlowData = {
  months: { id: string; label: string }[];
  openingBalances: CashFlowSection;
  incomes: CashFlowSection;
  expenses: CashFlowSection;
  closingBalances: CashFlowSection;
  totalIncome: Record<string, number>;
  totalExpense: Record<string, number>;
  resultado: Record<string, number>;
};

const UNCATEGORIZED_ID = "__uncategorized__";

// ─── Main query ──────────────────────────────────────

export async function getCashFlowData(
  monthIds: string[],
): Promise<CashFlowData | null> {
  if (monthIds.length === 0) return null;

  const supabase = await createClient();

  // 6 parallel queries (2 for transactions to handle accrual_month_id)
  const [accountsRes, monthsRes, obRes, txByMonthRes, txByAccrualRes, catRes] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("months")
        .select("id, label, year, month")
        .in("id", monthIds),
      supabase
        .from("opening_balances")
        .select("month_id, account_id, amount")
        .in("month_id", monthIds),
      // Transactions registered in selected months
      supabase
        .from("transactions")
        .select(
          "id, month_id, type, category_id, accrual_month_id, transaction_amounts(account_id, amount)",
        )
        .in("month_id", monthIds),
      // Transactions accrued to selected months (may be registered in other months)
      supabase
        .from("transactions")
        .select(
          "id, month_id, type, category_id, accrual_month_id, transaction_amounts(account_id, amount)",
        )
        .in("accrual_month_id", monthIds),
      supabase.from("categories").select("id, name").order("name"),
    ]);

  if (accountsRes.error) throw new Error(accountsRes.error.message);
  if (monthsRes.error) throw new Error(monthsRes.error.message);
  if (obRes.error) throw new Error(obRes.error.message);
  if (txByMonthRes.error) throw new Error(txByMonthRes.error.message);
  if (txByAccrualRes.error) throw new Error(txByAccrualRes.error.message);
  if (catRes.error) throw new Error(catRes.error.message);

  const accounts = accountsRes.data ?? [];
  const months = (monthsRes.data ?? []).sort(
    (a, b) => a.year - b.year || a.month - b.month,
  );
  const openingBalances = obRes.data ?? [];
  const categories = catRes.data ?? [];

  const selectedMonthIds = new Set(monthIds);
  const categoryNameMap = new Map<string, string>();
  for (const c of categories) {
    categoryNameMap.set(c.id, c.name);
  }

  // ─── Deduplicate & resolve effective month ─────────

  type RawTx = {
    id: string;
    month_id: string;
    type: string;
    category_id: string | null;
    accrual_month_id: string | null;
    transaction_amounts: { account_id: string; amount: number }[];
  };

  const txMap = new Map<string, RawTx>();
  for (const tx of (txByMonthRes.data ?? []) as RawTx[]) {
    txMap.set(tx.id, tx);
  }
  for (const tx of (txByAccrualRes.data ?? []) as RawTx[]) {
    txMap.set(tx.id, tx); // dedup by id
  }

  // Resolve effective month and filter to selected months only
  const transactions: (RawTx & { effectiveMonthId: string })[] = [];
  for (const tx of txMap.values()) {
    const effectiveMonthId = tx.accrual_month_id ?? tx.month_id;
    if (selectedMonthIds.has(effectiveMonthId)) {
      transactions.push({ ...tx, effectiveMonthId });
    }
  }

  // ─── SALDO INICIAL ────────────────────────────────

  const obMap = new Map<string, number>();
  for (const ob of openingBalances) {
    obMap.set(`${ob.month_id}|${ob.account_id}`, Number(ob.amount));
  }

  const openingBalanceRows: CashFlowRow[] = accounts.map((acc) => ({
    id: acc.id,
    label: acc.name,
    values: Object.fromEntries(
      months.map((m) => [m.id, obMap.get(`${m.id}|${acc.id}`) ?? 0]),
    ),
  }));

  const openingSubtotals: Record<string, number> = {};
  for (const m of months) {
    openingSubtotals[m.id] = openingBalanceRows.reduce(
      (sum, row) => sum + (row.values[m.id] ?? 0),
      0,
    );
  }

  // ─── Aggregate transactions ────────────────────────

  // Income by category per month
  const incomeMap = new Map<string, Map<string, number>>();
  // Expense by category per month
  const expenseMap = new Map<string, Map<string, number>>();
  // All tx amounts by account per month (for closing balance)
  const txByAccountMonth = new Map<string, number>();

  for (const tx of transactions) {
    const amounts = tx.transaction_amounts ?? [];
    const txTotal = amounts.reduce((s, a) => s + Number(a.amount), 0);

    // Accumulate per-account-per-month for closing balance (ALL types)
    for (const ta of amounts) {
      const key = `${tx.effectiveMonthId}|${ta.account_id}`;
      txByAccountMonth.set(
        key,
        (txByAccountMonth.get(key) ?? 0) + Number(ta.amount),
      );
    }

    // Group by category for income/expense sections
    const catKey = tx.category_id ?? UNCATEGORIZED_ID;

    if (tx.type === "income") {
      if (!incomeMap.has(catKey)) incomeMap.set(catKey, new Map());
      const catMap = incomeMap.get(catKey)!;
      catMap.set(
        tx.effectiveMonthId,
        (catMap.get(tx.effectiveMonthId) ?? 0) + txTotal,
      );
    } else if (tx.type === "expense") {
      if (!expenseMap.has(catKey)) expenseMap.set(catKey, new Map());
      const catMap = expenseMap.get(catKey)!;
      catMap.set(
        tx.effectiveMonthId,
        (catMap.get(tx.effectiveMonthId) ?? 0) + txTotal,
      );
    }
    // internal_transfer and adjustment: only affect closing balance
  }

  // ─── Build ENTRADAS section ────────────────────────

  const incomeRows: CashFlowRow[] = [];
  for (const [catId, monthMap] of incomeMap) {
    incomeRows.push({
      id: catId,
      label:
        catId === UNCATEGORIZED_ID
          ? "Sin categoría"
          : (categoryNameMap.get(catId) ?? "Sin categoría"),
      values: Object.fromEntries(
        months.map((m) => [m.id, monthMap.get(m.id) ?? 0]),
      ),
    });
  }
  incomeRows.sort((a, b) => a.label.localeCompare(b.label));

  const incomeSubtotals: Record<string, number> = {};
  for (const m of months) {
    incomeSubtotals[m.id] = incomeRows.reduce(
      (sum, row) => sum + (row.values[m.id] ?? 0),
      0,
    );
  }

  // ─── Build SALIDAS section ─────────────────────────

  const expenseRows: CashFlowRow[] = [];
  for (const [catId, monthMap] of expenseMap) {
    expenseRows.push({
      id: catId,
      label:
        catId === UNCATEGORIZED_ID
          ? "Sin categoría"
          : (categoryNameMap.get(catId) ?? "Sin categoría"),
      values: Object.fromEntries(
        months.map((m) => [m.id, monthMap.get(m.id) ?? 0]),
      ),
    });
  }
  expenseRows.sort((a, b) => a.label.localeCompare(b.label));

  const expenseSubtotals: Record<string, number> = {};
  for (const m of months) {
    expenseSubtotals[m.id] = expenseRows.reduce(
      (sum, row) => sum + (row.values[m.id] ?? 0),
      0,
    );
  }

  // ─── Totals & Resultado ────────────────────────────

  const totalIncome: Record<string, number> = {};
  const totalExpense: Record<string, number> = {};
  const resultado: Record<string, number> = {};

  for (const m of months) {
    totalIncome[m.id] = incomeSubtotals[m.id] ?? 0;
    totalExpense[m.id] = expenseSubtotals[m.id] ?? 0;
    resultado[m.id] = totalIncome[m.id] + totalExpense[m.id];
  }

  // ─── SALDO DE CIERRE ──────────────────────────────

  const closingBalanceRows: CashFlowRow[] = accounts.map((acc) => ({
    id: acc.id,
    label: acc.name,
    values: Object.fromEntries(
      months.map((m) => {
        const opening = obMap.get(`${m.id}|${acc.id}`) ?? 0;
        const txDelta = txByAccountMonth.get(`${m.id}|${acc.id}`) ?? 0;
        return [m.id, opening + txDelta];
      }),
    ),
  }));

  const closingSubtotals: Record<string, number> = {};
  for (const m of months) {
    closingSubtotals[m.id] = closingBalanceRows.reduce(
      (sum, row) => sum + (row.values[m.id] ?? 0),
      0,
    );
  }

  // ─── Return structured data ────────────────────────

  return {
    months: months.map((m) => ({ id: m.id, label: m.label })),
    openingBalances: {
      label: "SALDO INICIAL",
      rows: openingBalanceRows,
      subtotals: openingSubtotals,
    },
    incomes: {
      label: "ENTRADAS",
      rows: incomeRows,
      subtotals: incomeSubtotals,
    },
    expenses: {
      label: "SALIDAS",
      rows: expenseRows,
      subtotals: expenseSubtotals,
    },
    closingBalances: {
      label: "SALDO DE CIERRE",
      rows: closingBalanceRows,
      subtotals: closingSubtotals,
    },
    totalIncome,
    totalExpense,
    resultado,
  };
}
