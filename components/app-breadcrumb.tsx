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

const pathLabels: Record<string, string> = {
  "/": "Home",
  "/cash-flow": "Flujo de fondos",
  "/categories": "Categorías",
  "/accounts": "Cuentas",
  "/clients": "Clientes",
  "/shipments": "Envíos",
  "/settings": "Configuración",
};

export function AppBreadcrumb() {
  const pathname = usePathname();

  if (pathname === "/") {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
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
              Home
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
            Home
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
