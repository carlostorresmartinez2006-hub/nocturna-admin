"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  MapPin,
  Wine,
  Bell,
  ShieldAlert,
  Star,
  Moon,
  LogOut,
  ChevronRight,
  Trophy,
  Compass,
  Ticket,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/usuarios", label: "Usuarios", icon: Users },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/entradas", label: "Entradas", icon: Ticket },
  { href: "/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/locales", label: "Locales", icon: MapPin },
  { href: "/bares", label: "Bares", icon: Wine },
  { href: "/puntos-interes", label: "Puntos de interés", icon: Compass },
  { href: "/destacados", label: "Destacados", icon: Star },
  { href: "/notificaciones", label: "Notificaciones", icon: Bell },
  { href: "/moderacion", label: "Moderación", icon: ShieldAlert },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-60 shrink-0 flex flex-col h-screen bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
          <Moon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="font-bold text-sm leading-none">NOCTURNA</p>
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", active && "text-primary")} />
              <span className="truncate">{label}</span>
              {active && <ChevronRight className="w-3 h-3 ml-auto text-primary/60" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-sm"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
