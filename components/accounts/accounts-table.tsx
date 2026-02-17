"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
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
import { useAccounts } from "@/hooks/use-accounts";
import { AccountDialog } from "./account-dialog";
import { DeleteAccountDialog } from "./delete-account-dialog";
import type { Account, AccountType } from "@/lib/db/types";
import { formatCurrency } from "@/lib/format";

const typeBadge: Record<AccountType, { label: string; variant: "bank" | "cash" | "wallet" | "investment" | "checks" | "other" }> = {
  bank: { label: "Banco", variant: "bank" },
  cash: { label: "Efectivo", variant: "cash" },
  wallet: { label: "Billetera", variant: "wallet" },
  investment: { label: "Inversión", variant: "investment" },
  checks: { label: "Cheques", variant: "checks" },
  other: { label: "Otro", variant: "other" },
};

export function AccountsTable() {
  const { data: accounts, isLoading } = useAccounts();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);

  function handleCreate() {
    setEditAccount(null);
    setDialogOpen(true);
  }

  function handleEdit(acc: Account) {
    setEditAccount(acc);
    setDialogOpen(true);
  }

  function handleDelete(acc: Account) {
    setDeleteTarget(acc);
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
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Cuentas</h2>
        <Button onClick={handleCreate} size="sm">
          <Plus className="mr-2 size-4" />
          Nueva cuenta
        </Button>
      </div>

      <div className="mt-4 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Saldo apertura</TableHead>
              <TableHead className="w-[100px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts && accounts.length > 0 ? (
              accounts.map((acc) => {
                const badge = typeBadge[acc.type] ?? typeBadge.other;
                return (
                  <TableRow key={acc.id}>
                    <TableCell className="font-medium">{acc.name}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(acc.opening_balance)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(acc)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(acc)}
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
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  No hay cuentas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={editAccount}
      />
      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        account={deleteTarget}
      />
    </div>
  );
}
