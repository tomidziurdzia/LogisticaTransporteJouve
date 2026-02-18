"use client";

import type { Month } from "@/lib/db/types";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface MonthSelectorProps {
  months: Month[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  label?: string;
}

export function MonthSelector({
  months,
  selectedIds,
  onToggle,
  label = "Meses",
}: MonthSelectorProps) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-4">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex flex-wrap gap-4">
          {months.map((m) => (
            <label
              key={m.id}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={selectedIds.includes(m.id)}
                onCheckedChange={() => onToggle(m.id)}
              />
              <span>{m.label}</span>
            </label>
          ))}
        </div>
      </div>
    </Card>
  );
}
