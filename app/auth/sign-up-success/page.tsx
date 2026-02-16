import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Suspense } from "react";

async function SignUpSuccessContent() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) redirect("/");

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                ¡Gracias por registrarte!
              </CardTitle>
              <CardDescription>Revisa tu email para confirmar</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Te has registrado correctamente. Revisa tu correo electrónico
                para confirmar tu cuenta antes de iniciar sesión.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function SignUpSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
          <p className="text-muted-foreground">Cargando…</p>
        </div>
      }
    >
      <SignUpSuccessContent />
    </Suspense>
  );
}
