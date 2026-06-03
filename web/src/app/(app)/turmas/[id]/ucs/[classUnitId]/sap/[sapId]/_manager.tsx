"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { atualizarSap, carregarMarcacoes, obterOuCriarSap } from "@/lib/sap/actions";

import { RubricEditor, type Competency, type KObject } from "./_rubric-editor";
import { Evaluator } from "./_evaluator";

export type RubricUnitView = {
  id: string;
  code: string | null;
  title: string;
  elements: {
    id: string;
    code: string | null;
    title: string;
    criteria: {
      id: string;
      code: string | null;
      description: string;
      items: {
        id: string;
        code: string | null;
        description: string;
        points: number;
        competency_id: string | null;
        knowledge_object_id: string | null;
      }[];
    }[];
  }[];
};

type Sap = { id: string; title: string; description: string; max_score: number | null };
type Student = {
  id: string;
  name: string;
  link: string | null;
  submittedAt: string | null;
  score: number | null;
  maxScore: number | null;
  evaluated: boolean;
};

export function SapManager({
  assignmentId,
  assignmentTitle,
  sap,
  rubric,
  competencies,
  knowledgeObjects,
  students,
}: {
  classId: string;
  classUnitId: string;
  assignmentId: string;
  assignmentTitle: string;
  sap: Sap | null;
  rubric: RubricUnitView[];
  competencies: Competency[];
  knowledgeObjects: KObject[];
  students: Student[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Estado da avaliação aberta.
  const [openStudent, setOpenStudent] = useState<{
    id: string;
    name: string;
    marks: Record<string, { met: boolean; justification: string | null }>;
    feedback: string | null;
  } | null>(null);

  // Config.
  const [title, setTitle] = useState(sap?.title ?? assignmentTitle);
  const [description, setDescription] = useState(sap?.description ?? "");
  const [maxScore, setMaxScore] = useState(sap?.max_score != null ? String(sap.max_score) : "");

  if (!sap) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">{assignmentTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">SAP prático</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="mb-4 text-sm text-muted-foreground">
            Este SAP ainda não foi configurado. Clique para criar e montar a lista de verificação.
          </p>
          {error && (
            <div className="mb-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await obterOuCriarSap(assignmentId);
                if (!res.ok) {
                  setError(res.message);
                  return;
                }
                router.refresh();
              })
            }
          >
            {pending ? "Criando..." : "Configurar SAP"}
          </Button>
        </div>
      </div>
    );
  }

  function saveConfig() {
    setError(null);
    startTransition(async () => {
      const res = await atualizarSap(sap!.id, {
        title,
        description,
        max_score: maxScore ? Number(maxScore) : undefined,
      });
      if (!res.ok) setError(res.message);
      else router.refresh();
    });
  }

  function openEvaluator(s: Student) {
    setError(null);
    startTransition(async () => {
      const res = await carregarMarcacoes(sap!.id, s.id);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setOpenStudent({ id: s.id, name: s.name, marks: res.marks, feedback: res.feedback });
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{sap.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">SAP prático · lista de verificação</p>
      </div>

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
      )}

      {/* Config */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Configuração</h2>
        <div className="flex flex-col gap-4">
          <Field label="Título" htmlFor="title">
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Enunciado do desafio (opcional)" htmlFor="description">
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </Field>
          <Field label="Nota cheia (informativo, ex: 10)" htmlFor="max">
            <Input id="max" type="number" min={0} value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
          </Field>
          <div>
            <Button type="button" onClick={saveConfig} disabled={pending}>
              {pending ? "Salvando..." : "Salvar configuração"}
            </Button>
          </div>
        </div>
      </section>

      {/* Rubrica */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <RubricEditor
          assessmentId={sap.id}
          initial={rubric}
          competencies={competencies}
          knowledgeObjects={knowledgeObjects}
        />
      </section>

      {/* Avaliação aberta */}
      {openStudent && (
        <Evaluator
          assessmentId={sap.id}
          studentId={openStudent.id}
          studentName={openStudent.name}
          rubric={rubric}
          initialMarks={openStudent.marks}
          initialFeedback={openStudent.feedback}
          onClose={() => setOpenStudent(null)}
        />
      )}

      {/* Alunos */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Alunos</h2>
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aluno na turma ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2 text-left font-medium">Aluno</th>
                  <th className="px-3 py-2 text-left font-medium">Entrega</th>
                  <th className="px-3 py-2 text-center font-medium">Nota</th>
                  <th className="px-3 py-2 text-center font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                    <td className="px-3 py-2">{s.name}</td>
                    <td className="px-3 py-2">
                      {s.link ? (
                        <a
                          href={s.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          abrir entrega
                        </a>
                      ) : (
                        <span className="text-muted-foreground">sem entrega</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {s.evaluated && s.score != null ? (
                        <span className="font-semibold">
                          {s.score}/{s.maxScore}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button type="button" variant="secondary" onClick={() => openEvaluator(s)} disabled={pending}>
                        {s.evaluated ? "Reavaliar" : "Avaliar"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
