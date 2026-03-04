"use client";
// app/(public)/auth/registro/RegistroForm.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, Store, AlertCircle, CheckCircle2 } from "lucide-react";

export default function RegistroForm() {
  const [nombreUsuario,  setNombreUsuario]  = useState("");
  const [nombreComercio, setNombreComercio] = useState("");
  const [email,          setEmail]          = useState("");
  const [password,       setPassword]       = useState("");
  const [showPass,       setShowPass]       = useState(false);
  const [cargando,       setCargando]       = useState(false);
  const [error,          setError]          = useState("");
  const [exito,          setExito]          = useState(false);
  const router = useRouter();

  const passLen    = password.length >= 8;
  const passUpper  = /[A-Z]/.test(password);
  const passNum    = /[0-9]/.test(password);
  const passStrength = [passLen, passUpper, passNum].filter(Boolean).length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!passLen) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    setCargando(true);

    try {
      // 1. Crear cuenta (Supabase user + Tenant + cookie firmada)
      const res = await fetch("/api/auth/registro", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombreComercio, nombreUsuario, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al crear la cuenta"); return; }

      // 2. Login de Supabase para setear la cookie de sesión de Supabase.
      //    Sin esto el middleware no encuentra sesión y redirige al login.
      const loginRes = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!loginRes.ok) {
        // El registro funcionó igual — mandamos al login para que inicie sesión.
        router.push("/auth/login?registered=1");
        return;
      }

      // 3. Todo OK → dashboard
      setExito(true);
      router.refresh();
      setTimeout(() => router.push("/dashboard"), 1500);

    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  if (exito) {
    return (
      <div className="auth-shell">
        <div className="auth-glow" />
        <div className="auth-card auth-card-success">
          <div className="auth-success-icon">
            <CheckCircle2 className="h-8 w-8" style={{ color: "#22c55e" }} />
          </div>
          <h2 className="auth-success-title">¡Comercio creado!</h2>
          <p className="auth-success-sub">Redirigiendo a tu dashboard...</p>
          <span className="auth-spinner auth-spinner-green" />
        </div>
        <style>{authStyles}</style>
      </div>
    );
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
          <h1>Crear cuenta gratis</h1>
          <p>Tu comercio digital en minutos</p>
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">

          <div className="auth-row">
            <div className="auth-field">
              <label htmlFor="nombreUsuario">Tu nombre</label>
              <input
                id="nombreUsuario"
                type="text"
                autoComplete="given-name"
                placeholder="Juan García"
                value={nombreUsuario}
                onChange={e => setNombreUsuario(e.target.value)}
                required
                disabled={cargando}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="nombreComercio">Nombre del comercio</label>
              <input
                id="nombreComercio"
                type="text"
                placeholder="Mi Tienda"
                value={nombreComercio}
                onChange={e => setNombreComercio(e.target.value)}
                required
                disabled={cargando}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={cargando}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Contraseña</label>
            <div className="auth-pass-wrap">
              <input
                id="password"
                type={showPass ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={cargando}
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPass(!showPass)}
                tabIndex={-1}
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {password.length > 0 && (
              <div className="auth-strength">
                <div className="auth-strength-bars">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="auth-strength-bar" style={{
                      background: i < passStrength
                        ? passStrength === 1 ? "#ef4444" : passStrength === 2 ? "#f59e0b" : "#22c55e"
                        : "rgba(255,255,255,0.08)"
                    }} />
                  ))}
                </div>
                <span className="auth-strength-label">
                  {passStrength === 1 ? "Débil" : passStrength === 2 ? "Media" : passStrength === 3 ? "Fuerte" : ""}
                </span>
              </div>
            )}

            <div className="auth-hints">
              <span className={passLen   ? "hint-ok" : "hint-no"}>8+ caracteres</span>
              <span className={passUpper ? "hint-ok" : "hint-no"}>Mayúscula</span>
              <span className={passNum   ? "hint-ok" : "hint-no"}>Número</span>
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={cargando}>
            {cargando
              ? <span className="auth-spinner" />
              : <><ArrowRight className="h-4 w-4" />Crear cuenta gratis</>
            }
          </button>

          <p className="auth-terms">
            Al registrarte aceptás los{" "}
            <a href="/terminos" target="_blank" rel="noopener noreferrer">Términos de servicio</a>
            {" "}y la{" "}
            <a href="/privacidad" target="_blank" rel="noopener noreferrer">Política de privacidad</a>.
          </p>
        </form>

        <p className="auth-footer">
          ¿Ya tenés cuenta?{" "}
          <Link href="/auth/login">Iniciar sesión</Link>
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
    background: radial-gradient(ellipse at center, rgba(220,38,38,0.11) 0%, transparent 70%);
    pointer-events: none; z-index: 0;
  }
  .auth-card {
    position: relative; z-index: 1; width: 100%; max-width: 460px;
    background: #111111; border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px; padding: 2rem;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.03), 0 32px 64px rgba(0,0,0,0.6);
  }
  .auth-card-success {
    display: flex; flex-direction: column; align-items: center;
    gap: 12px; padding: 3rem 2rem; text-align: center;
  }
  .auth-success-icon {
    width: 64px; height: 64px; background: rgba(34,197,94,0.1);
    border: 1px solid rgba(34,197,94,0.25); border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
  }
  .auth-success-title { font-family: 'Syne', sans-serif; font-size: 1.375rem; font-weight: 700; color: #fff; margin: 0; }
  .auth-success-sub { font-size: 0.875rem; color: #71717a; margin: 0; }

  .auth-logo-wrap { display: flex; align-items: center; gap: 10px; margin-bottom: 1.75rem; }
  .auth-logo-icon {
    width: 36px; height: 36px; background: rgba(220,38,38,0.12);
    border: 1px solid rgba(220,38,38,0.25); border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
  }
  .auth-logo-text { font-family: 'Syne', sans-serif; font-size: 1rem; font-weight: 700; color: #fff; letter-spacing: -0.01em; }

  .auth-heading { margin-bottom: 1.5rem; }
  .auth-heading h1 {
    font-family: 'Syne', sans-serif; font-size: 1.5rem; font-weight: 700;
    color: #fff; margin: 0 0 0.375rem 0; letter-spacing: -0.02em; line-height: 1.2;
  }
  .auth-heading p { font-size: 0.875rem; color: #71717a; margin: 0; }

  .auth-error {
    display: flex; align-items: center; gap: 8px; padding: 10px 14px;
    background: rgba(220,38,38,0.08); border: 1px solid rgba(220,38,38,0.25);
    border-radius: 10px; color: #f87171; font-size: 0.8125rem; margin-bottom: 1.25rem;
  }
  .auth-form { display: flex; flex-direction: column; gap: 1rem; }
  .auth-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 480px) { .auth-row { grid-template-columns: 1fr; } }

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

  .auth-pass-wrap { position: relative; }
  .auth-pass-wrap input { padding-right: 42px; }
  .auth-eye {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    background: none; border: none; padding: 0; cursor: pointer;
    color: #52525b; display: flex; align-items: center; transition: color 0.15s;
  }
  .auth-eye:hover { color: #a1a1aa; }

  .auth-strength { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
  .auth-strength-bars { display: flex; gap: 4px; flex: 1; }
  .auth-strength-bar { height: 3px; flex: 1; border-radius: 99px; transition: background 0.3s; }
  .auth-strength-label { font-size: 0.6875rem; font-weight: 600; color: #52525b; white-space: nowrap; }

  .auth-hints { display: flex; gap: 8px; flex-wrap: wrap; }
  .hint-ok, .hint-no { font-size: 0.6875rem; font-weight: 500; padding: 2px 8px; border-radius: 99px; transition: all 0.2s; }
  .hint-ok { background: rgba(34,197,94,0.1); color: #4ade80; border: 1px solid rgba(34,197,94,0.2); }
  .hint-no { background: rgba(255,255,255,0.04); color: #52525b; border: 1px solid rgba(255,255,255,0.06); }

  .auth-submit {
    margin-top: 0.25rem; width: 100%; display: flex; align-items: center;
    justify-content: center; gap: 8px; padding: 11px 20px;
    background: #DC2626; border: none; border-radius: 10px;
    color: #fff; font-size: 0.9375rem; font-weight: 600;
    font-family: 'DM Sans', sans-serif; cursor: pointer;
    transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
  }
  .auth-submit:hover:not(:disabled) { background: #B91C1C; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(220,38,38,0.3); }
  .auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }

  .auth-spinner {
    display: inline-block; width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.25); border-top-color: #fff;
    border-radius: 50%; animation: auth-spin 0.7s linear infinite;
  }
  .auth-spinner-green { border-color: rgba(34,197,94,0.25); border-top-color: #22c55e; }
  @keyframes auth-spin { to { transform: rotate(360deg); } }

  .auth-terms { text-align: center; font-size: 0.75rem; color: #3f3f46; margin: 0; line-height: 1.5; }
  .auth-terms a { color: #52525b; text-decoration: underline; text-decoration-color: rgba(255,255,255,0.1); }
  .auth-terms a:hover { color: #a1a1aa; }

  .auth-footer { margin-top: 1.5rem; text-align: center; font-size: 0.8125rem; color: #52525b; }
  .auth-footer a { color: #DC2626; text-decoration: none; font-weight: 600; }
  .auth-footer a:hover { color: #ef4444; }
`;