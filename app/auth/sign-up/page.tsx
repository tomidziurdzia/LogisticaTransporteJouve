import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { Suspense } from "react";

async function SignUpContent() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) redirect("/");

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <SignUpForm />
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
          <p className="text-muted-foreground">Cargando…</p>
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}
