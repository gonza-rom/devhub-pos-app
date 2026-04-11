"use client";
// app/(app)/configuracion/page.tsx

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Store, MapPin, Phone, Mail, FileText, Save, Upload,
  CheckCircle, AlertCircle, Building2, Globe, Instagram, Facebook,
  ExternalLink, Link2,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import TurnosConfig from "./TurnosConfig";

// ── Tipos ─────────────────────────────────────────────────────

type Comercio = {
  id: string;
  slug: string;          // ← agregado
  nombre: string;
  logo: string | null;
  logoUrl: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  cuit: string | null;
  descripcion: string | null;
  sitioWeb: string | null;
  instagram: string | null;
  facebook: string | null;
  ciudad: string | null;
  provincia: string | null;
};

type Toast = { tipo: "ok" | "error"; mensaje: string } | null;

// ── Toast ─────────────────────────────────────────────────────

function ToastMsg({ toast }: { toast: Toast }) {
  if (!toast) return null;
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3.5 shadow-xl text-sm font-semibold transition-all",
      toast.tipo === "ok" ? "bg-green-600 text-white" : "bg-red-600 text-white"
    )}>
      {toast.tipo === "ok"
        ? <CheckCircle className="h-4 w-4 flex-shrink-0" />
        : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
      {toast.mensaje}
    </div>
  );
}

// ── CopiarLinkBtn ─────────────────────────────────────────────

function CopiarLinkBtn({ slug }: { slug: string }) {
  const [copiado, setCopiado] = useState(false);

  function copiar() {
    const url = `${window.location.origin}/catalogo/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return (
    <button
      onClick={copiar}
      className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
      style={{
        background: copiado ? "rgba(34,197,94,0.12)" : "rgba(220,38,38,0.1)",
        color:      copiado ? "#16a34a"               : "#DC2626",
      }}
    >
      {copiado
        ? <><CheckCircle className="h-3.5 w-3.5" /> Copiado</>
        : <><Link2 className="h-3.5 w-3.5" /> Copiar link</>
      }
    </button>
  );
}

// ── Componente principal ──────────────────────────────────────

export default function ConfiguracionPage() {
  const router = useRouter();
  const [form,          setForm]          = useState<Partial<Comercio>>({});
  const [loading,       setLoading]       = useState(true);
  const [guardando,     setGuardando]     = useState(false);
  const [toast,         setToast]         = useState<Toast>(null);
  const [logoPreview,   setLogoPreview]   = useState<string | null>(null);
  const [subiendoLogo,  setSubiendoLogo]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchComercio(); }, []);

  const fetchComercio = async () => {
    try {
      const res  = await fetch("/api/configuracion");
      const data = await res.json();
      const c    = data.data ?? data;
      setForm(c);
      if (c.logoUrl) setLogoPreview(c.logoUrl);
    } catch {
      mostrarToast("error", "Error al cargar la configuración");
    } finally {
      setLoading(false);
    }
  };

  const mostrarToast = (tipo: "ok" | "error", mensaje: string) => {
    setToast({ tipo, mensaje });
    setTimeout(() => setToast(null), 3500);
  };

  const handleGuardar = async () => {
    if (!form.nombre?.trim()) {
      mostrarToast("error", "El nombre del comercio es obligatorio");
      return;
    }
    setGuardando(true);
    try {
      const res  = await fetch("/api/configuracion", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      mostrarToast("ok", "Configuración guardada correctamente");
      router.refresh();
      window.dispatchEvent(new CustomEvent("tenant-config-updated", { detail: { nombre: form.nombre, logoUrl: form.logoUrl } }));
    } catch (err: any) {
      mostrarToast("error", err.message ?? "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];
    if (!tiposPermitidos.includes(file.type)) {
      mostrarToast("error", "Formato no permitido. Usá JPG, PNG o WebP");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      mostrarToast("error", "El logo no puede superar los 2 MB");
      return;
    }
    setSubiendoLogo(true);
    try {
      const cloudName    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", uploadPreset);
      fd.append("folder", "devhubpos/logos");

      const cloudRes  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: fd });
      const cloudData = await cloudRes.json();
      if (!cloudRes.ok) throw new Error(cloudData.error?.message ?? "Error al subir a Cloudinary");

      const url  = cloudData.secure_url as string;
      const res  = await fetch("/api/configuracion/logo", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar logo");

      setLogoPreview(url);
      setForm((prev) => ({ ...prev, logoUrl: url }));
      mostrarToast("ok", "Logo actualizado");
      router.refresh();
      window.dispatchEvent(new CustomEvent("tenant-logo-updated", { detail: { url } }));
    } catch (err: any) {
      mostrarToast("error", err.message ?? "Error al subir logo");
    } finally {
      setSubiendoLogo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const set = (key: keyof Comercio) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const urlCatalogo = typeof window !== "undefined" && form.slug
    ? `${window.location.origin}/catalogo/${form.slug}`
    : form.slug ? `/catalogo/${form.slug}` : null;

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Store className="h-6 w-6" /> Configuración del Comercio
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Datos que aparecen en tus tickets y reportes
          </p>
        </div>
        <button onClick={handleGuardar} disabled={guardando}
          className="flex items-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-5 py-2.5 text-sm font-semibold transition-colors shadow-sm">
          <Save className="h-4 w-4" />
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {/* ── Catálogo público ── */}
      {form.slug && (
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
            <ExternalLink className="h-4 w-4" /> Tu catálogo público
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Compartí este link con tus clientes para que vean tus productos disponibles.
          </p>

          {/* URL copiable */}
          <div className="flex items-center gap-2 rounded-xl px-4 py-3"
            style={{ background: "var(--bg-input, rgba(0,0,0,0.04))", border: "1px solid var(--border-base)" }}>
            <span className="text-sm flex-1 truncate font-mono" style={{ color: "var(--text-primary)" }}>
              {urlCatalogo ?? `/catalogo/${form.slug}`}
            </span>
            <CopiarLinkBtn slug={form.slug} />
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-3">
            <a
              href={`/catalogo/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
              style={{ background: "#DC2626", color: "#fff" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#b91c1c"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#DC2626"}
            >
              <ExternalLink className="h-4 w-4" />
              Abrir catálogo
            </a>
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>
              Se abre en una nueva pestaña
            </p>
          </div>
        </div>
      )}

      {/* ── Logo ── */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Logo del Comercio
        </h2>
        <div className="flex items-center gap-6">
          <div className="relative h-24 w-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-hidden flex items-center justify-center flex-shrink-0">
            {logoPreview ? (
              <Image src={logoPreview} alt="Logo" fill className="object-contain p-1" />
            ) : (
              <Store className="h-10 w-10 text-gray-300 dark:text-gray-600" />
            )}
            {subiendoLogo && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
                <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              PNG, JPG o WebP · Máx. 2 MB · Recomendado 400×400px
            </p>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            <button onClick={() => fileRef.current?.click()} disabled={subiendoLogo}
              className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50">
              <Upload className="h-4 w-4" />
              {subiendoLogo ? "Subiendo..." : "Cambiar logo"}
            </button>
            {logoPreview && (
              <button onClick={async () => {
                setLogoPreview(null);
                setForm((p) => ({ ...p, logoUrl: null }));
                try {
                  await fetch("/api/configuracion", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...form, logoUrl: null }),
                  });
                  router.refresh();
                } catch {}
              }} className="text-xs text-red-500 hover:text-red-700 transition-colors">
                Quitar logo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Datos principales ── */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2 flex items-center gap-2">
          <Store className="h-4 w-4" /> Datos del Comercio
        </h2>
        <div>
          <label className="label-base">Nombre del comercio *</label>
          <input type="text" value={form.nombre ?? ""} onChange={set("nombre")}
            placeholder="Ej: JMR Accesorios" className="input-base" />
        </div>
        <div>
          <label className="label-base">Descripción breve</label>
          <textarea value={form.descripcion ?? ""} onChange={set("descripcion")}
            placeholder="Ej: Venta de accesorios de moda al por mayor y menor"
            rows={2} className="input-base resize-none" />
        </div>
        <div>
          <label className="label-base flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" /> CUIT
          </label>
          <input type="text" value={form.cuit ?? ""} onChange={set("cuit")}
            placeholder="20-12345678-9" className="input-base" />
        </div>
      </div>

      {/* ── Contacto ── */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2 flex items-center gap-2">
          <Phone className="h-4 w-4" /> Contacto
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-base flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Teléfono</label>
            <input type="tel" value={form.telefono ?? ""} onChange={set("telefono")}
              placeholder="+54 9 11 1234-5678" className="input-base" />
          </div>
          <div>
            <label className="label-base flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email</label>
            <input type="email" value={form.email ?? ""} onChange={set("email")}
              placeholder="contacto@micomercio.com" className="input-base" />
          </div>
        </div>
      </div>

      {/* ── Ubicación ── */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2 flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Ubicación
        </h2>
        <div>
          <label className="label-base">Dirección</label>
          <input type="text" value={form.direccion ?? ""} onChange={set("direccion")}
            placeholder="Av. Corrientes 1234, Piso 3" className="input-base" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-base">Ciudad</label>
            <input type="text" value={form.ciudad ?? ""} onChange={set("ciudad")}
              placeholder="Buenos Aires" className="input-base" />
          </div>
          <div>
            <label className="label-base">Provincia</label>
            <input type="text" value={form.provincia ?? ""} onChange={set("provincia")}
              placeholder="CABA" className="input-base" />
          </div>
        </div>
      </div>

      {/* ── Redes y web ── */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2 flex items-center gap-2">
          <Globe className="h-4 w-4" /> Web y Redes Sociales
        </h2>
        <div>
          <label className="label-base flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> Sitio web</label>
          <input type="url" value={form.sitioWeb ?? ""} onChange={set("sitioWeb")}
            placeholder="https://micomercio.com" className="input-base" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-base flex items-center gap-1"><Instagram className="h-3.5 w-3.5" /> Instagram</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
              <input type="text" value={form.instagram ?? ""} onChange={set("instagram")}
                placeholder="micomercio" className="input-base pl-7" />
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
              Solo el usuario, sin @
            </p>
          </div>
          <div>
            <label className="label-base flex items-center gap-1"><Facebook className="h-3.5 w-3.5" /> Facebook</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
              <input type="text" value={form.facebook ?? ""} onChange={set("facebook")}
                placeholder="micomercio" className="input-base pl-7" />
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
              Solo el usuario, sin @
            </p>
          </div>
        </div>
      </div>

      <TurnosConfig />

      {/* ── Botón guardar bottom ── */}
      <div className="flex justify-end pb-4">
        <button onClick={handleGuardar} disabled={guardando}
          className="flex items-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-6 py-2.5 text-sm font-semibold transition-colors shadow-sm">
          <Save className="h-4 w-4" />
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      <ToastMsg toast={toast} />
    </div>
  );
}