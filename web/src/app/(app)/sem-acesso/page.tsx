import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/dal";
import { homeDe } from "@/lib/auth/permissions";
import type { Role } from "@/lib/features";

export default async function SemAcessoPage() {
  const profile = await getProfile();
  const home = homeDe((profile?.role ?? "aluno") as Role);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-danger/15 text-danger">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="m4.9 4.9 14.2 14.2" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold">Sem acesso</h1>
      <p className="text-sm text-muted-foreground">
        Você não tem permissão para acessar esta área. Se acha que isso é um engano,
        fale com a coordenação ou o administrador.
      </p>
      <Link href={home}>
        <Button>Voltar ao início</Button>
      </Link>
    </div>
  );
}
