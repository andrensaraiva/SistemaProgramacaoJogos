import { AppSidebar } from "@/components/app-sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { XpBar } from "@/components/xp-bar";
import { logout } from "@/lib/auth/actions";
import { getProfile } from "@/lib/auth/dal";
import { listarNotificacoes } from "@/lib/notifications/actions";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await getProfile();
  const role = (profile?.role ?? "aluno") as "aluno" | "professor" | "admin" | "coordenador";
  const roleLabel =
    role === "admin"
      ? "Administrador"
      : role === "coordenador"
        ? "Coordenador"
        : role === "professor"
          ? "Professor"
          : "Aluno";

  const notifications = profile ? await listarNotificacoes() : [];
  const unread = notifications.filter((n) => !n.read_at).length;

  const sidebarFooter = profile ? (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/40 p-3">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
          {profile.display_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium leading-tight">
            {profile.display_name}
          </div>
          <div className="text-xs leading-tight text-muted-foreground">
            {roleLabel}
          </div>
        </div>
      </div>
      {role === "aluno" && <XpBar xp={profile.xp} level={profile.level} />}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <form action={logout} className="flex-1">
          <Button type="submit" variant="secondary" className="w-full">
            Sair
          </Button>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppSidebar role={role} footer={sidebarFooter} />
      <div className="flex w-full flex-1 flex-col">
        {profile && (
          <div className="flex items-center justify-end border-b border-border px-5 py-2 sm:px-8">
            <NotificationBell notifications={notifications} unread={unread} />
          </div>
        )}
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
