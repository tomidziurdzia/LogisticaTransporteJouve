import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/login-form";
import { Suspense } from "react";

async function LoginContent() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) redirect("/");

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <LoginForm />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
          <p className="text-muted-foreground">Cargando…</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
