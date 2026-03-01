"use client";
// components/layout/Topbar.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { RolTenant } from "@/types";

const ROL_LABEL: Record<RolTenant, string> = {
  PROPIETARIO:   "Propietario",
  ADMINISTRADOR: "Administrador",
  EMPLEADO:      "Empleado",
};

type Props = {
  nombreUsuario: string;
  emailUsuario: string;
  rolUsuario: RolTenant;
};

export default function Topbar({ nombreUsuario, emailUsuario, rolUsuario }: Props) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cargandoLogout, setCargandoLogout] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    setCargandoLogout(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 md:px-6">
      {/* Título dinámico (mobile: logo) */}
      <div className="flex items-center gap-2 md:hidden">
        <span className="font-semibold text-gray-900 dark:text-gray-100">DevHub POS</span>
      </div>

      {/* Espacio vacío en desktop para empujar el menú a la derecha */}
      <div className="hidden md:block" />

      {/* Menú de usuario */}
      <div className="relative">
        <button
          onClick={() => setMenuAbierto(!menuAbierto)}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-white text-xs font-bold">
            {nombreUsuario.charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:flex flex-col items-start">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
              {nombreUsuario}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
              {ROL_LABEL[rolUsuario]}
            </span>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", menuAbierto && "rotate-180")} />
        </button>

        {/* Dropdown */}
        {menuAbierto && (
          <>
            {/* Overlay invisible para cerrar al hacer click fuera */}
            <div className="fixed inset-0 z-10" onClick={() => setMenuAbierto(false)} />

            <div className="absolute right-0 top-full mt-1 z-20 w-56 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1">
              {/* Info del usuario */}
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{nombreUsuario}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{emailUsuario}</p>
              </div>

              {/* Opciones */}
              <button
                onClick={handleLogout}
                disabled={cargandoLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                {cargandoLogout ? "Cerrando sesión..." : "Cerrar sesión"}
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
