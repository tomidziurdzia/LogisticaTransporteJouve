"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from "@/app/actions/transactions";
import { monthDataQueryKey } from "@/hooks/use-month-data";
import { invalidateAllMonthDependentQueries } from "@/lib/query-invalidation";

export function useCreateTransaction(monthId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransactionInput) => createTransaction(input),
    onSuccess: () =>
      invalidateAllMonthDependentQueries(qc, monthId, { subcategories: true }),
  });
}

export function useUpdateTransaction(monthId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTransactionInput) => updateTransaction(input),
    onSuccess: () =>
      invalidateAllMonthDependentQueries(qc, monthId, { subcategories: true }),
  });
}

export function useDeleteTransaction(monthId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      invalidateAllMonthDependentQueries(qc, monthId, { subcategories: true });
      // Refetch explícito para que la grilla se actualice al instante
      if (monthId) {
        qc.refetchQueries({ queryKey: monthDataQueryKey(monthId) });
      }
    },
  });
}
