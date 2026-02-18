"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { monthDataQueryKey } from "@/hooks/use-month-data";
import { monthsQueryKey } from "@/hooks/use-months";
import { subcategoriesQueryKey } from "@/hooks/use-categories";

/** Prefijos para invalidar todas las queries de flujo de fondos y resultados */
const CASH_FLOW_QUERY_KEY = ["cashFlow"] as const;
const RESULTS_QUERY_KEY = ["results"] as const;

/**
 * Suscripción a cambios en tiempo real de la tabla `transactions`.
 * Cuando vos, n8n, el bot de WhatsApp u otro usuario inserta/actualiza/elimina
 * una transacción, invalida todas las queries que dependen de eso para que
 * la UI se actualice en todas las pestañas (mes, flujo de fondos, resultados).
 */
export function useRealtimeTransactions() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("transactions-changes")
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

          if (monthId) {
            queryClient.invalidateQueries({ queryKey: monthDataQueryKey(monthId) });
          }
          queryClient.invalidateQueries({ queryKey: monthsQueryKey });
          queryClient.invalidateQueries({ queryKey: CASH_FLOW_QUERY_KEY });
          queryClient.invalidateQueries({ queryKey: RESULTS_QUERY_KEY });
          // Invalidar subcategorías para asegurar que se muestren correctamente
          // cuando cambia el subcategory_id de una transacción
          queryClient.invalidateQueries({ queryKey: subcategoriesQueryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
