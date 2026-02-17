"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  MoreVertical,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type {
  Account,
  Category,
  Subcategory,
  TransactionType,
  TransactionWithAmounts,
} from "@/lib/db/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from "@/hooks/use-transactions";
import { formatCurrency } from "@/lib/format";
import { SubcategoryDialog } from "@/components/categories/subcategory-dialog";

const TYPE_LABEL: Record<string, string> = {
  income: "Ingreso",
  expense: "Gasto",
  internal_transfer: "Transferencia",
  adjustment: "Ajuste",
};

const TYPE_BADGE_VARIANT: Record<
  string,
  "income" | "expense" | "transfer" | "adjustment"
> = {
  income: "income",
  expense: "expense",
  internal_transfer: "transfer",
  adjustment: "adjustment",
};

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getAmountForRow(
  row: TransactionWithAmounts | DraftRow,
  accountId: string,
): number {
  if ("transaction_amounts" in row && row.transaction_amounts) {
    const line = row.transaction_amounts.find(
      (a) => a.account_id === accountId,
    );
    return line?.amount ?? 0;
  }
  if ("amounts" in row && row.amounts) {
    return row.amounts[accountId] ?? 0;
  }
  return 0;
}

function getRowTotal(
  row: TransactionWithAmounts | DraftRow,
  accountIds: string[],
): number {
  return accountIds.reduce((s, accId) => s + getAmountForRow(row, accId), 0);
}

// ---------- Types ----------

interface DraftRow {
  id: string;
  date: string;
  type: TransactionType;
  description: string;
  category_id: string | null;
  subcategory_id: string | null;
  amounts: Record<string, number>;
}

type RowEdit = Partial<{
  date: string;
  type: TransactionType;
  description: string;
  category_id: string | null;
  subcategory_id: string | null;
  amounts: Record<string, number>;
}>;

type TableRow = { id: string; isDraft: boolean } & (
  | TransactionWithAmounts
  | DraftRow
);

function mergeRow(
  row: TransactionWithAmounts | DraftRow,
  edit: RowEdit | undefined,
): TransactionWithAmounts | DraftRow {
  if (!edit || Object.keys(edit).length === 0) return row;
  if ("transaction_amounts" in row) {
    const tx = row as TransactionWithAmounts;
    const amounts =
      edit.amounts !== undefined
        ? Object.entries(edit.amounts).map(([account_id, amount]) => ({
            account_id,
            amount,
          }))
        : tx.transaction_amounts;
    return {
      ...tx,
      ...(edit.date !== undefined && { date: edit.date }),
      ...(edit.type !== undefined && { type: edit.type }),
      ...(edit.description !== undefined && { description: edit.description }),
      ...(edit.category_id !== undefined && {
        category_id: edit.category_id,
      }),
      ...(edit.subcategory_id !== undefined && {
        subcategory_id: edit.subcategory_id,
      }),
      ...(edit.amounts !== undefined && {
        transaction_amounts: amounts.map((a) => ({
          id: "",
          transaction_id: tx.id,
          account_id: a.account_id,
          amount: a.amount,
          created_at: "",
        })),
      }),
    };
  }
  return { ...row, ...edit } as DraftRow;
}

// ---------- Component ----------

interface MonthTransactionsTableProps {
  monthId: string;
  monthYear: number;
  monthNumber: number;
  accounts: Account[];
  categories: Category[];
  subcategories: Subcategory[];
  transactions: TransactionWithAmounts[];
  nextRowOrder: number;
}

export function MonthTransactionsTable({
  monthId,
  monthYear,
  monthNumber,
  accounts,
  categories,
  subcategories,
  transactions,
  nextRowOrder,
}: MonthTransactionsTableProps) {
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Transfer modal state
  const [transferModalRowId, setTransferModalRowId] = useState<string | null>(
    null,
  );
  const [transferFrom, setTransferFrom] = useState<string>("");
  const [transferTo, setTransferTo] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [transferPrevType, setTransferPrevType] =
    useState<TransactionType>("income");
  const [transferPrevCategoryId, setTransferPrevCategoryId] = useState<
    string | null
  >(null);
  const [transferPrevSubcategoryId, setTransferPrevSubcategoryId] = useState<
    string | null
  >(null);

  // Allow typing "-" for negative amounts; key = `${rowId}-${accId}`
  const [pendingAmountInput, setPendingAmountInput] = useState<
    Record<string, string>
  >({});

  // Subcategory dialog state (reused with categories page dialog)
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] =
    useState<boolean>(false);
  const [subcategoryDialogCategoryId, setSubcategoryDialogCategoryId] =
    useState<string | null>(null);

  // Month date boundaries (YYYY-MM-DD)
  const monthStart = useMemo(() => {
    const m = String(monthNumber).padStart(2, "0");
    return `${monthYear}-${m}-01`;
  }, [monthYear, monthNumber]);

  const monthEnd = useMemo(() => {
    const m = monthNumber;
    const nextMonth = m === 12 ? 1 : m + 1;
    const nextYear = m === 12 ? monthYear + 1 : monthYear;
    const nextMonthStr = String(nextMonth).padStart(2, "0");
    // Day 0 of next month is last day of current month
    const d = new Date(`${nextYear}-${nextMonthStr}-01T00:00:00Z`);
    d.setUTCDate(0);
    const day = String(d.getUTCDate()).padStart(2, "0");
    const monthStr = String(monthNumber).padStart(2, "0");
    return `${monthYear}-${monthStr}-${day}`;
  }, [monthYear, monthNumber]);

  // Sort direction
  const [dateSortDir, setDateSortDir] = useState<"asc" | "desc">("desc");

  // Filters
  const [filterType, setFilterType] = useState<TransactionType | "">("");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("");
  const [filterSubcategoryId, setFilterSubcategoryId] = useState<string>("");
  const [filterDescription, setFilterDescription] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");

  const hasActiveFilters =
    filterType !== "" ||
    filterCategoryId !== "" ||
    filterSubcategoryId !== "" ||
    filterDescription !== "" ||
    filterDateFrom !== "" ||
    filterDateTo !== "";

  const clearFilters = useCallback(() => {
    setFilterType("");
    setFilterCategoryId("");
    setFilterSubcategoryId("");
    setFilterDescription("");
    setFilterDateFrom("");
    setFilterDateTo("");
  }, []);

  const createTx = useCreateTransaction(monthId);
  const updateTx = useUpdateTransaction(monthId);
  const deleteTx = useDeleteTransaction(monthId);

  const accountIds = useMemo(() => accounts.map((a) => a.id), [accounts]);

  // ---------- Rows ----------

  const allRows: TableRow[] = useMemo(() => {
    const existing: TableRow[] = transactions.map((t) => ({
      ...t,
      id: t.id,
      isDraft: false,
    }));
    const drafts: TableRow[] = draftRows.map((d) => ({ ...d, isDraft: true }));
    const combined = [...drafts, ...existing];
    const dirMul = dateSortDir === "desc" ? -1 : 1;
    return combined.sort((a, b) => {
      if (a.isDraft && !b.isDraft) return -1;
      if (!a.isDraft && b.isDraft) return 1;
      const dateA = "date" in a ? a.date : "";
      const dateB = "date" in b ? b.date : "";
      const cmp = (dateA || "").localeCompare(dateB || "");
      if (cmp !== 0) return cmp * dirMul;
      const orderA =
        "row_order" in a ? (a as TransactionWithAmounts).row_order : 0;
      const orderB =
        "row_order" in b ? (b as TransactionWithAmounts).row_order : 0;
      return (orderA - orderB) * dirMul;
    });
  }, [transactions, draftRows, dateSortDir]);

  const filteredRows = useMemo(() => {
    if (!hasActiveFilters) return allRows;
    return allRows.filter((row) => {
      if (row.isDraft) return true;
      const display = row as TransactionWithAmounts;
      if (filterType && display.type !== filterType) return false;
      if (filterCategoryId && display.category_id !== filterCategoryId)
        return false;
      if (filterSubcategoryId && display.subcategory_id !== filterSubcategoryId)
        return false;
      if (
        filterDescription &&
        !display.description
          .toLowerCase()
          .includes(filterDescription.toLowerCase())
      )
        return false;
      if (filterDateFrom && display.date < filterDateFrom) return false;
      if (filterDateTo && display.date > filterDateTo) return false;
      return true;
    });
  }, [
    allRows,
    hasActiveFilters,
    filterType,
    filterCategoryId,
    filterSubcategoryId,
    filterDescription,
    filterDateFrom,
    filterDateTo,
  ]);

  // ---------- Edit helpers ----------

  const getDisplayRow = useCallback(
    (row: TableRow) => mergeRow(row, edits[row.id]),
    [edits],
  );

  const setEdit = useCallback((id: string, update: RowEdit) => {
    setEdits((prev) => {
      const next = { ...prev[id], ...update };
      const keys = Object.keys(next) as (keyof RowEdit)[];
      const hasChange = keys.some((k) => next[k] !== undefined);
      if (!hasChange) {
        return Object.fromEntries(
          Object.entries(prev).filter(([k]) => k !== id),
        ) as Record<string, RowEdit>;
      }
      return { ...prev, [id]: next };
    });
  }, []);

  // ---------- Draft CRUD ----------

  const addRow = useCallback(() => {
    setDraftRows((prev) => [
      ...prev,
      {
        id: `draft-${Date.now()}-${prev.length}`,
        date: toYMD(new Date()),
        type: "expense",
        description: "",
        category_id: null,
        subcategory_id: null,
        amounts: {},
      },
    ]);
  }, []);

  const discardDraftRow = useCallback((draftId: string) => {
    setDraftRows((prev) => prev.filter((r) => r.id !== draftId));
    setEdits((prev) => {
      const next = { ...prev };
      delete next[draftId];
      return next;
    });
  }, []);

  const saveDraftRow = useCallback(
    async (d: DraftRow) => {
      setValidationError(null);
      const tableRow: TableRow = { ...d, isDraft: true };
      const display = getDisplayRow(tableRow);
      const displayDate = "date" in display ? display.date : "";
      const displayDesc = "description" in display ? display.description : "";
      const displayType = "type" in display ? display.type : d.type;
      const displayCategoryId =
        "category_id" in display ? display.category_id : d.category_id;
      const displaySubcategoryId =
        "subcategory_id" in display ? display.subcategory_id : d.subcategory_id;
      const accountsWithAmount = accountIds.filter(
        (accId) => getAmountForRow(display, accId) !== 0,
      ).length;
      const hasAmount = accountsWithAmount > 0;

      if (!String(displayDate).trim()) {
        setValidationError("La fecha es obligatoria.");
        return;
      }
      if (displayDate < monthStart || displayDate > monthEnd) {
        setValidationError("La fecha debe estar dentro del mes seleccionado.");
        return;
      }
      if (!String(displayDesc).trim()) {
        setValidationError("La descripción es obligatoria.");
        return;
      }
      if (!hasAmount) {
        setValidationError("Ingresá al menos un monto en alguna cuenta.");
        return;
      }
      if (displayType === "internal_transfer" && accountsWithAmount < 2) {
        setValidationError(
          "La transferencia interna requiere al menos dos cuentas.",
        );
        return;
      }
      if (displayType === "internal_transfer") {
        const sum = accountIds.reduce(
          (s, accId) => s + getAmountForRow(display, accId),
          0,
        );
        if (Math.abs(sum) > 1e-6) {
          setValidationError(
            "En una transferencia interna, la suma de los montos debe ser 0.",
          );
          return;
        }
      }
      if (!displayCategoryId && displayType !== "internal_transfer") {
        setValidationError("Seleccioná una categoría.");
        return;
      }

      try {
        const amounts = accountIds
          .filter((accId) => getAmountForRow(display, accId) !== 0)
          .map((account_id) => {
            const raw = getAmountForRow(display, account_id);
            return {
              account_id,
              amount: displayType === "expense" ? -Math.abs(raw) : raw,
            };
          });
        const draftIndex = draftRows.findIndex((r) => r.id === d.id);
        await createTx.mutateAsync({
          month_id: monthId,
          date: String(displayDate).trim(),
          type: displayType,
          description: String(displayDesc).trim(),
          category_id: displayCategoryId ?? null,
          subcategory_id: displaySubcategoryId ?? null,
          row_order: nextRowOrder + draftIndex,
          amounts,
        });
        setDraftRows((prev) => prev.filter((r) => r.id !== d.id));
        // Clear pending inputs for this row
        setPendingAmountInput((prev) => {
          const next = { ...prev };
          for (const accId of accountIds) {
            delete next[`${d.id}-${accId}`];
          }
          return next;
        });
      } catch {
        // Error shown via mutation state
      }
    },
    [
      accountIds,
      monthId,
      nextRowOrder,
      createTx,
      draftRows,
      getDisplayRow,
      monthStart,
      monthEnd,
    ],
  );

  // ---------- Edit existing row ----------

  const saveEditedRow = useCallback(
    async (rowId: string) => {
      const edit = edits[rowId];
      if (!edit || Object.keys(edit).length === 0) {
        setEditingRowId(null);
        return;
      }
      const row = allRows.find((r) => r.id === rowId && !r.isDraft);
      if (!row) return;
      const display = getDisplayRow(row);
      setValidationError(null);

      const accountsWithAmount = accountIds.filter(
        (accId) => getAmountForRow(display, accId) !== 0,
      ).length;
      const hasAmount = accountsWithAmount > 0;

      if (!display.date?.trim()) {
        setValidationError("La fecha es obligatoria.");
        return;
      }
      if (display.date < monthStart || display.date > monthEnd) {
        setValidationError("La fecha debe estar dentro del mes seleccionado.");
        return;
      }
      if (!display.description?.trim()) {
        setValidationError("La descripción es obligatoria.");
        return;
      }
      if (!hasAmount) {
        setValidationError("Ingresá al menos un monto en alguna cuenta.");
        return;
      }
      if (display.type === "internal_transfer" && accountsWithAmount < 2) {
        setValidationError(
          "La transferencia interna requiere al menos dos cuentas.",
        );
        return;
      }
      if (display.type === "internal_transfer") {
        const sum = accountIds.reduce(
          (s, accId) => s + getAmountForRow(display, accId),
          0,
        );
        if (Math.abs(sum) > 1e-6) {
          setValidationError(
            "En una transferencia interna, la suma de los montos debe ser 0.",
          );
          return;
        }
      }
      if (!display.category_id && display.type !== "internal_transfer") {
        setValidationError("Seleccioná una categoría.");
        return;
      }

      const orig = transactions.find((t) => t.id === rowId);
      if (!orig) return;

      try {
        const payload: Parameters<typeof updateTx.mutateAsync>[0] = {
          id: rowId,
        };
        if (edit.date !== undefined) payload.date = edit.date;
        if (edit.type !== undefined) payload.type = edit.type;
        if (edit.description !== undefined)
          payload.description = edit.description;
        if (edit.category_id !== undefined)
          payload.category_id = edit.category_id;
        if (edit.subcategory_id !== undefined)
          payload.subcategory_id = edit.subcategory_id;
        // Internal transfers shouldn't keep category/subcategory.
        if (display.type === "internal_transfer") {
          payload.category_id = null;
          payload.subcategory_id = null;
        }
        if (edit.amounts !== undefined || edit.type !== undefined) {
          const fullAmounts = {
            ...Object.fromEntries(
              orig.transaction_amounts.map((a) => [a.account_id, a.amount]),
            ),
            ...(edit.amounts ?? {}),
          };
          payload.amounts = Object.entries(fullAmounts)
            .filter(([, amount]) => amount !== 0)
            .map(([account_id, amount]) => ({
              account_id,
              amount:
                display.type === "internal_transfer"
                  ? amount!
                  : display.type === "expense"
                    ? -Math.abs(amount!)
                    : display.type === "income"
                      ? Math.abs(amount!)
                      : amount!,
            }));
        }
        await updateTx.mutateAsync(payload);
        setEdits((prev) => {
          const next = { ...prev };
          delete next[rowId];
          return next;
        });
        setEditingRowId(null);
        // Clear pending inputs for this row
        setPendingAmountInput((prev) => {
          const next = { ...prev };
          for (const accId of accountIds) {
            delete next[`${rowId}-${accId}`];
          }
          return next;
        });
      } catch {
        // Error shown via mutation state
      }
    },
    [
      edits,
      allRows,
      transactions,
      accountIds,
      getDisplayRow,
      updateTx,
      monthStart,
      monthEnd,
    ],
  );

  // ---------- Delete ----------

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTargetId) return;
    try {
      await deleteTx.mutateAsync(deleteTargetId);
      setDeleteTargetId(null);
    } catch {
      // Error shown via mutation state
    }
  }, [deleteTargetId, deleteTx]);

  // ---------- Category filter by type ----------

  const getCategoriesForType = useCallback(
    (type: TransactionType) => {
      if (type === "internal_transfer") return [];
      return categories.filter((c) => c.type === type);
    },
    [categories],
  );

  const getSubcategoriesForCategory = useCallback(
    (categoryId: string | null) => {
      if (!categoryId) return [];
      return subcategories.filter((s) => s.category_id === categoryId);
    },
    [subcategories],
  );

  // ---------- Render ----------

  const selectClass =
    "border-input h-8 w-full rounded-md border bg-transparent px-2 py-1 text-sm";

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={addRow}>
          <Plus className="size-4" />
          Agregar fila
        </Button>
        <div className="mx-1 h-6 w-px bg-border" />
        <select
          value={filterType}
          onChange={(e) =>
            setFilterType(e.target.value as TransactionType | "")
          }
          className="border-input h-8 rounded-md border bg-transparent px-2 py-1 text-sm"
        >
          <option value="">Todos los tipos</option>
          {(Object.entries(TYPE_LABEL) as [TransactionType, string][]).map(
            ([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ),
          )}
        </select>
        <select
          value={filterCategoryId}
          onChange={(e) => {
            const nextCategoryId = e.target.value;
            setFilterCategoryId(nextCategoryId);
            // Si cambiás de categoría, reseteamos subcategoría para evitar inconsistencia
            setFilterSubcategoryId("");
          }}
          className="border-input h-8 rounded-md border bg-transparent px-2 py-1 text-sm"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={filterSubcategoryId}
          onChange={(e) => setFilterSubcategoryId(e.target.value)}
          className="border-input h-8 rounded-md border bg-transparent px-2 py-1 text-sm"
          disabled={!filterCategoryId}
        >
          <option value="">
            {filterCategoryId
              ? "Todas las subcategorías"
              : "Elegí una categoría"}
          </option>
          {filterCategoryId &&
            subcategories
              .filter((s) => s.category_id === filterCategoryId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
        </select>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filterDescription}
            onChange={(e) => setFilterDescription(e.target.value)}
            placeholder="Buscar descripción..."
            className="h-8 w-44 pl-7 text-sm"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Desde</span>
          <Input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="h-8 w-36 text-sm"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Hasta</span>
          <Input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="h-8 w-36 text-sm"
          />
        </div>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 text-xs"
          >
            <X className="mr-1 size-3" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Errors */}
      {(createTx.isError || updateTx.isError) && (
        <p className="text-sm text-destructive">
          {createTx.error?.message ?? updateTx.error?.message}
        </p>
      )}
      {validationError && (
        <p className="text-sm text-destructive">{validationError}</p>
      )}

      {/* Delete confirmation */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-lg border bg-background p-4 shadow-lg">
            <p className="mb-4 text-sm font-medium">
              ¿Estás seguro de que querés eliminar esta transacción?
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteTargetId(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={deleteTx.isPending}
              >
                {deleteTx.isPending ? "Eliminando…" : "Eliminar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer modal */}
      {transferModalRowId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-lg border bg-background p-4 shadow-lg">
            <p className="mb-4 text-sm font-medium">Transferencia interna</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Desde
                </label>
                <select
                  value={transferFrom}
                  onChange={(e) => setTransferFrom(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Seleccionar cuenta</option>
                  {accounts.map((acc) => (
                    <option
                      key={acc.id}
                      value={acc.id}
                      disabled={acc.id === transferTo}
                    >
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Hacia
                </label>
                <select
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Seleccionar cuenta</option>
                  {accounts.map((acc) => (
                    <option
                      key={acc.id}
                      value={acc.id}
                      disabled={acc.id === transferFrom}
                    >
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Monto
                </label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={transferAmount}
                  onChange={(e) =>
                    setTransferAmount(e.target.value.replace(",", "."))
                  }
                  placeholder="0.00"
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const rowId = transferModalRowId;
                  if (!rowId) {
                    setTransferModalRowId(null);
                    setTransferFrom("");
                    setTransferTo("");
                    setTransferAmount("");
                    setTransferPrevCategoryId(null);
                    setTransferPrevSubcategoryId(null);
                    return;
                  }
                  const draft = draftRows.find((r) => r.id === rowId);
                  if (draft) {
                    setDraftRows((prev) =>
                      prev.map((r) =>
                        r.id === rowId
                          ? {
                              ...r,
                              type: transferPrevType,
                              category_id: transferPrevCategoryId,
                              subcategory_id: transferPrevSubcategoryId,
                            }
                          : r,
                      ),
                    );
                  } else {
                    setEdit(rowId, {
                      type: transferPrevType,
                      category_id: transferPrevCategoryId,
                      subcategory_id: transferPrevSubcategoryId,
                    });
                  }
                  setTransferModalRowId(null);
                  setTransferFrom("");
                  setTransferTo("");
                  setTransferAmount("");
                  setTransferPrevCategoryId(null);
                  setTransferPrevSubcategoryId(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={
                  !transferFrom ||
                  !transferTo ||
                  !transferAmount ||
                  transferFrom === transferTo
                }
                onClick={() => {
                  const amt = parseFloat(transferAmount);
                  if (Number.isNaN(amt) || amt <= 0) return;
                  const rowId = transferModalRowId;
                  const newAmounts: Record<string, number> = {};
                  for (const accId of accountIds) {
                    newAmounts[accId] = 0;
                  }
                  newAmounts[transferFrom] = -Math.abs(amt);
                  newAmounts[transferTo] = Math.abs(amt);

                  const fromName =
                    accounts.find((a) => a.id === transferFrom)?.name ?? "";
                  const toName =
                    accounts.find((a) => a.id === transferTo)?.name ?? "";
                  const autoDescription = `${fromName} → ${toName}`;

                  const draft = draftRows.find((r) => r.id === rowId);
                  if (draft) {
                    setDraftRows((prev) =>
                      prev.map((r) =>
                        r.id === rowId
                          ? {
                              ...r,
                              amounts: newAmounts,
                              description: autoDescription,
                            }
                          : r,
                      ),
                    );
                  } else {
                    setEdit(rowId, {
                      amounts: newAmounts,
                      description: autoDescription,
                    });
                  }
                  setPendingAmountInput((prev) => {
                    const next = { ...prev };
                    for (const accId of accountIds) {
                      delete next[`${rowId}-${accId}`];
                    }
                    return next;
                  });
                  setTransferModalRowId(null);
                  setTransferFrom("");
                  setTransferTo("");
                  setTransferAmount("");
                  setTransferPrevCategoryId(null);
                  setTransferPrevSubcategoryId(null);
                }}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto rounded-md border">
        <table className="w-full min-w-[600px] table-fixed text-sm">
          <colgroup>
            {/* Fecha */}
            <col className="w-28" />
            {/* Tipo */}
            <col className="w-24" />
            {/* Categoría */}
            <col className="w-32" />
            {/* Subcategoría */}
            <col className="w-32" />
            {/* Descripción */}
            <col className="w-40" />
            {/* Una columna por cuenta */}
            {accounts.map((acc) => (
              <col key={acc.id} className="w-32" />
            ))}
            {/* Total */}
            <col className="w-24" />
            {/* Acciones */}
            <col className="w-18" />
          </colgroup>
          <thead>
            <tr className="sticky top-0 z-10 border-b bg-muted">
              <th
                className="sticky top-0 z-10 cursor-pointer select-none bg-muted px-3 py-2 text-left font-medium"
                onClick={() =>
                  setDateSortDir((d) => (d === "desc" ? "asc" : "desc"))
                }
              >
                <span className="inline-flex items-center gap-1">
                  Fecha
                  {dateSortDir === "desc" ? (
                    <ArrowDown className="size-3.5" />
                  ) : (
                    <ArrowUp className="size-3.5" />
                  )}
                </span>
              </th>
              <th className="sticky top-0 z-10 bg-muted pl-3 pr-8 py-2 text-left font-medium">
                Tipo
              </th>
              <th className="sticky top-0 z-10 bg-muted px-3 py-2 text-left font-medium">
                Categoría
              </th>
              <th className="sticky top-0 z-10 bg-muted px-3 py-2 text-left font-medium">
                Subcategoría
              </th>
              <th className="sticky top-0 z-10 bg-muted px-3 py-2 text-left font-medium">
                Descripción
              </th>
              {accounts.map((acc) => (
                <th
                  key={acc.id}
                  className="sticky top-0 z-10 whitespace-nowrap bg-muted px-3 py-2 text-right font-medium tabular-nums"
                >
                  {acc.name}
                </th>
              ))}
              <th className="sticky top-0 z-10 bg-muted px-3 py-2 text-right font-medium tabular-nums">
                Total
              </th>
              <th className="sticky top-0 z-10 w-18 bg-muted px-1 py-2" />
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const isDraft = row.isDraft;
              const isEditing = isDraft || editingRowId === row.id;
              const display = isEditing
                ? getDisplayRow(row)
                : (row as TransactionWithAmounts | DraftRow);
              const total = getRowTotal(display, accountIds);
              const typeCats = getCategoriesForType(display.type);

              return (
                <tr
                  key={row.id}
                  className="border-b last:border-b-0 hover:bg-muted/30"
                >
                  {isEditing ? (
                    <>
                      {/* Date */}
                      <td className="px-3 py-1.5">
                        <Input
                          type="date"
                          value={display.date}
                          min={monthStart}
                          max={monthEnd}
                          onChange={(e) =>
                            isDraft
                              ? setDraftRows((prev) =>
                                  prev.map((r) =>
                                    r.id === row.id
                                      ? { ...r, date: e.target.value }
                                      : r,
                                  ),
                                )
                              : setEdit(row.id, { date: e.target.value })
                          }
                          className="h-8 text-sm"
                        />
                      </td>
                      {/* Type */}
                      <td className="pl-3 pr-8 py-1.5">
                        <select
                          value={display.type}
                          onChange={(e) => {
                            const newType = e.target.value as TransactionType;
                            if (newType === "internal_transfer") {
                              setTransferPrevType(display.type);
                              setTransferPrevCategoryId(
                                "category_id" in display
                                  ? (display.category_id as string | null)
                                  : null,
                              );
                              setTransferPrevSubcategoryId(
                                "subcategory_id" in display
                                  ? (display.subcategory_id as string | null)
                                  : null,
                              );
                              setTransferModalRowId(row.id);
                              setTransferFrom("");
                              setTransferTo("");
                              setTransferAmount("");
                              if (isDraft) {
                                setDraftRows((prev) =>
                                  prev.map((r) =>
                                    r.id === row.id
                                      ? {
                                          ...r,
                                          type: newType,
                                          category_id: null,
                                          subcategory_id: null,
                                        }
                                      : r,
                                  ),
                                );
                              } else {
                                setEdit(row.id, {
                                  type: newType,
                                  category_id: null,
                                  subcategory_id: null,
                                });
                              }
                              return;
                            }
                            const normalize = (v: number) =>
                              newType === "expense"
                                ? -Math.abs(v)
                                : Math.abs(v);
                            if (isDraft) {
                              setDraftRows((prev) =>
                                prev.map((r) => {
                                  if (r.id !== row.id) return r;
                                  const updatedAmounts: Record<string, number> =
                                    {};
                                  for (const accId of accountIds) {
                                    const val = r.amounts[accId] ?? 0;
                                    if (val !== 0)
                                      updatedAmounts[accId] = normalize(val);
                                  }
                                  return {
                                    ...r,
                                    type: newType,
                                    category_id: null,
                                    amounts: {
                                      ...r.amounts,
                                      ...updatedAmounts,
                                    },
                                  };
                                }),
                              );
                            } else {
                              const currentAmounts: Record<string, number> = {};
                              for (const accId of accountIds) {
                                const val = getAmountForRow(display, accId);
                                if (val !== 0)
                                  currentAmounts[accId] = normalize(val);
                              }
                              setEdit(row.id, {
                                type: newType,
                                category_id: null,
                                ...(Object.keys(currentAmounts).length > 0
                                  ? { amounts: currentAmounts }
                                  : {}),
                              });
                            }
                            setPendingAmountInput((prev) => {
                              const next = { ...prev };
                              for (const accId of accountIds) {
                                delete next[`${row.id}-${accId}`];
                              }
                              return next;
                            });
                          }}
                          className={selectClass}
                        >
                          {(
                            Object.entries(TYPE_LABEL) as [
                              TransactionType,
                              string,
                            ][]
                          ).map(([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      {/* Category */}
                      <td className="px-3 py-1.5">
                        {display.type === "internal_transfer" ? (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        ) : (
                          <select
                            value={display.category_id ?? ""}
                            onChange={(e) => {
                              const nextCategoryId =
                                e.target.value || (null as string | null);
                              if (isDraft) {
                                setDraftRows((prev) =>
                                  prev.map((r) =>
                                    r.id === row.id
                                      ? {
                                          ...r,
                                          category_id: nextCategoryId,
                                          subcategory_id: null,
                                        }
                                      : r,
                                  ),
                                );
                              } else {
                                setEdit(row.id, {
                                  category_id: nextCategoryId,
                                  subcategory_id: null,
                                });
                              }
                            }}
                            className={selectClass}
                          >
                            <option value="">Seleccionar categoría</option>
                            {typeCats.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      {/* Subcategory */}
                      <td className="px-3 py-1.5">
                        {display.type === "internal_transfer" ||
                        !display.category_id ? (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <select
                              value={display.subcategory_id ?? ""}
                              onChange={(e) => {
                                const nextSubId =
                                  e.target.value || (null as string | null);
                                if (isDraft) {
                                  setDraftRows((prev) =>
                                    prev.map((r) =>
                                      r.id === row.id
                                        ? {
                                            ...r,
                                            subcategory_id: nextSubId,
                                          }
                                        : r,
                                    ),
                                  );
                                } else {
                                  setEdit(row.id, {
                                    subcategory_id: nextSubId,
                                  });
                                }
                              }}
                              className={selectClass}
                            >
                              <option value="">Sin subcategoría</option>
                              {getSubcategoriesForCategory(
                                display.category_id ?? null,
                              ).map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-xs"
                              className="h-7 w-7"
                              onClick={() => {
                                const cid = display.category_id;
                                if (!cid) return;
                                setSubcategoryDialogCategoryId(cid);
                                setSubcategoryDialogOpen(true);
                              }}
                              title="Agregar subcategoría"
                            >
                              <Plus className="size-3" />
                            </Button>
                          </div>
                        )}
                      </td>
                      {/* Description */}
                      <td className="px-3 py-1.5">
                        <Input
                          value={display.description}
                          onChange={(e) =>
                            isDraft
                              ? setDraftRows((prev) =>
                                  prev.map((r) =>
                                    r.id === row.id
                                      ? {
                                          ...r,
                                          description: e.target.value,
                                        }
                                      : r,
                                  ),
                                )
                              : setEdit(row.id, {
                                  description: e.target.value,
                                })
                          }
                          placeholder="Descripción"
                          className="h-8 max-w-[180px] text-sm"
                        />
                      </td>
                      {/* Amount per account */}
                      {accountIds.map((accId) => {
                        const amountKey = `${row.id}-${accId}`;
                        const amount = getAmountForRow(display, accId);
                        const isExpense = display.type === "expense";
                        const baseAmount = isExpense
                          ? Math.abs(amount)
                          : amount;
                        const inputValue =
                          pendingAmountInput[amountKey] !== undefined
                            ? pendingAmountInput[amountKey]
                            : baseAmount === 0
                              ? ""
                              : String(baseAmount);
                        return (
                          <td key={accId} className="px-3 py-1.5 text-right">
                            <div className="relative inline-flex items-center">
                              {isExpense && (
                                <span className="pointer-events-none absolute left-2 text-sm text-muted-foreground">
                                  &minus;
                                </span>
                              )}
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={inputValue}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const trimmed = raw.replace(",", ".");
                                  const num = parseFloat(trimmed);
                                  setPendingAmountInput((prev) => ({
                                    ...prev,
                                    [amountKey]: raw,
                                  }));
                                  let valueToStore: number;
                                  if (raw === "" || raw === "-") {
                                    valueToStore = 0;
                                  } else if (!Number.isNaN(num)) {
                                    valueToStore = isExpense
                                      ? -Math.abs(num)
                                      : num;
                                  } else {
                                    valueToStore = amount;
                                  }
                                  if (isDraft) {
                                    setDraftRows((prev) =>
                                      prev.map((r) =>
                                        r.id === row.id
                                          ? {
                                              ...r,
                                              amounts: {
                                                ...r.amounts,
                                                [accId]: valueToStore,
                                              },
                                            }
                                          : r,
                                      ),
                                    );
                                  } else {
                                    const currentAmounts = accountIds.reduce(
                                      (acc, aid) => ({
                                        ...acc,
                                        [aid]: getAmountForRow(display, aid),
                                      }),
                                      {} as Record<string, number>,
                                    );
                                    setEdit(row.id, {
                                      amounts: {
                                        ...currentAmounts,
                                        [accId]: valueToStore,
                                      },
                                    });
                                  }
                                }}
                                onBlur={() => {
                                  setPendingAmountInput((prev) => {
                                    const next = { ...prev };
                                    delete next[amountKey];
                                    return next;
                                  });
                                }}
                                className={`h-8 w-24 text-right text-sm tabular-nums ${isExpense ? "pl-6" : ""}`}
                              />
                            </div>
                          </td>
                        );
                      })}
                      {/* Total */}
                      <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                        {formatCurrency(total)}
                      </td>
                      {/* Actions */}
                      <td className="w-18 px-1 py-1 align-middle">
                        {isDraft ? (
                          <div className="flex items-center gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="h-7 w-7"
                              onClick={() => saveDraftRow(row as DraftRow)}
                              disabled={createTx.isPending}
                              title="Guardar fila"
                            >
                              <Save className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => discardDraftRow(row.id)}
                              disabled={createTx.isPending}
                              title="Descartar fila"
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        ) : editingRowId === row.id ? (
                          <div className="flex items-center gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="h-7 w-7"
                              onClick={() => saveEditedRow(row.id)}
                              disabled={updateTx.isPending}
                              title="Guardar cambios"
                            >
                              <Save className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                setEditingRowId(null);
                                setEdits((prev) => {
                                  const next = { ...prev };
                                  delete next[row.id];
                                  return next;
                                });
                                setPendingAmountInput((prev) => {
                                  const next = { ...prev };
                                  for (const accId of accountIds) {
                                    delete next[`${row.id}-${accId}`];
                                  }
                                  return next;
                                });
                              }}
                              title="Cancelar edición"
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                className="h-7 w-7"
                              >
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setEditingRowId(row.id)}
                              >
                                <Pencil className="mr-2 size-3.5" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteTargetId(row.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 size-3.5" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      {/* Read-only cells */}
                      <td className="whitespace-nowrap px-3 py-1.5 text-sm text-muted-foreground">
                        {formatDate(display.date)}
                      </td>
                      <td className="pl-3 pr-8 py-1.5">
                        <Badge
                          variant={
                            TYPE_BADGE_VARIANT[display.type] ?? "adjustment"
                          }
                        >
                          {TYPE_LABEL[display.type] ?? display.type}
                        </Badge>
                      </td>
                      <td className="px-3 py-1.5 text-sm text-muted-foreground">
                        {categories.find((c) => c.id === display.category_id)
                          ?.name ?? "—"}
                      </td>
                      <td className="px-3 py-1.5 text-sm text-muted-foreground">
                        {subcategories.find(
                          (s) => s.id === display.subcategory_id,
                        )?.name ?? "—"}
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-1.5 text-sm">
                        {display.description || "—"}
                      </td>
                      {accountIds.map((accId) => {
                        const amount = getAmountForRow(display, accId);
                        return (
                          <td
                            key={accId}
                            className={`px-3 py-1.5 text-right text-sm tabular-nums ${
                              amount < 0 ? "text-red-600 dark:text-red-400" : ""
                            }`}
                          >
                            {amount !== 0 ? formatCurrency(amount) : "—"}
                          </td>
                        );
                      })}
                      <td className="px-3 py-1.5 text-right text-sm font-medium tabular-nums">
                        {formatCurrency(total)}
                      </td>
                      <td className="w-18 px-1 py-1 align-top">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="h-7 w-7"
                            >
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setEditingRowId(row.id)}
                            >
                              <Pencil className="mr-2 size-3.5" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteTargetId(row.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 size-3.5" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredRows.length === 0 && (
          <p className="border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            {hasActiveFilters
              ? "No hay transacciones que coincidan con los filtros."
              : 'No hay transacciones. Hacé clic en "Agregar fila" para crear una.'}
          </p>
        )}
      </div>
      {subcategoryDialogCategoryId && (
        <SubcategoryDialog
          open={subcategoryDialogOpen}
          onOpenChange={(open) => {
            setSubcategoryDialogOpen(open);
            if (!open) {
              setSubcategoryDialogCategoryId(null);
            }
          }}
          categoryId={subcategoryDialogCategoryId}
          subcategory={null}
        />
      )}
    </div>
  );
}
