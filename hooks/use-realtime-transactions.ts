"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { invalidateAllMonthDependentQueries } from "@/lib/query-invalidation";
import {
  categoriesQueryKey,
  subcategoriesQueryKey,
} from "@/hooks/use-categories";
import { accountsQueryKey } from "@/hooks/use-accounts";

export function useRealtimeTransactions() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("realtime-changes")
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
          invalidateAllMonthDependentQueries(queryClient, monthId, {
            subcategories: true,
          });
        }
      )
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
