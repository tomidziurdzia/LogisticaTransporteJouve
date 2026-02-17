"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getSubcategories,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from "@/app/actions/categories";
import type { TransactionType } from "@/lib/db/types";

// ─── Query keys ───────────────────────────────────────

export const categoriesQueryKey = ["categories"] as const;
export const subcategoriesQueryKey = ["subcategories"] as const;

// ─── Categories ───────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: categoriesQueryKey,
    queryFn: () => getCategories(),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, type }: { name: string; type: TransactionType }) =>
      createCategory(name, type),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoriesQueryKey }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      fields,
    }: {
      id: string;
      fields: { name?: string; type?: TransactionType };
    }) => updateCategory(id, fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoriesQueryKey }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoriesQueryKey });
      qc.invalidateQueries({ queryKey: subcategoriesQueryKey });
    },
  });
}

// ─── Subcategories ────────────────────────────────────

export function useSubcategories(categoryId?: string) {
  return useQuery({
    queryKey: [...subcategoriesQueryKey, categoryId],
    queryFn: () => getSubcategories(categoryId),
  });
}

export function useCreateSubcategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      categoryId,
      name,
    }: {
      categoryId: string;
      name: string;
    }) => createSubcategory(categoryId, name),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: subcategoriesQueryKey }),
  });
}

export function useUpdateSubcategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      fields,
    }: {
      id: string;
      fields: { name?: string; category_id?: string };
    }) => updateSubcategory(id, fields),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: subcategoriesQueryKey }),
  });
}

export function useDeleteSubcategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSubcategory(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: subcategoriesQueryKey }),
  });
}
