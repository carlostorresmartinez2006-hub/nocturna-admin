"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectionBar } from "@/components/ui/selection-bar";
import { cn } from "cn";
import { deleteNotificaciones } from "@/app/actions/resources";

type Notif = {
  id: string;
  user_id: string;
  tipo: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
  user: { username?: string; email: string } | null;
};

export default function NotificacionesTable({ notifs }: { notifs: Notif[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, startDeleteTransition] = useTransition();

  const allSelected = notifs.length > 0 && selected.size === notifs.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(notifs.map((n) => n.id)));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  function handleBulkDelete() {
    if (!confirm(`¿Eliminar ${selected.size} ${selected.size === 1 ? "notificación" : "notificaciones"}?`)) return;
    startDeleteTransition(async () => {
      await deleteNotificaciones([...selected]);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <>
      <SelectionBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        onDelete={selected.size > 0 ? handleBulkDelete : undefined}
        deleting={isDeleting}
      />
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Últimas 50 notificaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 px-3 w-8">
                    <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
                  </th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">Usuario</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">Tipo</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">Mensaje</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">Leída</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {notifs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                      Sin notificaciones todavía
                    </td>
                  </tr>
                ) : (
                  notifs.map((n) => (
                    <tr
                      key={n.id}
                      onClick={() => router.push(`/usuarios/${n.user_id}`)}
                      className={cn(
                        "border-b border-border/40 cursor-pointer",
                        selected.has(n.id) && "bg-primary/5"
                      )}
                    >
                      <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selected.has(n.id)} onChange={() => toggle(n.id)} />
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {n.user?.username ?? n.user?.email ?? "—"}
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="secondary" className="text-[10px]">
                          {n.tipo}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 max-w-[200px] truncate text-xs">{n.mensaje}</td>
                      <td className="py-2 px-3">
                        <Badge
                          variant={n.leida ? "secondary" : "default"}
                          className={
                            n.leida ? "" : "bg-primary/20 text-primary border-primary/30 text-[10px]"
                          }
                        >
                          {n.leida ? "Sí" : "No"}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
