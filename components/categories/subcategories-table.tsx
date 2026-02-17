"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, Plus, ArrowLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubcategories, useCategories } from "@/hooks/use-categories";
import { SubcategoryDialog } from "./subcategory-dialog";
import { DeleteSubcategoryDialog } from "./delete-subcategory-dialog";
import type { Subcategory } from "@/lib/db/types";

interface SubcategoriesTableProps {
  categoryId: string;
}

export function SubcategoriesTable({ categoryId }: SubcategoriesTableProps) {
  const { data: subcategories, isLoading } = useSubcategories(categoryId);
  const { data: categories } = useCategories();

  const category = categories?.find((c) => c.id === categoryId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSubcategory, setEditSubcategory] = useState<Subcategory | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Subcategory | null>(null);

  function handleCreate() {
    setEditSubcategory(null);
    setDialogOpen(true);
  }

  function handleEdit(sub: Subcategory) {
    setEditSubcategory(sub);
    setDialogOpen(true);
  }

  function handleDelete(sub: Subcategory) {
    setDeleteTarget(sub);
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/categories">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex flex-1 items-center justify-between">
          <h2 className="text-2xl font-bold">
            Subcategorías de {category?.name ?? "..."}
          </h2>
          <Button onClick={handleCreate} size="sm">
            <Plus className="mr-2 size-4" />
            Nueva subcategoría
          </Button>
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-[100px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subcategories && subcategories.length > 0 ? (
              subcategories.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(sub)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(sub)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center text-muted-foreground"
                >
                  No hay subcategorías
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <SubcategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categoryId={categoryId}
        subcategory={editSubcategory}
      />
      <DeleteSubcategoryDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        subcategory={deleteTarget}
      />
    </div>
  );
}
