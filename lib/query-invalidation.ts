import type { QueryClient } from "@tanstack/react-query";
import { monthDataQueryKey } from "@/hooks/use-month-data";
import { monthsQueryKey } from "@/hooks/use-months";
import { subcategoriesQueryKey } from "@/hooks/use-categories";

export const CASH_FLOW_QUERY_KEY = ["cashFlow"] as const;
export const RESULTS_QUERY_KEY = ["results"] as const;

export interface InvalidateMonthDependentOptions {
  subcategories?: boolean;
}

export function invalidateAllMonthDependentQueries(
  queryClient: QueryClient,
  monthId?: string,
  options: InvalidateMonthDependentOptions = {},
) {
  if (monthId) {
    queryClient.invalidateQueries({ queryKey: monthDataQueryKey(monthId) });
  }
  queryClient.invalidateQueries({ queryKey: monthsQueryKey });
  queryClient.invalidateQueries({ queryKey: CASH_FLOW_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: RESULTS_QUERY_KEY });
  if (options.subcategories) {
    queryClient.invalidateQueries({ queryKey: subcategoriesQueryKey });
  }
}
