"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";

import { Badge, DIFFICULTY_LABEL, DIFFICULTY_TONE } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { activityLabel } from "@/lib/activities/registry";
import { aplicarExercicio } from "@/lib/catalog/actions";

export type CatalogoItem = {
  id: string;
  title: string;
  language: string;
  difficulty: string;
  xp_reward: number;
  exercise_type: string;
  is_public: boolean;
  is_exam_suitable: boolean;
  is_mine: boolean;
  author_name: string;
  uc_ids: string[];
  uc_labels: string[];
  course_ids: string[];
};

export type TurmaComListas = {
  id: string;
  name: string;
  listas: { id: string; title: string; kind: string }[];
};

const selCls =
  "rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

export function CatalogoExercicios({
  items,
  turmas,
  courses,
  ucs,
}: {
  items: CatalogoItem[];
  turmas: TurmaComListas[];
  courses: { id: string; name: string }[];
  ucs: { id: string; label: string }[];
}) {
  const [busca, setBusca] = useState("");
  const [curso, setCurso] = useState("todos");
  const [uc, setUc] = useState("todas");
  const [dif, setDif] = useState("todas");
  const [prova, setProva] = useState("todos");
  const [autor, setAutor] = useState("todos");

  // UCs do curso escolhido (afunila o segundo filtro).
  const ucsDoCurso = useMemo(
    () => (curso === "todos" ? ucs : ucs.filter((u) => u.label.startsWith(cursoNome(courses, curso)))),
    [curso, ucs, courses],
  );

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return items.filter((e) => {
      if (q && !e.title.toLowerCase().includes(q)) return false;
      if (curso !== "todos" && !e.course_ids.includes(curso)) return false;
      if (uc !== "todas" && !e.uc_ids.includes(uc)) return false;
      if (dif !== "todas" && e.difficulty !== dif) return false;
      if (prova === "sim" && !e.is_exam_suitable) return false;
      if (prova === "nao" && e.is_exam_suitable) return false;
      if (autor === "meus" && !e.is_mine) return false;
      return true;
    });
  }, [items, busca, curso, uc, dif, prova, autor]);

  return (
    <div className="flex flex-col gap-5">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por título..."
          className={`${selCls} min-w-52 flex-1`}
        />
        <select value={curso} onChange={(e) => { setCurso(e.target.value); setUc("todas"); }} className={selCls}>
          <option value="todos">Todos os cursos</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={uc} onChange={(e) => setUc(e.target.value)} className={selCls}>
          <option value="todas">Todas as UCs</option>
          {ucsDoCurso.map((u) => (
            <option key={u.id} value={u.id}>{u.label}</option>
          ))}
        </select>
        <select value={dif} onChange={(e) => setDif(e.target.value)} className={selCls}>
          <option value="todas">Toda dificuldade</option>
          <option value="facil">Fácil</option>
          <option value="medio">Médio</option>
          <option value="dificil">Difícil</option>
          <option value="desafio">Desafio</option>
        </select>
        <select value={prova} onChange={(e) => setProva(e.target.value)} className={selCls}>
          <option value="todos">Prova: tanto faz</option>
          <option value="sim">Só de prova</option>
          <option value="nao">Sem prova</option>
        </select>
        <select value={autor} onChange={(e) => setAutor(e.target.value)} className={selCls}>
          <option value="todos">Todos os autores</option>
          <option value="meus">Só os meus</option>
        </select>
      </div>

      <p className="text-xs text-muted-foreground">
        {visiveis.length} de {items.length} exercício{items.length !== 1 ? "s" : ""}
      </p>

      {/* Cards */}
      {visiveis.length === 0 ? (
        <Card className="text-center text-sm text-muted-foreground">
          Nenhum exercício neste filtro.
        </Card>
      ) : (
        <div className="grid gap-3">
          {visiveis.map((e) => (
            <ExercicioCard key={e.id} item={e} turmas={turmas} />
          ))}
        </div>
      )}
    </div>
  );
}

function cursoNome(courses: { id: string; name: string }[], id: string) {
  return courses.find((c) => c.id === id)?.name ?? "";
}

function ExercicioCard({ item, turmas }: { item: CatalogoItem; turmas: TurmaComListas[] }) {
  const [aberto, setAberto] = useState(false);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/exercicios/${item.id}`} className="text-lg font-semibold hover:text-primary">
            {item.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{item.author_name}</span>
            <span>·</span>
            <span>{activityLabel(item.exercise_type)}</span>
            <span>·</span>
            <span className="uppercase">{item.language}</span>
            <span>·</span>
            <span className="font-medium text-foreground">⚡ {item.xp_reward} XP</span>
            {!item.is_public && (
              <>
                <span>·</span>
                <span className="text-warning">privado</span>
              </>
            )}
          </div>
          {item.uc_labels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {item.uc_labels.map((l, i) => (
                <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {l}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge tone={DIFFICULTY_TONE[item.difficulty] ?? "neutral"}>
            {DIFFICULTY_LABEL[item.difficulty] ?? item.difficulty}
          </Badge>
          {item.is_exam_suitable && <Badge tone="warning">Prova</Badge>}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border pt-3">
        <Button type="button" variant="secondary" onClick={() => setAberto((v) => !v)}>
          {aberto ? "Fechar" : "Usar em uma turma"}
        </Button>
      </div>

      {aberto && <UsarEmTurma exerciseId={item.id} turmas={turmas} />}
    </Card>
  );
}

const KIND_LABEL: Record<string, string> = { lista: "Lista", desafio: "Desafio", prova: "Prova" };

function UsarEmTurma({ exerciseId, turmas }: { exerciseId: string; turmas: TurmaComListas[] }) {
  const [turmaId, setTurmaId] = useState(turmas[0]?.id ?? "");
  const [listaId, setListaId] = useState("");
  const [novaLista, setNovaLista] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string; href?: string } | null>(null);
  const [pending, start] = useTransition();

  const turma = turmas.find((t) => t.id === turmaId);
  const criandoNova = listaId === "__nova__";

  if (turmas.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm text-muted-foreground">
        Você ainda não tem turmas. Crie uma turma para aplicar exercícios.
      </p>
    );
  }

  function aplicar() {
    setMsg(null);
    const fd = new FormData();
    fd.set("exercise_id", exerciseId);
    fd.set("class_id", turmaId);
    if (criandoNova) fd.set("nova_lista", novaLista);
    else fd.set("assignment_id", listaId);

    start(async () => {
      const res = await aplicarExercicio(fd);
      if (res.ok) {
        setMsg({
          ok: true,
          text: "Exercício aplicado!",
          href: `/turmas/${res.classId}/listas/${res.assignmentId}`,
        });
      } else {
        setMsg({ ok: false, text: res.message });
      }
    });
  }

  const podeAplicar = !!turmaId && (criandoNova ? novaLista.trim().length >= 3 : !!listaId);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium">Turma</span>
          <select
            value={turmaId}
            onChange={(e) => { setTurmaId(e.target.value); setListaId(""); }}
            className={selCls}
          >
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium">Lista</span>
          <select value={listaId} onChange={(e) => setListaId(e.target.value)} className={selCls}>
            <option value="">Selecione a lista...</option>
            {(turma?.listas ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.title} — {KIND_LABEL[l.kind] ?? l.kind}
              </option>
            ))}
            <option value="__nova__">+ Nova lista...</option>
          </select>
        </label>
      </div>

      {criandoNova && (
        <input
          value={novaLista}
          onChange={(e) => setNovaLista(e.target.value)}
          placeholder="Nome da nova lista"
          className={selCls}
        />
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={aplicar} disabled={pending || !podeAplicar}>
          {pending ? "Aplicando..." : "Aplicar"}
        </Button>
        {msg && (
          <span className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`}>
            {msg.text}{" "}
            {msg.ok && msg.href && (
              <Link href={msg.href} className="underline">abrir lista</Link>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
