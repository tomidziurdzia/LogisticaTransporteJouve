"use client";

import { useRealtimeTransactions } from "@/hooks/use-realtime-transactions";

export function RealtimeTransactionsSync() {
  useRealtimeTransactions();
  return null;
}
