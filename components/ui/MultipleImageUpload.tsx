"use client";
// components/ui/MultipleImageUpload.tsx

import { useState } from "react";
import {
  Upload, X, Image as ImageIcon,
  Loader2, CheckCircle2, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  maxImagenes?: number;
  folder?: string;
};

export default function MultipleImageUpload({
  value = [],
  onChange,
  maxImagenes = 10,
  folder = "devhub-pos/productos",
}: Props) {
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState("");

  const imagenes = Array.isArray(value) ? value : [];

  // ── Subir una imagen a Cloudinary ─────────────────────────

  async function subirACloudinary(file: File): Promise<string> {
    const cloudName  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET ?? "devhub-pos";

    if (!cloudName) {
      throw new Error("Falta NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME en el .env");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", folder);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: formData }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message ?? "Error al subir imagen");
    }

    return data.secure_url as string;
  }

  // ── Manejar selección de archivos ─────────────────────────

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    // Reset input para permitir subir el mismo archivo de nuevo
    e.target.value = "";

    if (imagenes.length + files.length > maxImagenes) {
      setError(`Máximo ${maxImagenes} imágenes por producto`);
      return;
    }

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > 20 * 1024 * 1024) {
      setError("El tamaño total no puede superar 20MB");
      return;
    }

    setSubiendo(true);
    setError("");
    setProgreso(0);

    const urls: string[] = [];
    const errores: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.type.startsWith("image/")) {
        errores.push(`${file.name}: no es una imagen`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        errores.push(`${file.name}: supera 5MB`);
        continue;
      }

      try {
        const url = await subirACloudinary(file);
        urls.push(url);
        setProgreso(Math.round(((i + 1) / files.length) * 100));
      } catch (err: any) {
        errores.push(`${file.name}: ${err.message}`);
      }
    }

    if (urls.length > 0) {
      onChange([...imagenes, ...urls]);
    }
    if (errores.length > 0) {
      setError(errores.join(" · "));
    }

    setSubiendo(false);
    setProgreso(0);
  }

  // ── Operaciones sobre el array ────────────────────────────

  function eliminar(index: number) {
    onChange(imagenes.filter((_, i) => i !== index));
  }

  function setPrincipal(index: number) {
    const copia = [...imagenes];
    const [img] = copia.splice(index, 1);
    onChange([img, ...copia]);
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Label */}
      <div className="flex items-center justify-between">
        <span className="label-base mb-0" style={{ color: "var(--text-primary)" }}>Imágenes del producto</span>
        {imagenes.length > 0 && (
          <span className="text-xs" style={{ color: "var(--text-primary)" }}>
            {imagenes.length} / {maxImagenes}
          </span>
        )}
      </div>

      {/* Zona de drop */}
      <label
        htmlFor="img-upload"
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
          subiendo
            ? "border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/10"
            : "border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-600 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        )}
      >
        <input
          id="img-upload"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={subiendo || imagenes.length >= maxImagenes}
          className="hidden"
        />

        {subiendo ? (
          <>
            <Loader2 className="h-10 w-10 text-primary-500 animate-spin" />
            <div className="space-y-2 w-48">
              <p className="text-sm font-medium text-primary-600 dark:text-primary-400">
                Subiendo... {progreso}%
              </p>
              <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-300"
                  style={{ width: `${progreso}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
              <Upload className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Hacé click para subir imágenes
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                PNG, JPG, WebP · Máx. 5MB por imagen · Hasta {maxImagenes} imágenes
              </p>
            </div>
          </>
        )}
      </label>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Grid de previews */}
      {imagenes.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {imagenes.map((url, index) => (
            <div key={url} className="relative group">
              <div
                className={cn(
                  "relative h-24 rounded-xl overflow-hidden border-2 transition-all",
                  index === 0
                    ? "border-primary-500 shadow-sm shadow-primary-200 dark:shadow-primary-900"
                    : "border-gray-200 dark:border-gray-700 group-hover:border-gray-300"
                )}
              >
                <img
                  src={url}
                  alt={`Imagen ${index + 1}`}
                  className="h-full w-full object-cover"
                />

                {/* Badge principal */}
                {index === 0 && (
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 bg-primary-600/90 py-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                    <span className="text-[9px] font-bold text-white">PRINCIPAL</span>
                  </div>
                )}

                {/* Overlay con acciones */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {index !== 0 && (
                    <button
                      type="button"
                      onClick={() => setPrincipal(index)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-900 hover:bg-gray-100 transition-colors"
                      title="Poner como principal"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => eliminar(index)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                    title="Eliminar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estado vacío */}
      {imagenes.length === 0 && !subiendo && (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <ImageIcon className="h-10 w-10 text-gray-200 dark:text-gray-700" />
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Sin imágenes · La primera que subas será la principal
          </p>
        </div>
      )}
    </div>
  );
}