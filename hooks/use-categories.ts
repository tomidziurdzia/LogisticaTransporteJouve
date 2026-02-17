"use client";

import { useQuery } from "@tanstack/react-query";
import { getCategories, getSubcategories } from "@/app/actions/categories";

export const categoriesQueryKey = ["categories"] as const;
export const subcategoriesQueryKey = ["subcategories"] as const;

export function useCategories() {
  return useQuery({
    queryKey: categoriesQueryKey,
    queryFn: () => getCategories(),
  });
}

export function useSubcategories(categoryId?: string) {
  return useQuery({
    queryKey: [...subcategoriesQueryKey, categoryId],
    queryFn: () => getSubcategories(categoryId),
  });
}
