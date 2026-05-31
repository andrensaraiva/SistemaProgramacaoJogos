import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { XpBar } from "@/components/xp-bar";
import { logout } from "@/lib/auth/actions";
import { getProfile } from "@/lib/auth/dal";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await getProfile();
  const isProf = profile?.role === "professor" || profile?.role === "admin";

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
            {isProf ? "Professor" : "Aluno"}
          </div>
        </div>
      </div>
      {!isProf && <XpBar xp={profile.xp} level={profile.level} />}
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
      <AppSidebar isProf={isProf} footer={sidebarFooter} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8">
        {children}
      </main>
    </div>
  );
}
