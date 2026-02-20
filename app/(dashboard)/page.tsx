import { DashboardMonths } from "@/components/periods/dashboard-months";
import { UploadTransactionsSection } from "@/components/upload-transactions/upload-transactions-section";
import { getAccounts } from "@/app/actions/accounts";
import { getCategories, getSubcategories } from "@/app/actions/categories";

export default async function DashboardPage() {
  const [accounts, categories, subcategories] = await Promise.all([
    getAccounts(),
    getCategories(),
    getSubcategories(),
  ]);

  return (
    <div className="flex flex-col">
      <UploadTransactionsSection
        accounts={accounts}
        categories={categories}
        subcategories={subcategories}
      />
      {/* Espaciador fijo: separa tabla de upload y Períodos */}
      <div className="h-12 w-full shrink-0" aria-hidden="true" />
      <section className="block">
        <DashboardMonths />
      </section>
      {/* Espaciador debajo de Períodos */}
      <div
        style={{
          height: "2.5rem",
          minHeight: "2.5rem",
          width: "100%",
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
    </div>
  );
}
