"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  formatCurrency,
  formatAmountForInput,
  parseLocaleAmount,
} from "@/lib/format";
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
    {},
  );
  /** Input con foco: guardamos el texto que escribe el usuario para no formatear en cada tecla (evita que el cursor salte). */
  const [focusedAccountId, setFocusedAccountId] = useState<string | null>(null);
  const [focusedValue, setFocusedValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function commitFocused() {
    if (!focusedAccountId) return;
    const parsed = parseLocaleAmount(focusedValue);
    setEditedAmounts((prev) => ({
      ...prev,
      [focusedAccountId]: Number.isNaN(parsed) ? 0 : parsed,
    }));
    setFocusedAccountId(null);
    setFocusedValue("");
  }

  useEffect(() => {
    if (!prevBalances) return;
    const amounts: Record<string, number> = {};
    for (const b of prevBalances) {
      amounts[b.account_id] = b.balance;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditedAmounts(amounts);
  }, [prevBalances]);

  // Total incluyendo el valor del input con foco si hay uno
  const total = useMemo(() => {
    const amounts = { ...editedAmounts };
    if (focusedAccountId) {
      const parsed = parseLocaleAmount(focusedValue);
      amounts[focusedAccountId] = Number.isNaN(parsed) ? 0 : parsed;
    }
    return Object.values(amounts).reduce((sum, val) => sum + val, 0);
  }, [editedAmounts, focusedAccountId, focusedValue]);

  async function handleConfirm() {
    setError(null);
    try {
      // Incluir el valor del input con foco si hay uno (evita perder el último edit por cierre de estado)
      const amounts = { ...editedAmounts };
      if (focusedAccountId) {
        const parsed = parseLocaleAmount(focusedValue);
        amounts[focusedAccountId] = Number.isNaN(parsed) ? 0 : parsed;
      }
      const balances = Object.entries(amounts).map(
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
                onClick={() => {
                  if (editing) commitFocused();
                  setEditing(!editing);
                }}
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
                    <TableHead className="text-right">Monto (ARS)</TableHead>
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
                            type="text"
                            inputMode="decimal"
                            className="ml-auto w-36 text-right tabular-nums"
                            placeholder="Monto"
                            value={
                              focusedAccountId === b.account_id
                                ? focusedValue
                                : (editedAmounts[b.account_id] ?? 0) === 0
                                  ? ""
                                  : formatAmountForInput(
                                      editedAmounts[b.account_id] ?? 0,
                                      (editedAmounts[b.account_id] ?? 0) < 0,
                                    )
                            }
                            onFocus={() => {
                              setFocusedAccountId(b.account_id);
                              const amount = editedAmounts[b.account_id] ?? 0;
                              setFocusedValue(
                                amount === 0
                                  ? ""
                                  : formatAmountForInput(amount, amount < 0),
                              );
                            }}
                            onChange={(e) => {
                              if (focusedAccountId === b.account_id) {
                                setFocusedValue(e.target.value);
                              }
                            }}
                            onBlur={() => {
                              if (focusedAccountId === b.account_id) {
                                commitFocused();
                              }
                            }}
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
