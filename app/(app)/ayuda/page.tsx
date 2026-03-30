// app/(app)/ayuda/page.tsx
import {
  ShoppingCart, LockOpen, Package, History, CheckCircle,Keyboard
} from "lucide-react";
import { ImagenAyuda } from "@/components/ui/ImagenAyuda";

type PasoNormal = {
  texto: string;
  detalle?: string;
  imagen?: string;
};

type PasoImagen = {
  soloImagen: string;
};

type Paso = PasoNormal | PasoImagen;

type Seccion = {
  id: string;
  icono: React.ElementType;
  titulo: string;
  descripcion: string;
  color: string;
  colorFondo: string;
  pasos: Paso[];
  consejos?: string[];
};

const SECCIONES: Seccion[] = [
  {
    id: "venta",
    icono: ShoppingCart,
    titulo: "Cómo hacer una venta",
    descripcion: "Registrá una venta desde el punto de venta o desde la caja.",
    color: "#4ade80",
    colorFondo: "rgba(34,197,94,0.08)",
    pasos: [
      {
        texto: "Ir a Punto de venta en el menú lateral, o presionar Cobrar venta desde Caja",
        detalle: "Ambos abren el mismo sistema de ventas",
      },
      { soloImagen: "venta-menu.png" },
      {
        texto: "Buscá el producto por nombre o código en la barra de búsqueda",
        detalle: "También podés filtrar por categoría con los botones de colores",
      },
      { soloImagen: "venta-catalogo.png" },
      {
        texto: "Hacé clic en el producto para agregarlo al carrito",
        detalle: "Podés hacer clic varias veces para aumentar la cantidad",
      },
      {
        texto: "¿El producto no está cargado? Usá el botón + Nuevo",
        detalle: "Permite crear un producto rápido sin salir de la pantalla de venta",
      },
      { soloImagen: "crear-producto-rapido.png" },
      { texto: "Elegí el método de pago: Efectivo, Débito, Crédito, Transferencia o QR" },
      { texto: "Si querés, escribí el nombre del cliente (opcional)" },
      {
        texto: "Presioná el botón rojo Cobrar para confirmar",
        detalle: "El sistema registra la venta y descuenta el stock automáticamente",
      },
    ],
    consejos: [
      "Si el producto no aparece en el catálogo, verificá que tenga stock disponible",
      "Podés agregar un descuento antes de cobrar desde la sección Opciones",
      "El ticket se genera automáticamente al confirmar la venta",
    ],
  },
  {
    id: "caja",
    icono: LockOpen,
    titulo: "Abrir y cerrar caja",
    descripcion: "Manejá la caja de cada turno correctamente.",
    color: "#60a5fa",
    colorFondo: "rgba(59,130,246,0.08)",
    pasos: [
      { texto: "Ir a Caja en el menú lateral" },
      {
        texto: "Para ABRIR: presioná el botón verde Abrir caja",
        detalle: "Ingresá el dinero con el que arrancás el turno (saldo inicial)",
      },
      { soloImagen: "caja-apertura.png" },
      { texto: "Elegí el turno: mañana, tarde o noche" },
      { soloImagen: "modal-caja.png" },
      {
        texto: "Una vez abierta, presioná Cobrar venta para registrar ventas",
        detalle: "Esto abre el mismo sistema de ventas que el Punto de venta",
      },
      {
        texto: "También podés registrar ingresos y gastos manuales durante el turno",
        detalle: "Usá los botones Ingreso manual y Gasto / Retiro",
        
      },
      { soloImagen: "caja-vista.png" },
      {
        texto: "Para CERRAR: presioná Cerrar caja al terminar el turno",
        detalle: "Contá el dinero físico que tenés y escribí el total",
      },
      { soloImagen: "cerrar-caja.png" },
      {
        texto: "El sistema te muestra si hay diferencia entre lo esperado y lo contado",
        detalle: "Una diferencia pequeña es normal",
      },
    ],
    consejos: [
      "Siempre abrí la caja al empezar el turno antes de cobrar",
      "El fondo de cambio del cierre se sugiere automáticamente como saldo inicial del próximo turno",
      "Podés ver el historial de todos los cierres en Historial de caja",
    ],
  },
  {
    id: "productos",
    icono: Package,
    titulo: "Agregar y editar productos",
    descripcion: "Administrá el catálogo de productos del negocio.",
    color: "#c084fc",
    colorFondo: "rgba(168,85,247,0.08)",
    pasos: [
      { texto: "Ir a Productos en el menú lateral" },
      {
        texto: "Para AGREGAR: presioná el botón Nuevo producto",
        detalle: "Completá nombre, precio y stock como mínimo",
      },
      { soloImagen: "productos-vista.png" },
      {
        texto: "Podés agregar una foto, categoría y código de barras",
        detalle: "La foto ayuda a identificar el producto rápido en el punto de venta",
      },
      { texto: "Presioná Guardar para confirmar" },
      {
        texto: "Para EDITAR: buscá el producto y hacé clic en editar",
        detalle: "Podés cambiar precio, stock, nombre y cualquier dato",
      },
      { texto: "Guardá los cambios con el botón rojo" },
    ],
    consejos: [
      "El stock mínimo sirve para que el sistema te avise cuando queda poco",
      "Podés desactivar un producto sin borrarlo definitivamente",
      "Los códigos de barras permiten escanear con la cámara del celular al momento de vender",
    ],
  },
  {
    id: "historial",
    icono: History,
    titulo: "Ver historial de ventas",
    descripcion: "Consultá todas las ventas registradas con filtros.",
    color: "#fbbf24",
    colorFondo: "rgba(251,191,36,0.08)",
    pasos: [
      { texto: "Ir a Historial de ventas en el menú lateral" },
      { texto: "Ves todas las ventas ordenadas de la más reciente a la más antigua" },
      { soloImagen: "historial-lista.png" },
      {
        texto: "Usá los filtros para buscar por fecha, método de pago o cliente",
        detalle: "Por ejemplo: todas las ventas del mes pasado en efectivo",
      },
      {
        texto: "Hacé clic en una venta para ver el detalle",
        detalle: "Podés ver qué productos se vendieron y a qué precio",
      },
      {
        texto: "Si necesitás cancelar una venta, usá el botón Cancelar",
        detalle: "El stock se restaura automáticamente al cancelar",
      },
    ],
    consejos: [
      "El resumen arriba muestra el total recaudado con los filtros aplicados",
      "Podés ver las ventas canceladas activando el toggle Mostrar canceladas",
      "Los administradores pueden exportar las ventas en formato CSV",
    ],
  },
  {
  id: "atajos",
  icono: Keyboard,
  titulo: "Atajos de teclado",
  descripcion: "Comandos rápidos para usar el sistema más rápido.",
  color: "#f87171",
  colorFondo: "rgba(220,38,38,0.08)",
  pasos: [
    {
      texto: "Enter — Confirmar venta",
      detalle: "Presioná Enter para cobrar cuando el carrito tiene productos. No funciona si estás escribiendo en un campo.",
    },
    {
      texto: "Escape — Cerrar ventanas",
      detalle: "Presioná Escape para cerrar cualquier ventana o modal abierto.",
    },
  ],
  consejos: [
    "Los atajos solo funcionan en el Punto de venta",
    "Si estás escribiendo en un campo, los atajos no se activan",
  ],
},
];

// Las imágenes sueltas no cuentan para la numeración
function numerarPasos(pasos: Paso[]): { paso: Paso; numero: number }[] {
  let contador = 0;
  return pasos.map((paso) => {
    if ("soloImagen" in paso) return { paso, numero: 0 };
    contador++;
    return { paso, numero: contador };
  });
}

function TarjetaPaso({ numero, paso }: { numero: number; paso: Paso }) {
  // Solo imagen — sin número, con sangría para alinear con el texto del paso anterior
  if ("soloImagen" in paso) {
    return (
      <div className="pl-12">
        <ImagenAyuda
          src={`/ayuda/${paso.soloImagen}`}
          alt="Captura de pantalla"
          nombreArchivo={paso.soloImagen}
        />
      </div>
    );
  }

  // Paso normal con número
  return (
    <div className="flex gap-4 items-start">
      <div
        className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold"
        style={{
          background: "rgba(220,38,38,0.15)",
          color: "#f87171",
          border: "1px solid rgba(220,38,38,0.3)",
        }}
      >
        {numero}
      </div>
      <div className="flex-1 pt-1 space-y-2">
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {paso.texto}
        </p>
        {paso.detalle && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {paso.detalle}
          </p>
        )}
        {paso.imagen && (
          <ImagenAyuda
            src={`/ayuda/${paso.imagen}`}
            alt={paso.texto}
            nombreArchivo={paso.imagen}
          />
        )}
      </div>
    </div>
  );
}

export default function AyudaPage() {
  return (
    <div className="space-y-8 max-w-4xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Centro de ayuda
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Guía paso a paso para usar el sistema correctamente.
        </p>
      </div>

      {/* Índice rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SECCIONES.map((s) => {
          const Icon = s.icono;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="card p-4 flex flex-col items-center gap-2 text-center transition-colors hover:border-red-600/40"
            >
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ background: s.colorFondo }}
              >
                <Icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
              <p className="text-xs font-semibold leading-tight" style={{ color: "var(--text-secondary)" }}>
                {s.titulo}
              </p>
            </a>
          );
        })}
      </div>

      {/* Secciones */}
      {SECCIONES.map((seccion) => {
        const Icon = seccion.icono;
        const pasosNumerados = numerarPasos(seccion.pasos);
        return (
          <div key={seccion.id} id={seccion.id} className="card overflow-hidden scroll-mt-6">

            {/* Header sección */}
            <div
              className="px-6 py-4 flex items-center gap-3"
              style={{ borderBottom: "1px solid var(--border-base)", background: seccion.colorFondo }}
            >
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(0,0,0,0.15)" }}
              >
                <Icon className="h-5 w-5" style={{ color: seccion.color }} />
              </div>
              <div>
                <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  {seccion.titulo}
                </h2>
                <p className="text-xs" style={{ color: "var(--text-primary)" }}>
                  {seccion.descripcion}
                </p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* Pasos */}
              {pasosNumerados.map(({ paso, numero }, i) => (
                <TarjetaPaso key={i} numero={numero} paso={paso} />
              ))}

              {/* Consejos */}
              {seccion.consejos && (
                <div
                  className="rounded-xl p-4 space-y-2 mt-6"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-base)" }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-faint)" }}>
                    💡 Consejos útiles
                  </p>
                  {seccion.consejos.map((consejo, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: seccion.color }} />
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{consejo}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div className="card p-5 text-center" style={{ borderColor: "rgba(220,38,38,0.2)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>¿Tenés alguna duda?</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Consultá con el administrador del sistema.</p>
      </div>
    </div>
  );
}