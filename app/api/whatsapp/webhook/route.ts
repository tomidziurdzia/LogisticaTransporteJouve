import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseExpenseCommand,
  WHATSAPP_HELP_TEXT,
} from "@/lib/whatsapp/expense-command";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function twimlMessage(message: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
}

function xmlResponse(message: string, status = 200) {
  return new NextResponse(twimlMessage(message), {
    status,
    headers: { "Content-Type": "text/xml" },
  });
}

function canonicalHost(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  return forwardedHost ?? request.headers.get("host") ?? "localhost:3000";
}

function canonicalProtocol(request: Request) {
  return request.headers.get("x-forwarded-proto") ?? "https";
}

function isValidTwilioRequest({
  request,
  body,
  signature,
}: {
  request: Request;
  body: URLSearchParams;
  signature: string;
}) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return true;

  const url = `${canonicalProtocol(request)}://${canonicalHost(request)}${new URL(request.url).pathname}`;
  const sortedEntries = Array.from(body.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const payload = sortedEntries.reduce(
    (acc, [key, value]) => `${acc}${key}${value}`,
    url,
  );

  const expected = createHmac("sha1", authToken)
    .update(payload)
    .digest("base64");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer);
}

async function getOrCreateCurrentMonth(supabase: ReturnType<typeof createAdminClient>) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  const { data: existingMonth, error: monthErr } = await supabase
    .from("months")
    .select("id")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (monthErr) {
    throw new Error(monthErr.message);
  }

  if (existingMonth) return existingMonth.id;

  const label = now.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  const { data: created, error: createErr } = await supabase
    .from("months")
    .insert({ year, month, label })
    .select("id")
    .single();

  if (createErr) {
    throw new Error(createErr.message);
  }

  return created.id;
}

export async function POST(request: Request) {
  const bodyText = await request.text();
  const body = new URLSearchParams(bodyText);

  const signature = request.headers.get("x-twilio-signature");
  if (process.env.TWILIO_AUTH_TOKEN && signature) {
    if (!isValidTwilioRequest({ request, body, signature })) {
      return xmlResponse("Firma inválida.", 403);
    }
  }

  const messageBody = body.get("Body")?.trim() ?? "";
  const from = body.get("From")?.trim() ?? "desconocido";

  if (!messageBody || /^ayuda$/i.test(messageBody)) {
    return xmlResponse(WHATSAPP_HELP_TEXT);
  }

  const parsed = parseExpenseCommand(messageBody);
  if (!parsed) {
    return xmlResponse(`No pude interpretar el mensaje.\n\n${WHATSAPP_HELP_TEXT}`);
  }

  try {
    const supabase = createAdminClient();

    const monthId = await getOrCreateCurrentMonth(supabase);

    const { data: category, error: categoryErr } = await supabase
      .from("categories")
      .select("id, name")
      .eq("type", "expense")
      .ilike("name", parsed.category)
      .maybeSingle();

    if (categoryErr) {
      throw new Error(categoryErr.message);
    }

    if (!category) {
      return xmlResponse(
        `No encontré la categoría "${parsed.category}". Verificá el nombre exacto en la app.`,
      );
    }

    const accountName =
      parsed.account ?? process.env.WHATSAPP_DEFAULT_ACCOUNT_NAME ?? "Caja";

    const { data: account, error: accountErr } = await supabase
      .from("accounts")
      .select("id, name")
      .ilike("name", accountName)
      .eq("is_active", true)
      .maybeSingle();

    if (accountErr) {
      throw new Error(accountErr.message);
    }

    if (!account) {
      return xmlResponse(
        `No encontré la cuenta "${accountName}". Configurá WHATSAPP_DEFAULT_ACCOUNT_NAME o enviala en el mensaje.`,
      );
    }

    const { data: transaction, error: txErr } = await supabase
      .from("transactions")
      .insert({
        month_id: monthId,
        date: parsed.date,
        type: "expense",
        description: `[WhatsApp ${from}] ${parsed.description}`,
        category_id: category.id,
        is_operational: true,
      })
      .select("id")
      .single();

    if (txErr) {
      throw new Error(txErr.message);
    }

    const { error: amountErr } = await supabase
      .from("transaction_amounts")
      .insert({
        transaction_id: transaction.id,
        account_id: account.id,
        amount: -Math.abs(parsed.amount),
      });

    if (amountErr) {
      throw new Error(amountErr.message);
    }

    return xmlResponse(
      `✅ Gasto registrado: ${parsed.description} por ${parsed.amount.toFixed(2)} en ${category.name} (${account.name}).`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return xmlResponse(`No pude guardar el gasto: ${message}`, 500);
  }
}
