import { Card, CardHeader } from "@/components/ui/card";
import { getProfile } from "@/lib/auth/dal";
import { getFeedbackResumo } from "@/lib/feedback/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { listarProfessoresDaTurma } from "@/lib/turmas/co-docencia";

import {
  AddProfessorForm,
  FeedbackForm,
  RemoveProfessorButton,
  ResponsavelUcForm,
} from "./_co-docencia-client";

type UcRef = { id: string; title: string };

// Seção de co-docência: para professores que gerenciam (dono/co), mostra a
// gestão de professores e responsáveis por UC. Para alunos, o formulário de
// feedback anônimo.
export async function ClassTeachersSection({
  classId,
  canManage,
  isStudent,
  ucList,
}: {
  classId: string;
  canManage: boolean;
  isStudent: boolean;
  ucList: UcRef[];
}) {
  const professores = await listarProfessoresDaTurma(classId);

  if (isStudent) {
    return <FeedbackPanel classId={classId} professores={professores} ucList={ucList} />;
  }

  if (!canManage) return null;

  const admin = createAdminClient();
  // Professores disponíveis para adicionar (todos os professores, menos os que já estão).
  const { data: todos } = await admin
    .from("profiles")
    .select("id, display_name")
    .eq("role", "professor")
    .order("display_name");
  const jaNaTurma = new Set(professores.map((p) => p.id));
  const disponiveis = (todos ?? []).filter((p) => !jaNaTurma.has(p.id));

  // Responsável atual por UC.
  const { data: cus } = await admin
    .from("class_units")
    .select("id, teacher_id")
    .eq("class_id", classId);
  const respPorUc = new Map((cus ?? []).map((c) => [c.id, c.teacher_id as string | null]));

  // Quem gerencia a turma (dono, co-docente, coordenador, admin) gerencia a
  // equipe de professores e os responsáveis por UC. (canManage já é o gate da seção.)
  const podeGerir = canManage;

  // Feedback que o PRÓPRIO professor logado recebeu (anônimo). Admin não tem
  // feedback próprio aqui; vê consolidado nos relatórios.
  const me = await getProfile();
  const meuResumo = me && me.role !== "admin" ? await getFeedbackResumo(me.id) : null;

  return (
    <Card>
      <CardHeader
        title="Professores da turma"
        description="Co-docência: vários professores podem lecionar e acompanhar a turma juntos."
      />

      <ul className="mb-4 flex flex-col gap-2">
        {professores.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
            <span>
              {p.display_name}{" "}
              <span className="text-xs text-muted-foreground">{p.isOwner ? "(dono)" : "(co-professor)"}</span>
            </span>
            {podeGerir && !p.isOwner && <RemoveProfessorButton classId={classId} teacherId={p.id} />}
          </li>
        ))}
      </ul>

      {podeGerir && disponiveis.length > 0 && (
        <div className="mb-4">
          <AddProfessorForm classId={classId} professores={disponiveis} />
        </div>
      )}

      {podeGerir && ucList.length > 0 && (
        <div className="rounded-lg border border-border p-3">
          <h3 className="mb-2 text-sm font-semibold">Responsável por UC</h3>
          <div className="flex flex-col gap-2">
            {ucList.map((uc) => (
              <ResponsavelUcForm
                key={uc.id}
                classId={classId}
                classUnitId={uc.id}
                ucTitle={uc.title}
                professores={professores}
                atual={respPorUc.get(uc.id) ?? ""}
              />
            ))}
          </div>
        </div>
      )}

      {meuResumo && meuResumo.total > 0 && (
        <div className="mt-4 rounded-lg border border-border p-3">
          <h3 className="mb-1 text-sm font-semibold">
            Seu feedback dos alunos (anônimo) — média {meuResumo.average} ★ · {meuResumo.total} avaliação(ões)
          </h3>
          <p className="mb-2 text-xs text-muted-foreground">
            {meuResumo.geralCount} geral · {meuResumo.porAulaCount} por aula. Você não vê quem enviou.
          </p>
          {meuResumo.comments.length > 0 && (
            <ul className="flex flex-col gap-1">
              {meuResumo.comments.slice(0, 10).map((c, i) => (
                <li key={i} className="rounded bg-muted/40 px-2 py-1 text-xs">
                  <span className="text-warning">{"★".repeat(c.rating)}</span> {c.comment}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

function FeedbackPanel({
  classId,
  professores,
  ucList,
}: {
  classId: string;
  professores: { id: string; display_name: string }[];
  ucList: UcRef[];
}) {
  if (professores.length === 0) return null;
  return (
    <Card>
      <CardHeader
        title="Avaliar professores (anônimo)"
        description="Sua avaliação é totalmente anônima — nem o professor nem o admin sabem quem enviou."
      />
      <FeedbackForm classId={classId} professores={professores} ucList={ucList} />
    </Card>
  );
}
