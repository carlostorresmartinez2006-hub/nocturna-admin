"use client";
import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
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
import { Medal, Plus, Loader2, X } from "lucide-react";
import { cn } from "cn";
import { addEntrada } from "@/app/actions/entradas";
import type { RankingConfig } from "@/app/actions/ranking-config";

type Ticket = { id: string; user_id: string; created_at: string; evento_id: string | null };
type Profile = { id: string; username: string | null; email: string; avatar_url: string | null };
type Evento = { id: string; titulo: string; fecha_texto: string | null; fecha_evento: string | null; local_id: string | null };
type Local = { id: string; nombre: string };

type RankEntry = {
  userId: string;
  username: string;
  email: string;
  avatar_url: string | null;
  count: number;
  points: number;
  streak: number;
  lastActivity: Date | null;
  rank: number;
};

type TimeFilter = "Semanal" | "Mensual" | "Trimestral";

const TIME_DAYS: Record<TimeFilter, number> = { Semanal: 7, Mensual: 30, Trimestral: 90 };

const medalColor = (rank: number) => {
  if (rank === 1) return "text-yellow-400";
  if (rank === 2) return "text-slate-300";
  if (rank === 3) return "text-amber-600";
  return "text-muted-foreground";
};

function getMondayKey(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function computeStreak(allDates: Date[]): number {
  if (allDates.length === 0) return 0;
  const keys = [...new Set(allDates.map(getMondayKey))].sort().reverse();
  const now = new Date();
  const curWeek = getMondayKey(now);
  const lastWeekDate = new Date(now);
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const lastWeek = getMondayKey(lastWeekDate);
  if (keys[0] !== curWeek && keys[0] !== lastWeek) return 0;
  let streak = 1;
  for (let i = 1; i < keys.length; i++) {
    const prev = new Date(keys[i - 1]);
    const curr = new Date(keys[i]);
    const diffWeeks = Math.round((prev.getTime() - curr.getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (diffWeeks === 1) streak++;
    else break;
  }
  return streak;
}

function streakBonus(streak: number, config: RankingConfig): number {
  if (streak >= 4) return config.bonus_racha_4_plus;
  if (streak === 3) return config.bonus_racha_3;
  if (streak === 2) return config.bonus_racha_2;
  if (streak === 1) return config.bonus_racha_1;
  return 0;
}

function computeRanking(tickets: Ticket[], profiles: Profile[], days: number, config: RankingConfig): RankEntry[] {
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
  const filtered = tickets.filter((t) => new Date(t.created_at).getTime() >= threshold);

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  // Collect all ticket dates per user (for streak, uses all tickets, not just filtered)
  const allDatesMap = new Map<string, Date[]>();
  for (const t of tickets) {
    const arr = allDatesMap.get(t.user_id) ?? [];
    arr.push(new Date(t.created_at));
    allDatesMap.set(t.user_id, arr);
  }

  const userStats = new Map<string, { count: number; lastActivity: Date }>();
  for (const t of filtered) {
    const s = userStats.get(t.user_id) ?? { count: 0, lastActivity: new Date(0) };
    s.count += 1;
    const d = new Date(t.created_at);
    if (d > s.lastActivity) s.lastActivity = d;
    userStats.set(t.user_id, s);
  }

  const result: Omit<RankEntry, "rank">[] = [];
  for (const [userId, stats] of userStats.entries()) {
    const p = profileMap.get(userId);
    const streak = computeStreak(allDatesMap.get(userId) ?? []);
    const pointsPerEntry = config.puntos_por_entrada + streakBonus(streak, config);
    result.push({
      userId,
      username: p?.username ?? p?.email ?? userId,
      email: p?.email ?? "",
      avatar_url: p?.avatar_url ?? null,
      count: stats.count,
      points: stats.count * pointsPerEntry,
      streak,
      lastActivity: stats.lastActivity.getTime() === 0 ? null : stats.lastActivity,
    });
  }

  result.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aT = a.lastActivity?.getTime() ?? 0;
    const bT = b.lastActivity?.getTime() ?? 0;
    if (bT !== aT) return bT - aT;
    return a.username.localeCompare(b.username);
  });

  return result.map((entry, i) => ({ ...entry, rank: i + 1 }));
}

const isDefaultScoring = (config: RankingConfig) =>
  config.puntos_por_entrada === 1 &&
  config.bonus_racha_1 === 0 &&
  config.bonus_racha_2 === 0 &&
  config.bonus_racha_3 === 0 &&
  config.bonus_racha_4_plus === 0;

function InlineAddForm({
  userId,
  eventos,
  locales,
  onDone,
}: {
  userId: string;
  eventos: Evento[];
  locales: Local[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selectedLocalId, setSelectedLocalId] = useState("");
  const [eventoId, setEventoId] = useState("");
  const [nombreTicket, setNombreTicket] = useState("");

  const sortedLocales = useMemo(
    () => [...locales].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [locales]
  );

  const filteredEventos = useMemo(() => {
    const list = selectedLocalId
      ? eventos.filter((ev) => ev.local_id === selectedLocalId)
      : eventos;
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
  }, [eventos, selectedLocalId]);

  function handleLocalChange(v: string | null) {
    setSelectedLocalId(v ?? "");
    setEventoId("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!eventoId) { setError("Selecciona un evento"); return; }
    setError("");
    startTransition(async () => {
      try {
        await addEntrada({ userId, eventoId, nombreTicket: nombreTicket || null });
        onDone();
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      }
    });
  }

  const localLabel = sortedLocales.find((l) => l.id === selectedLocalId)?.nombre;
  const eventoItem = filteredEventos.find((ev) => ev.id === eventoId);
  const eventoLabel = eventoItem
    ? `${eventoItem.titulo}${eventoItem.fecha_texto ? ` · ${eventoItem.fecha_texto}` : ""}`
    : undefined;

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 py-2">
      <div className="space-y-1">
        <Label className="text-xs">Local</Label>
        <Select value={selectedLocalId} onValueChange={handleLocalChange}>
          <SelectTrigger className="h-8 text-sm w-48">
            <SelectValue placeholder="Todos los locales">{localLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sortedLocales.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Evento *</Label>
        <Select value={eventoId} onValueChange={(v) => setEventoId(v ?? "")}>
          <SelectTrigger className="h-8 text-sm w-64">
            <SelectValue placeholder="Selecciona un evento...">{eventoLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {filteredEventos.map((ev) => (
              <SelectItem key={ev.id} value={ev.id}>
                {ev.titulo}{ev.fecha_texto ? ` · ${ev.fecha_texto}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Nombre ticket</Label>
        <Input
          value={nombreTicket}
          onChange={(e) => setNombreTicket(e.target.value)}
          placeholder="Nombre..."
          className="h-8 text-sm w-40"
        />
      </div>
      {error && <p className="text-xs text-destructive self-end mb-1">{error}</p>}
      <div className="flex gap-2 self-end">
        <Button type="submit" size="sm" disabled={isPending} className="h-8 gap-1.5">
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Añadir
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8" onClick={onDone}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </form>
  );
}

export default function RankingClient({
  tickets,
  profiles,
  eventos,
  locales,
  config,
}: {
  tickets: Ticket[];
  profiles: Profile[];
  eventos: Evento[];
  locales: Local[];
  config: RankingConfig;
}) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("Mensual");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeAddUserId, setActiveAddUserId] = useState<string | null>(null);

  const showPoints = !isDefaultScoring(config);

  const ranking = useMemo(
    () => computeRanking(tickets, profiles, TIME_DAYS[timeFilter], config),
    [tickets, profiles, timeFilter, config]
  );

  const podium = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  const allSelected = rest.length > 0 && selected.size === rest.length;
  const someSelected = selected.size > 0 && !allSelected;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rest.map((r) => r.userId)));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="space-y-6">
      {/* Filter chips */}
      <div className="flex items-center gap-2">
        {(["Semanal", "Mensual", "Trimestral"] as TimeFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setTimeFilter(f)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
              timeFilter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            )}
          >
            {f}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-2">
          {ranking.length} usuarios con entradas
        </span>
      </div>

      {/* Podium */}
      {podium.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {podium.map((r) => (
            <Card key={r.userId} className={r.rank === 1 ? "border-yellow-400/40" : ""}>
              <CardContent className="pt-6 text-center space-y-2">
                <Medal className={`w-8 h-8 mx-auto ${medalColor(r.rank)}`} />
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-lg font-bold text-primary mx-auto">
                  {(r.username)[0]?.toUpperCase() ?? "?"}
                </div>
                <p className="font-semibold text-sm">{r.username}</p>
                {showPoints ? (
                  <div>
                    <p className="text-2xl font-bold text-primary">{r.points} pts</p>
                    <p className="text-xs text-muted-foreground">{r.count} {r.count === 1 ? "entrada" : "entradas"}{r.streak > 0 ? ` · 🔥${r.streak}` : ""}</p>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-primary">
                    {r.count} {r.count === 1 ? "entrada" : "entradas"}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{r.email}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Table */}
      <SelectionBar count={selected.size} onClear={() => setSelected(new Set())} />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 w-10">
                  <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
                </th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium w-12">#</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Usuario</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">
                  {showPoints ? "Puntos" : "Entradas"} ({timeFilter.toLowerCase()})
                </th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Última actividad</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium w-20">Añadir</th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {ranking.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Sin entradas en el período seleccionado
                  </td>
                </tr>
              ) : (
                <>
                  {/* Top 3 rows (no checkbox - shown in podium) */}
                  {podium.map((r) => (
                    <tr key={r.userId} className="border-b border-border/50 bg-primary/3">
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3">
                        <span className={`font-bold ${medalColor(r.rank)}`}>{r.rank}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {r.username[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <p className="font-medium">{r.username}</p>
                            <p className="text-xs text-muted-foreground">{r.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">
                        {showPoints ? (
                          <span>
                            {r.points} <span className="text-xs font-normal text-muted-foreground">({r.count}{r.streak > 0 ? ` 🔥${r.streak}` : ""})</span>
                          </span>
                        ) : r.count}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {r.lastActivity
                          ? r.lastActivity.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setActiveAddUserId(activeAddUserId === r.userId ? null : r.userId)}
                          className={cn("rounded p-0.5 transition-colors", activeAddUserId === r.userId ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10")}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/usuarios/${r.userId}`} className="text-primary hover:text-primary/80 text-xs">ver</Link>
                      </td>
                    </tr>
                  ))}
                  {/* Podium inline forms */}
                  {podium.map((r) =>
                    activeAddUserId === r.userId ? (
                      <tr key={`form-${r.userId}`} className="border-b border-border/50 bg-muted/10">
                        <td colSpan={7} className="px-6 py-1">
                          <InlineAddForm userId={r.userId} eventos={eventos} locales={locales} onDone={() => setActiveAddUserId(null)} />
                        </td>
                      </tr>
                    ) : null
                  )}

                  {/* Rest of the ranking */}
                  {rest.map((r) => (
                    <Fragment key={r.userId}>
                      <tr
                        className={cn(
                          "border-b border-border/50 hover:bg-muted/20 transition-colors",
                          selected.has(r.userId) && "bg-primary/5 hover:bg-primary/10"
                        )}
                      >
                        <td className="px-4 py-3">
                          <Checkbox checked={selected.has(r.userId)} onChange={() => toggle(r.userId)} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-muted-foreground font-medium">{r.rank}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {r.username[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div>
                              <p className="font-medium">{r.username}</p>
                              <p className="text-xs text-muted-foreground">{r.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-primary">
                          {showPoints ? (
                            <span>
                              {r.points} <span className="text-xs font-normal text-muted-foreground">({r.count}{r.streak > 0 ? ` 🔥${r.streak}` : ""})</span>
                            </span>
                          ) : r.count}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {r.lastActivity
                            ? r.lastActivity.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setActiveAddUserId(activeAddUserId === r.userId ? null : r.userId)}
                            className={cn("rounded p-0.5 transition-colors", activeAddUserId === r.userId ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10")}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/usuarios/${r.userId}`} className="text-primary hover:text-primary/80 text-xs">ver</Link>
                        </td>
                      </tr>
                      {activeAddUserId === r.userId && (
                        <tr className="border-b border-border/50 bg-muted/10">
                          <td colSpan={7} className="px-6 py-1">
                            <InlineAddForm userId={r.userId} eventos={eventos} locales={locales} onDone={() => setActiveAddUserId(null)} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
