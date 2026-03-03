"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Algo salió mal</h1>
        <p className="text-gray-500 mt-2">Ocurrió un error inesperado. Podés intentar de nuevo.</p>
        <button onClick={reset}
          className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors">
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}