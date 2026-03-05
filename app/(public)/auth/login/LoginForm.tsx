"use client";
// app/(public)/auth/login/LoginForm.tsx

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, Store, AlertCircle, CheckCircle2 } from "lucide-react";

export default function LoginForm() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error,    setError]    = useState("");
  const searchParams = useSearchParams();

  const urlError   = searchParams.get("error");
  const registered = searchParams.get("registered");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const res  = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al iniciar sesión"); return; }
      // Ir a la pantalla de loading que llama a refresh-session
      // Esto evita el flash blanco y garantiza que la cookie del tenant se actualice
      window.location.href = "/auth/loading?redirect=/dashboard";
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-glow" />
      <div className="auth-card">

        <div className="auth-logo-wrap">
          <div className="auth-logo-icon">
            <Store className="h-5 w-5" style={{ color: "#DC2626" }} />
          </div>
          <span className="auth-logo-text">DevHub POS</span>
        </div>

        <div className="auth-heading">
          <h1>Bienvenido</h1>
          <p>Ingresá tus credenciales para continuar</p>
        </div>

        {/* Registro exitoso */}
        {registered && (
          <div className="auth-success">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>Cuenta creada. Revisá tu email para confirmarla antes de ingresar.</span>
          </div>
        )}

        {/* Error por URL (link expirado, etc.) */}
        {urlError && !error && (
          <div className="auth-error">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{decodeURIComponent(urlError)}</span>
          </div>
        )}

        {/* Error de formulario */}
        {error && (
          <div className="auth-error">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" type="email" autoComplete="email"
              placeholder="tu@correo.com" value={email}
              onChange={e => setEmail(e.target.value)} required disabled={cargando} />
          </div>

          <div className="auth-field">
            <div className="auth-field-row">
              <label htmlFor="password">Contraseña</label>
              <Link href="/auth/recuperar" className="auth-forgot">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="auth-pass-wrap">
              <input id="password" type={showPass ? "text" : "password"}
                autoComplete="current-password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                required disabled={cargando} />
              <button type="button" className="auth-eye" onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={cargando}>
            {cargando
              ? <span className="auth-spinner" />
              : <>Iniciar sesión <ArrowRight className="h-4 w-4" /></>
            }
          </button>
        </form>

        <p className="auth-footer">
          ¿No tenés cuenta?{" "}
          <Link href="/auth/registro">Crear cuenta gratis</Link>
        </p>
      </div>
      <style>{authStyles}</style>
    </div>
  );
}

const authStyles = `
  .auth-shell {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 1.5rem; background: #0a0a0a; position: relative; overflow: hidden;
  }
  .auth-glow {
    position: fixed; top: -20%; left: 50%; transform: translateX(-50%);
    width: 600px; height: 400px;
    background: radial-gradient(ellipse at center, rgba(220,38,38,0.12) 0%, transparent 70%);
    pointer-events: none; z-index: 0;
  }
  .auth-card {
    position: relative; z-index: 1; width: 100%; max-width: 400px;
    background: #111111; border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px; padding: 2rem;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.03), 0 32px 64px rgba(0,0,0,0.6), 0 0 80px rgba(220,38,38,0.04);
  }
  .auth-logo-wrap { display: flex; align-items: center; gap: 10px; margin-bottom: 2rem; }
  .auth-logo-icon {
    width: 36px; height: 36px; background: rgba(220,38,38,0.12);
    border: 1px solid rgba(220,38,38,0.25); border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
  }
  .auth-logo-text { font-family: 'Syne', sans-serif; font-size: 1rem; font-weight: 700; color: #fff; letter-spacing: -0.01em; }
  .auth-heading { margin-bottom: 1.75rem; }
  .auth-heading h1 {
    font-family: 'Syne', sans-serif; font-size: 1.5rem; font-weight: 700;
    color: #fff; margin: 0 0 0.375rem; letter-spacing: -0.02em; line-height: 1.2;
  }
  .auth-heading p { font-size: 0.875rem; color: #71717a; margin: 0; }
  .auth-error {
    display: flex; align-items: center; gap: 8px; padding: 10px 14px;
    background: rgba(220,38,38,0.08); border: 1px solid rgba(220,38,38,0.25);
    border-radius: 10px; color: #f87171; font-size: 0.8125rem; margin-bottom: 1.25rem;
  }
  .auth-success {
    display: flex; align-items: center; gap: 8px; padding: 10px 14px;
    background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.25);
    border-radius: 10px; color: #4ade80; font-size: 0.8125rem; margin-bottom: 1.25rem;
  }
  .auth-form { display: flex; flex-direction: column; gap: 1.125rem; }
  .auth-field { display: flex; flex-direction: column; gap: 6px; }
  .auth-field label { font-size: 0.75rem; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.05em; }
  .auth-field input {
    width: 100%; padding: 10px 14px; background: #1a1a1a;
    border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
    color: #f4f4f5; font-size: 0.875rem; font-family: 'DM Sans', sans-serif;
    outline: none; transition: border-color 0.15s, box-shadow 0.15s;
  }
  .auth-field input::placeholder { color: #3f3f46; }
  .auth-field input:focus { border-color: rgba(220,38,38,0.45); box-shadow: 0 0 0 3px rgba(220,38,38,0.08); }
  .auth-field input:disabled { opacity: 0.5; cursor: not-allowed; }
  .auth-field-row { display: flex; align-items: center; justify-content: space-between; }
  .auth-forgot { font-size: 0.75rem; color: #52525b; text-decoration: none; transition: color 0.15s; }
  .auth-forgot:hover { color: #DC2626; }
  .auth-pass-wrap { position: relative; }
  .auth-pass-wrap input { padding-right: 42px; }
  .auth-eye {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    background: none; border: none; padding: 0; cursor: pointer;
    color: #52525b; display: flex; align-items: center; transition: color 0.15s;
  }
  .auth-eye:hover { color: #a1a1aa; }
  .auth-submit {
    margin-top: 0.25rem; width: 100%; display: flex; align-items: center;
    justify-content: center; gap: 8px; padding: 11px 20px;
    background: #DC2626; border: none; border-radius: 10px;
    color: #fff; font-size: 0.9375rem; font-weight: 600;
    font-family: 'DM Sans', sans-serif; cursor: pointer;
    transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
  }
  .auth-submit:hover:not(:disabled) { background: #B91C1C; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(220,38,38,0.3); }
  .auth-submit:active:not(:disabled) { transform: translateY(0); }
  .auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .auth-spinner {
    display: inline-block; width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.25); border-top-color: #fff;
    border-radius: 50%; animation: auth-spin 0.7s linear infinite;
  }
  @keyframes auth-spin { to { transform: rotate(360deg); } }
  .auth-footer { margin-top: 1.5rem; text-align: center; font-size: 0.8125rem; color: #52525b; }
  .auth-footer a { color: #DC2626; text-decoration: none; font-weight: 600; transition: color 0.15s; }
  .auth-footer a:hover { color: #ef4444; }
`;