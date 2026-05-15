import Link from "next/link";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth/actions";
import { getProfile } from "@/lib/auth/dal";

const NAV = [
  { href: "/painel", label: "Painel" },
  { href: "/exercicios", label: "Exercícios" },
  { href: "/turmas", label: "Turmas" },
  { href: "/duelos", label: "Duelos" },
];

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await getProfile();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-8">
            <Link href="/painel">
              <Logo />
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {profile && (
              <div className="hidden items-center gap-3 sm:flex">
                <div className="text-right">
                  <div className="text-sm font-medium leading-tight">
                    {profile.display_name}
                  </div>
                  <div className="text-xs leading-tight text-muted-foreground">
                    Nível {profile.level} · {profile.xp} XP
                  </div>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {profile.display_name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            <form action={logout}>
              <Button type="submit" variant="ghost">
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
