import { redirect } from "next/navigation";

import { Logo } from "@/components/logo";
import { getProfile } from "@/lib/auth/dal";

import { PrimeiroAcessoForm } from "./_form";

// Wizard de primeiro acesso (fora do layout do app — sem sidebar). O middleware
// força a vinda para cá enquanto must_change_password ou !profile_completed.
export default async function PrimeiroAcessoPage() {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  // Já liberado? Volta ao painel.
  if (!profile.must_change_password && profile.profile_completed) {
    redirect("/painel");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <Logo />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Bem-vindo(a), {profile.display_name}!</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Este é seu primeiro acesso. Defina uma nova senha e confirme seus
              dados para começar.
            </p>
          </div>
          <PrimeiroAcessoForm
            personalEmail={profile.personal_email ?? ""}
            institutionalEmail={profile.institutional_email ?? ""}
          />
        </div>
      </main>
    </div>
  );
}
