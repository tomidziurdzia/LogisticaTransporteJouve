"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, CalendarDays, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonths } from "@/hooks/use-months";
import { NewMonthModal } from "./new-month-modal";

export function DashboardMonths() {
  const { data: months, isLoading } = useMonths();
  const [showModal, setShowModal] = useState(false);

  // Calculate next month to create
  const now = new Date();
  let nextYear = now.getFullYear();
  let nextMonth = now.getMonth() + 1; // 1-based

  if (months && months.length > 0) {
    const latest = months[0]; // sorted desc
    nextMonth = latest.month + 1;
    nextYear = latest.year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Períodos</h2>
        <Button onClick={() => setShowModal(true)} size="sm">
          <Plus className="mr-2 size-4" />
          Crear mes
        </Button>
      </div>

      {months && months.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          {months.map((m) => (
            <Link
              key={m.id}
              href={`/month/${m.id}`}
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <CalendarDays className="size-5 text-muted-foreground" />
              <span className="font-medium">{m.label}</span>
              {m.is_closed && (
                <Badge variant="adjustment" className="ml-auto">
                  <Lock className="mr-1 size-3" />
                  Cerrado
                </Badge>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-center gap-4 text-center">
          <CalendarDays className="size-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            No hay períodos creados todavía.
          </p>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="mr-2 size-4" />
            Crear primer mes
          </Button>
        </div>
      )}

      {showModal && (
        <NewMonthModal
          year={nextYear}
          month={nextMonth}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
