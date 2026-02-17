"use client";

import { use } from "react";
import { SubcategoriesTable } from "@/components/categories/subcategories-table";

export default function SubcategoriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <SubcategoriesTable categoryId={id} />;
}
