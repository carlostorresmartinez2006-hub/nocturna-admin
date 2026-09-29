import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/login");

  // Entradas de Fourvenues pendientes de revisar (las apunta el robot de ventas).
  const { count: discrepancias } = await createAdminClient()
    .from("fourvenues_discrepancias")
    .select("id", { count: "exact", head: true })
    .eq("resuelta", false);

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar avisos={{ "/fourvenues": discrepancias ?? 0 }} />
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}
