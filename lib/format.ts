export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(value);
}

const numberFormat = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formatea un número para mostrar en inputs (ej: 1234.5 → "1.234,50"). Para gastos puede llevar signo menos. */
export function formatAmountForInput(
  value: number,
  isExpense: boolean,
): string {
  if (Number.isNaN(value)) return "";
  const abs = Math.abs(value);
  const formatted = numberFormat.format(abs);
  return isExpense ? `-${formatted}` : formatted;
}

/**
 * Parsea un valor en formato es-AR:
 * - Con coma decimal: "1.234,56" → 1234.56, "10.000" con coma no aplica.
 * - Sin coma: "10.000" (miles) → 10000; "10,50" o "10.5" (decimal) → 10.5.
 * Heurística: si hay coma → es-AR (punto=miles, coma=decimal). Si solo punto y la parte tras el último punto tiene 3 dígitos → miles; si tiene ≤2 → decimal.
 */
export function parseLocaleAmount(value: string): number {
  const trimmed = value.trim().replace(/\s/g, "");
  if (trimmed === "" || trimmed === "-") return NaN;
  const negative = trimmed.startsWith("-");
  const withoutSign = trimmed.replace(/^-/, "");
  let normalized: string;
  if (withoutSign.includes(",")) {
    normalized = withoutSign.replace(/\./g, "").replace(",", ".");
  } else if (withoutSign.includes(".")) {
    const parts = withoutSign.split(".");
    const lastPart = parts[parts.length - 1] ?? "";
    if (parts.length === 2 && lastPart.length <= 2) {
      normalized = withoutSign;
    } else {
      normalized = withoutSign.replace(/\./g, "");
    }
  } else {
    normalized = withoutSign;
  }
  const num = parseFloat(normalized);
  return Number.isNaN(num) ? NaN : (negative ? -num : num);
}
