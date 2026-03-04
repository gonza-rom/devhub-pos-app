"use client";
// components/ventas/TicketPrint.tsx
// Ticket de impresión estilo térmica 80mm
// Uso: <TicketPrint venta={venta} onClose={() => setTicket(null)} />

import { useEffect, useRef } from "react";
import { X, Printer, Download } from "lucide-react";

type ItemTicket = {
  nombre:    string;
  cantidad:  number;
  precioUnit: number;
  subtotal:  number;
};

type VentaTicket = {
  id:            string;
  createdAt:     string;
  total:         number;
  subtotal?:     number;
  descuento?:    number;
  metodoPago:    string;
  clienteNombre?: string | null;
  usuarioNombre?: string | null;
  items:         ItemTicket[];
};

type Props = {
  venta:         VentaTicket;
  nombreTenant:  string;
  telefonoTenant?: string | null;
  direccionTenant?: string | null;
  onClose:       () => void;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const METODO_LABEL: Record<string, string> = {
  efectivo:      "Efectivo",
  debito:        "Tarjeta Débito",
  credito:       "Tarjeta Crédito",
  transferencia: "Transferencia",
  qr:            "QR / Mercado Pago",
};

export default function TicketPrint({ venta, nombreTenant, telefonoTenant, direccionTenant, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function getHtmlTicket() {
    const contenido = printRef.current?.innerHTML;
    if (!contenido) return null;
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Ticket #${venta.id.slice(-6).toUpperCase()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: 80mm auto; margin: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px; color: #000; background: #fff;
      width: 80mm; padding: 6mm 4mm;
    }
    .centro     { text-align: center; }
    .negrita    { font-weight: bold; }
    .grande     { font-size: 16px; }
    .pequeno    { font-size: 10px; }
    .separador  { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    .fila       { display: flex; justify-content: space-between; margin: 2px 0; }
    .fila-item  { display: flex; justify-content: space-between; margin: 3px 0; }
    .nombre-item { flex: 1; padding-right: 4px; word-break: break-word; }
    .precio-item { text-align: right; white-space: nowrap; }
    .total-row  { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-top: 4px; }
    .gracias    { text-align: center; margin-top: 8px; font-size: 10px; }
  </style>
</head>
<body>${contenido}</body>
</html>`;
  }

  function handlePrint() {
    const html = getHtmlTicket();
    if (!html) return;
    const ventana = window.open("", "_blank", "width=400,height=600");
    if (!ventana) return;
    ventana.document.write(html);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => { ventana.print(); ventana.close(); }, 300);
  }

  function handleDescargarPDF() {
    const html = getHtmlTicket();
    if (!html) return;
    // Descarga como archivo HTML que el browser puede abrir y guardar como PDF
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `ticket-${venta.id.slice(-6).toUpperCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const ticketId = venta.id.slice(-6).toUpperCase();
  const hayDescuento = (venta.descuento ?? 0) > 0;

  return (
    <>
      {/* ── Overlay ── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      >
        <div
          className="w-full max-w-sm flex flex-col rounded-2xl overflow-hidden"
          style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          {/* Header modal */}
          <div
            className="flex items-center justify-between px-5 py-4 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <h3 className="text-base font-semibold text-zinc-100">Vista previa del ticket</h3>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Preview del ticket */}
          <div className="p-5 overflow-y-auto max-h-[70vh]">
            <div
              className="mx-auto rounded-lg p-4 text-black"
              style={{
                width: "280px",
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: "12px",
                background: "#fff",
                boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
              }}
            >
              {/* Contenido real que se imprime */}
              <div ref={printRef}>
                {/* Cabecera */}
                <div className="centro negrita grande" style={{ marginBottom: "2px" }}>
                  {nombreTenant}
                </div>
                {direccionTenant && (
                  <div className="centro pequeno" style={{ marginBottom: "1px" }}>{direccionTenant}</div>
                )}
                {telefonoTenant && (
                  <div className="centro pequeno" style={{ marginBottom: "4px" }}>{telefonoTenant}</div>
                )}

                <hr className="separador" />

                {/* Info de venta */}
                <div className="fila">
                  <span>Ticket #{ticketId}</span>
                  <span>{fmtFecha(venta.createdAt)}</span>
                </div>
                {venta.clienteNombre && (
                  <div className="fila pequeno">
                    <span>Cliente:</span>
                    <span>{venta.clienteNombre}</span>
                  </div>
                )}
                {venta.usuarioNombre && (
                  <div className="fila pequeno">
                    <span>Atendió:</span>
                    <span>{venta.usuarioNombre}</span>
                  </div>
                )}

                <hr className="separador" />

                {/* Encabezado items */}
                <div className="fila negrita pequeno" style={{ marginBottom: "3px" }}>
                  <span>PRODUCTO</span>
                  <span>IMPORTE</span>
                </div>

                {/* Items */}
                {venta.items.map((item, i) => (
                  <div key={i} style={{ marginBottom: "4px" }}>
                    <div className="nombre-item" style={{ wordBreak: "break-word" }}>
                      {item.nombre}
                    </div>
                    <div className="fila-item pequeno">
                      <span style={{ paddingLeft: "4px" }}>
                        {item.cantidad} x {fmt(item.precioUnit)}
                      </span>
                      <span className="precio-item negrita">{fmt(item.subtotal)}</span>
                    </div>
                  </div>
                ))}

                <hr className="separador" />

                {/* Totales */}
                {hayDescuento && (
                  <>
                    <div className="fila">
                      <span>Subtotal</span>
                      <span>{fmt(venta.subtotal ?? 0)}</span>
                    </div>
                    <div className="fila">
                      <span>Descuento</span>
                      <span>- {fmt(venta.descuento ?? 0)}</span>
                    </div>
                  </>
                )}
                <div className="total-row">
                  <span>TOTAL</span>
                  <span>{fmt(venta.total)}</span>
                </div>
                <div className="fila pequeno" style={{ marginTop: "3px" }}>
                  <span>Forma de pago</span>
                  <span>{METODO_LABEL[venta.metodoPago] ?? venta.metodoPago}</span>
                </div>

                <hr className="separador" />

                {/* Pie */}
                <div className="gracias">
                  ¡Gracias por su compra!
                </div>
                <div className="gracias" style={{ marginTop: "2px" }}>
                  Conserve este comprobante
                </div>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div
            className="flex gap-2 px-5 py-4 flex-shrink-0"
            style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
          >
            <button onClick={onClose} className="btn-ghost flex-1">
              Cerrar
            </button>
            <button
              onClick={handleDescargarPDF}
              className="btn-ghost flex-1 justify-center"
              title="Descarga como HTML — abrilo en el browser y guardá como PDF"
            >
              <Download className="h-4 w-4" />
              PDF
            </button>
            <button onClick={handlePrint} className="btn-primary flex-1 justify-center">
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </>
  );
}