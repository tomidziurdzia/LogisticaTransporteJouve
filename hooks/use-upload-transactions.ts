"use client";

import { useQuery } from "@tanstack/react-query";
import { getUploadTransactions } from "@/app/actions/upload-transactions";

export const uploadTransactionsQueryKey = ["uploadTransactions"] as const;

export function useUploadTransactions() {
  return useQuery({
    queryKey: uploadTransactionsQueryKey,
    queryFn: () => getUploadTransactions(),
  });
}
