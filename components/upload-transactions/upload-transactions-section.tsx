"use client";

import { UploadTransactionsTable } from "@/components/upload-transactions/upload-transactions-table";
import { useUploadTransactions } from "@/hooks/use-upload-transactions";
import type { Account, Category, Subcategory } from "@/lib/db/types";

export interface UploadTransactionsSectionProps {
  accounts: Account[];
  categories: Category[];
  subcategories: Subcategory[];
}

export function UploadTransactionsSection({
  accounts,
  categories,
  subcategories,
}: UploadTransactionsSectionProps) {
  const { data: uploads = [], isLoading } = useUploadTransactions();

  if (isLoading) {
    return null;
  }

  if (uploads.length === 0) {
    return null;
  }

  return (
    <section className="pb-4">
      <h2 className="mb-6 text-2xl font-bold">Transacciones pendientes</h2>
      <UploadTransactionsTable
        uploads={uploads}
        accounts={accounts}
        categories={categories}
        subcategories={subcategories}
      />
    </section>
  );
}
