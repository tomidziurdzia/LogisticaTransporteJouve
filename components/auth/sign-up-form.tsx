"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/confirm`,
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/auth/sign-up-success");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <h1 className="text-2xl font-semibold">Registrarse</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="text-sm font-medium">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Enviando…" : "Crear cuenta"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/auth/login" className="hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
