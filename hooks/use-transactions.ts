"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from "@/app/actions/transactions";
import { monthsQueryKey } from "@/hooks/use-months";
import { monthDataQueryKey } from "@/hooks/use-month-data";
import { subcategoriesQueryKey } from "@/hooks/use-categories";

const CASH_FLOW_QUERY_KEY = ["cashFlow"] as const;
const RESULTS_QUERY_KEY = ["results"] as const;

function invalidateTransactionQueries(
  qc: ReturnType<typeof useQueryClient>,
  monthId: string,
) {
  qc.invalidateQueries({ queryKey: monthDataQueryKey(monthId) });
  qc.invalidateQueries({ queryKey: monthsQueryKey });
  qc.invalidateQueries({ queryKey: CASH_FLOW_QUERY_KEY });
  qc.invalidateQueries({ queryKey: RESULTS_QUERY_KEY });
  // Invalidar subcategorías para asegurar que se muestren correctamente
  // cuando cambia el subcategory_id de una transacción
  qc.invalidateQueries({ queryKey: subcategoriesQueryKey });
}

export function useCreateTransaction(monthId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransactionInput) => createTransaction(input),
    onSuccess: () => invalidateTransactionQueries(qc, monthId),
  });
}

export function useUpdateTransaction(monthId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTransactionInput) => updateTransaction(input),
    onSuccess: () => invalidateTransactionQueries(qc, monthId),
  });
}

export function useDeleteTransaction(monthId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => invalidateTransactionQueries(qc, monthId),
  });
}
