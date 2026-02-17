"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteSubcategory } from "@/hooks/use-categories";
import type { Subcategory } from "@/lib/db/types";

interface DeleteSubcategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subcategory: Subcategory | null;
}

export function DeleteSubcategoryDialog({
  open,
  onOpenChange,
  subcategory,
}: DeleteSubcategoryDialogProps) {
  const deleteMutation = useDeleteSubcategory();

  async function handleDelete() {
    if (!subcategory) return;
    await deleteMutation.mutateAsync(subcategory.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar subcategoría</DialogTitle>
          <DialogDescription>
            Se eliminará la subcategoría <strong>{subcategory?.name}</strong>.
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
