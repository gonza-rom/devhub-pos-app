// lib/email.ts
// Emails automáticos con Resend
// - emailPagoFallido: se llama desde el webhook de MercadoPago
// - emailTrialVencido: se llama desde el cron job o al hacer login

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = "DevHub POS <devhub@jmrmarroquineria.com.ar>"; // cambiá por tu dominio verificado en Resend
const APP_URL        = (process.env.NEXT_PUBLIC_APP_URL ?? "https://devhub-pos.vercel.app").replace(/\/$/, "");

async function enviarEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY no definido — email no enviado");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });

    if (!res.ok) {
      const error = await res.json();
      console.error("[Email] Error Resend:", error);
      return false;
    }

    console.log(`[Email] Enviado a ${to}: ${subject}`);
    return true;
  } catch (err) {
    console.error("[Email] Error enviando:", err);
    return false;
  }
}

// ── Template base ─────────────────────────────────────────────
function templateBase(contenido: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DevHub POS</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(220,38,38,0.12);border:1px solid rgba(220,38,38,0.25);border-radius:10px;padding:10px 14px;">
                    <span style="font-size:16px;font-weight:700;color:#fff;letter-spacing:-0.3px;">DevHub POS</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#111111;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:40px 36px;">
              ${contenido}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#3f3f46;">
                DevHub POS · Si tenés preguntas respondé este email
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Email: Pago fallido ───────────────────────────────────────
export async function emailPagoFallido({
  emailDestino,
  nombreComercio,
  nombreUsuario,
}: {
  emailDestino:  string;
  nombreComercio: string;
  nombreUsuario:  string;
}): Promise<boolean> {
  const html = templateBase(`
    <!-- Ícono -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:rgba(220,38,38,0.1);border:1px solid rgba(220,38,38,0.25);border-radius:50%;width:64px;height:64px;line-height:64px;text-align:center;">
        <span style="font-size:28px;">⚠️</span>
      </div>
    </div>

    <!-- Título -->
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff;text-align:center;">
      Problema con tu pago
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:#71717a;text-align:center;line-height:1.6;">
      Hola ${nombreUsuario}, no pudimos procesar el pago de <strong style="color:#a1a1aa;">${nombreComercio}</strong>.
    </p>

    <!-- Info box -->
    <div style="background:rgba(220,38,38,0.06);border:1px solid rgba(220,38,38,0.2);border-radius:12px;padding:20px;margin-bottom:28px;">
      <p style="margin:0 0 8px;font-size:13px;color:#f87171;font-weight:600;">¿Qué pasó?</p>
      <p style="margin:0;font-size:13px;color:#a1a1aa;line-height:1.6;">
        MercadoPago rechazó el cobro de tu suscripción Plan Pro. Tu cuenta fue cambiada al plan gratuito temporalmente.
      </p>
    </div>

    <!-- Lo que perdés -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;margin-bottom:28px;">
      <p style="margin:0 0 12px;font-size:13px;color:#71717a;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Con el plan gratuito perdés</p>
      <p style="margin:4px 0;font-size:13px;color:#a1a1aa;">❌ Productos ilimitados</p>
      <p style="margin:4px 0;font-size:13px;color:#a1a1aa;">❌ Múltiples usuarios</p>
      <p style="margin:4px 0;font-size:13px;color:#a1a1aa;">❌ Estadísticas avanzadas</p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:20px;">
      <a href="${APP_URL}/configuracion/plan"
        style="display:inline-block;background:#DC2626;color:#fff;text-decoration:none;padding:13px 32px;border-radius:10px;font-size:15px;font-weight:600;">
        Actualizar método de pago →
      </a>
    </div>

    <p style="margin:0;font-size:12px;color:#52525b;text-align:center;line-height:1.6;">
      Si creés que es un error de tu banco o tarjeta, intentá con otro método de pago.<br/>
      Tu historial de ventas y productos están intactos.
    </p>
  `);

  return enviarEmail(emailDestino, "⚠️ Problema con tu pago — DevHub POS", html);
}

// ── Email: Trial vencido ──────────────────────────────────────
export async function emailTrialVencido({
  emailDestino,
  nombreComercio,
  nombreUsuario,
}: {
  emailDestino:   string;
  nombreComercio: string;
  nombreUsuario:  string;
}): Promise<boolean> {
  const html = templateBase(`
    <!-- Ícono -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:50%;width:64px;height:64px;line-height:64px;text-align:center;">
        <span style="font-size:28px;">⏰</span>
      </div>
    </div>

    <!-- Título -->
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff;text-align:center;">
      Tu período de prueba terminó
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:#71717a;text-align:center;line-height:1.6;">
      Hola ${nombreUsuario}, los 7 días de prueba de <strong style="color:#a1a1aa;">${nombreComercio}</strong> llegaron a su fin.
    </p>

    <!-- Lo que usaste -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:13px;color:#71717a;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Con el Plan Pro seguís teniendo</p>
      <p style="margin:4px 0;font-size:13px;color:#a1a1aa;">✅ Productos ilimitados</p>
      <p style="margin:4px 0;font-size:13px;color:#a1a1aa;">✅ Hasta 10 usuarios</p>
      <p style="margin:4px 0;font-size:13px;color:#a1a1aa;">✅ Estadísticas y reportes</p>
      <p style="margin:4px 0;font-size:13px;color:#a1a1aa;">✅ Soporte prioritario</p>
    </div>

    <!-- Precio -->
    <div style="background:rgba(220,38,38,0.06);border:1px solid rgba(220,38,38,0.2);border-radius:12px;padding:20px;margin-bottom:28px;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;color:#71717a;">Plan Pro</p>
      <p style="margin:0;font-size:28px;font-weight:800;color:#fff;">$35.000 <span style="font-size:14px;font-weight:400;color:#71717a;">ARS/mes</span></p>
      <p style="margin:4px 0 0;font-size:12px;color:#52525b;">Sin permanencia · Cancelás cuando querés</p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:20px;">
      <a href="${APP_URL}/configuracion/plan"
        style="display:inline-block;background:#DC2626;color:#fff;text-decoration:none;padding:13px 32px;border-radius:10px;font-size:15px;font-weight:600;">
        Activar Plan Pro →
      </a>
    </div>

    <p style="margin:0;font-size:12px;color:#52525b;text-align:center;line-height:1.6;">
      También podés pagar por transferencia bancaria.<br/>
      Respondé este email y te mandamos los datos.
    </p>
  `);

  return enviarEmail(emailDestino, "⏰ Tu prueba gratuita terminó — DevHub POS", html);
}

// ── Email: Trial por vencer (día 5) ──────────────────────────
export async function emailTrialPorVencer({
  emailDestino,
  nombreComercio,
  nombreUsuario,
  diasRestantes,
}: {
  emailDestino:   string;
  nombreComercio: string;
  nombreUsuario:  string;
  diasRestantes:  number;
}): Promise<boolean> {
  const html = templateBase(`
    <!-- Ícono -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:50%;width:64px;height:64px;line-height:64px;text-align:center;">
        <span style="font-size:28px;">🕐</span>
      </div>
    </div>

    <!-- Título -->
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff;text-align:center;">
      Te ${diasRestantes === 1 ? "queda 1 día" : `quedan ${diasRestantes} días"}`} de prueba
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:#71717a;text-align:center;line-height:1.6;">
      Hola ${nombreUsuario}, tu prueba de <strong style="color:#a1a1aa;">${nombreComercio}</strong> está por terminar.
    </p>

    <!-- Info -->
    <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:20px;margin-bottom:28px;">
      <p style="margin:0;font-size:13px;color:#a1a1aa;line-height:1.6;">
        Cuando termine el período de prueba, tu cuenta volverá al plan gratuito con límite de 50 productos y 1 usuario.
        <strong style="color:#fbbf24;">Activá el Plan Pro ahora para no perder acceso.</strong>
      </p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:20px;">
      <a href="${APP_URL}/configuracion/plan"
        style="display:inline-block;background:#DC2626;color:#fff;text-decoration:none;padding:13px 32px;border-radius:10px;font-size:15px;font-weight:600;">
        Ver planes →
      </a>
    </div>

    <p style="margin:0;font-size:12px;color:#52525b;text-align:center;">
      $35.000 ARS/mes · Sin permanencia
    </p>
  `);

  return enviarEmail(emailDestino, `🕐 Te ${diasRestantes === 1 ? "queda 1 día" : `quedan ${diasRestantes} días`} de prueba — DevHub POS`, html);
}