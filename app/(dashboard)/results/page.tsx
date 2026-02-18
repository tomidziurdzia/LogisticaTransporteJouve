"use client";

import { useMemo, useState } from "react";
import { useMonths } from "@/hooks/use-months";
import { useResults } from "@/hooks/use-results";
import { ResultsTable } from "@/components/results/results-table";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function ResultsPage() {
  const { data: months, isLoading: loadingMonths } = useMonths();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Sort months: most recent first (for checkbox display)
  const sortedMonths = useMemo(
    () =>
      (months ?? []).slice().sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      }),
    [months],
  );

  // Default to 4 most recent months
  const defaultSelected = useMemo(() => {
    return sortedMonths.slice(0, 4).map((m) => m.id);
  }, [sortedMonths]);

  const effectiveSelected = hasUserInteracted ? selectedIds : defaultSelected;

  const { data: results, isLoading: loadingResults } = useResults(
    effectiveSelected,
    true,
  );

  const toggleMonth = (id: string) => {
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
      setSelectedIds(
        defaultSelected.includes(id)
          ? defaultSelected.filter((x) => x !== id)
          : [...defaultSelected, id],
      );
      return;
    }
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id],
    );
  };

  if (loadingMonths) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Estado de resultados</h1>
        <p className="text-muted-foreground">Cargando períodos…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold">Estado de resultados</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Ingresos y egresos por categoría (base devengado). Seleccioná los
          meses a comparar.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <Label className="text-sm font-medium">Meses</Label>
          <div className="flex flex-wrap gap-4">
            {sortedMonths.map((m) => (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={effectiveSelected.includes(m.id)}
                  onCheckedChange={() => toggleMonth(m.id)}
                />
                <span>{m.label}</span>
              </label>
            ))}
          </div>
        </div>
      </Card>

      {loadingResults ? (
        <p className="text-muted-foreground">Cargando resultados…</p>
      ) : results ? (
        <ResultsTable data={results} />
      ) : (
        <p className="text-muted-foreground">
          No hay datos para los meses seleccionados.
        </p>
      )}
    </div>
  );
}
