import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-200">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-4">Página no encontrada</h1>
        <p className="text-gray-500 mt-2">La página que buscás no existe o fue movida.</p>
        <Link href="/dashboard"
          className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}