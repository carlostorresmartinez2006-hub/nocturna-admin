"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectionBar } from "@/components/ui/selection-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ticket, Plus, Trash2, Loader2, ChevronRight, X } from "lucide-react";
import { cn } from "cn";
import { addEntrada, deleteEntrada, deleteEntradas } from "@/app/actions/entradas";

type EntradaRow = {
  id: string;
  estado: string;
  nombre_ticket: string | null;
  email_ticket: string | null;
  created_at: string;
  user_id: string;
  evento_id: string | null;
  evento: { id: string; titulo: string; fecha_texto: string | null; fecha_evento: string | null } | null;
  profile: { id: string; username: string | null; email: string } | null;
};

type Evento = { id: string; titulo: string; fecha_texto: string | null; fecha_evento: string | null; local_id: string | null };
type Local = { id: string; nombre: string };
type UserProfile = { id: string; username: string | null; email: string };

function DeleteButton({ entradaId }: { entradaId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("¿Eliminar esta entrada?")) return;
    startTransition(async () => {
      await deleteEntrada(entradaId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
    >
      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function EntradaTable({
  entradas,
  allEventos,
  allProfiles,
  allLocales,
}: {
  entradas: EntradaRow[];
  allEventos: Evento[];
  allProfiles: UserProfile[];
  allLocales: Local[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [newLocalId, setNewLocalId] = useState("");
  const [newEventoId, setNewEventoId] = useState("");
  const [newNombreTicket, setNewNombreTicket] = useState("");
  const [newEmailTicket, setNewEmailTicket] = useState("");

  const allSelected = entradas.length > 0 && selected.size === entradas.length;
  const someSelected = selected.size > 0 && !allSelected;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(entradas.map((e) => e.id)));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const sortedLocales = useMemo(
    () => [...allLocales].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [allLocales]
  );

  const sortedEventos = useMemo(() => {
    const list = newLocalId
      ? allEventos.filter((ev) => ev.local_id === newLocalId)
      : allEventos;
    const now = new Date();
    return [...list].sort((a, b) => {
      if (!a.fecha_evento && !b.fecha_evento) return 0;
      if (!a.fecha_evento) return 1;
      if (!b.fecha_evento) return -1;
      const aFuture = new Date(a.fecha_evento) >= now;
      const bFuture = new Date(b.fecha_evento) >= now;
      if (aFuture && bFuture) return new Date(a.fecha_evento).getTime() - new Date(b.fecha_evento).getTime();
      if (!aFuture && !bFuture) return new Date(b.fecha_evento).getTime() - new Date(a.fecha_evento).getTime();
      return aFuture ? -1 : 1;
    });
  }, [allEventos, newLocalId]);

  const sortedProfiles = useMemo(
    () => [...allProfiles].sort((a, b) => (a.username ?? a.email).localeCompare(b.username ?? b.email)),
    [allProfiles]
  );

  function handleLocalChange(v: string | null) {
    setNewLocalId(v ?? "");
    setNewEventoId("");
  }

  function handleBulkDelete() {
    if (!confirm(`¿Eliminar ${selected.size} ${selected.size === 1 ? "entrada" : "entradas"}?`)) return;
    startDeleteTransition(async () => {
      await deleteEntradas([...selected]);
      setSelected(new Set());
      router.refresh();
    });
  }

  function handleAddEntrada(e: React.FormEvent) {
    e.preventDefault();
    if (!newUserId) { setError("Selecciona un usuario"); return; }
    if (!newEventoId) { setError("Selecciona un evento"); return; }
    setError("");
    startTransition(async () => {
      try {
        await addEntrada({
          userId: newUserId,
          eventoId: newEventoId,
          nombreTicket: newNombreTicket || null,
          emailTicket: newEmailTicket || null,
        });
        setShowAddForm(false);
        setNewUserId("");
        setNewLocalId("");
        setNewEventoId("");
        setNewNombreTicket("");
        setNewEmailTicket("");
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  const newUserProfile = sortedProfiles.find((p) => p.id === newUserId);
  const newUserLabel = newUserProfile
    ? (newUserProfile.username ? `${newUserProfile.username} — ${newUserProfile.email}` : newUserProfile.email)
    : undefined;
  const newLocalLabel = sortedLocales.find((l) => l.id === newLocalId)?.nombre;
  const newEventoItem = sortedEventos.find((ev) => ev.id === newEventoId);
  const newEventoLabel = newEventoItem
    ? `${newEventoItem.titulo}${newEventoItem.fecha_texto ? ` · ${newEventoItem.fecha_texto}` : ""}`
    : undefined;

  return (
    <>
      <SelectionBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        onDelete={selected.size > 0 ? handleBulkDelete : undefined}
        deleting={isDeleting}
      />

      {/* Add form */}
      {showAddForm ? (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> Nueva entrada manual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddEntrada} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Usuario *</Label>
                  <Select value={newUserId} onValueChange={(v) => setNewUserId(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona un usuario...">{newUserLabel}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {sortedProfiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.username ? `${p.username} — ${p.email}` : p.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Local (filtrar eventos)</Label>
                  <Select value={newLocalId} onValueChange={handleLocalChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Todos los locales">{newLocalLabel}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {sortedLocales.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs">Evento *</Label>
                  <Select value={newEventoId} onValueChange={(v) => setNewEventoId(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona un evento...">{newEventoLabel}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {sortedEventos.map((ev) => (
                        <SelectItem key={ev.id} value={ev.id}>
                          {ev.titulo}{ev.fecha_texto ? ` · ${ev.fecha_texto}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre en ticket</Label>
                  <Input
                    value={newNombreTicket}
                    onChange={(e) => setNewNombreTicket(e.target.value)}
                    placeholder="Nombre del asistente"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email en ticket</Label>
                  <Input
                    type="email"
                    value={newEmailTicket}
                    onChange={(e) => setNewEmailTicket(e.target.value)}
                    placeholder="email@..."
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2 pt-1">
                <Button type="submit" size="sm" disabled={isPending} className="gap-2">
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Guardar entrada
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowAddForm(false)}>
                  <X className="w-3.5 h-3.5 mr-1" /> Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end">
          <Button size="sm" className="gap-2" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4" /> Nueva entrada
          </Button>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 w-10">
                  <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
                </th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Usuario</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Evento</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Nombre ticket</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Fecha</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {entradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Ticket className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-muted-foreground">No hay entradas registradas todavía</p>
                  </td>
                </tr>
              ) : (
                entradas.map((e) => (
                  <tr
                    key={e.id}
                    className={cn(
                      "border-b border-border/50 hover:bg-muted/20 transition-colors",
                      selected.has(e.id) && "bg-primary/5 hover:bg-primary/10"
                    )}
                  >
                    <td className="px-4 py-3">
                      <Checkbox checked={selected.has(e.id)} onChange={() => toggle(e.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/usuarios/${e.user_id}`}
                        className="hover:text-primary transition-colors group flex items-center gap-1"
                      >
                        <div>
                          <p className="font-medium group-hover:text-primary">
                            {e.profile?.username ?? "sin username"}
                          </p>
                          <p className="text-xs text-muted-foreground">{e.profile?.email ?? e.user_id}</p>
                        </div>
                        <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary shrink-0" />
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium truncate max-w-[180px]">
                        {e.evento?.titulo ?? "Evento desconocido"}
                      </p>
                      <p className="text-xs text-muted-foreground">{e.evento?.fecha_texto ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={
                          e.estado === "verificada"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs"
                            : "text-xs"
                        }
                      >
                        {e.estado}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{e.nombre_ticket ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(e.created_at).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <DeleteButton entradaId={e.id} />
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
