import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Verifica que la sesión de admin sea válida.
 * Llamar al inicio de cada Server Component del área /admin.
 */
export async function requireAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("devhub-admin-session");

  if (!session || session.value !== process.env.ADMIN_SECRET) {
    redirect("/admin/login");
  }
}

/**
 * Verifica el header x-admin-secret para API routes del super-admin.
 * Retorna true si es válido, false si no.
 */
export function verifyAdminSecret(req: Request): boolean {
  const headerSecret = req.headers.get("x-admin-secret");
  return headerSecret === process.env.ADMIN_SECRET;
}