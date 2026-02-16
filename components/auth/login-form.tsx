"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LoginForm() {
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
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
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
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>
      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <Link href="/auth/forgot-password" className="hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
        <Link href="/auth/sign-up" className="hover:underline">
          Crear cuenta
        </Link>
      </div>
    </div>
  );
}
