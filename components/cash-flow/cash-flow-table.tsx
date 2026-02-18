"use client";

import type { CashFlowData, CashFlowRow, CashFlowSection } from "@/app/actions/cash-flow";
import { formatCurrency } from "@/lib/format";

type CashFlowTableProps = {
  data: CashFlowData;
};

export function CashFlowTable({ data }: CashFlowTableProps) {
  const {
    months,
    openingBalances,
    incomes,
    expenses,
    closingBalances,
    totalIncome,
    totalExpense,
    resultado,
  } = data;

  const colCount = months.length + 1; // label column + month columns

  // ─── Helper renderers ──────────────────────────────

  function renderSectionHeader(label: string, key: string) {
    return (
      <tr key={key} className="bg-muted">
        <td
          className="sticky left-0 z-10 bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-wider text-foreground"
        >
          {label}
        </td>
        {months.map((m) => (
          <td key={m.id} />
        ))}
      </tr>
    );
  }

  function renderDataRow(row: CashFlowRow, keyPrefix: string) {
    return (
      <tr key={`${keyPrefix}-${row.id}`} className="border-b border-border/50">
        <td className="sticky left-0 z-10 bg-background px-4 py-1.5 text-sm text-foreground">
          {row.label}
        </td>
        {months.map((m) => {
          const value = row.values[m.id] ?? 0;
          return (
            <td
              key={m.id}
              className={`px-4 py-1.5 text-right text-sm tabular-nums ${
                value < 0 ? "text-destructive" : "text-foreground"
              }`}
            >
              {formatCurrency(value)}
            </td>
          );
        })}
      </tr>
    );
  }

  function renderSubtotalRow(
    label: string,
    subtotals: Record<string, number>,
    key: string,
  ) {
    return (
      <tr key={key} className="border-t border-foreground/20">
        <td className="sticky left-0 z-10 bg-background px-4 py-2 text-sm font-semibold text-foreground">
          {label}
        </td>
        {months.map((m) => {
          const value = subtotals[m.id] ?? 0;
          return (
            <td
              key={m.id}
              className={`px-4 py-2 text-right text-sm font-semibold tabular-nums ${
                value < 0 ? "text-destructive" : "text-foreground"
              }`}
            >
              {formatCurrency(value)}
            </td>
          );
        })}
      </tr>
    );
  }

  function renderTotalRow(
    label: string,
    totals: Record<string, number>,
    key: string,
  ) {
    return (
      <tr key={key} className="border-t-2 border-foreground/20 bg-muted/50">
        <td className="sticky left-0 z-10 bg-muted/50 px-4 py-2.5 text-sm font-bold text-foreground">
          {label}
        </td>
        {months.map((m) => {
          const value = totals[m.id] ?? 0;
          return (
            <td
              key={m.id}
              className={`px-4 py-2.5 text-right text-sm font-bold tabular-nums ${
                value < 0 ? "text-destructive" : "text-foreground"
              }`}
            >
              {formatCurrency(value)}
            </td>
          );
        })}
      </tr>
    );
  }

  function renderResultadoRow() {
    return (
      <tr
        key="resultado"
        className="border-t-2 border-foreground/30 bg-muted/30"
      >
        <td className="sticky left-0 z-10 bg-muted/30 px-4 py-3 text-sm font-bold text-foreground">
          RESULTADO
        </td>
        {months.map((m) => {
          const value = resultado[m.id] ?? 0;
          return (
            <td
              key={m.id}
              className={`px-4 py-3 text-right text-sm font-bold tabular-nums ${
                value > 0
                  ? "text-emerald-700 dark:text-emerald-400"
                  : value < 0
                    ? "text-destructive"
                    : "text-foreground"
              }`}
            >
              {formatCurrency(value)}
            </td>
          );
        })}
      </tr>
    );
  }

  function renderSpacerRow(key: string) {
    return (
      <tr key={key}>
        <td colSpan={colCount} className="h-2 border-0" />
      </tr>
    );
  }

  function renderSection(section: CashFlowSection, sectionKey: string) {
    return (
      <>
        {renderSectionHeader(section.label, `${sectionKey}-header`)}
        {section.rows.map((row) => renderDataRow(row, sectionKey))}
        {renderSubtotalRow("Subtotal", section.subtotals, `${sectionKey}-subtotal`)}
      </>
    );
  }

  // ─── Render ────────────────────────────────────────

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left text-sm font-medium text-foreground">
              Concepto
            </th>
            {months.map((m) => (
              <th
                key={m.id}
                className="px-4 py-3 text-right text-sm font-medium text-foreground"
              >
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* SALDO INICIAL */}
          {renderSection(openingBalances, "opening")}

          {renderSpacerRow("spacer-1")}

          {/* ENTRADAS */}
          {renderSection(incomes, "income")}

          {/* TOTAL INGRESOS */}
          {renderTotalRow("TOTAL INGRESOS", totalIncome, "total-income")}

          {renderSpacerRow("spacer-2")}

          {/* SALIDAS */}
          {renderSection(expenses, "expense")}

          {/* TOTAL EGRESOS */}
          {renderTotalRow("TOTAL EGRESOS", totalExpense, "total-expense")}

          {renderSpacerRow("spacer-3")}

          {/* RESULTADO */}
          {renderResultadoRow()}

          {renderSpacerRow("spacer-4")}

          {/* SALDO DE CIERRE */}
          {renderSection(closingBalances, "closing")}
        </tbody>
      </table>
    </div>
  );
}
