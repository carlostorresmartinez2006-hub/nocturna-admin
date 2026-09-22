"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserMinus, UserPlus, UserX, Volume2, VolumeX } from "lucide-react";
import {
  addFriendship,
  blockUserRelation,
  removeFriendship,
  silenceUserRelation,
  unblockUserRelation,
  unsilenceUserRelation,
} from "@/app/actions/users";

type Friend = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type UserOption = {
  id: string;
  username: string | null;
  email: string;
};

type Props = {
  userId: string;
  friends: Friend[];
  allUsers: UserOption[];
  blockedFriendIds: string[];
  silencedFriendIds: string[];
};

export default function ManageFriendsSection({
  userId,
  friends,
  allUsers,
  blockedFriendIds,
  silencedFriendIds,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [newFriendId, setNewFriendId] = useState("");
  const [error, setError] = useState("");

  const blockedSet = new Set(blockedFriendIds);
  const silencedSet = new Set(silencedFriendIds);

  const nonFriends = allUsers.filter(
    (u) => u.id !== userId && !friends.some((f) => f.id === u.id)
  );

  const selectedFriendLabel = nonFriends.find((u) => u.id === newFriendId);
  const newFriendLabel = selectedFriendLabel
    ? (selectedFriendLabel.username ?? selectedFriendLabel.email)
    : undefined;

  function run(key: string, confirmMsg: string, fn: () => Promise<void>) {
    if (!confirm(confirmMsg)) return;
    setActionKey(key);
    setError("");
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setActionKey(null);
      }
    });
  }

  function runAdd() {
    if (!newFriendId) return;
    setActionKey("add");
    setError("");
    startTransition(async () => {
      try {
        await addFriendship(userId, newFriendId);
        setNewFriendId("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setActionKey(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      {/* Add friend */}
      <div className="flex gap-2">
        <Select value={newFriendId} onValueChange={(v) => setNewFriendId(v ?? "")}>
          <SelectTrigger className="flex-1 h-8 text-sm">
            <SelectValue placeholder="Añadir amigo...">{newFriendLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {nonFriends.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.username ?? u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="h-8 gap-1.5 shrink-0"
          disabled={!newFriendId || isPending}
          onClick={runAdd}
        >
          {actionKey === "add" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <UserPlus className="w-3.5 h-3.5" />
          )}
          Añadir
        </Button>
      </div>

      {/* Friends list */}
      {friends.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Sin amigos</p>
      ) : (
        <div className="space-y-2">
          {friends.map((f) => {
            const isBlocked = blockedSet.has(f.id);
            const isSilenced = silencedSet.has(f.id);
            return (
              <div
                key={f.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/40"
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {(f.username ?? "?")[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-medium flex-1 min-w-0 truncate">
                  {f.username ?? (
                    <span className="italic text-muted-foreground">sin username</span>
                  )}
                </span>
                <div className="flex items-center gap-0.5">
                  {/* Silence toggle */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`h-7 w-7 transition-colors ${
                      isSilenced
                        ? "text-amber-400 bg-amber-400/10 hover:bg-amber-400/20"
                        : "text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10"
                    }`}
                    title={isSilenced ? "Dessilenciar" : "Silenciar"}
                    disabled={isPending}
                    onClick={() =>
                      run(
                        `silence-${f.id}`,
                        isSilenced ? "¿Dessilenciar a este usuario?" : "¿Silenciar a este usuario?",
                        () =>
                          isSilenced
                            ? unsilenceUserRelation(userId, f.id)
                            : silenceUserRelation(userId, f.id)
                      )
                    }
                  >
                    {actionKey === `silence-${f.id}` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isSilenced ? (
                      <Volume2 className="w-3.5 h-3.5" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5" />
                    )}
                  </Button>

                  {/* Block toggle */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`h-7 w-7 transition-colors ${
                      isBlocked
                        ? "text-orange-400 bg-orange-400/10 hover:bg-orange-400/20"
                        : "text-muted-foreground hover:text-orange-400 hover:bg-orange-400/10"
                    }`}
                    title={isBlocked ? "Desbloquear" : "Bloquear"}
                    disabled={isPending}
                    onClick={() =>
                      run(
                        `block-${f.id}`,
                        isBlocked ? "¿Desbloquear a este usuario?" : "¿Bloquear a este usuario?",
                        () =>
                          isBlocked
                            ? unblockUserRelation(userId, f.id)
                            : blockUserRelation(userId, f.id)
                      )
                    }
                  >
                    {actionKey === `block-${f.id}` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UserX className="w-3.5 h-3.5" />
                    )}
                  </Button>

                  {/* Remove friendship */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Eliminar amistad"
                    disabled={isPending}
                    onClick={() =>
                      run(
                        `remove-${f.id}`,
                        "¿Eliminar esta amistad? Esta acción es irreversible.",
                        () => removeFriendship(userId, f.id)
                      )
                    }
                  >
                    {actionKey === `remove-${f.id}` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UserMinus className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
