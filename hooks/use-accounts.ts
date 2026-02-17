"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from "@/app/actions/accounts";
import type { AccountType } from "@/lib/db/types";

export const accountsQueryKey = ["accounts"] as const;

export function useAccounts() {
  return useQuery({
    queryKey: accountsQueryKey,
    queryFn: () => getAccounts(),
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      type,
      openingBalance,
      allowNegative,
    }: {
      name: string;
      type: AccountType;
      openingBalance?: number;
      allowNegative?: boolean;
    }) => createAccount(name, type, openingBalance, allowNegative),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountsQueryKey }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      fields,
    }: {
      id: string;
      fields: {
        name?: string;
        type?: AccountType;
        opening_balance?: number;
        allow_negative?: boolean;
      };
    }) => updateAccount(id, fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountsQueryKey }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountsQueryKey }),
  });
}
