"use client";

import { useMemo, useState } from "react";
import type { Month } from "@/lib/db/types";

interface UseMonthSelectionResult {
  sortedMonths: Month[];
  effectiveSelectedIds: string[];
  toggleMonth: (id: string) => void;
}

export function useMonthSelection(
  months: Month[] | undefined,
): UseMonthSelectionResult {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const sortedMonths = useMemo(
    () =>
      (months ?? []).slice().sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      }),
    [months],
  );

  const defaultSelected = useMemo(
    () => sortedMonths.slice(0, 4).map((m) => m.id),
    [sortedMonths],
  );

  const effectiveSelectedIds = hasUserInteracted
    ? selectedIds
    : defaultSelected;

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
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return {
    sortedMonths,
    effectiveSelectedIds,
    toggleMonth,
  };
}
