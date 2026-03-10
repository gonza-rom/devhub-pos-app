"use client";
// app/(app)/configuracion/afip/ConfiguracionAFIPClient.tsx

import { useState } from "react";
import { Upload, Save, AlertCircle, CheckCircle2, Loader2, FileText, Key, Shield } from "lucide-react";

type ConfigData = {
  id: string;
  cuit: string;
  razonSocial: string | null;
  puntoVenta: number;
  condicionFiscal: string;
  ambiente: string;
  activo: boolean;
  certificado: string;
  clavePrivada: string;
  ultimaConexion: string | null;
} | null;

type Props = {
  configInicial: ConfigData;
  tenantCuit?: string | null;
  tenantNombre?: string | null;
};

export default function ConfiguracionAFIPClient({ configInicial, tenantCuit, tenantNombre }: Props) {
  const [cuit, setCuit] = useState(configInicial?.cuit || tenantCuit || "");
  const [razonSocial, setRazonSocial] = useState(configInicial?.razonSocial || tenantNombre || "");
  const [puntoVenta, setPuntoVenta] = useState(configInicial?.puntoVenta || 1);
  const [condicionFiscal, setCondicionFiscal] = useState(configInicial?.condicionFiscal || "MT");
  const [ambiente, setAmbiente] = useState(configInicial?.ambiente || "testing");
  const [activo, setActivo] = useState(configInicial?.activo ?? true);

  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [clavePrivadaFile, setClavePrivadaFile] = useState<File | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<"exito" | "error" | null>(null);
  const [mensaje, setMensaje] = useState("");

  const handleGuardar = async () => {
    // Validaciones
    if (!cuit || cuit.length < 11) {
      setResultado("error");
      setMensaje("El CUIT debe tener 11 dígitos");
      return;
    }

    if (!configInicial && (!certificadoFile || !clavePrivadaFile)) {
      setResultado("error");
      setMensaje("Debes subir el certificado (.crt) y la clave privada (.key)");
      return;
    }

    setGuardando(true);
    setResultado(null);

    try {
      let certificadoContent = configInicial?.certificado || "";
      let clavePrivadaContent = configInicial?.clavePrivada || "";

      // Leer archivos si fueron seleccionados
      if (certificadoFile) {
        certificadoContent = await certificadoFile.text();
      }
      if (clavePrivadaFile) {
        clavePrivadaContent = await clavePrivadaFile.text();
      }

      const response = await fetch("/api/afip/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cuit: cuit.replace(/[-\s]/g, ""), // Quitar guiones
          razonSocial,
          puntoVenta,
          condicionFiscal,
          ambiente,
          activo,
          certificado: certificadoContent,
          clavePrivada: clavePrivadaContent,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setResultado("exito");
        setMensaje("Configuración guardada exitosamente");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setResultado("error");
        setMensaje(data.error || "Error al guardar");
      }
    } catch (error) {
      setResultado("error");
      setMensaje("Error de conexión");
    } finally {
      setGuardando(false);
    }
  };

  const tieneCertificados = configInicial?.certificado && configInicial?.clavePrivada;

  return (
    <div className="space-y-6">
      {/* Estado actual */}
      {configInicial && (
        <div
          className="rounded-xl p-4 border"
          style={{
            background: configInicial.activo ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
            borderColor: configInicial.activo ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Shield className={`h-5 w-5 ${configInicial.activo ? "text-green-400" : "text-amber-400"}`} />
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {configInicial.activo ? "Integración activa" : "Integración desactivada"}
            </p>
          </div>
          {configInicial.ultimaConexion && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Última conexión: {new Date(configInicial.ultimaConexion).toLocaleString("es-AR")}
            </p>
          )}
        </div>
      )}

      {/* Formulario */}
      <div
        className="rounded-xl p-6 border space-y-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}
      >
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Datos del Emisor
        </h2>

        {/* CUIT */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            CUIT <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            placeholder="20123456789"
            className="input-base w-full"
            maxLength={11}
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
            Sin guiones ni espacios
          </p>
        </div>

        {/* Razón Social */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            Razón Social
          </label>
          <input
            type="text"
            value={razonSocial}
            onChange={(e) => setRazonSocial(e.target.value)}
            placeholder="Mi Comercio S.R.L."
            className="input-base w-full"
          />
        </div>

        {/* Punto de Venta */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            Punto de Venta <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            value={puntoVenta}
            onChange={(e) => setPuntoVenta(parseInt(e.target.value) || 1)}
            min={1}
            max={9999}
            className="input-base w-32"
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
            Debe estar habilitado en AFIP
          </p>
        </div>

        {/* Condición Fiscal */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            Condición Fiscal <span className="text-red-400">*</span>
          </label>
          <select
            value={condicionFiscal}
            onChange={(e) => setCondicionFiscal(e.target.value)}
            className="input-base w-full md:w-64"
          >
            <option value="RI">Responsable Inscripto</option>
            <option value="MT">Monotributo</option>
            <option value="EX">Exento</option>
          </select>
          <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
            {condicionFiscal === "RI" && "Emite Factura A y B"}
            {condicionFiscal === "MT" && "Emite Factura C"}
            {condicionFiscal === "EX" && "Emite Factura C"}
          </p>
        </div>

        {/* Ambiente */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            Ambiente <span className="text-red-400">*</span>
          </label>
          <select
            value={ambiente}
            onChange={(e) => setAmbiente(e.target.value)}
            className="input-base w-full md:w-64"
          >
            <option value="testing">Testing (Homologación)</option>
            <option value="produccion">Producción</option>
          </select>
          <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
            Usá "Testing" para pruebas. Los CAE de testing no son válidos.
          </p>
        </div>

        {/* Activo */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              className="flex h-5 w-5 items-center justify-center rounded"
              style={{
                background: activo ? "#DC2626" : "transparent",
                border: activo ? "1px solid #DC2626" : "1px solid var(--border-strong)",
              }}
              onClick={() => setActivo(!activo)}
            >
              {activo && (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 12 12" stroke="#ffffff" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                </svg>
              )}
            </div>
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Activar integración AFIP
            </span>
          </label>
        </div>
      </div>

      {/* Certificados */}
      <div
        className="rounded-xl p-6 border space-y-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}
      >
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Certificados Digitales
        </h2>

        <div
          className="rounded-lg p-4 border"
          style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.3)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            <strong>¿Cómo obtener los certificados?</strong>
          </p>
          <ol className="text-xs mt-2 space-y-1" style={{ color: "var(--text-muted)" }}>
            <li>1. Ingresá a AFIP con Clave Fiscal</li>
            <li>2. Administrador de Relaciones de Clave Fiscal → Alta</li>
            <li>3. Elegí "Web Service Facturación Electrónica (WSFE)"</li>
            <li>4. Generá el certificado (.crt) y clave privada (.key)</li>
          </ol>
        </div>

        {/* Certificado .crt */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            Certificado (.crt) {!tieneCertificados && <span className="text-red-400">*</span>}
          </label>
          <div className="flex items-center gap-3">
            <label
              className="flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors"
              style={{
                background: "var(--bg-hover-md)",
                borderColor: "var(--border-md)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#DC2626")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--border-md)")}
            >
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">
                {certificadoFile ? certificadoFile.name : "Seleccionar .crt"}
              </span>
              <input
                type="file"
                accept=".crt,.pem"
                onChange={(e) => setCertificadoFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
            {tieneCertificados && !certificadoFile && (
              <span className="text-xs text-green-400">✓ Certificado configurado</span>
            )}
          </div>
        </div>

        {/* Clave Privada .key */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            Clave Privada (.key) {!tieneCertificados && <span className="text-red-400">*</span>}
          </label>
          <div className="flex items-center gap-3">
            <label
              className="flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors"
              style={{
                background: "var(--bg-hover-md)",
                borderColor: "var(--border-md)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#DC2626")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--border-md)")}
            >
              <Key className="h-4 w-4" />
              <span className="text-sm font-medium">
                {clavePrivadaFile ? clavePrivadaFile.name : "Seleccionar .key"}
              </span>
              <input
                type="file"
                accept=".key,.pem"
                onChange={(e) => setClavePrivadaFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
            {tieneCertificados && !clavePrivadaFile && (
              <span className="text-xs text-green-400">✓ Clave configurada</span>
            )}
          </div>
        </div>
      </div>

      {/* Resultado */}
      {resultado && (
        <div
          className="rounded-lg p-4 border"
          style={{
            background: resultado === "exito" ? "rgba(34,197,94,0.1)" : "rgba(220,38,38,0.1)",
            borderColor: resultado === "exito" ? "rgba(34,197,94,0.3)" : "rgba(220,38,38,0.3)",
          }}
        >
          <div className="flex items-center gap-2">
            {resultado === "exito" ? (
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400" />
            )}
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {mensaje}
            </p>
          </div>
        </div>
      )}

      {/* Botón Guardar */}
      <button
        onClick={handleGuardar}
        disabled={guardando}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
        style={{ background: "#DC2626", color: "#fff" }}
        onMouseEnter={(e) => {
          if (!guardando) (e.currentTarget as HTMLElement).style.background = "#B91C1C";
        }}
        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "#DC2626"}
      >
        {guardando ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            <Save className="h-5 w-5" />
            Guardar Configuración
          </>
        )}
      </button>
    </div>
  );
}