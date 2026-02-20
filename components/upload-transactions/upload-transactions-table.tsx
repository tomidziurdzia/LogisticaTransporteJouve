"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Save } from "lucide-react";
import { uploadTransactionsQueryKey } from "@/hooks/use-upload-transactions";
import type {
  Account,
  Category,
  Subcategory,
  UploadTransaction,
} from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { approveUploadTransaction } from "@/app/actions/upload-transactions";
import { createCategory, createSubcategory } from "@/app/actions/categories";
import { formatAmountForInput, parseLocaleAmount } from "@/lib/format";
import { invalidateAllMonthDependentQueries } from "@/lib/query-invalidation";
import { monthDataQueryKey } from "@/hooks/use-month-data";

const TYPE_LABEL: Record<string, string> = {
  income: "Ingreso",
  expense: "Gasto",
};

export interface UploadTransactionsTableProps {
  uploads: UploadTransaction[];
  accounts: Account[];
  categories: Category[];
  subcategories: Subcategory[];
  onSaved?: () => void;
}

export function UploadTransactionsTable({
  uploads: initialUploads,
  accounts,
  categories,
  subcategories,
  onSaved,
}: UploadTransactionsTableProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [uploads, setUploads] = useState<UploadTransaction[]>(initialUploads);

  useEffect(() => {
    setUploads(initialUploads);
  }, [initialUploads]);

  const [edits, setEdits] = useState<
    Record<
      string,
      Partial<{
        date: string;
        type: "income" | "expense";
        amount: string;
        description: string;
        category_id: string;
        subcategory_id: string;
        account_id: string;
      }>
    >
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Diálogos para crear categoría / subcategoría desde la fila
  const [newCategoryRowId, setNewCategoryRowId] = useState<string | null>(null);
  const [newCategoryType, setNewCategoryType] = useState<"income" | "expense">(
    "expense",
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryPending, setNewCategoryPending] = useState(false);

  const [newSubcategoryRowId, setNewSubcategoryRowId] = useState<string | null>(
    null,
  );
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newSubcategoryPending, setNewSubcategoryPending] = useState(false);

  const [focusedAmountRowId, setFocusedAmountRowId] = useState<string | null>(
    null,
  );

  const getRow = useCallback(
    (row: UploadTransaction) => {
      const e = edits[row.id] ?? {};
      return {
        date: e.date ?? row.date,
        type: (e.type ?? row.type) as "income" | "expense",
        amount:
          e.amount !== undefined && e.amount !== ""
            ? e.amount
            : String(row.amount),
        description: e.description ?? row.description ?? "",
        category_id: e.category_id ?? row.category_id ?? "",
        subcategory_id: e.subcategory_id ?? row.subcategory_id ?? "",
        account_id: e.account_id ?? accounts[0]?.id ?? "",
      };
    },
    [edits, accounts],
  );

  const setEdit = useCallback((id: string, field: string, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
    setError(null);
  }, []);

  /** Valor a mostrar en el input de monto: formateado (es-AR) o raw si está enfocado. */
  const getAmountDisplay = useCallback(
    (amount: string, type: "income" | "expense", rowId: string) => {
      if (focusedAmountRowId === rowId) return amount;
      const num = parseLocaleAmount(amount);
      if (Number.isNaN(num)) return amount;
      return formatAmountForInput(num, type === "expense");
    },
    [focusedAmountRowId],
  );

  const handleAmountChange = useCallback(
    (rowId: string, value: string) => {
      setEdit(rowId, "amount", value);
    },
    [setEdit],
  );

  const handleAmountBlur = useCallback(
    (row: UploadTransaction) => {
      const r = getRow(row);
      const num = parseLocaleAmount(r.amount);
      if (!Number.isNaN(num)) {
        setEdit(row.id, "amount", String(num));
      }
      setFocusedAmountRowId(null);
    },
    [getRow, setEdit],
  );

  /** Al cambiar a gasto, si el monto es positivo lo pasamos a negativo en estado. */
  const handleTypeChange = useCallback(
    (rowId: string, newType: "income" | "expense", currentAmount: string) => {
      setEdit(rowId, "type", newType);
      setEdit(rowId, "category_id", "");
      setEdit(rowId, "subcategory_id", "");
      const num = parseLocaleAmount(currentAmount);
      if (Number.isNaN(num)) return;
      if (newType === "expense" && num > 0) {
        setEdit(rowId, "amount", String(-num));
      }
      if (newType === "income" && num < 0) {
        setEdit(rowId, "amount", String(-num));
      }
    },
    [setEdit],
  );

  const handleSave = useCallback(
    async (row: UploadTransaction) => {
      setError(null);
      setSavingId(row.id);
      const r = getRow(row);
      const amount = parseLocaleAmount(r.amount);
      const amountAbs = Math.abs(amount);
      if (!r.date?.trim()) {
        setError("La fecha es obligatoria.");
        setSavingId(null);
        return;
      }
      if (Number.isNaN(amount) || amountAbs <= 0) {
        setError("El monto debe ser un número mayor a 0.");
        setSavingId(null);
        return;
      }
      if (!r.account_id) {
        setError("Elegí una cuenta.");
        setSavingId(null);
        return;
      }
      try {
        const { monthId } = await approveUploadTransaction(row.id, {
          date: r.date,
          type: r.type,
          amount: amountAbs,
          description: r.description?.trim() || null,
          category_id: r.category_id || null,
          subcategory_id: r.subcategory_id || null,
          account_id: r.account_id,
        });
        setUploads((prev) => prev.filter((u) => u.id !== row.id));
        setEdits((prev) => {
          const next = { ...prev };
          delete next[row.id];
          return next;
        });
        onSaved?.();
        queryClient.invalidateQueries({ queryKey: uploadTransactionsQueryKey });
        invalidateAllMonthDependentQueries(queryClient, monthId, {
          subcategories: true,
        });
        // Refetch del mes para que la tabla de transacciones se actualice al instante
        queryClient.refetchQueries({ queryKey: monthDataQueryKey(monthId) });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      } finally {
        setSavingId(null);
      }
    },
    [getRow, onSaved, queryClient],
  );

  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const getCategoriesForType = (type: "income" | "expense") =>
    type === "income" ? incomeCategories : expenseCategories;
  const getSubcategoriesForCategory = (categoryId: string) =>
    subcategories.filter((s) => s.category_id === categoryId);

  const openNewCategory = useCallback(
    (row: UploadTransaction) => {
      const r = getRow(row);
      setNewCategoryType(r.type);
      setNewCategoryName("");
      setNewCategoryRowId(row.id);
    },
    [getRow],
  );

  const openNewSubcategory = useCallback(
    (row: UploadTransaction) => {
      const r = getRow(row);
      if (!r.category_id) return;
      setNewSubcategoryName("");
      setNewSubcategoryRowId(row.id);
    },
    [getRow],
  );

  const handleCreateCategory = useCallback(async () => {
    if (!newCategoryRowId || !newCategoryName.trim()) return;
    setNewCategoryPending(true);
    try {
      const cat = await createCategory(newCategoryName.trim(), newCategoryType);
      setEdit(newCategoryRowId, "category_id", cat.id);
      setEdit(newCategoryRowId, "subcategory_id", "");
      setNewCategoryRowId(null);
      router.refresh();
    } catch {
      setError("No se pudo crear la categoría.");
    } finally {
      setNewCategoryPending(false);
    }
  }, [newCategoryRowId, newCategoryName, newCategoryType, setEdit, router]);

  const handleCreateSubcategory = useCallback(async () => {
    if (!newSubcategoryRowId || !newSubcategoryName.trim()) return;
    const row = uploads.find((u) => u.id === newSubcategoryRowId);
    if (!row) return;
    const categoryId = getRow(row).category_id;
    if (!categoryId) return;
    setNewSubcategoryPending(true);
    try {
      const sub = await createSubcategory(
        categoryId,
        newSubcategoryName.trim(),
      );
      setEdit(newSubcategoryRowId, "subcategory_id", sub.id);
      setNewSubcategoryRowId(null);
      router.refresh();
    } catch {
      setError("No se pudo crear la subcategoría.");
    } finally {
      setNewSubcategoryPending(false);
    }
  }, [
    newSubcategoryRowId,
    newSubcategoryName,
    uploads,
    getRow,
    setEdit,
    router,
  ]);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Subcategoría</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead className="w-[100px]">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {uploads.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-muted-foreground"
                >
                  No hay transacciones pendientes ni aprobadas.
                </TableCell>
              </TableRow>
            ) : (
              uploads.map((row) => {
                const r = getRow(row);
                const cats = getCategoriesForType(r.type);
                const subcats = getSubcategoriesForCategory(r.category_id);
                const isSaving = savingId === row.id;
                const isProcessed = row.status === "processed";
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Input
                        type="date"
                        value={r.date}
                        onChange={(e) =>
                          setEdit(row.id, "date", e.target.value)
                        }
                        className="h-8 w-32 text-sm"
                        disabled={isProcessed}
                      />
                    </TableCell>
                    <TableCell>
                      <select
                        value={r.type}
                        onChange={(e) =>
                          handleTypeChange(
                            row.id,
                            e.target.value as "income" | "expense",
                            r.amount,
                          )
                        }
                        className="h-8 w-full min-w-24 rounded-md border border-input bg-transparent pl-3 pr-8 py-1.5 text-sm"
                        disabled={isProcessed}
                      >
                        {Object.entries(TYPE_LABEL).map(([val, label]) => (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={getAmountDisplay(r.amount, r.type, row.id)}
                        onChange={(e) =>
                          handleAmountChange(row.id, e.target.value)
                        }
                        onFocus={() => setFocusedAmountRowId(row.id)}
                        onBlur={() => handleAmountBlur(row)}
                        placeholder={r.type === "expense" ? "-0,00" : "0,00"}
                        className="h-8 w-40 min-w-40 text-sm tabular-nums"
                        disabled={isProcessed}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={r.description}
                        onChange={(e) =>
                          setEdit(row.id, "description", e.target.value)
                        }
                        placeholder="Descripción"
                        className="h-8 min-w-40 text-sm"
                        disabled={isProcessed}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <select
                          value={r.category_id}
                          onChange={(e) => {
                            setEdit(row.id, "category_id", e.target.value);
                            setEdit(row.id, "subcategory_id", "");
                          }}
                          className="h-8 min-w-32 flex-1 rounded-md border border-input bg-transparent pl-3 pr-8 py-1.5 text-sm"
                          disabled={isProcessed}
                        >
                          <option value="">Sin categoría</option>
                          {cats.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => openNewCategory(row)}
                          title="Nueva categoría"
                          disabled={isProcessed}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-0 flex-1 items-center gap-1">
                        <select
                          value={r.subcategory_id}
                          onChange={(e) =>
                            setEdit(row.id, "subcategory_id", e.target.value)
                          }
                          className="h-8 min-w-28 flex-1 rounded-md border border-input bg-transparent pl-3 pr-8 py-1.5 text-sm"
                          disabled={!r.category_id || isProcessed}
                        >
                          <option value="">
                            {r.category_id ? "Ninguna" : "—"}
                          </option>
                          {subcats.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        {r.category_id && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => openNewSubcategory(row)}
                            title="Nueva subcategoría"
                            disabled={isProcessed}
                          >
                            <Plus className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <select
                        value={r.account_id}
                        onChange={(e) =>
                          setEdit(row.id, "account_id", e.target.value)
                        }
                        className="h-8 w-full min-w-28 rounded-md border border-input bg-transparent pl-3 pr-8 py-1.5 text-sm"
                        disabled={isProcessed}
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      {isProcessed ? (
                        <span className="text-muted-foreground text-sm">
                          Procesada
                        </span>
                      ) : (
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => handleSave(row)}
                          disabled={isSaving}
                          title="Guardar"
                        >
                          {isSaving ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Save className="size-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Diálogo nueva categoría */}
      <Dialog
        open={newCategoryRowId !== null}
        onOpenChange={(open) => !open && setNewCategoryRowId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-cat-name">Nombre</Label>
              <Input
                id="new-cat-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nombre de la categoría"
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Tipo: {TYPE_LABEL[newCategoryType]}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewCategoryRowId(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateCategory}
              disabled={newCategoryPending || !newCategoryName.trim()}
            >
              {newCategoryPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo nueva subcategoría */}
      <Dialog
        open={newSubcategoryRowId !== null}
        onOpenChange={(open) => !open && setNewSubcategoryRowId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva subcategoría</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-sub-name">Nombre</Label>
              <Input
                id="new-sub-name"
                value={newSubcategoryName}
                onChange={(e) => setNewSubcategoryName(e.target.value)}
                placeholder="Nombre de la subcategoría"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewSubcategoryRowId(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateSubcategory}
              disabled={newSubcategoryPending || !newSubcategoryName.trim()}
            >
              {newSubcategoryPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
