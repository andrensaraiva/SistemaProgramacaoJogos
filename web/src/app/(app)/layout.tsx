import { AppSidebar } from "@/components/app-sidebar";
import { AvatarWithFrame } from "@/components/avatar-with-frame";
import { NotificationBell } from "@/components/notification-bell";
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
  // Aurora Minimal — tema POR PAPEL: aluno = escuro (imersivo/gamificado);
  // instrutor/coordenador/admin = claro (calmo/premium). Um script inline aplica
  // a classe .dark no <html> antes da pintura (sem flash), sobrepondo o
  // toggle/localStorage do script raiz para a área logada.
  const isStudent = role === "aluno";
  const roleThemeScript = `document.documentElement.classList.${isStudent ? "add" : "remove"}('dark');`;
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-2.5">
        <AvatarWithFrame name={profile.display_name} frameId={profile.avatar_frame_id} skinId={profile.avatar_skin_id} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium leading-tight">
            {profile.display_name}
          </div>
          <div className="text-xs leading-tight text-muted-foreground">
            {roleLabel}
          </div>
        </div>
      </div>
      {role === "aluno" && <XpBar xp={profile.xp} level={profile.level} />}
      <form action={logout}>
        <Button type="submit" variant="secondary" className="w-full">
          Sair
        </Button>
      </form>
    </div>
  ) : null;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Tema por papel: aplica .dark antes da pintura (anti-flash). */}
      <script dangerouslySetInnerHTML={{ __html: roleThemeScript }} />
      <AppSidebar
        role={role}
        footer={sidebarFooter}
        mobileAction={profile ? <NotificationBell notifications={notifications} unread={unread} /> : null}
      />
      <div className="flex w-full flex-1 flex-col">
        {profile && (
          <div className="sticky top-0 z-20 hidden items-center justify-end border-b border-border bg-background/80 px-5 py-2.5 backdrop-blur sm:px-8 md:flex">
            <NotificationBell notifications={notifications} unread={unread} />
          </div>
        )}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
