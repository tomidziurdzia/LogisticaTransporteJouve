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
import { uploadTransactionsQueryKey } from "@/hooks/use-upload-transactions";
import { monthDataQueryKey } from "@/hooks/use-month-data";

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
          if (monthId) {
            queryClient.refetchQueries({ queryKey: monthDataQueryKey(monthId) });
          } else {
            queryClient.invalidateQueries({ queryKey: ["months"] });
          }
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
          queryClient.invalidateQueries({ queryKey: ["months"] });
          queryClient.refetchQueries({ queryKey: ["months"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "upload_transaction",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: uploadTransactionsQueryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
