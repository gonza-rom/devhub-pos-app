"use client";
// app/(public)/auth/login/LoginForm.tsx

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Store, Eye, EyeOff } from "lucide-react";

function LoginFormInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos"
          : "Error al iniciar sesión. Intentá de nuevo."
      );
      setCargando(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white mb-3">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">DevHub POS</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Iniciá sesión en tu comercio
          </p>
        </div>

        {/* Card del formulario */}
        <div className="card p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="label-base">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
                placeholder="tu@email.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="label-base">Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={verPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setVerPassword(!verPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {verPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2.5">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cargando ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          ¿No tenés cuenta?{" "}
          <Link
            href="/auth/registro"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
          >
            Registrá tu comercio
          </Link>
        </p>
      </div>
    </div>
  );
}

// Suspense requerido por useSearchParams en Next.js 15
export default function LoginForm() {
  return (
    <Suspense>
      <LoginFormInner />
    </Suspense>
  );
}
