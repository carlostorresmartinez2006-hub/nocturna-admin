"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectionBar } from "@/components/ui/selection-bar";
import { Shield } from "lucide-react";
import { cn } from "cn";
import { deleteUsuarios } from "@/app/actions/resources";

type Usuario = {
  id: string;
  username: string | null;
  email: string;
  full_name: string | null;
  age: number | null;
  is_admin: boolean | null;
  updated_at: string | null;
};

export default function UsuariosTable({ usuarios }: { usuarios: Usuario[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, startDeleteTransition] = useTransition();

  const allSelected = usuarios.length > 0 && selected.size === usuarios.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(usuarios.map((u) => u.id)));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  function handleBulkDelete() {
    if (!confirm(`¿Eliminar ${selected.size} ${selected.size === 1 ? "usuario" : "usuarios"}? Esta acción es permanente e irrecuperable.`)) return;
    startDeleteTransition(async () => {
      await deleteUsuarios([...selected]);
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
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 w-10">
                  <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
                </th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Usuario</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Email</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Nombre completo</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Edad</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Rol</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Último acceso</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No hay usuarios registrados todavía
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => (
                  <tr
                    key={u.id}
                    className={cn(
                      "border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer",
                      selected.has(u.id) && "bg-primary/5 hover:bg-primary/10"
                    )}
                    onClick={() => router.push(`/usuarios/${u.id}`)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {u.username?.[0]?.toUpperCase() ?? u.email[0]?.toUpperCase() ?? "?"}
                        </div>
                        <span className="font-medium">
                          {u.username ?? (
                            <span className="text-muted-foreground italic">sin username</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">{u.full_name ?? "—"}</td>
                    <td className="px-4 py-3">{u.age ?? "—"}</td>
                    <td className="px-4 py-3">
                      {u.is_admin ? (
                        <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
                          <Shield className="w-3 h-3" /> Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">
                          Usuario
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {u.updated_at
                        ? new Date(u.updated_at).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
