"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ban, Loader2, VolumeX } from "lucide-react";
import { banUserByAdmin, silenceUserByAdmin } from "@/app/actions/users";

type UserOption = { id: string; username: string | null; email: string };

type Props = {
  type: "ban" | "silence";
  allUsers: UserOption[];
};

export default function AdminBanUserForm({ type, allUsers }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allUsers.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [allUsers, search]);

  const selectedUser = allUsers.find((u) => u.id === selectedId);
  const label = (u: UserOption) => u.username ?? u.email;

  async function handleSubmit() {
    if (!selectedId) return;
    const verb = type === "ban" ? "banear" : "silenciar";
    if (!confirm(`¿${verb} a ${label(selectedUser!)}?`)) return;
    setLoading(true);
    try {
      if (type === "ban") await banUserByAdmin(selectedId, true);
      else await silenceUserByAdmin(selectedId, true);
      setSelectedId(null);
      setSearch("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pt-2 border-t border-border/40 space-y-2">
      <p className="text-xs text-muted-foreground font-medium">
        {type === "ban" ? "Banear usuario" : "Silenciar usuario"}
      </p>
      <div className="relative">
        <Input
          placeholder="Buscar por usuario o email…"
          value={selectedId ? label(selectedUser!) : search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedId(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="h-8 text-xs"
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
            {filtered.slice(0, 20).map((u) => (
              <button
                key={u.id}
                type="button"
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors"
                onMouseDown={() => {
                  setSelectedId(u.id);
                  setSearch("");
                  setOpen(false);
                }}
              >
                <span className="font-medium">{u.username ?? "—"}</span>
                <span className="text-muted-foreground ml-1">· {u.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        className={`h-7 gap-1.5 text-xs w-full ${
          type === "ban"
            ? "hover:text-red-400 hover:border-red-400/40"
            : "hover:text-amber-400 hover:border-amber-400/40"
        }`}
        onClick={handleSubmit}
        disabled={!selectedId || loading}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : type === "ban" ? (
          <Ban className="w-3 h-3" />
        ) : (
          <VolumeX className="w-3 h-3" />
        )}
        {type === "ban" ? "Banear" : "Silenciar"}
      </Button>
    </div>
  );
}
