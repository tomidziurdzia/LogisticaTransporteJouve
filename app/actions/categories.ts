"use server";

import { createClient } from "@/lib/supabase/server";
import type { Category, Subcategory, TransactionType } from "@/lib/db/types";

// ─── Categories ───────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}

export async function createCategory(
  name: string,
  type: TransactionType
): Promise<Category> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({ name, type })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Category;
}

export async function updateCategory(
  id: string,
  fields: { name?: string; type?: TransactionType }
): Promise<Category> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) throw new Error(error.message);
}

// ─── Subcategories ────────────────────────────────────

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

export async function createSubcategory(
  categoryId: string,
  name: string
): Promise<Subcategory> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subcategories")
    .insert({ category_id: categoryId, name })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Subcategory;
}

export async function updateSubcategory(
  id: string,
  fields: { name?: string; category_id?: string }
): Promise<Subcategory> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subcategories")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Subcategory;
}

export async function deleteSubcategory(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("subcategories")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
