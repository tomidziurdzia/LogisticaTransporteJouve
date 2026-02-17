"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useMonthData } from "@/hooks/use-month-data";

const pathLabels: Record<string, string> = {
  "/": "Períodos",
  "/cash-flow": "Flujo de fondos",
  "/categories": "Categorías",
  "/accounts": "Cuentas",
  "/clients": "Clientes",
  "/shipments": "Envíos",
  "/settings": "Configuración",
};

function MonthBreadcrumbLabel({ monthId }: { monthId: string }) {
  const { data } = useMonthData(monthId);
  return <BreadcrumbPage>{data?.month.label ?? "Cargando..."}</BreadcrumbPage>;
}

export function AppBreadcrumb() {
  const pathname = usePathname();

  if (pathname === "/") {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Períodos</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // Handle /month/[monthId]
  const monthMatch = pathname.match(/^\/month\/([^/]+)$/);
  if (monthMatch) {
    const monthId = monthMatch[1];
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link
              href="/"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Períodos
            </Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <MonthBreadcrumbLabel monthId={monthId} />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // Handle /categories/[id]/subcategories
  const subMatch = pathname.match(/^\/categories\/[^/]+\/subcategories$/);
  if (subMatch) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link
              href="/"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Períodos
            </Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <Link
              href="/categories"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Categorías
            </Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Subcategorías</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  const label = pathLabels[pathname] ?? pathname.slice(1);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <Link
            href="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Períodos
          </Link>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{label}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
