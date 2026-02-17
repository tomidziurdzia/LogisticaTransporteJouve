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

export function useCreateTransaction(monthId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransactionInput) => createTransaction(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: monthDataQueryKey(monthId) });
      qc.invalidateQueries({ queryKey: monthsQueryKey });
    },
  });
}

export function useUpdateTransaction(monthId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTransactionInput) => updateTransaction(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: monthDataQueryKey(monthId) });
      qc.invalidateQueries({ queryKey: monthsQueryKey });
    },
  });
}

export function useDeleteTransaction(monthId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: monthDataQueryKey(monthId) });
      qc.invalidateQueries({ queryKey: monthsQueryKey });
    },
  });
}
