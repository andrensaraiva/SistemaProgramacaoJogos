"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { finalizarProva, iniciarProva } from "@/lib/exams/actions";

type Estado = "nao_iniciada" | "em_andamento" | "finalizada";

// Lockdown da prova: regra do usuário — SAIR DA TELA finaliza/entrega a prova.
// Se houver questões não respondidas, avisa e pede confirmação antes de entregar.
export function ExamLockdown({
  classId,
  assignmentId,
  estadoInicial,
  respondidas,
  total,
  leftScreen,
  children,
}: {
  classId: string;
  assignmentId: string;
  estadoInicial: Estado;
  respondidas: number;
  total: number;
  leftScreen: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>(estadoInicial);
  const [confirmando, setConfirmando] = useState(false);
  const [pendente, setPendente] = useState(false);
  const finalizandoRef = useRef(false);

  const faltam = Math.max(0, total - respondidas);

  // Finaliza a prova de fato (idempotente). `porSaida` marca saída da tela.
  const finalizar = useCallback(
    async (porSaida: boolean) => {
      if (finalizandoRef.current) return;
      finalizandoRef.current = true;
      setPendente(true);
      await finalizarProva(assignmentId, classId, porSaida);
      setEstado("finalizada");
      setPendente(false);
      router.refresh();
    },
    [assignmentId, classId, router],
  );

  // Vigia de saída da tela: só enquanto a prova está em andamento.
  useEffect(() => {
    if (estado !== "em_andamento") return;

    function aoSair() {
      // Saiu da tela → entrega automática (sem confirmar; a regra é dura).
      void finalizar(true);
    }
    function aoVisibilidade() {
      if (document.hidden) aoSair();
    }
    function aoSairFullscreen() {
      if (!document.fullscreenElement) aoSair();
    }

    document.addEventListener("visibilitychange", aoVisibilidade);
    window.addEventListener("blur", aoSair);
    document.addEventListener("fullscreenchange", aoSairFullscreen);
    return () => {
      document.removeEventListener("visibilitychange", aoVisibilidade);
      window.removeEventListener("blur", aoSair);
      document.removeEventListener("fullscreenchange", aoSairFullscreen);
    };
  }, [estado, finalizar]);

  async function iniciar() {
    setPendente(true);
    const res = await iniciarProva(assignmentId, classId);
    setPendente(false);
    if (!res.ok) return;
    // Tela cheia ajuda a deixar claro que está em prova (e detectamos a saída).
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Alguns navegadores exigem gesto/permite negar — seguimos mesmo assim.
    }
    setEstado("em_andamento");
  }

  // Entrega manual: se faltam questões, confirma antes.
  function entregar() {
    if (faltam > 0) {
      setConfirmando(true);
      return;
    }
    void finalizarSaindoDoFullscreen();
  }

  async function finalizarSaindoDoFullscreen() {
    setConfirmando(false);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* ignore */
      }
    }
    await finalizar(false);
  }

  // ----- Renderização por estado -----
  if (estado === "finalizada") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <div className="text-3xl">📝</div>
        <h2 className="mt-2 text-lg font-semibold">Prova finalizada</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sua prova foi entregue
          {leftScreen ? " automaticamente porque você saiu da tela." : "."} Não é possível
          responder novamente.
        </p>
      </div>
    );
  }

  if (estado === "nao_iniciada") {
    return (
      <div className="rounded-2xl border border-warning/40 bg-warning/5 p-6">
        <h2 className="text-lg font-semibold">Modo prova 🔒</h2>
        <ul className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
          <li>• A prova abre em tela cheia.</li>
          <li>
            • <span className="font-medium text-foreground">Se você sair da tela</span> (trocar de
            aba, minimizar ou sair da tela cheia), a prova é{" "}
            <span className="font-medium text-foreground">entregue automaticamente</span>.
          </li>
          <li>• São {total} questão{total !== 1 ? "ões" : ""} no total.</li>
        </ul>
        <div className="mt-4">
          <Button type="button" onClick={iniciar} disabled={pendente}>
            {pendente ? "Iniciando..." : "Iniciar prova"}
          </Button>
        </div>
      </div>
    );
  }

  // em_andamento
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
        <span className="text-sm font-medium text-warning">
          🔒 Prova em andamento — não saia da tela ou ela será entregue.
        </span>
        <span className="text-xs text-muted-foreground">
          {respondidas} de {total} respondidas
        </span>
      </div>

      {children}

      <div className="flex items-center justify-end gap-3">
        <Button type="button" onClick={entregar} disabled={pendente}>
          {pendente ? "Entregando..." : "Entregar prova"}
        </Button>
      </div>

      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
            <div className="text-3xl">⚠️</div>
            <h3 className="mt-2 text-lg font-semibold">Entregar mesmo assim?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Você ainda não respondeu {faltam} questão{faltam !== 1 ? "ões" : ""}. Depois de
              entregar, não dá para voltar.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button type="button" variant="ghost" onClick={() => setConfirmando(false)}>
                Continuar prova
              </Button>
              <Button type="button" variant="danger" onClick={finalizarSaindoDoFullscreen} disabled={pendente}>
                Entregar assim mesmo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
