"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateSubcategory,
  useUpdateSubcategory,
} from "@/hooks/use-categories";
import type { Subcategory } from "@/lib/db/types";

interface SubcategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  subcategory?: Subcategory | null;
}

export function SubcategoryDialog({
  open,
  onOpenChange,
  categoryId,
  subcategory,
}: SubcategoryDialogProps) {
  const [name, setName] = useState("");

  const createMutation = useCreateSubcategory();
  const updateMutation = useUpdateSubcategory();

  const isEditing = !!subcategory;
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setName(subcategory?.name ?? "");
    }
  }, [open, subcategory]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    if (isEditing) {
      await updateMutation.mutateAsync({
        id: subcategory.id,
        fields: { name: trimmed },
      });
    } else {
      await createMutation.mutateAsync({ categoryId, name: trimmed });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar subcategoría" : "Nueva subcategoría"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sub-name">Nombre</Label>
            <Input
              id="sub-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la subcategoría"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
