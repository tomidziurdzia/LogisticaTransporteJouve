"use client";

import type { ResultsData, ResultsRow, ResultsSection } from "@/app/actions/results";
import { formatCurrency } from "@/lib/format";

type ResultsTableProps = {
  data: ResultsData;
};

export function ResultsTable({ data }: ResultsTableProps) {
  const { months, incomes, expenses, resultado, resultadoTotal } = data;

  const colCount = months.length + 2; // label + months + total

  // ─── Helper renderers ──────────────────────────────

  function renderSectionHeader(label: string, key: string) {
    return (
      <tr key={key} className="bg-muted">
        <td className="sticky left-0 z-10 bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">
          {label}
        </td>
        {months.map((m) => (
          <td key={m.id} />
        ))}
        <td />
      </tr>
    );
  }

  function renderDataRow(row: ResultsRow, keyPrefix: string) {
    return (
      <tr
        key={`${keyPrefix}-${row.id}`}
        className="border-b border-border/50"
      >
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
        <td
          className={`px-4 py-1.5 text-right text-sm font-medium tabular-nums ${
            row.total < 0 ? "text-destructive" : "text-foreground"
          }`}
        >
          {formatCurrency(row.total)}
        </td>
      </tr>
    );
  }

  function renderSubtotalRow(
    label: string,
    subtotals: Record<string, number>,
    subtotalTotal: number,
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
        <td
          className={`px-4 py-2 text-right text-sm font-semibold tabular-nums ${
            subtotalTotal < 0 ? "text-destructive" : "text-foreground"
          }`}
        >
          {formatCurrency(subtotalTotal)}
        </td>
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
        <td
          className={`px-4 py-3 text-right text-sm font-bold tabular-nums ${
            resultadoTotal > 0
              ? "text-emerald-700 dark:text-emerald-400"
              : resultadoTotal < 0
                ? "text-destructive"
                : "text-foreground"
          }`}
        >
          {formatCurrency(resultadoTotal)}
        </td>
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

  function renderSection(section: ResultsSection, sectionKey: string) {
    return (
      <>
        {renderSectionHeader(section.label, `${sectionKey}-header`)}
        {section.rows.map((row) => renderDataRow(row, sectionKey))}
        {renderSubtotalRow(
          `Subtotal ${section.label.toLowerCase()}`,
          section.subtotals,
          section.subtotalTotal,
          `${sectionKey}-subtotal`,
        )}
      </>
    );
  }

  // ─── Render ────────────────────────────────────────

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="sticky left-0 z-10 bg-muted/50 px-4 py-4 text-left text-sm font-medium text-foreground">
              Concepto
            </th>
            {months.map((m) => (
              <th
                key={m.id}
                className="px-4 py-4 text-right text-sm font-medium text-foreground"
              >
                {m.label}
              </th>
            ))}
            <th className="px-4 py-4 text-right text-sm font-medium text-foreground">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {/* INGRESOS */}
          {renderSection(incomes, "income")}

          {renderSpacerRow("spacer-1")}

          {/* EGRESOS */}
          {renderSection(expenses, "expense")}

          {renderSpacerRow("spacer-2")}

          {/* RESULTADO */}
          {renderResultadoRow()}
        </tbody>
      </table>
    </div>
  );
}
