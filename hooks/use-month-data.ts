"use client";

import { useQuery } from "@tanstack/react-query";
import { getMonthData } from "@/app/actions/months";

export function monthDataQueryKey(monthId: string) {
  return ["months", monthId] as const;
}

export function useMonthData(monthId: string) {
  return useQuery({
    queryKey: monthDataQueryKey(monthId),
    queryFn: () => getMonthData(monthId),
    enabled: !!monthId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}
