"use client";
// app/(app)/configuracion/usuarios/page.tsx

import { useEffect, useState } from "react";
import {
  Users, Plus, Edit, Trash2, ShieldCheck, User, Eye, EyeOff,
  CheckCircle, AlertCircle, X, Save, AlertTriangle, Crown,
} from "lucide-react";
import { cn, PLAN_LIMITES } from "@/lib/utils";

type Rol = "ADMINISTRADOR" | "EMPLEADO";
type PlanTipo = "FREE" | "PRO" | "ENTERPRISE";

type Usuario = {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  createdAt: string;
  ultimoAcceso?: string | null;
};

type Toast = { tipo: "ok" | "error"; mensaje: string } | null;

type ModalUsuario = {
  modo: "crear" | "editar";
  usuario?: Usuario;
};

const ROL_LABELS: Record<Rol, string> = {
  ADMINISTRADOR: "Administrador",
  EMPLEADO:      "Empleado",
};

const ROL_BADGE: Record<Rol, string> = {
  ADMINISTRADOR: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  EMPLEADO:      "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
};

function ToastUI({ toast }: { toast: Toast }) {
  if (!toast) return null;
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3.5 shadow-xl text-sm font-semibold",
      toast.tipo === "ok" ? "bg-green-600 text-white" : "bg-red-600 text-white"
    )}>
      {toast.tipo === "ok" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {toast.mensaje}
    </div>
  );
}

const FORM_VACIO = { nombre: "", email: "", rol: "EMPLEADO" as Rol, password: "", activo: true };

export default function UsuariosPage() {
  const [usuarios, setUsuarios]   = useState<Usuario[]>([]);
  const [plan, setPlan]           = useState<PlanTipo>("FREE");
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState<Toast>(null);
  const [modal, setModal]         = useState<ModalUsuario | null>(null);
  const [form, setForm]           = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [modalEliminar, setModalEliminar] = useState<Usuario | null>(null);
  const [eliminando, setEliminando]       = useState(false);

  const limiteRaw     = PLAN_LIMITES[plan].usuarios;
  const LIMITE_USUARIOS = limiteRaw === Infinity ? 999 : limiteRaw;
  const usuariosActivos = usuarios.filter((u) => u.activo).length;
  const limiteSuperado  = usuariosActivos >= LIMITE_USUARIOS;

  useEffect(() => { fetchUsuarios(); }, []);

  const fetchUsuarios = async () => {
    try {
      const res  = await fetch("/api/usuarios");
      const data = await res.json();
      setUsuarios(data.data ?? []);
      if (data.plan) setPlan(data.plan as PlanTipo);
    } catch { mostrarToast("error", "Error al cargar usuarios"); }
    finally { setLoading(false); }
  };

  const mostrarToast = (tipo: "ok" | "error", mensaje: string) => {
    setToast({ tipo, mensaje });
    setTimeout(() => setToast(null), 3500);
  };

  const abrirCrear = () => {
    setForm(FORM_VACIO);
    setFormError("");
    setVerPassword(false);
    setModal({ modo: "crear" });
  };

  const abrirEditar = (u: Usuario) => {
    setForm({ nombre: u.nombre, email: u.email, rol: u.rol, password: "", activo: u.activo });
    setFormError("");
    setVerPassword(false);
    setModal({ modo: "editar", usuario: u });
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { setFormError("El nombre es obligatorio"); return; }
    if (!form.email.trim())  { setFormError("El email es obligatorio");  return; }
    if (modal?.modo === "crear" && !form.password) { setFormError("La contraseña es obligatoria al crear"); return; }
    setGuardando(true); setFormError("");
    try {
      const esEditar = modal?.modo === "editar";
      const url      = esEditar ? `/api/usuarios/${modal.usuario!.id}` : "/api/usuarios";
      const body: any = { nombre: form.nombre, email: form.email, rol: form.rol, activo: form.activo };
      if (form.password) body.password = form.password;
      const res  = await fetch(url, {
        method: esEditar ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      setModal(null);
      mostrarToast("ok", esEditar ? "Usuario actualizado" : "Usuario creado");
      fetchUsuarios();
    } catch (err: any) {
      setFormError(err.message ?? "Error al guardar");
    } finally { setGuardando(false); }
  };

  const handleEliminar = async () => {
    if (!modalEliminar) return;
    setEliminando(true);
    try {
      const res  = await fetch(`/api/usuarios/${modalEliminar.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al eliminar");
      setModalEliminar(null);
      mostrarToast("ok", "Usuario eliminado");
      fetchUsuarios();
    } catch (err: any) {
      mostrarToast("error", err.message ?? "Error al eliminar");
    } finally { setEliminando(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Users className="h-6 w-6" /> Usuarios
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {usuariosActivos}/{limiteRaw === Infinity ? "∞" : LIMITE_USUARIOS} usuarios activos · Plan {plan}
          </p>
        </div>
        <button onClick={abrirCrear} disabled={limiteSuperado}
          className="flex items-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2.5 text-sm font-semibold transition-colors shadow-sm">
          <Plus className="h-4 w-4" /> Nuevo usuario
        </button>
      </div>

      {/* Alerta límite */}
      {limiteSuperado && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
          <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700 dark:text-amber-300">
            <strong>Límite de usuarios alcanzado.</strong> El plan {plan} permite hasta {LIMITE_USUARIOS} usuario{LIMITE_USUARIOS !== 1 ? "s" : ""} activo{LIMITE_USUARIOS !== 1 ? "s" : ""}.{" "}
            <a href="/configuracion/plan" className="underline hover:no-underline font-semibold">
              Actualizá tu plan
            </a>{" "}
            para agregar más.
          </div>
        </div>
      )}

      {/* ── Lista de usuarios ── */}
      {usuarios.length === 0 ? (
        <div className="card py-16 text-center">
          <Users className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="font-medium text-gray-900 dark:text-gray-100">No hay usuarios aún</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Creá el primer usuario del equipo</p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100 dark:divide-gray-700/50 overflow-hidden">
          {usuarios.map((u) => (
            <div key={u.id} className={cn(
              "flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors",
              !u.activo && "opacity-50"
            )}>
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm",
                u.rol === "ADMINISTRADOR" ? "bg-purple-500" : "bg-blue-500"
              )}>
                {u.nombre.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{u.nombre}</p>
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold", ROL_BADGE[u.rol])}>
                    {u.rol === "ADMINISTRADOR" ? <ShieldCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {ROL_LABELS[u.rol]}
                  </span>
                  {!u.activo && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">Inactivo</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                {u.ultimoAcceso && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Último acceso: {new Date(u.ultimoAcceso).toLocaleDateString("es-AR")}
                  </p>
                )}
              </div>

              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => abrirEditar(u)}
                  className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  <Edit className="h-4 w-4" />
                </button>
                <button onClick={() => setModalEliminar(u)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR / EDITAR */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !guardando && setModal(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                {modal.modo === "crear" ? <Plus className="h-5 w-5" /> : <Edit className="h-5 w-5" />}
                {modal.modo === "crear" ? "Nuevo usuario" : "Editar usuario"}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label-base">Nombre *</label>
                <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Nombre completo" className="input-base" autoFocus />
              </div>
              <div>
                <label className="label-base">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="usuario@comercio.com" className="input-base" />
              </div>
              <div>
                <label className="label-base">
                  Contraseña {modal.modo === "editar" && <span className="text-gray-400 font-normal">(dejá vacío para no cambiar)</span>}
                </label>
                <div className="relative">
                  <input type={verPassword ? "text" : "password"} value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={modal.modo === "crear" ? "Mínimo 8 caracteres" : "••••••••"}
                    className="input-base pr-10" />
                  <button type="button" onClick={() => setVerPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {verPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label-base">Rol</label>
                <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })} className="input-base">
                  <option value="EMPLEADO">Empleado</option>
                  <option value="ADMINISTRADOR">Administrador</option>
                </select>
              </div>
              {modal.modo === "editar" && (
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 px-4 py-3">
                  <input type="checkbox" id="activo" checked={form.activo}
                    onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600" />
                  <label htmlFor="activo" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    Usuario activo
                  </label>
                </div>
              )}

              {formError && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleGuardar} disabled={guardando}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white py-2.5 text-sm font-semibold transition-colors">
                <Save className="h-4 w-4" />
                {guardando ? "Guardando..." : modal.modo === "crear" ? "Crear usuario" : "Guardar cambios"}
              </button>
              <button onClick={() => setModal(null)}
                className="flex-1 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2.5 text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {modalEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !eliminando && setModalEliminar(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Eliminar usuario</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  ¿Eliminar a <strong>{modalEliminar.nombre}</strong>? Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleEliminar} disabled={eliminando}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2.5 text-sm font-bold transition-colors">
                {eliminando ? "Eliminando..." : "Sí, eliminar"}
              </button>
              <button onClick={() => setModalEliminar(null)}
                className="flex-1 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2.5 text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastUI toast={toast} />
    </div>
  );
}