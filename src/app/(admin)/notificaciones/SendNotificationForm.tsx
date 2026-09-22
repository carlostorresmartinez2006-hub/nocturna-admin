"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, Loader2, Search, Send, X } from "lucide-react";

const TIPOS = [
  { value: "amistad", label: "Amistad" },
  { value: "amistad_aceptada", label: "Amistad aceptada" },
  { value: "invitacion_fiesta", label: "Invitación a fiesta" },
  { value: "invitacion_previa", label: "Invitación a previa" },
  { value: "actividad", label: "Actividad" },
  { value: "invitacion", label: "Invitación" },
  { value: "sistema", label: "Sistema" },
  { value: "personalizar", label: "Personalizar..." },
];

interface Props {
  usuarios: { id: string; username: string | null; email: string }[];
  eventos: { id: string; titulo: string; fecha_texto: string | null; local_texto: string | null }[];
  previas: { id: string; nombre: string; icono: string }[];
}

export default function SendNotificationForm({ usuarios, eventos, previas }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [targetMode, setTargetMode] = useState<"specific" | "all">("specific");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tipo, setTipo] = useState("sistema");
  const [customTipo, setCustomTipo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [emisorId, setEmisorId] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const filtered = usuarios.filter((u) => {
    const q = search.toLowerCase();
    return (u.username?.toLowerCase().includes(q) ?? false) || u.email.toLowerCase().includes(q);
  });

  const toggle = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const labelOf = (id: string) => {
    const u = usuarios.find((u) => u.id === id);
    return u?.username ?? u?.email ?? id;
  };

  function handleTipoChange(v: string) {
    setTipo(v ?? "sistema");
    setReferenceId("");
    setEmisorId("");
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    const supabase = createClient();
    const finalTipo = tipo === "personalizar" ? customTipo : tipo;
    const targets = targetMode === "all" ? usuarios.map((u) => u.id) : selectedIds;
    if (targets.length > 0) {
      await supabase.from("notificaciones").insert(
        targets.map((user_id) => ({
          user_id,
          tipo: finalTipo,
          mensaje,
          leida: false,
          reference_id: referenceId || null,
          emisor_id: emisorId || null,
        }))
      );
    }
    setMensaje("");
    setSelectedIds([]);
    setSearch("");
    setReferenceId("");
    setEmisorId("");
    setSuccess(true);
    setLoading(false);
    router.refresh();
  }

  const canSend =
    targetMode === "all" || selectedIds.length > 0;

  return (
    <form onSubmit={handleSend} className="space-y-4">
      {/* Target mode */}
      <div className="space-y-1.5">
        <Label>Destinatarios</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={targetMode === "specific" ? "default" : "outline"}
            onClick={() => setTargetMode("specific")}
          >
            Específicos
          </Button>
          <Button
            type="button"
            size="sm"
            variant={targetMode === "all" ? "default" : "outline"}
            onClick={() => setTargetMode("all")}
          >
            Todos ({usuarios.length})
          </Button>
        </div>
      </div>

      {/* Multi-user picker */}
      {targetMode === "specific" && (
        <div className="space-y-2">
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedIds.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/15 text-primary border border-primary/30"
                >
                  {labelOf(id)}
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
            >
              <span>
                {selectedIds.length > 0
                  ? `${selectedIds.length} seleccionado${selectedIds.length > 1 ? "s" : ""}`
                  : "Selecciona usuarios..."}
              </span>
              <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
            </button>

            {dropdownOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
                <div className="p-2 border-b border-border">
                  <div className="flex items-center gap-2 px-2 rounded border border-input bg-background">
                    <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Buscar..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto p-1">
                  {filtered.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</p>
                  ) : (
                    filtered.map((u) => {
                      const checked = selectedIds.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggle(u.id)}
                          className={`flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm text-left transition-colors hover:bg-muted/50 ${checked ? "bg-primary/10" : ""}`}
                        >
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center text-xs shrink-0 transition-colors ${
                              checked
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/40"
                            }`}
                          >
                            {checked && "✓"}
                          </span>
                          <span className="font-medium">
                            {u.username ?? (
                              <span className="italic text-muted-foreground">sin username</span>
                            )}
                          </span>
                          <span className="text-muted-foreground text-xs ml-auto truncate max-w-[120px]">
                            {u.email}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tipo */}
      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <Select value={tipo} onValueChange={handleTipoChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {tipo === "personalizar" && (
          <Input
            value={customTipo}
            onChange={(e) => setCustomTipo(e.target.value)}
            placeholder="Escribe el tipo..."
            required
          />
        )}
      </div>

      {/* Campos extra según tipo */}
      {(tipo === "invitacion_fiesta" || tipo === "invitacion") && (
        <div className="space-y-1.5">
          <Label>Evento / Fiesta</Label>
          <Select value={referenceId} onValueChange={setReferenceId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un evento..." />
            </SelectTrigger>
            <SelectContent>
              {eventos.map((ev) => (
                <SelectItem key={ev.id} value={ev.id}>
                  <span className="font-medium">{ev.titulo}</span>
                  {(ev.fecha_texto || ev.local_texto) && (
                    <span className="text-muted-foreground text-xs ml-2">
                      {[ev.fecha_texto, ev.local_texto].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {tipo === "invitacion_previa" && (
        <div className="space-y-1.5">
          <Label>Previa</Label>
          <Select value={referenceId} onValueChange={setReferenceId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona una previa..." />
            </SelectTrigger>
            <SelectContent>
              {previas.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.icono} {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {(tipo === "amistad" || tipo === "amistad_aceptada") && (
        <div className="space-y-1.5">
          <Label>{tipo === "amistad" ? "Usuario que envía la solicitud" : "Usuario que aceptó"}</Label>
          <Select value={emisorId} onValueChange={setEmisorId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un usuario..." />
            </SelectTrigger>
            <SelectContent>
              {usuarios.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.username ?? <span className="italic text-muted-foreground">sin username</span>}
                  <span className="text-muted-foreground text-xs ml-2">{u.email}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Mensaje */}
      <div className="space-y-1.5">
        <Label>Mensaje</Label>
        <Textarea
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={3}
          required
          placeholder="Escribe el mensaje..."
        />
      </div>

      {success && <p className="text-sm text-emerald-400">Notificación enviada correctamente.</p>}

      <Button type="submit" disabled={loading || !canSend} className="w-full gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Enviar
        {targetMode === "specific" && selectedIds.length > 0 && ` (${selectedIds.length})`}
        {targetMode === "all" && " a todos"}
      </Button>
    </form>
  );
}
