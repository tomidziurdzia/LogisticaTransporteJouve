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
import { useDeleteAccount } from "@/hooks/use-accounts";
import type { Account } from "@/lib/db/types";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  account,
}: DeleteAccountDialogProps) {
  const deleteMutation = useDeleteAccount();

  async function handleDelete() {
    if (!account) return;
    await deleteMutation.mutateAsync(account.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar cuenta</DialogTitle>
          <DialogDescription>
            Se eliminará la cuenta <strong>{account?.name}</strong>. Esta acción
            no se puede deshacer.
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
