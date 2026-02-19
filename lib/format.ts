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

/** Parsea un valor ingresado en es-AR (acepta "1.234,56", "1234,56", "1234.56"). */
export function parseLocaleAmount(value: string): number {
  const trimmed = value.trim().replace(/\s/g, "");
  if (trimmed === "" || trimmed === "-") return NaN;
  const negative = trimmed.startsWith("-");
  const withoutSign = trimmed.replace(/^-/, "");
  let normalized: string;
  if (withoutSign.includes(",")) {
    normalized = withoutSign.replace(/\./g, "").replace(",", ".");
  } else {
    const parts = withoutSign.split(".");
    normalized =
      parts.length === 1
        ? withoutSign
        : parts.slice(0, -1).join("") + "." + parts[parts.length - 1];
  }
  const num = parseFloat(normalized);
  return Number.isNaN(num) ? NaN : (negative ? -num : num);
}
