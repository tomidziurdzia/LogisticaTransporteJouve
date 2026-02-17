import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

async function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth/login");
  }

  return (
    <SidebarProvider defaultOpen={false} className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
          <SidebarTrigger className="-ml-1 size-9 shrink-0" />
          <AppBreadcrumb />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh w-full items-center justify-center">
          <p className="text-muted-foreground">Cargando…</p>
        </div>
      }
    >
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
