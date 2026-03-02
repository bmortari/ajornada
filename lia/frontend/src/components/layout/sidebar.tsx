"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Home,
  FolderOpen,
  FileText,
  CalendarDays,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Scale,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Leaf,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Início", icon: Home, key: "inicio" },
  { href: "/projetos", label: "Projetos", icon: FolderOpen, key: "projetos" },
  { separator: true, key: "sep1" },
  { href: "/artefatos", label: "Artefatos", icon: FileText, key: "artefatos" },
  { href: "/pac", label: "PAC", icon: CalendarDays, key: "pac" },
  { separator: true, key: "sep2" },
  { href: "/manual", label: "Manual", icon: BookOpen, key: "manual" },
  {
    href: "/configuracoes",
    label: "Configurações",
    icon: Settings,
    key: "configuracoes",
  },
] as const;

type NavItem =
  | { href: string; label: string; icon: React.ComponentType<{ className?: string }>; key: string; separator?: never }
  | { separator: true; key: string; href?: never; label?: never; icon?: never };

const themeOptions = [
  { value: "light" as const, label: "Claro", icon: Sun },
  { value: "dark" as const, label: "Escuro", icon: Moon },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const stored = localStorage.getItem("sidebar_collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar_collapsed", String(next));
  };

  const userInitials = user?.nome
    ? user.nome
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Scale className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">LIA</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapse}
          className={cn(
            "h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {(navItems as unknown as NavItem[]).map((item) => {
          if (item.separator) {
            return (
              <Separator
                key={item.key}
                className="my-2 bg-sidebar-border"
              />
            );
          }

          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          const link = (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.key} delayDuration={0}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return link;
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border space-y-2">
        {/* Theme selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground",
                collapsed && "justify-center px-0"
              )}
              size="sm"
            >
              {themeOptions.find((t) => t.value === theme)?.icon && (
                (() => {
                  const ThemeIcon = themeOptions.find((t) => t.value === theme)!.icon;
                  return <ThemeIcon className="h-4 w-4 shrink-0" />;
                })()
              )}
              {!collapsed && (
                <span className="text-xs">
                  {themeOptions.find((t) => t.value === theme)?.label}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end">
            <DropdownMenuLabel>Tema</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {themeOptions.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={cn(theme === opt.value && "bg-accent")}
              >
                <opt.icon className="h-4 w-4 mr-2" />
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent/50",
                collapsed && "justify-center px-0"
              )}
              size="sm"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col items-start text-left min-w-0">
                  <span className="text-xs font-medium truncate max-w-[140px]">
                    {user?.nome || "Usuário"}
                  </span>
                  <span className="text-[10px] text-sidebar-foreground/50 truncate max-w-[140px]">
                    {user?.email}
                  </span>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.nome}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/configuracoes">
                <User className="h-4 w-4 mr-2" />
                Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {!collapsed && (
          <p className="text-[10px] text-center text-sidebar-foreground/30 pb-1">
            v2.0.0
          </p>
        )}
      </div>
    </aside>
  );
}
