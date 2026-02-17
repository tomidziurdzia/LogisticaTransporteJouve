"use client";

import { useQuery } from "@tanstack/react-query";
import { getAccounts } from "@/app/actions/accounts";

export const accountsQueryKey = ["accounts"] as const;

export function useAccounts() {
  return useQuery({
    queryKey: accountsQueryKey,
    queryFn: () => getAccounts(),
  });
}
