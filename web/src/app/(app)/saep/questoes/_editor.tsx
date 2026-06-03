"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { salvarQuestao, sugerirQuestaoIA } from "@/lib/saep/actions";

type Option = { label: string; text: string; is_correct: boolean; justification: string };

type Initial = {
  id?: string;
  contexto: string;
  comando: string;
  resolucao: string;
  difficulty: string;
  is_public: boolean;
  course_id: string;
  competency_id: string;
  knowledge_object_id: string;
  options: Option[];
};

type Competency = { id: string; code: string; description: string };
type KObject = { id: string; code: string; name: string };

const LABELS = ["A", "B", "C", "D", "E"];

function blankOptions(): Option[] {
  return LABELS.map((label) => ({ label, text: "", is_correct: false, justification: "" }));
}

export function QuestaoEditor({
  initial,
  competencies,
  knowledgeObjects,
}: {
  initial?: Partial<Initial>;
  competencies: Competency[];
  knowledgeObjects: KObject[];
}) {
  const router = useRouter();
  const [contexto, setContexto] = useState(initial?.contexto ?? "");
  const [comando, setComando] = useState(initial?.comando ?? "");
  const [resolucao, setResolucao] = useState(initial?.resolucao ?? "");
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? "medio");
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? false);
  const [competencyId, setCompetencyId] = useState(initial?.competency_id ?? "");
  const [objectId, setObjectId] = useState(initial?.knowledge_object_id ?? "");
  const [options, setOptions] = useState<Option[]>(
    initial?.options?.length ? initial.options : blankOptions(),
  );

  const [tema, setTema] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setOption(i: number, patch: Partial<Option>) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }

  function markCorrect(i: number) {
    // Apenas uma correta.
    setOptions((prev) => prev.map((o, idx) => ({ ...o, is_correct: idx === i })));
  }

  async function handleAi() {
    setError(null);
    if (!tema.trim()) {
      setError("Escreva um tema para a IA gerar.");
      return;
    }
    setAiLoading(true);
    const compLabel = competencies.find((c) => c.id === competencyId);
    const objLabel = knowledgeObjects.find((o) => o.id === objectId);
    const res = await sugerirQuestaoIA({
      tema,
      competencia: compLabel ? `${compLabel.code} ${compLabel.description}` : undefined,
      objeto: objLabel ? `${objLabel.code} ${objLabel.name}` : undefined,
      difficulty: difficulty as "facil" | "medio" | "dificil" | "desafio",
    });
    setAiLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    // Preenche o formulário com a sugestão — o instrutor revisa e edita.
    const q = res.question;
    setContexto(q.contexto);
    setComando(q.comando);
    setResolucao(q.resolucao);
    setOptions(
      q.options.map((o) => ({
        label: o.label,
        text: o.text,
        is_correct: o.is_correct,
        justification: o.justification,
      })),
    );
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await salvarQuestao(initial?.id ?? null, {
        course_id: initial?.course_id ?? "",
        competency_id: competencyId,
        knowledge_object_id: objectId,
        contexto,
        comando,
        resolucao,
        difficulty,
        is_public: isPublic,
        options,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.push("/saep/questoes");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Assistente de IA */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Sugerir com IA (opcional)</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          A IA preenche o formulário abaixo no formato SAEP. Você revisa e ajusta antes de salvar.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1">
            <Field label="Tema" htmlFor="tema">
              <Input
                id="tema"
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder="Ex: testes de caixa preta, herança em POO, tilemaps no Unity"
              />
            </Field>
          </div>
          <Button type="button" variant="secondary" onClick={handleAi} disabled={aiLoading}>
            {aiLoading ? "Gerando..." : "Gerar sugestão"}
          </Button>
        </div>
      </div>

      {/* Classificação na matriz */}
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Capacidade (matriz)" htmlFor="competency">
          <select
            id="competency"
            value={competencyId}
            onChange={(e) => setCompetencyId(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">— Sem capacidade —</option>
            {competencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.description}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Objeto de conhecimento" htmlFor="object">
          <select
            id="object"
            value={objectId}
            onChange={(e) => setObjectId(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">— Sem objeto —</option>
            {knowledgeObjects.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code} — {o.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dificuldade" htmlFor="difficulty">
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="facil">Fácil</option>
            <option value="medio">Médio</option>
            <option value="dificil">Difícil</option>
            <option value="desafio">Desafio</option>
          </select>
        </Field>
      </div>

      <Field label="Contexto" htmlFor="contexto">
        <textarea
          id="contexto"
          rows={3}
          value={contexto}
          onChange={(e) => setContexto(e.target.value)}
          placeholder="Situação-problema que dá contexto à pergunta."
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </Field>

      <Field label="Comando (a pergunta)" htmlFor="comando">
        <textarea
          id="comando"
          rows={2}
          value={comando}
          onChange={(e) => setComando(e.target.value)}
          placeholder="Qual tipo de teste é indicado para...?"
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </Field>

      {/* Alternativas */}
      <div>
        <div className="mb-2 text-sm font-medium">Alternativas (marque a correta)</div>
        <div className="flex flex-col gap-3">
          {options.map((o, i) => (
            <div
              key={i}
              className={`rounded-xl border p-3 ${
                o.is_correct ? "border-success bg-success/5" : "border-border bg-card"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={o.is_correct}
                  onChange={() => markCorrect(i)}
                  title="Marcar como correta"
                />
                <span className="font-semibold">{o.label}</span>
                <input
                  value={o.text}
                  onChange={(e) => setOption(i, { text: e.target.value })}
                  placeholder={`Texto da alternativa ${o.label}`}
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <input
                value={o.justification}
                onChange={(e) => setOption(i, { justification: e.target.value })}
                placeholder="Justificativa (por que está certa/errada)"
                className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          ))}
        </div>
      </div>

      <Field label="Resolução comentada (opcional)" htmlFor="resolucao">
        <textarea
          id="resolucao"
          rows={3}
          value={resolucao}
          onChange={(e) => setResolucao(e.target.value)}
          placeholder="Explicação do raciocínio até a resposta correta."
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
        Tornar pública (outros professores podem reutilizar)
      </label>

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="button" onClick={handleSave} disabled={pending}>
          {pending ? "Salvando..." : "Salvar questão"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/saep/questoes")}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
