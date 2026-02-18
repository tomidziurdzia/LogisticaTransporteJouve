export interface ParsedExpenseCommand {
  amount: number;
  category: string;
  description: string;
  account?: string;
  date: string;
}

export const WHATSAPP_HELP_TEXT = [
  "Formato esperado:",
  "gasto <monto> | <categoria> | <descripcion> | <cuenta opcional> | <fecha opcional YYYY-MM-DD>",
  "",
  "Ejemplo:",
  "gasto 18500 | Combustibles | Carga de gasoil | Galicia | 2026-02-18",
  "",
  "Si no enviás fecha, usa la de hoy.",
  "Si no enviás cuenta, usa WHATSAPP_DEFAULT_ACCOUNT_NAME o Caja.",
].join("\n");

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function parseExpenseCommand(body: string): ParsedExpenseCommand | null {
  const text = body.trim();

  if (!text.toLowerCase().startsWith("gasto ")) {
    return null;
  }

  const payload = text.slice(6).trim();
  const chunks = payload.split("|").map((part) => part.trim()).filter(Boolean);

  if (chunks.length < 3) {
    return null;
  }

  const amount = Number(chunks[0].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const category = chunks[1];
  const description = chunks[2];

  if (!category || !description) {
    return null;
  }

  let account: string | undefined;
  let date = new Date().toISOString().slice(0, 10);

  if (chunks[3]) {
    if (DATE_REGEX.test(chunks[3])) {
      date = chunks[3];
    } else {
      account = chunks[3];
    }
  }

  if (chunks[4]) {
    if (!DATE_REGEX.test(chunks[4])) {
      return null;
    }
    date = chunks[4];
  }

  return {
    amount,
    category,
    description,
    account,
    date,
  };
}
