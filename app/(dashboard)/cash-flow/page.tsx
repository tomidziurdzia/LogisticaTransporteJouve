"use client";

import { useMonths } from "@/hooks/use-months";
import { useCashFlow } from "@/hooks/use-cash-flow";
import { useMonthSelection } from "@/hooks/use-month-selection";
import { CashFlowTable } from "@/components/cash-flow/cash-flow-table";
import { MonthSelector } from "@/components/periods/month-selector";

export default function CashFlowPage() {
  const { data: months, isLoading: loadingMonths } = useMonths();
  const { sortedMonths, effectiveSelectedIds, toggleMonth } =
    useMonthSelection(months);

  const { data: cashFlow, isLoading: loadingCashFlow } = useCashFlow(
    effectiveSelectedIds,
    true,
  );

  if (loadingMonths) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Flujo de fondos</h1>
        <p className="text-muted-foreground">Cargando períodos…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold">Flujo de fondos</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Saldos, ingresos y egresos por mes. Seleccioná los meses a comparar.
        </p>
      </div>

      <MonthSelector
        months={sortedMonths}
        selectedIds={effectiveSelectedIds}
        onToggle={toggleMonth}
      />

      {loadingCashFlow ? (
        <p className="text-muted-foreground">Cargando flujo de fondos…</p>
      ) : cashFlow ? (
        <CashFlowTable data={cashFlow} />
      ) : (
        <p className="text-muted-foreground">
          No hay datos para los meses seleccionados.
        </p>
      )}
    </div>
  );
}
