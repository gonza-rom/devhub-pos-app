"use client";
// app/(public)/catalogo/[slug]/CatalogoClient.tsx

import { useState, useMemo, useCallback } from "react";
import {
  Search, X, MapPin, Instagram, Facebook, MessageCircle,
  Package, Tag, ShoppingCart, ChevronDown, SlidersHorizontal,
  Plus, Minus, Trash2, Share2, Check, ExternalLink,
} from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────

type Tenant = {
  id: string; nombre: string; logoUrl: string | null;
  telefono: string | null; direccion: string | null;
  ciudad: string | null; descripcion: string | null;
  instagram: string | null; facebook: string | null;
};

type Categoria = { id: string; nombre: string };

type Variante = {
  id: string; talle: string | null; color: string;
  stock: number; precio: number | null;
};

type Producto = {
  id: string; nombre: string; descripcion: string | null;
  precio: number; imagen: string | null; imagenes: string[];
  categoria: Categoria | null;
  tieneVariantes?: boolean;
  variantes?: Variante[];
};

type ItemCarrito = {
  productoId: string;
  varianteId?: string;
  nombre: string;
  detalle?: string;
  precio: number;
  cantidad: number;
  imagen: string | null;
};

type Props = {
  tenant: Tenant;
  productos: Producto[];
  categorias: Categoria[];
};

// ── Helpers ──────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const limpiarTel = (tel: string) => tel.replace(/\D/g, "");

function waLink(tel: string, msg: string) {
  return `https://wa.me/${limpiarTel(tel)}?text=${encodeURIComponent(msg)}`;
}

// Normaliza el link de Instagram — acepta @usuario, usuario o URL completa
function instagramUrl(ig: string): string {
  if (!ig) return "#";
  // Ya es una URL completa
  if (ig.startsWith("http://") || ig.startsWith("https://")) return ig;
  // Es @usuario o usuario
  const usuario = ig.replace(/^@/, "").trim();
  return `https://www.instagram.com/${usuario}`;
}

// Normaliza el link de Facebook — acepta URL completa o nombre de página
function facebookUrl(fb: string): string {
  if (!fb) return "#";
  if (fb.startsWith("http://") || fb.startsWith("https://")) return fb;
  return `https://www.facebook.com/${fb.trim()}`;
}

// ── Modal de producto ────────────────────────────────────────

function ModalProducto({
  producto, tenant, onCerrar, onAgregarCarrito,
}: {
  producto: Producto;
  tenant: Tenant;
  onCerrar: () => void;
  onAgregarCarrito: (item: ItemCarrito) => void;
}) {
  const imagenes = producto.imagenes?.length ? producto.imagenes : producto.imagen ? [producto.imagen] : [];
  const [imgActiva, setImgActiva] = useState(0);
  const [talleSelec, setTalleSelec] = useState<string | null>(null);
  const [colorSelec, setColorSelec] = useState<string | null>(null);
  const [agregado,   setAgregado]   = useState(false);

  const variantes = producto.variantes ?? [];
  const talles    = [...new Set(variantes.map(v => v.talle).filter(Boolean))] as string[];
  const colores   = [...new Set(variantes.map(v => v.color).filter(Boolean))];

  const varianteActual = variantes.find(v =>
    (talles.length === 0 || v.talle === talleSelec) && v.color === colorSelec
  );

  const precio      = varianteActual?.precio ?? producto.precio;
  const stockActual = producto.tieneVariantes ? (varianteActual?.stock ?? 0) : 999;
  const sinStock    = producto.tieneVariantes && (!varianteActual || stockActual === 0);

  const coloresParaTalle = talleSelec
    ? [...new Set(variantes.filter(v => v.talle === talleSelec).map(v => v.color))]
    : colores;

  function handleAgregar() {
    const detalle = [talleSelec, colorSelec].filter(Boolean).join(" · ");
    onAgregarCarrito({
      productoId: producto.id,
      varianteId: varianteActual?.id,
      nombre:     producto.nombre,
      detalle:    detalle || undefined,
      precio,
      cantidad:   1,
      imagen:     imagenes[0] ?? null,
    });
    setAgregado(true);
    setTimeout(() => { setAgregado(false); onCerrar(); }, 800);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
      onClick={onCerrar}>
      <div
        className="w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden"
        style={{ background: "#fff", borderRadius: "24px 24px 0 0", boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}
        onClick={e => e.stopPropagation()}>

        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div style={{ width: 36, height: 4, borderRadius: 99, background: "#e5e7eb" }} />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid sm:grid-cols-2">
            {/* Imágenes */}
            <div style={{ background: "#f8f8f8", position: "relative" }}>
              <div style={{ aspectRatio: "1/1" }}>
                {imagenes.length > 0 ? (
                  <img src={imagenes[imgActiva]?.replace("/upload/", "/upload/f_auto,q_auto,w_600/")}
                    alt={producto.nombre} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package style={{ width: 48, height: 48, color: "#d1d5db" }} />
                  </div>
                )}
                <button onClick={onCerrar}
                  className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: "rgba(255,255,255,0.9)", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
              {imagenes.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {imagenes.map((img, i) => (
                    <button key={i} onClick={() => setImgActiva(i)}
                      className="flex-shrink-0 h-12 w-12 rounded-lg overflow-hidden"
                      style={{ border: i === imgActiva ? "2px solid #111827" : "2px solid transparent" }}>
                      <img src={img.replace("/upload/", "/upload/f_auto,q_auto,w_100/")} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-5 space-y-4 flex flex-col">
              {producto.categoria && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full inline-block"
                  style={{ background: "#f3f4f6", color: "#6b7280" }}>
                  {producto.categoria.nombre}
                </span>
              )}
              <div>
                <h2 className="font-bold text-xl leading-tight" style={{ color: "#111827" }}>{producto.nombre}</h2>
                {producto.descripcion && (
                  <p className="text-sm mt-2 leading-relaxed" style={{ color: "#6b7280" }}>{producto.descripcion}</p>
                )}
              </div>
              <p className="text-2xl font-bold" style={{ color: "#111827" }}>{fmt(precio)}</p>

              {talles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Talle</p>
                  <div className="flex flex-wrap gap-2">
                    {talles.map(t => {
                      const disp = variantes.some(v => v.talle === t && v.stock > 0);
                      return (
                        <button key={t} onClick={() => setTalleSelec(t === talleSelec ? null : t)}
                          disabled={!disp}
                          className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                          style={{ background: talleSelec === t ? "#111827" : "#f3f4f6", color: talleSelec === t ? "#fff" : "#374151" }}>
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {colores.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Color</p>
                  <div className="flex flex-wrap gap-2">
                    {coloresParaTalle.map(c => {
                      const disp = variantes.some(v => v.color === c && (talles.length === 0 || v.talle === talleSelec) && v.stock > 0);
                      return (
                        <button key={c} onClick={() => setColorSelec(c === colorSelec ? null : c)}
                          disabled={!disp}
                          className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                          style={{ background: colorSelec === c ? "#111827" : "#f3f4f6", color: colorSelec === c ? "#fff" : "#374151" }}>
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {sinStock && <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>Sin stock para esta combinación</p>}

              <div className="flex flex-col gap-2 pt-2 mt-auto">
                <button onClick={handleAgregar} disabled={sinStock || agregado}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-50"
                  style={{ background: agregado ? "#16a34a" : "#111827", color: "#fff" }}>
                  {agregado
                    ? <><Check style={{ width: 16, height: 16 }} /> Agregado</>
                    : <><ShoppingCart style={{ width: 16, height: 16 }} /> Agregar al carrito</>
                  }
                </button>
                {tenant.telefono && (
                  <a href={waLink(tenant.telefono, `Hola, quiero consultar por: ${producto.nombre}`)}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold"
                    style={{ background: "#dcfce7", color: "#16a34a" }}>
                    <MessageCircle style={{ width: 16, height: 16 }} /> Consultar por WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Carrito sidebar ──────────────────────────────────────────

function CarritoSidebar({
  items, tenant, onCerrar, onCambiarCantidad, onEliminar,
}: {
  items: ItemCarrito[];
  tenant: Tenant;
  onCerrar: () => void;
  onCambiarCantidad: (key: string, delta: number) => void;
  onEliminar: (key: string) => void;
}) {
  const total    = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  const cantidad = items.reduce((acc, i) => acc + i.cantidad, 0);

  const mensajeWA = () => {
    const lineas = items.map(i => `• ${i.nombre}${i.detalle ? ` (${i.detalle})` : ""} x${i.cantidad} — ${fmt(i.precio * i.cantidad)}`);
    return `Hola! Me gustaría hacer el siguiente pedido:\n\n${lineas.join("\n")}\n\n*Total: ${fmt(total)}*`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={onCerrar}>
      <div className="w-full max-w-sm h-full flex flex-col"
        style={{ background: "#fff", boxShadow: "-8px 0 40px rgba(0,0,0,0.15)" }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid #f0f0f0" }}>
          <div className="flex items-center gap-2">
            <ShoppingCart style={{ width: 20, height: 20 }} />
            <span className="font-bold text-base" style={{ color: "#111827" }}>Carrito ({cantidad})</span>
          </div>
          <button onClick={onCerrar}><X style={{ width: 20, height: 20, color: "#9ca3af" }} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <ShoppingCart style={{ width: 40, height: 40, color: "#e5e7eb", marginBottom: 12 }} />
              <p className="font-semibold text-sm" style={{ color: "#374151" }}>El carrito está vacío</p>
              <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>Agregá productos para consultar</p>
            </div>
          ) : items.map(item => {
            const key = `${item.productoId}_${item.varianteId ?? ""}`;
            return (
              <div key={key} className="flex gap-3 rounded-xl p-3" style={{ background: "#f9fafb", border: "1px solid #f0f0f0" }}>
                <div className="h-14 w-14 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "#f3f4f6" }}>
                  {item.imagen
                    ? <img src={item.imagen.replace("/upload/", "/upload/f_auto,q_auto,w_100/")} alt={item.nombre} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Package style={{ width: 20, height: 20, color: "#d1d5db" }} /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "#111827" }}>{item.nombre}</p>
                  {item.detalle && <p className="text-xs" style={{ color: "#9ca3af" }}>{item.detalle}</p>}
                  <p className="text-sm font-bold mt-1" style={{ color: "#111827" }}>{fmt(item.precio * item.cantidad)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button onClick={() => onEliminar(key)}>
                    <Trash2 style={{ width: 14, height: 14, color: "#d1d5db" }} />
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onCambiarCantidad(key, -1)}
                      className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: "#e5e7eb" }}>
                      <Minus style={{ width: 10, height: 10 }} />
                    </button>
                    <span className="text-sm font-semibold w-5 text-center" style={{ color: "#111827" }}>{item.cantidad}</span>
                    <button onClick={() => onCambiarCantidad(key, 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: "#111827" }}>
                      <Plus style={{ width: 10, height: 10, color: "#fff" }} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {items.length > 0 && (
          <div className="p-4 space-y-3 flex-shrink-0" style={{ borderTop: "1px solid #f0f0f0" }}>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-sm" style={{ color: "#374151" }}>Total</span>
              <span className="font-bold text-xl" style={{ color: "#111827" }}>{fmt(total)}</span>
            </div>
            {tenant.telefono ? (
              <a href={waLink(tenant.telefono, mensajeWA())} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold"
                style={{ background: "#25D366", color: "#fff" }}>
                <MessageCircle style={{ width: 18, height: 18 }} />
                Consultar pedido por WhatsApp
              </a>
            ) : (
              <p className="text-xs text-center" style={{ color: "#9ca3af" }}>Sin WhatsApp configurado</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tarjeta de producto ──────────────────────────────────────

function TarjetaProducto({
  producto, enCarrito, onVerDetalle, onAgregarRapido,
}: {
  producto: Producto;
  enCarrito: boolean;
  onVerDetalle: () => void;
  onAgregarRapido: () => void;
}) {
  const img = producto.imagenes?.[0] ?? producto.imagen;

  return (
    <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: `1.5px solid ${enCarrito ? "#111827" : "#f0f0f0"}`, transition: "all 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.10)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}>

      {/* Imagen — clickeable para ver detalle */}
      <div onClick={onVerDetalle} style={{ aspectRatio: "1/1", background: "#f8f8f8", position: "relative", overflow: "hidden", cursor: "pointer" }}>
        {img ? (
          <img src={img.replace("/upload/", "/upload/f_auto,q_auto,w_300/")} alt={producto.nombre}
            loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Package style={{ width: 32, height: 32, color: "#d1d5db" }} />
          </div>
        )}
        {producto.categoria && (
          <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 99, background: "rgba(255,255,255,0.92)", color: "#374151" }}>
            {producto.categoria.nombre}
          </span>
        )}
        {producto.tieneVariantes && (
          <span style={{ position: "absolute", bottom: 8, left: 8, fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 99, background: "rgba(17,24,39,0.85)", color: "#fff" }}>
            + variantes
          </span>
        )}
        {enCarrito && (
          <span style={{ position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: "50%", background: "#111827", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check style={{ width: 10, height: 10, color: "#fff" }} />
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <p onClick={onVerDetalle} style={{ fontWeight: 600, fontSize: 13, color: "#111827", margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", cursor: "pointer" }}>
          {producto.nombre}
        </p>
        <p style={{ fontWeight: 700, fontSize: 15, color: "#111827", margin: 0 }}>{fmt(producto.precio)}</p>

        {/* Botón agregar al carrito */}
        <button
          onClick={producto.tieneVariantes ? onVerDetalle : onAgregarRapido}
          style={{ marginTop: 4, width: "100%", padding: "8px 0", borderRadius: 10, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: enCarrito ? "#f0fdf4" : "#111827", color: enCarrito ? "#16a34a" : "#fff", transition: "all 0.15s" }}
          onMouseEnter={e => { if (!enCarrito) (e.currentTarget as HTMLElement).style.background = "#374151"; }}
          onMouseLeave={e => { if (!enCarrito) (e.currentTarget as HTMLElement).style.background = "#111827"; }}
        >
          {enCarrito
            ? <><Check style={{ width: 12, height: 12 }} /> En el carrito</>
            : producto.tieneVariantes
            ? <><Tag style={{ width: 12, height: 12 }} /> Elegir variante</>
            : <><ShoppingCart style={{ width: 12, height: 12 }} /> Agregar</>
          }
        </button>
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────

export default function CatalogoClient({ tenant, productos, categorias }: Props) {
  const [busqueda,        setBusqueda]        = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [ordenar,         setOrdenar]         = useState("nombre");
  const [precioMin,       setPrecioMin]       = useState("");
  const [precioMax,       setPrecioMax]       = useState("");
  const [mostrarFiltros,  setMostrarFiltros]  = useState(false);
  const [productoModal,   setProductoModal]   = useState<Producto | null>(null);
  const [carritoAbierto,  setCarritoAbierto]  = useState(false);
  const [carrito,         setCarrito]         = useState<ItemCarrito[]>([]);
  const [linkCopiado,     setLinkCopiado]     = useState(false);

  const cantidadCarrito = carrito.reduce((a, i) => a + i.cantidad, 0);

  const productosFiltrados = useMemo(() => {
    let lista = productos.filter(p => {
      const matchBusq = !busqueda.trim() ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.descripcion?.toLowerCase().includes(busqueda.toLowerCase());
      const matchCat = !categoriaActiva || p.categoria?.id === categoriaActiva;
      const matchMin = !precioMin || p.precio >= parseFloat(precioMin);
      const matchMax = !precioMax || p.precio <= parseFloat(precioMax);
      return matchBusq && matchCat && matchMin && matchMax;
    });
    if (ordenar === "precio-asc")  lista = [...lista].sort((a, b) => a.precio - b.precio);
    if (ordenar === "precio-desc") lista = [...lista].sort((a, b) => b.precio - a.precio);
    if (ordenar === "nombre")      lista = [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre));
    return lista;
  }, [productos, busqueda, categoriaActiva, ordenar, precioMin, precioMax]);

  const agregarCarrito = useCallback((item: ItemCarrito) => {
    const key = `${item.productoId}_${item.varianteId ?? ""}`;
    setCarrito(prev => {
      const existe = prev.find(i => `${i.productoId}_${i.varianteId ?? ""}` === key);
      if (existe) return prev.map(i => `${i.productoId}_${i.varianteId ?? ""}` === key ? { ...i, cantidad: i.cantidad + item.cantidad } : i);
      return [...prev, item];
    });
  }, []);

  const agregarRapido = useCallback((producto: Producto) => {
    agregarCarrito({
      productoId: producto.id,
      nombre:     producto.nombre,
      precio:     producto.precio,
      cantidad:   1,
      imagen:     producto.imagenes?.[0] ?? producto.imagen ?? null,
    });
  }, [agregarCarrito]);

  const cambiarCantidad = useCallback((key: string, delta: number) => {
    setCarrito(prev =>
      prev.map(i => `${i.productoId}_${i.varianteId ?? ""}` === key
        ? { ...i, cantidad: Math.max(0, i.cantidad + delta) }
        : i
      ).filter(i => i.cantidad > 0)
    );
  }, []);

  const eliminarItem = useCallback((key: string) => {
    setCarrito(prev => prev.filter(i => `${i.productoId}_${i.varianteId ?? ""}` !== key));
  }, []);

  function compartirLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2000);
    });
  }

  const hayFiltros = !!(busqueda || categoriaActiva || precioMin || precioMax || ordenar !== "nombre");

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── HEADER ── */}
      <header style={{ background: "#fff", borderBottom: "1px solid #f0f0f0", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "12px 16px" }}>
          <div className="flex items-center gap-3">
            {tenant.logoUrl ? (
              <div style={{ width: 44, height: 44, borderRadius: 12, overflow: "hidden", border: "1px solid #f0f0f0", flexShrink: 0 }}>
                <img src={tenant.logoUrl} alt={tenant.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#111827", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>{tenant.nombre.charAt(0)}</span>
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontWeight: 700, fontSize: 16, color: "#111827", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {tenant.nombre}
              </h1>
              {(tenant.ciudad || tenant.direccion) && (
                <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0", display: "flex", alignItems: "center", gap: 3 }}>
                  <MapPin style={{ width: 10, height: 10 }} />
                  {[tenant.ciudad, tenant.direccion].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {tenant.instagram && (
                <a href={instagramUrl(tenant.instagram)} target="_blank" rel="noopener noreferrer"
                  style={{ width: 36, height: 36, borderRadius: 10, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#374151" }}>
                  <Instagram style={{ width: 16, height: 16 }} />
                </a>
              )}
              {tenant.facebook && (
                <a href={facebookUrl(tenant.facebook)} target="_blank" rel="noopener noreferrer"
                  style={{ width: 36, height: 36, borderRadius: 10, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#374151" }}>
                  <Facebook style={{ width: 16, height: 16 }} />
                </a>
              )}
              <button onClick={compartirLink}
                style={{ width: 36, height: 36, borderRadius: 10, background: linkCopiado ? "#dcfce7" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: linkCopiado ? "#16a34a" : "#374151", border: "none", cursor: "pointer" }}>
                {linkCopiado ? <Check style={{ width: 16, height: 16 }} /> : <Share2 style={{ width: 16, height: 16 }} />}
              </button>
              <button onClick={() => setCarritoAbierto(true)}
                style={{ position: "relative", width: 40, height: 40, borderRadius: 12, background: "#111827", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
                <ShoppingCart style={{ width: 18, height: 18, color: "#fff" }} />
                {cantidadCarrito > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {cantidadCarrito > 9 ? "9+" : cantidadCarrito}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {tenant.descripcion && (
        <div style={{ background: "#f9fafb", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "10px 16px" }}>
            <p style={{ fontSize: 13, color: "#6b7280", textAlign: "center", margin: 0 }}>{tenant.descripcion}</p>
          </div>
        </div>
      )}

      {/* ── FILTROS ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 16px 8px" }}>
        <div className="flex gap-2">
          <div style={{ position: "relative", flex: 1 }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#9ca3af" }} />
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar productos..."
              style={{ width: "100%", padding: "10px 36px 10px 38px", borderRadius: 12, border: "1.5px solid #e5e7eb", fontSize: 14, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" }}
              onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = "#111827"}
              onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb"}
            />
            {busqueda && (
              <button onClick={() => setBusqueda("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>
          <button onClick={() => setMostrarFiltros(v => !v)}
            style={{ padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${mostrarFiltros ? "#111827" : "#e5e7eb"}`, background: mostrarFiltros ? "#111827" : "#fff", color: mostrarFiltros ? "#fff" : "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            <SlidersHorizontal style={{ width: 15, height: 15 }} />
            Filtros
            {hayFiltros && <span style={{ width: 6, height: 6, borderRadius: "50%", background: mostrarFiltros ? "#fff" : "#ef4444", display: "inline-block" }} />}
          </button>
        </div>

        {mostrarFiltros && (
          <div style={{ marginTop: 12, padding: 16, borderRadius: 16, background: "#fff", border: "1px solid #f0f0f0", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Ordenar por</label>
                <div style={{ position: "relative" }}>
                  <select value={ordenar} onChange={e => setOrdenar(e.target.value)}
                    style={{ width: "100%", padding: "8px 32px 8px 12px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 13, color: "#111827", background: "#fff", appearance: "none", cursor: "pointer" }}>
                    <option value="nombre">Nombre (A-Z)</option>
                    <option value="precio-asc">Precio: menor a mayor</option>
                    <option value="precio-desc">Precio: mayor a menor</option>
                  </select>
                  <ChevronDown style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#9ca3af", pointerEvents: "none" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Precio mínimo</label>
                <input type="number" value={precioMin} onChange={e => setPrecioMin(e.target.value)} placeholder="$ 0"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 13, color: "#111827", background: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Precio máximo</label>
                <input type="number" value={precioMax} onChange={e => setPrecioMax(e.target.value)} placeholder="Sin límite"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 13, color: "#111827", background: "#fff", boxSizing: "border-box" }} />
              </div>
            </div>
            {hayFiltros && (
              <button onClick={() => { setBusqueda(""); setCategoriaActiva(null); setPrecioMin(""); setPrecioMax(""); setOrdenar("nombre"); }}
                style={{ marginTop: 12, fontSize: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                Limpiar todos los filtros
              </button>
            )}
          </div>
        )}

        {categorias.length > 0 && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginTop: 12 }}>
            <button onClick={() => setCategoriaActiva(null)}
              style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 99, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: !categoriaActiva ? "#111827" : "#f3f4f6", color: !categoriaActiva ? "#fff" : "#6b7280" }}>
              Todos ({productos.length})
            </button>
            {categorias.map(cat => {
              const n = productos.filter(p => p.categoria?.id === cat.id).length;
              return (
                <button key={cat.id} onClick={() => setCategoriaActiva(categoriaActiva === cat.id ? null : cat.id)}
                  style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 99, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, background: categoriaActiva === cat.id ? "#111827" : "#f3f4f6", color: categoriaActiva === cat.id ? "#fff" : "#6b7280" }}>
                  <Tag style={{ width: 10, height: 10 }} />
                  {cat.nombre} ({n})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── GRID ── */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 16px 100px" }}>
        <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>
          {productosFiltrados.length === productos.length
            ? `${productos.length} productos`
            : `${productosFiltrados.length} de ${productos.length} productos`}
        </p>

        {productosFiltrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Package style={{ width: 48, height: 48, color: "#e5e7eb", margin: "0 auto 12px" }} />
            <p style={{ fontWeight: 600, fontSize: 14, color: "#374151" }}>Sin resultados</p>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>Probá con otros filtros</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {productosFiltrados.map(producto => (
              <TarjetaProducto
                key={producto.id}
                producto={producto}
                enCarrito={carrito.some(i => i.productoId === producto.id)}
                onVerDetalle={() => setProductoModal(producto)}
                onAgregarRapido={() => agregarRapido(producto)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── FAB carrito ── */}
      {cantidadCarrito > 0 && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 30 }}>
          <button onClick={() => setCarritoAbierto(true)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderRadius: 99, background: "#111827", color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>
            <ShoppingCart style={{ width: 18, height: 18 }} />
            Ver carrito ({cantidadCarrito}) — {fmt(carrito.reduce((a, i) => a + i.precio * i.cantidad, 0))}
          </button>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ textAlign: "center", padding: "24px 16px", borderTop: "1px solid #f0f0f0", background: "#fff" }}>
        <p style={{ fontSize: 14, color: "#525456ff", margin: "0 0 8px" }}>
          ¿Querés tu propio catálogo digital?
        </p>
        <a href="https://devhub-pos.vercel.app/#" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 14, color: "#f53737ff", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
          Probá DevHub POS gratis <ExternalLink style={{ width: 11, height: 11 }} />
        </a>
        <p style={{ fontSize: 12, color: "#000000ff", margin: "8px 0 0" }}>
          Desarrollado por{" "}
          <a href="https://www.devhub.com.ar/" target="_blank" rel="noopener noreferrer"
            style={{ color: "#f94040f8", fontWeight: 600, textDecoration: "none" }}>
            DevHub
          </a>
        </p>
      </footer>

      {/* ── MODALES ── */}
      {productoModal && (
        <ModalProducto
          producto={productoModal}
          tenant={tenant}
          onCerrar={() => setProductoModal(null)}
          onAgregarCarrito={item => { agregarCarrito(item); }}
        />
      )}

      {carritoAbierto && (
        <CarritoSidebar
          items={carrito}
          tenant={tenant}
          onCerrar={() => setCarritoAbierto(false)}
          onCambiarCantidad={cambiarCantidad}
          onEliminar={eliminarItem}
        />
      )}
    </div>
  );
}