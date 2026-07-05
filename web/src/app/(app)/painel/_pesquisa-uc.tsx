"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { responderPesquisa, type PesquisaPendente } from "@/lib/uc-survey/actions";
import { SURVEY_TOPICS, type SurveyRatings, type SurveyTopic } from "@/lib/uc-survey/eligibility";

// Card no painel do aluno: pesquisa ANÔNIMA de UCs que terminaram. Notas 1–5 por
// tópico (infra/didática/ritmo/geral) + comentário. Some quando responde tudo.
export function PesquisaUcPainel({ pendentes }: { pendentes: PesquisaPendente[] }) {
  const [restantes, setRestantes] = useState(pendentes);
  if (restantes.length === 0) return null;
  // Uma pesquisa por vez (a primeira da fila).
  const atual = restantes[0];

  return (
    <Card className="reveal-up border-primary/30 bg-primary/5">
      <CardHeader
        title="📝 Pesquisa da unidade curricular"
        description={`A UC "${atual.uc}" (${atual.turma}) terminou. Conte como foi — é anônimo!`}
        action={
          restantes.length > 1 ? (
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {restantes.length} pendentes
            </span>
          ) : undefined
        }
      />
      <SurveyForm
        key={atual.classUnitId}
        pesquisa={atual}
        onDone={() => setRestantes((r) => r.slice(1))}
      />
    </Card>
  );
}

function SurveyForm({
  pesquisa,
  onDone,
}: {
  pesquisa: PesquisaPendente;
  onDone: () => void;
}) {
  const router = useRouter();
  const [ratings, setRatings] = useState<SurveyRatings>({
    infra: null,
    didatica: null,
    ritmo: null,
    geral: null,
  });
  const [comment, setComment] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function enviar() {
    setErro(null);
    start(async () => {
      const res = await responderPesquisa(pesquisa.classUnitId, ratings, comment);
      if (res.ok) {
        onDone();
        router.refresh();
      } else {
        setErro(res.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {SURVEY_TOPICS.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-background/40 p-3">
            <div className="text-sm font-medium">
              {t.emoji} {t.label}
            </div>
            <div className="text-xs text-muted-foreground">{t.hint}</div>
            <StarPicker
              value={ratings[t.id]}
              onChange={(v) => setRatings((r) => ({ ...r, [t.id]: v }))}
            />
          </div>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="O que foi bom? O que melhorar? (opcional)"
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      />

      {erro && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {erro}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={enviar} disabled={pending}>
          {pending ? "Enviando…" : "Enviar pesquisa"}
        </Button>
        <span className="text-xs text-muted-foreground">Anônimo — ninguém vê quem respondeu.</span>
      </div>
    </div>
  );
}

function StarPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: SurveyTopic extends never ? never : number) => void;
}) {
  return (
    <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Nota de 1 a 5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} de 5`}
          aria-checked={value === n}
          role="radio"
          className={`text-2xl leading-none transition-transform hover:scale-110 ${
            value != null && n <= value ? "text-warning" : "text-muted-foreground/40"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
