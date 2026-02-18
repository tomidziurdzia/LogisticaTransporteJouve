"use client";

import { useQuery } from "@tanstack/react-query";
import { getCashFlowData } from "@/app/actions/cash-flow";

export function cashFlowQueryKey(monthIds: string[]) {
  return ["cashFlow", [...monthIds].sort().join(",")] as const;
}

export function useCashFlow(monthIds: string[], enabled: boolean) {
  return useQuery({
    queryKey: cashFlowQueryKey(monthIds),
    queryFn: () => getCashFlowData(monthIds),
    enabled: enabled && monthIds.length > 0,
  });
}
