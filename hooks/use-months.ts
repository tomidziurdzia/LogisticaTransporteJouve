"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMonths,
  getPreviousMonthClosingBalances,
  createMonthWithBalances,
} from "@/app/actions/months";

export const monthsQueryKey = ["months"] as const;

export function useMonths() {
  return useQuery({
    queryKey: monthsQueryKey,
    queryFn: () => getMonths(),
  });
}

export function usePreviousMonthBalances(
  year: number,
  month: number,
  enabled: boolean
) {
  return useQuery({
    queryKey: ["previousMonthBalances", year, month],
    queryFn: () => getPreviousMonthClosingBalances(year, month),
    enabled,
  });
}

export function useCreateMonthWithBalances() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      year,
      month,
      balances,
      label,
    }: {
      year: number;
      month: number;
      balances: { account_id: string; amount: number }[];
      label?: string;
    }) => createMonthWithBalances(year, month, balances, label),
    onSuccess: () => qc.invalidateQueries({ queryKey: monthsQueryKey }),
  });
}
