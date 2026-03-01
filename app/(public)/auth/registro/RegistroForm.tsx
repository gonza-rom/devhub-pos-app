"use client";
// app/(public)/auth/registro/RegistroForm.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Store, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function RegistroForm() {
  const [form, setForm] = useState({
    nombreComercio: "",
    nombreUsuario: "",
    email: "",
    password: "",
    confirmarPassword: "",
  });
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [exito, setExito] = useState(false);
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleRegistro(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validaciones del lado del cliente
    if (form.password !== form.confirmarPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setCargando(true);

    try {
      // Llamar a nuestra API de registro (crea user en Supabase + Tenant en Prisma)
      const res = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreComercio: form.nombreComercio,
          nombreUsuario:  form.nombreUsuario,
          email:          form.email,
          password:       form.password,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.error ?? "Error al crear la cuenta");
        setCargando(false);
        return;
      }

      // Registro OK → hacer login automático
      const supabase = createClient();
      await supabase.auth.signInWithPassword({
        email:    form.email,
        password: form.password,
      });

      setExito(true);

      // Redirigir al dashboard
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1500);

    } catch {
      setError("Error de conexión. Intentá de nuevo.");
      setCargando(false);
    }
  }

  // Pantalla de éxito
  if (exito) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="text-center">
          <CheckCircle2 className="h-16 w-16 text-primary-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            ¡Comercio creado!
          </h2>
          <p className="text-gray-500 dark:text-gray-400">Redirigiendo al dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white mb-3">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">DevHub POS</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Registrá tu comercio gratis
          </p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleRegistro} className="space-y-4">

            {/* Nombre del comercio */}
            <div>
              <label htmlFor="nombreComercio" className="label-base">
                Nombre del comercio
              </label>
              <input
                id="nombreComercio"
                name="nombreComercio"
                type="text"
                value={form.nombreComercio}
                onChange={handleChange}
                className="input-base"
                placeholder="Ej: Almacén Don Pedro"
                required
                autoFocus
              />
            </div>

            {/* Tu nombre */}
            <div>
              <label htmlFor="nombreUsuario" className="label-base">
                Tu nombre
              </label>
              <input
                id="nombreUsuario"
                name="nombreUsuario"
                type="text"
                value={form.nombreUsuario}
                onChange={handleChange}
                className="input-base"
                placeholder="Ej: Pedro González"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="label-base">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="input-base"
                placeholder="tu@email.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label htmlFor="password" className="label-base">Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={verPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  className="input-base pr-10"
                  placeholder="Mínimo 8 caracteres"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setVerPassword(!verPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {verPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label htmlFor="confirmarPassword" className="label-base">
                Confirmá la contraseña
              </label>
              <input
                id="confirmarPassword"
                name="confirmarPassword"
                type={verPassword ? "text" : "password"}
                value={form.confirmarPassword}
                onChange={handleChange}
                className="input-base"
                placeholder="Repetí la contraseña"
                required
                autoComplete="new-password"
              />
            </div>

            {/* Error */}
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
              {cargando ? "Creando cuenta..." : "Crear mi comercio gratis"}
            </button>

            <p className="text-center text-xs text-gray-400 dark:text-gray-500">
              Plan Free incluido. Sin tarjeta de crédito.
            </p>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/auth/login"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
          >
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
