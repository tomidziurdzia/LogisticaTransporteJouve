/** Orden deseado de cuentas en tablas y modales. Las que no estén en la lista quedan al final, ordenadas por nombre. */
export const ACCOUNT_DISPLAY_ORDER = [
  "Caja",
  "Cambio",
  "CH Fisico",
  "CH Electronico",
  "Galicia",
  "Provincia",
  "Macro",
  "Mercado Pago",
  "FIMA",
] as const;

function orderIndex(name: string): number {
  const i = ACCOUNT_DISPLAY_ORDER.indexOf(name as (typeof ACCOUNT_DISPLAY_ORDER)[number]);
  return i === -1 ? ACCOUNT_DISPLAY_ORDER.length : i;
}

/** Ordena un array de cuentas por ACCOUNT_DISPLAY_ORDER. */
export function sortAccountsByNameOrder<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const i = orderIndex(a.name);
    const j = orderIndex(b.name);
    if (i !== j) return i - j;
    return a.name.localeCompare(b.name);
  });
}

/** Ordena un array con `account_name` por ACCOUNT_DISPLAY_ORDER. */
export function sortByAccountNameOrder<T extends { account_name: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const i = orderIndex(a.account_name);
    const j = orderIndex(b.account_name);
    if (i !== j) return i - j;
    return a.account_name.localeCompare(b.account_name);
  });
}
