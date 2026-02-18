"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { monthDataQueryKey } from "@/hooks/use-month-data";
import { monthsQueryKey } from "@/hooks/use-months";
import {
  categoriesQueryKey,
  subcategoriesQueryKey,
} from "@/hooks/use-categories";
import { accountsQueryKey } from "@/hooks/use-accounts";

/** Prefijos para invalidar todas las queries de flujo de fondos y resultados */
const CASH_FLOW_QUERY_KEY = ["cashFlow"] as const;
const RESULTS_QUERY_KEY = ["results"] as const;

/** Invalida todas las queries que dependen de datos del mes / transacciones */
function invalidateAllMonthDependentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  monthId?: string,
) {
  if (monthId) {
    queryClient.invalidateQueries({ queryKey: monthDataQueryKey(monthId) });
  }
  queryClient.invalidateQueries({ queryKey: monthsQueryKey });
  queryClient.invalidateQueries({ queryKey: CASH_FLOW_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: RESULTS_QUERY_KEY });
}

/**
 * Suscripción a cambios en tiempo real de todas las tablas relevantes.
 * Cuando vos u otro usuario crea/actualiza/elimina meses, cuentas, categorías,
 * subcategorías, transacciones o saldos de apertura, la UI se actualiza en todas las pestañas.
 */
export function useRealtimeTransactions() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("realtime-changes")
      // Transacciones
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        (payload) => {
          const monthId =
            (payload.new as { month_id?: string })?.month_id ??
            (payload.old as { month_id?: string })?.month_id;
          invalidateAllMonthDependentQueries(queryClient, monthId);
          queryClient.invalidateQueries({ queryKey: subcategoriesQueryKey });
        }
      )
      // Subcategorías
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subcategories",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: subcategoriesQueryKey });
          invalidateAllMonthDependentQueries(queryClient);
        }
      )
      // Meses
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "months",
        },
        () => {
          invalidateAllMonthDependentQueries(queryClient);
        }
      )
      // Cuentas
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "accounts",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: accountsQueryKey });
          invalidateAllMonthDependentQueries(queryClient);
        }
      )
      // Categorías
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
          queryClient.invalidateQueries({ queryKey: subcategoriesQueryKey });
          invalidateAllMonthDependentQueries(queryClient);
        }
      )
      // Saldos de apertura (ej. al crear un mes)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "opening_balances",
        },
        (payload) => {
          const monthId =
            (payload.new as { month_id?: string })?.month_id ??
            (payload.old as { month_id?: string })?.month_id;
          invalidateAllMonthDependentQueries(queryClient, monthId);
        }
      )
      // Montos por transacción (al crear/editar transacciones)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transaction_amounts",
        },
        () => {
          invalidateAllMonthDependentQueries(queryClient);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
