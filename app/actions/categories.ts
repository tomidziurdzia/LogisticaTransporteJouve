"use server";

import { createClient } from "@/lib/supabase/server";
import type { Category, Subcategory } from "@/lib/db/types";

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}

export async function getSubcategories(
  categoryId?: string
): Promise<Subcategory[]> {
  const supabase = await createClient();
  let query = supabase
    .from("subcategories")
    .select("*")
    .order("name", { ascending: true });

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data ?? []) as Subcategory[];
}
