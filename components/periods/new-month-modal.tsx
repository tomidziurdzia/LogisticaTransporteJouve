"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  usePreviousMonthBalances,
  useCreateMonthWithBalances,
} from "@/hooks/use-months";
import { formatCurrency } from "@/lib/format";
import { MONTH_NAMES } from "@/lib/months";

interface NewMonthModalProps {
  year: number;
  month: number;
  onClose: () => void;
}

export function NewMonthModal({ year, month, onClose }: NewMonthModalProps) {
  const router = useRouter();
  const { data: prevBalances, isLoading } = usePreviousMonthBalances(
    year,
    month,
    true,
  );
  const createMutation = useCreateMonthWithBalances();

  const [editing, setEditing] = useState(false);
  const [editedAmounts, setEditedAmounts] = useState<Record<string, number>>(
    () => {
      const amounts: Record<string, number> = {};
      for (const b of prevBalances ?? []) {
        amounts[b.account_id] = b.balance;
      }
      return amounts;
    },
  );
  const [error, setError] = useState<string | null>(null);

  const total = Object.values(editedAmounts).reduce((sum, val) => sum + val, 0);

  async function handleConfirm() {
    setError(null);
    try {
      const balances = Object.entries(editedAmounts).map(
        ([account_id, amount]) => ({
          account_id,
          amount,
        }),
      );

      const newMonth = await createMutation.mutateAsync({
        year,
        month,
        balances,
      });

      onClose();
      router.push(`/month/${newMonth.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear el mes");
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Nuevo mes — {MONTH_NAMES[month]} {year}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="py-4 text-center text-muted-foreground">Cargando...</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Saldos de apertura
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(!editing)}
              >
                <Pencil className="mr-1 size-3" />
                {editing ? "Listo" : "Editar"}
              </Button>
            </div>

            <div className="max-h-64 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prevBalances?.map((b) => (
                    <TableRow key={b.account_id}>
                      <TableCell className="font-medium">
                        {b.account_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {editing ? (
                          <Input
                            type="number"
                            step="0.01"
                            className="ml-auto w-32 text-right"
                            value={editedAmounts[b.account_id] ?? 0}
                            onChange={(e) =>
                              setEditedAmounts((prev) => ({
                                ...prev,
                                [b.account_id]: parseFloat(e.target.value) || 0,
                              }))
                            }
                          />
                        ) : (
                          formatCurrency(editedAmounts[b.account_id] ?? 0)
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(total)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || createMutation.isPending}
          >
            {createMutation.isPending ? "Creando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
