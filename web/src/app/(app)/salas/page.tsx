import { redirect } from "next/navigation";

import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth/dal";
import { listarSalas } from "@/lib/rooms/actions";
import { ROOM_KIND_LABEL } from "@/lib/rooms/kinds";

import { NovaSalaForm, RemoverSalaButton } from "./_client";

export default async function SalasPage() {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");
  if (profile.role !== "admin" && profile.role !== "coordenador") redirect("/painel");

  const salas = await listarSalas();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Salas e ambientes"
        description="Cadastro das salas/laboratórios usados no calendário das turmas."
      />

      <Card>
        <CardHeader title="Nova sala" />
        <NovaSalaForm />
      </Card>

      <Card>
        <CardHeader title="Salas" description={`${salas.length} cadastrada(s).`} />
        {salas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma sala cadastrada.</p>
        ) : (
          <ul className="divide-y divide-border">
            {salas.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span className="font-medium">{s.name}</span>{" "}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {ROOM_KIND_LABEL[s.kind] ?? s.kind}
                  </span>
                  {s.capacity != null && (
                    <span className="ml-2 text-xs text-muted-foreground">{s.capacity} lugares</span>
                  )}
                </div>
                <RemoverSalaButton id={s.id} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
