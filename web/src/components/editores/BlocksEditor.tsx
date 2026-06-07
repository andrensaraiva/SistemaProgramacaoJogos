"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CATEGORIES, colorOf, createBlock, type BlockType } from "@/lib/blocks/catalog";
import { runProgram } from "@/lib/blocks/runtime";
import { emptyBlocksProject, type Block, type BlockValue, type BlocksProject } from "@/lib/blocks/types";
import type { CanvasConfig } from "@/lib/canvas/types";

import { BlockValueInput, ConditionInput } from "./_base/BlockValueInput";
import { CelesteSprite } from "./_base/CelesteSprite";

const CONTAINER: BlockType[] = ["se", "repita", "enquanto"];

export function BlocksEditor({
  config,
  initial,
  onChange,
}: {
  config: CanvasConfig;
  initial?: BlocksProject | null;
  onChange: (project: BlocksProject, pngBlob: () => Promise<Blob>) => void;
}) {
  const [project, setProject] = useState<BlocksProject>(
    () => initial ?? emptyBlocksProject(config.width, config.height),
  );
  // Container alvo para "adicionar dentro" (id do bloco) ou null = topo.
  const [target, setTarget] = useState<string | null>(null);
  const [result, setResult] = useState(() => runProgram(project));
  const stageRef = useRef<HTMLDivElement>(null);

  // Variáveis declaradas (para os seletores de variável).
  const vars = useMemo(() => {
    const set = new Set<string>();
    const walk = (bs: Block[]) => {
      for (const b of bs) {
        if (b.type === "definir_var" || b.type === "mudar_var") set.add(b.name);
        if (b.type === "se") {
          walk(b.corpo);
          if (b.senao) walk(b.senao);
        }
        if (b.type === "repita" || b.type === "enquanto") walk(b.corpo);
      }
    };
    walk(project.blocks);
    return [...set];
  }, [project.blocks]);

  // PNG do palco para a entrega/preview.
  const pngBlob = useCallback(async (): Promise<Blob> => {
    const w = config.width;
    const h = config.height;
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, w, h);
    // Marca a posição final da Celeste (sem o SVG; mantém leve e determinístico).
    const cx = w / 2 + result.stage.x;
    const cy = h / 2 - result.stage.y;
    ctx.fillStyle = "#bfe0ff";
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe9a8";
    ctx.fillRect(cx - 2, cy - 28, 4, 12); // chifre
    if (result.stage.says) {
      ctx.fillStyle = "#fff";
      ctx.font = "14px sans-serif";
      ctx.fillText(result.stage.says.slice(0, 30), 10, 22);
    }
    return await new Promise<Blob>((resolve) => cv.toBlob((b) => resolve(b!), "image/png"));
  }, [config.width, config.height, result]);

  useEffect(() => {
    onChange(project, pngBlob);
  }, [project, pngBlob, onChange]);

  function addBlock(type: BlockType) {
    const blk = createBlock(type);
    setProject((p) => {
      if (!target) return { ...p, blocks: [...p.blocks, blk] };
      // Adiciona dentro do container alvo (corpo).
      const insert = (bs: Block[]): Block[] =>
        bs.map((b) => {
          if (b.id === target && (b.type === "se" || b.type === "repita" || b.type === "enquanto")) {
            return { ...b, corpo: [...b.corpo, blk] };
          }
          if (b.type === "se") return { ...b, corpo: insert(b.corpo), senao: b.senao ? insert(b.senao) : b.senao };
          if (b.type === "repita" || b.type === "enquanto") return { ...b, corpo: insert(b.corpo) };
          return b;
        });
      return { ...p, blocks: insert(p.blocks) };
    });
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    setProject((p) => {
      const walk = (bs: Block[]): Block[] =>
        bs.map((b) => {
          if (b.id === id) return { ...b, ...patch } as Block;
          if (b.type === "se") return { ...b, corpo: walk(b.corpo), senao: b.senao ? walk(b.senao) : b.senao };
          if (b.type === "repita" || b.type === "enquanto") return { ...b, corpo: walk(b.corpo) };
          return b;
        });
      return { ...p, blocks: walk(p.blocks) };
    });
  }

  function removeBlock(id: string) {
    setProject((p) => {
      const walk = (bs: Block[]): Block[] =>
        bs
          .filter((b) => b.id !== id)
          .map((b) => {
            if (b.type === "se") return { ...b, corpo: walk(b.corpo), senao: b.senao ? walk(b.senao) : b.senao };
            if (b.type === "repita" || b.type === "enquanto") return { ...b, corpo: walk(b.corpo) };
            return b;
          });
      return { ...p, blocks: walk(p.blocks) };
    });
    if (target === id) setTarget(null);
  }

  function move(list: Block[], id: string, dir: -1 | 1): Block[] {
    const i = list.findIndex((b) => b.id === id);
    if (i < 0) return list;
    const to = i + dir;
    if (to < 0 || to >= list.length) return list;
    const next = list.slice();
    [next[i], next[to]] = [next[to], next[i]];
    return next;
  }
  function moveBlock(id: string, dir: -1 | 1) {
    setProject((p) => {
      const walk = (bs: Block[]): Block[] => {
        const moved = move(bs, id, dir);
        return moved.map((b) => {
          if (b.type === "se") return { ...b, corpo: walk(b.corpo), senao: b.senao ? walk(b.senao) : b.senao };
          if (b.type === "repita" || b.type === "enquanto") return { ...b, corpo: walk(b.corpo) };
          return b;
        });
      };
      return { ...p, blocks: walk(p.blocks) };
    });
  }

  function executar() {
    setResult(runProgram(project));
  }

  const celesteLeft = config.width / 2 + result.stage.x;
  const celesteTop = config.height / 2 - result.stage.y;

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      {/* Paleta */}
      <div className="w-full shrink-0 lg:w-48">
        <div className="mb-2 text-xs text-muted-foreground">
          {target ? "Adicionando DENTRO do bloco selecionado" : "Adicionando no fim do programa"}
          {target && (
            <button onClick={() => setTarget(null)} className="ml-1 text-primary underline">
              (topo)
            </button>
          )}
        </div>
        <div className="flex flex-col gap-3">
          {CATEGORIES.map((cat) => (
            <div key={cat.id}>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {cat.label}
              </div>
              <div className="flex flex-col gap-1">
                {cat.blocks.map((b) => (
                  <button
                    key={b.type}
                    type="button"
                    onClick={() => addBlock(b.type)}
                    className="rounded-lg px-2 py-1 text-left text-xs font-medium text-white"
                    style={{ backgroundColor: cat.color }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pilha de blocos */}
      <div className="flex-1 rounded-xl border border-border bg-[#0d1326] p-3">
        {project.blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Clique nos blocos da paleta para montar o programa da Celeste.
          </p>
        ) : (
          <BlockList
            blocks={project.blocks}
            vars={vars}
            target={target}
            onTarget={setTarget}
            onUpdate={updateBlock}
            onRemove={removeBlock}
            onMove={moveBlock}
          />
        )}
      </div>

      {/* Palco + console */}
      <div className="w-full shrink-0 lg:w-72">
        <button
          type="button"
          onClick={executar}
          className="mb-2 w-full rounded-lg bg-success px-3 py-2 text-sm font-semibold text-white"
        >
          ▶ Executar
        </button>
        <div
          ref={stageRef}
          className="relative overflow-hidden rounded-lg border border-border"
          style={{ width: "100%", aspectRatio: `${config.width} / ${config.height}`, background: "#0b1020" }}
        >
          <div
            className="absolute"
            style={{
              left: `${(celesteLeft / config.width) * 100}%`,
              top: `${(celesteTop / config.height) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {result.stage.says && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-white px-2 py-0.5 text-[10px] text-black">
                {result.stage.says}
              </div>
            )}
            <CelesteSprite size={64} dir={result.stage.dir} />
          </div>
        </div>

        <div className="mt-2 rounded-lg border border-border bg-black/40 p-2">
          <div className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">Console</div>
          {result.error && <div className="text-xs text-danger">{result.error}</div>}
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-success">
            {result.console.join("\n") || "(vazio)"}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ---- Renderização recursiva da pilha ----
function BlockList({
  blocks,
  vars,
  target,
  onTarget,
  onUpdate,
  onRemove,
  onMove,
  depth = 0,
}: {
  blocks: Block[];
  vars: string[];
  target: string | null;
  onTarget: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<Block>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  depth?: number;
}) {
  return (
    <div className="flex flex-col gap-1" style={{ marginLeft: depth ? 14 : 0 }}>
      {blocks.map((b) => (
        <div key={b.id}>
          <div
            className="flex flex-wrap items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: colorOf(b.type) }}
          >
            <BlockBody block={b} vars={vars} onUpdate={onUpdate} />
            <span className="ml-auto flex items-center gap-1">
              {CONTAINER.includes(b.type) && (
                <button
                  type="button"
                  onClick={() => onTarget(target === b.id ? null : b.id)}
                  title="Adicionar dentro"
                  className={`rounded px-1 ${target === b.id ? "bg-white text-black" : "bg-white/20"}`}
                >
                  ＋
                </button>
              )}
              <button type="button" onClick={() => onMove(b.id, -1)} className="rounded bg-white/20 px-1">▲</button>
              <button type="button" onClick={() => onMove(b.id, 1)} className="rounded bg-white/20 px-1">▼</button>
              <button type="button" onClick={() => onRemove(b.id)} className="rounded bg-white/20 px-1">✕</button>
            </span>
          </div>
          {b.type === "se" && (
            <>
              <BlockList blocks={b.corpo} vars={vars} target={target} onTarget={onTarget} onUpdate={onUpdate} onRemove={onRemove} onMove={onMove} depth={depth + 1} />
              <div className="px-2 text-[10px] text-muted-foreground" style={{ marginLeft: depth ? 14 : 0 }}>senão:</div>
              <BlockList blocks={b.senao ?? []} vars={vars} target={target} onTarget={onTarget} onUpdate={onUpdate} onRemove={onRemove} onMove={onMove} depth={depth + 1} />
            </>
          )}
          {(b.type === "repita" || b.type === "enquanto") && (
            <BlockList blocks={b.corpo} vars={vars} target={target} onTarget={onTarget} onUpdate={onUpdate} onRemove={onRemove} onMove={onMove} depth={depth + 1} />
          )}
        </div>
      ))}
    </div>
  );
}

const nameCls = "rounded border border-white/30 bg-white/90 px-1.5 py-0.5 text-xs text-black w-16";

// Renderiza os campos editáveis de cada bloco.
function BlockBody({
  block: b,
  vars,
  onUpdate,
}: {
  block: Block;
  vars: string[];
  onUpdate: (id: string, patch: Partial<Block>) => void;
}) {
  const V = (value: BlockValue, key: string, numeric = false) => (
    <BlockValueInput
      value={value}
      numeric={numeric}
      vars={vars}
      onChange={(v) => onUpdate(b.id, { [key]: v } as Partial<Block>)}
    />
  );

  switch (b.type) {
    case "mover":
      return <>mover {V(b.passos, "passos", true)} passos</>;
    case "virar":
      return <>virar {V(b.graus, "graus", true)} graus</>;
    case "ir_para":
      return <>ir para x:{V(b.x, "x", true)} y:{V(b.y, "y", true)}</>;
    case "falar":
      return <>falar {V(b.texto, "texto")}</>;
    case "imprimir":
      return <>imprimir {V(b.valor, "valor")}</>;
    case "definir_var":
      return (
        <>
          definir{" "}
          <input className={nameCls} value={b.name} onChange={(e) => onUpdate(b.id, { name: e.target.value })} /> ={" "}
          {V(b.valor, "valor", true)}
        </>
      );
    case "mudar_var":
      return (
        <>
          mudar{" "}
          <input className={nameCls} value={b.name} onChange={(e) => onUpdate(b.id, { name: e.target.value })} /> em{" "}
          {V(b.por, "por", true)}
        </>
      );
    case "criar_lista":
      return (
        <>
          criar lista{" "}
          <input className={nameCls} value={b.name} onChange={(e) => onUpdate(b.id, { name: e.target.value })} />
        </>
      );
    case "add_lista":
      return (
        <>
          adicionar {V(b.valor, "valor", true)} à lista{" "}
          <input className={nameCls} value={b.name} onChange={(e) => onUpdate(b.id, { name: e.target.value })} />
        </>
      );
    case "se":
      return (
        <>
          se{" "}
          <ConditionInput value={b.cond} vars={vars} onChange={(cond) => onUpdate(b.id, { cond })} /> então
        </>
      );
    case "repita":
      return <>repita {V(b.vezes, "vezes", true)} vezes</>;
    case "enquanto":
      return (
        <>
          enquanto <ConditionInput value={b.cond} vars={vars} onChange={(cond) => onUpdate(b.id, { cond })} />
        </>
      );
  }
}
