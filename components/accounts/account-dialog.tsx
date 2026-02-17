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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateAccount, useUpdateAccount } from "@/hooks/use-accounts";
import type { Account, AccountType } from "@/lib/db/types";

const typeLabels: Record<AccountType, string> = {
  bank: "Banco",
  cash: "Efectivo",
  wallet: "Billetera",
  investment: "Inversión",
  checks: "Cheques",
  other: "Otro",
};

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
}

export function AccountDialog({
  open,
  onOpenChange,
  account,
}: AccountDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [allowNegative, setAllowNegative] = useState(false);

  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();

  const isEditing = !!account;
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setName(account?.name ?? "");
      setType(account?.type ?? "bank");
      setOpeningBalance(String(account?.opening_balance ?? 0));
      setAllowNegative(account?.allow_negative ?? false);
    }
  }, [open, account]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const balance = parseFloat(openingBalance) || 0;

    if (isEditing) {
      await updateMutation.mutateAsync({
        id: account.id,
        fields: {
          name: trimmed,
          type,
          opening_balance: balance,
          allow_negative: allowNegative,
        },
      });
    } else {
      await createMutation.mutateAsync({
        name: trimmed,
        type,
        openingBalance: balance,
        allowNegative,
      });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar cuenta" : "Nueva cuenta"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="acc-name">Nombre</Label>
            <Input
              id="acc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la cuenta"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="acc-type">Tipo</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as AccountType)}
            >
              <SelectTrigger id="acc-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="acc-balance">Saldo de apertura</Label>
            <Input
              id="acc-balance"
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="acc-negative"
              type="checkbox"
              checked={allowNegative}
              onChange={(e) => setAllowNegative(e.target.checked)}
              className="size-4 rounded border-input"
            />
            <Label htmlFor="acc-negative">Permitir saldo negativo</Label>
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
