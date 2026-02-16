import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Suspense } from "react";

async function ForgotPasswordContent() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) redirect("/");

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <ForgotPasswordForm />
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
          <p className="text-muted-foreground">Cargando…</p>
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
