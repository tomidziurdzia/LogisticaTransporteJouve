"use client";

import { Wallet, TrendingUp, TrendingDown, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonthData } from "@/hooks/use-month-data";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { MonthTransactionsTable } from "./month-transactions-table";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(value);
}

interface MonthViewProps {
  monthId: string;
}

export function MonthView({ monthId }: MonthViewProps) {
  const { data: monthData, isLoading: monthLoading } = useMonthData(monthId);
  const { data: accounts, isLoading: accLoading } = useAccounts();
  const { data: categories } = useCategories();

  if (monthLoading || accLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!monthData || !accounts) {
    return <p className="text-muted-foreground">Mes no encontrado.</p>;
  }

  const { month, opening_balances, transactions } = monthData;

  // Calculations
  const openingTotal = opening_balances.reduce(
    (sum, ob) => sum + Number(ob.amount),
    0
  );

  let incomeTotal = 0;
  let expenseTotal = 0;
  let allAmountsSum = 0;

  for (const tx of transactions) {
    for (const ta of tx.transaction_amounts) {
      const amt = Number(ta.amount);
      allAmountsSum += amt;
      if (tx.type === "income") incomeTotal += amt;
      if (tx.type === "expense") expenseTotal += Math.abs(amt);
    }
  }

  const closingTotal = openingTotal + allAmountsSum;

  // Per-account balances
  const accountBalances = (accounts ?? []).map((acc) => {
    const opening =
      opening_balances.find((ob) => ob.account_id === acc.id)?.amount ?? 0;
    let txSum = 0;
    for (const tx of transactions) {
      for (const ta of tx.transaction_amounts) {
        if (ta.account_id === acc.id) txSum += Number(ta.amount);
      }
    }
    return { ...acc, balance: Number(opening) + txSum };
  });

  const nextRowOrder =
    transactions.length > 0
      ? Math.max(...transactions.map((t) => t.row_order)) + 1
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold">{month.label}</h2>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo apertura
            </CardTitle>
            <Wallet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(openingTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <TrendingUp className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {formatCurrency(incomeTotal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gastos</CardTitle>
            <TrendingDown className="size-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">
              {formatCurrency(expenseTotal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo cierre</CardTitle>
            <Building2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(closingTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-account balances */}
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {accountBalances.map((acc) => (
          <div
            key={acc.id}
            className="flex items-center justify-between rounded-lg border px-3 py-2"
          >
            <span className="text-sm text-muted-foreground">{acc.name}</span>
            <span className="text-sm font-medium">
              {formatCurrency(acc.balance)}
            </span>
          </div>
        ))}
      </div>

      {/* Transactions table */}
      <MonthTransactionsTable
        monthId={monthId}
        accounts={accounts ?? []}
        categories={categories ?? []}
        transactions={transactions}
        nextRowOrder={nextRowOrder}
      />
    </div>
  );
}
