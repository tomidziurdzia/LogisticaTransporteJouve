"use client";

import { useRealtimeTransactions } from "@/hooks/use-realtime-transactions";

/**
 * Componente invisible que mantiene la suscripción a cambios en tiempo real
 * de transacciones. Debe montarse dentro del dashboard para que todos los
 * clientes vean los cambios hechos por n8n, WhatsApp u otros usuarios.
 */
export function RealtimeTransactionsSync() {
  useRealtimeTransactions();
  return null;
}
