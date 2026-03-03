import { requireAdmin } from "@/lib/admin-auth";
import AdminSidebar from "../AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <AdminSidebar />
      <main className="flex-1 ml-56 p-8">
        {children}
      </main>
    </div>
  );
}