"use server";

import { createClient } from "@/lib/supabase/server";

// ─── Types ───────────────────────────────────────────

export type ResultsRow = {
  id: string;
  label: string;
  values: Record<string, number>; // monthId → amount
  total: number; // sum across all months
};

export type ResultsSection = {
  label: string;
  rows: ResultsRow[];
  subtotals: Record<string, number>; // monthId → subtotal
  subtotalTotal: number;
};

export type ResultsData = {
  months: { id: string; label: string }[];
  incomes: ResultsSection;
  expenses: ResultsSection;
  resultado: Record<string, number>;
  resultadoTotal: number;
};

const UNCATEGORIZED_ID = "__uncategorized__";

// ─── Main query (base devengado: usa accrual_month_id ?? month_id) ───

export async function getResultsData(
  monthIds: string[],
): Promise<ResultsData | null> {
  if (monthIds.length === 0) return null;

  const supabase = await createClient();

  // 4 parallel queries (2 for transactions to handle accrual_month_id)
  const [monthsRes, txByMonthRes, txByAccrualRes, catRes] = await Promise.all([
    supabase
      .from("months")
      .select("id, label, year, month")
      .in("id", monthIds),
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

  if (monthsRes.error) throw new Error(monthsRes.error.message);
  if (txByMonthRes.error) throw new Error(txByMonthRes.error.message);
  if (txByAccrualRes.error) throw new Error(txByAccrualRes.error.message);
  if (catRes.error) throw new Error(catRes.error.message);

  const months = (monthsRes.data ?? []).sort(
    (a, b) => a.year - b.year || a.month - b.month,
  );
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

  // Resolve effective month (accrual-basis) and filter
  type ResolvedTx = RawTx & { effectiveMonthId: string };
  const transactions: ResolvedTx[] = [];
  for (const tx of txMap.values()) {
    const effectiveMonthId = tx.accrual_month_id ?? tx.month_id;
    if (selectedMonthIds.has(effectiveMonthId)) {
      transactions.push({ ...tx, effectiveMonthId });
    }
  }

  // ─── Aggregate by type and category ────────────────

  const incomeMap = new Map<string, Map<string, number>>();
  const expenseMap = new Map<string, Map<string, number>>();

  for (const tx of transactions) {
    const amounts = tx.transaction_amounts ?? [];
    const txTotal = amounts.reduce((s, a) => s + Number(a.amount), 0);
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
    // internal_transfer and adjustment: not shown in P&L
  }

  // ─── Build INGRESOS section ────────────────────────

  const incomeRows: ResultsRow[] = [];
  for (const [catId, monthMap] of incomeMap) {
    const values: Record<string, number> = Object.fromEntries(
      months.map((m) => [m.id, monthMap.get(m.id) ?? 0]),
    );
    const total = Object.values(values).reduce(
      (s: number, v: number) => s + v,
      0,
    );
    incomeRows.push({
      id: catId,
      label:
        catId === UNCATEGORIZED_ID
          ? "Sin categoría"
          : (categoryNameMap.get(catId) ?? "Sin categoría"),
      values,
      total,
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
  const incomeSubtotalTotal = Object.values(incomeSubtotals).reduce(
    (s, v) => s + v,
    0,
  );

  // ─── Build EGRESOS section ─────────────────────────

  const expenseRows: ResultsRow[] = [];
  for (const [catId, monthMap] of expenseMap) {
    const values: Record<string, number> = Object.fromEntries(
      months.map((m) => [m.id, monthMap.get(m.id) ?? 0]),
    );
    const total = Object.values(values).reduce(
      (s: number, v: number) => s + v,
      0,
    );
    expenseRows.push({
      id: catId,
      label:
        catId === UNCATEGORIZED_ID
          ? "Sin categoría"
          : (categoryNameMap.get(catId) ?? "Sin categoría"),
      values,
      total,
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
  const expenseSubtotalTotal = Object.values(expenseSubtotals).reduce(
    (s, v) => s + v,
    0,
  );

  // ─── Resultado ─────────────────────────────────────

  const resultado: Record<string, number> = {};
  for (const m of months) {
    resultado[m.id] =
      (incomeSubtotals[m.id] ?? 0) + (expenseSubtotals[m.id] ?? 0);
  }
  const resultadoTotal = incomeSubtotalTotal + expenseSubtotalTotal;

  // ─── Return ────────────────────────────────────────

  return {
    months: months.map((m) => ({ id: m.id, label: m.label })),
    incomes: {
      label: "INGRESOS",
      rows: incomeRows,
      subtotals: incomeSubtotals,
      subtotalTotal: incomeSubtotalTotal,
    },
    expenses: {
      label: "EGRESOS",
      rows: expenseRows,
      subtotals: expenseSubtotals,
      subtotalTotal: expenseSubtotalTotal,
    },
    resultado,
    resultadoTotal,
  };
}
