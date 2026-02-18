"use client";

import { useQuery } from "@tanstack/react-query";
import { getResultsData } from "@/app/actions/results";

export function resultsQueryKey(monthIds: string[]) {
  return ["results", [...monthIds].sort().join(",")] as const;
}

export function useResults(monthIds: string[], enabled: boolean) {
  return useQuery({
    queryKey: resultsQueryKey(monthIds),
    queryFn: () => getResultsData(monthIds),
    enabled: enabled && monthIds.length > 0,
  });
}
