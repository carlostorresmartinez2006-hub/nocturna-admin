"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings2, Loader2, CheckCircle2 } from "lucide-react";
import { updateRankingConfig, type RankingConfig } from "@/app/actions/ranking-config";

export default function ScoringConfigSection({ initial }: { initial: RankingConfig }) {
  const [config, setConfig] = useState<RankingConfig>(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function setField(key: keyof RankingConfig, raw: string) {
    const v = parseInt(raw, 10);
    setConfig((prev) => ({ ...prev, [key]: isNaN(v) ? 0 : Math.max(0, v) }));
    setSaved(false);
    setError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (config.titulo_vip_min <= config.titulo_alma_min) {
      setError("El umbral VIP debe ser mayor que ALMA DE LA FIESTA");
      return;
    }
    if (config.titulo_leyenda_min <= config.titulo_vip_min) {
      setError("El umbral LEYENDA debe ser mayor que VIP NOCTURNA");
      return;
    }
    startTransition(async () => {
      try {
        await updateRankingConfig(config);
        setSaved(true);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          <CardTitle>Configuración de puntuación</CardTitle>
        </div>
        <CardDescription>
          Define cómo se calculan los puntos del ranking. Los cambios se aplican en tiempo real.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Base scoring */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Puntuación base
            </p>
            <div className="flex items-end gap-4">
              <div className="space-y-1 w-40">
                <Label htmlFor="puntos_por_entrada" className="text-sm">
                  Puntos por entrada
                </Label>
                <Input
                  id="puntos_por_entrada"
                  type="number"
                  min={1}
                  value={config.puntos_por_entrada}
                  onChange={(e) => setField("puntos_por_entrada", e.target.value)}
                  className="h-9 text-sm"
                />
                <p className="text-xs text-muted-foreground">Base × entradas</p>
              </div>
            </div>
          </div>

          {/* Streak bonuses */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Bonus por racha semanal
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Puntos extra <span className="font-medium">por entrada</span> según las semanas consecutivas de actividad del usuario.
            </p>
            <div className="flex flex-wrap gap-4">
              {(
                [
                  { key: "bonus_racha_1", label: "1 semana", emoji: "" },
                  { key: "bonus_racha_2", label: "2 semanas", emoji: "" },
                  { key: "bonus_racha_3", label: "3 semanas", emoji: "" },
                  { key: "bonus_racha_4_plus", label: "4+ semanas 🔥", emoji: "" },
                ] as { key: keyof RankingConfig; label: string; emoji: string }[]
              ).map(({ key, label }) => (
                <div key={key} className="space-y-1 w-32">
                  <Label htmlFor={key} className="text-sm">
                    {label}
                  </Label>
                  <Input
                    id={key}
                    type="number"
                    min={0}
                    value={config[key]}
                    onChange={(e) => setField(key, e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Rank title thresholds */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Umbrales de título (entradas totales)
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1 w-40">
                <Label htmlFor="titulo_alma_min" className="text-sm">
                  ALMA DE LA FIESTA 🕺
                </Label>
                <Input
                  id="titulo_alma_min"
                  type="number"
                  min={1}
                  value={config.titulo_alma_min}
                  onChange={(e) => setField("titulo_alma_min", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1 w-40">
                <Label htmlFor="titulo_vip_min" className="text-sm">
                  VIP NOCTURNA 🌟
                </Label>
                <Input
                  id="titulo_vip_min"
                  type="number"
                  min={1}
                  value={config.titulo_vip_min}
                  onChange={(e) => setField("titulo_vip_min", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1 w-40">
                <Label htmlFor="titulo_leyenda_min" className="text-sm">
                  LEYENDA LOCAL 👑
                </Label>
                <Input
                  id="titulo_leyenda_min"
                  type="number"
                  min={1}
                  value={config.titulo_leyenda_min}
                  onChange={(e) => setField("titulo_leyenda_min", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Settings2 className="w-4 h-4" />
              )}
              Guardar cambios
            </Button>
            {saved && !isPending && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                Guardado
              </span>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
