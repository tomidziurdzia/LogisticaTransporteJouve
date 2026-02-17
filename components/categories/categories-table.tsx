"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, Plus, FolderOpen } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/use-categories";
import { CategoryDialog } from "./category-dialog";
import { DeleteCategoryDialog } from "./delete-category-dialog";
import type { Category, TransactionType } from "@/lib/db/types";

const typeBadge: Record<
  TransactionType,
  { label: string; variant: "income" | "expense" | "transfer" | "adjustment" }
> = {
  income: { label: "Ingreso", variant: "income" },
  expense: { label: "Gasto", variant: "expense" },
  internal_transfer: { label: "Transferencia", variant: "transfer" },
  adjustment: { label: "Ajuste", variant: "adjustment" },
};

export function CategoriesTable() {
  const { data: categories, isLoading } = useCategories();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  function handleCreate() {
    setEditCategory(null);
    setDialogOpen(true);
  }

  function handleEdit(cat: Category) {
    setEditCategory(cat);
    setDialogOpen(true);
  }

  function handleDelete(cat: Category) {
    setDeleteTarget(cat);
    setDeleteDialogOpen(true);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Categorías</h2>
        <Button onClick={handleCreate} size="sm">
          <Plus className="mr-2 size-4" />
          Nueva categoría
        </Button>
      </div>

      <div className="mt-4 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="w-35 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories && categories.length > 0 ? (
              categories.map((cat) => {
                const badge = typeBadge[cat.type] ?? typeBadge.expense;
                return (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/categories/${cat.id}/subcategories`}>
                            <FolderOpen className="size-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(cat)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(cat)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center text-muted-foreground"
                >
                  No hay categorías
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editCategory}
      />
      <DeleteCategoryDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        category={deleteTarget}
      />
    </>
  );
}
