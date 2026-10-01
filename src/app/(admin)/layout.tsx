import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { usuarioAdmin } from "@/lib/auth/admin";
import Sidebar from "@/components/layout/Sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await usuarioAdmin())) redirect("/login");

  // Entradas de Fourvenues pendientes de revisar (las apunta el robot de ventas).
  // Y denuncias de perfiles pendientes (las envían los usuarios desde la app).
  const admin = createAdminClient();
  const [{ count: discrepancias }, { count: denuncias }] = await Promise.all([
    admin.from("fourvenues_discrepancias").select("id", { count: "exact", head: true }).eq("resuelta", false),
    admin.from("denuncias").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
  ]);

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar avisos={{ "/fourvenues": discrepancias ?? 0, "/denuncias": denuncias ?? 0 }} />
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}
