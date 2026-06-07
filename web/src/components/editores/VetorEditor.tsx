"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { makeId, type CanvasConfig, type VectorProject, type VectorShape } from "@/lib/canvas/types";

import { EditorShell, Palette, ToolButton, Toolbar } from "./_base/ui";

type Tool = "selecionar" | "rect" | "ellipse" | "line" | "path";

function initialProject(config: CanvasConfig): VectorProject {
  return { kind: "vetor", width: config.width, height: config.height, shapes: [] };
}

function drawShape(ctx: CanvasRenderingContext2D, s: VectorShape) {
  ctx.lineWidth = s.strokeWidth;
  if (s.type === "rect") {
    ctx.fillStyle = s.fill;
    ctx.strokeStyle = s.stroke;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    if (s.strokeWidth > 0) ctx.strokeRect(s.x, s.y, s.w, s.h);
  } else if (s.type === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(s.cx, s.cy, Math.abs(s.rx), Math.abs(s.ry), 0, 0, Math.PI * 2);
    ctx.fillStyle = s.fill;
    ctx.fill();
    if (s.strokeWidth > 0) {
      ctx.strokeStyle = s.stroke;
      ctx.stroke();
    }
  } else if (s.type === "line") {
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.strokeStyle = s.stroke;
    ctx.stroke();
  } else if (s.type === "path") {
    ctx.beginPath();
    s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.strokeStyle = s.stroke;
    ctx.stroke();
  }
}

export function VetorEditor({
  config,
  initial,
  onChange,
}: {
  config: CanvasConfig;
  initial?: VectorProject | null;
  onChange: (project: VectorProject, pngBlob: () => Promise<Blob>) => void;
}) {
  const [project, setProject] = useState<VectorProject>(() => initial ?? initialProject(config));
  const [tool, setTool] = useState<Tool>("rect");
  const [fill, setFill] = useState("#3498db");
  const [stroke, setStroke] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [selected, setSelected] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ startX: number; startY: number; shapeId: string | null; mode: "create" | "move" } | null>(null);
  const { width: w, height: h } = project;

  const render = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    for (const s of project.shapes) {
      drawShape(ctx, s);
      if (s.id === selected) {
        const b = bounds(s);
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
        ctx.setLineDash([]);
      }
    }
  }, [project, selected, w, h]);

  useEffect(() => {
    render();
  }, [render]);

  const pngBlob = useCallback(async (): Promise<Blob> => {
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const ctx = off.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    for (const s of project.shapes) drawShape(ctx, s);
    return await new Promise<Blob>((resolve) => off.toBlob((b) => resolve(b!), "image/png"));
  }, [project, w, h]);

  useEffect(() => {
    onChange(project, pngBlob);
  }, [project, pngBlob, onChange]);

  function pos(e: React.MouseEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handleDown(e: React.MouseEvent) {
    const { x, y } = pos(e);
    if (tool === "selecionar") {
      const hit = [...project.shapes].reverse().find((s) => inBounds(s, x, y));
      setSelected(hit?.id ?? null);
      if (hit) drag.current = { startX: x, startY: y, shapeId: hit.id, mode: "move" };
      return;
    }
    const id = makeId();
    let shape: VectorShape;
    if (tool === "rect") shape = { id, type: "rect", x, y, w: 0, h: 0, fill, stroke, strokeWidth };
    else if (tool === "ellipse") shape = { id, type: "ellipse", cx: x, cy: y, rx: 0, ry: 0, fill, stroke, strokeWidth };
    else if (tool === "line") shape = { id, type: "line", x1: x, y1: y, x2: x, y2: y, stroke, strokeWidth };
    else shape = { id, type: "path", points: [{ x, y }], stroke, strokeWidth };
    setProject((p) => ({ ...p, shapes: [...p.shapes, shape] }));
    setSelected(id);
    drag.current = { startX: x, startY: y, shapeId: id, mode: "create" };
  }

  function handleMove(e: React.MouseEvent) {
    if (!drag.current) return;
    const { x, y } = pos(e);
    const { startX, startY, shapeId, mode } = drag.current;
    setProject((p) => ({
      ...p,
      shapes: p.shapes.map((s) => {
        if (s.id !== shapeId) return s;
        if (mode === "move") {
          const dx = x - startX;
          const dy = y - startY;
          return translate(s, dx, dy);
        }
        // create: redimensiona conforme arrasta
        if (s.type === "rect") return { ...s, w: x - startX, h: y - startY };
        if (s.type === "ellipse") return { ...s, rx: (x - startX) / 2, ry: (y - startY) / 2, cx: startX + (x - startX) / 2, cy: startY + (y - startY) / 2 };
        if (s.type === "line") return { ...s, x2: x, y2: y };
        if (s.type === "path") return { ...s, points: [...s.points, { x, y }] };
        return s;
      }),
    }));
    if (mode === "move") drag.current = { ...drag.current, startX: x, startY: y };
  }

  function stop() {
    drag.current = null;
  }

  function removeSelected() {
    if (!selected) return;
    setProject((p) => ({ ...p, shapes: p.shapes.filter((s) => s.id !== selected) }));
    setSelected(null);
  }
  function bringToFront() {
    if (!selected) return;
    setProject((p) => {
      const s = p.shapes.find((x) => x.id === selected);
      if (!s) return p;
      return { ...p, shapes: [...p.shapes.filter((x) => x.id !== selected), s] };
    });
  }

  return (
    <EditorShell
      toolbar={
        <Toolbar>
          <ToolButton active={tool === "selecionar"} onClick={() => setTool("selecionar")} title="Selecionar/mover">🖱️</ToolButton>
          <ToolButton active={tool === "rect"} onClick={() => setTool("rect")} title="Retângulo">▭</ToolButton>
          <ToolButton active={tool === "ellipse"} onClick={() => setTool("ellipse")} title="Elipse">⬭</ToolButton>
          <ToolButton active={tool === "line"} onClick={() => setTool("line")} title="Linha">／</ToolButton>
          <ToolButton active={tool === "path"} onClick={() => setTool("path")} title="Caminho livre">✎</ToolButton>
          <div className="mx-1 h-6 w-px bg-border" />
          <ToolButton onClick={bringToFront} title="Trazer para frente">⬆</ToolButton>
          <ToolButton onClick={removeSelected} title="Excluir selecionado">🗑️</ToolButton>
        </Toolbar>
      }
      side={
        <div className="flex flex-col gap-4">
          <div>
            <span className="text-xs text-muted-foreground">Preenchimento</span>
            <Palette colors={[fill]} current={fill} onPick={setFill} />
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Traço</span>
            <Palette colors={[stroke]} current={stroke} onPick={setStroke} />
          </div>
          <label className="text-xs text-muted-foreground">
            Espessura: {strokeWidth}px
            <input
              type="range"
              min={0}
              max={20}
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-full"
            />
          </label>
        </div>
      }
    >
      <canvas
        ref={canvasRef}
        width={w}
        height={h}
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={stop}
        onMouseLeave={stop}
        className="cursor-crosshair bg-white"
      />
    </EditorShell>
  );
}

// --- helpers de bounds/translate ---
function bounds(s: VectorShape) {
  if (s.type === "rect") return { x: Math.min(s.x, s.x + s.w), y: Math.min(s.y, s.y + s.h), w: Math.abs(s.w), h: Math.abs(s.h) };
  if (s.type === "ellipse") return { x: s.cx - Math.abs(s.rx), y: s.cy - Math.abs(s.ry), w: Math.abs(s.rx) * 2, h: Math.abs(s.ry) * 2 };
  if (s.type === "line") return { x: Math.min(s.x1, s.x2), y: Math.min(s.y1, s.y2), w: Math.abs(s.x2 - s.x1), h: Math.abs(s.y2 - s.y1) };
  const xs = s.points.map((p) => p.x);
  const ys = s.points.map((p) => p.y);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}
function inBounds(s: VectorShape, x: number, y: number) {
  const b = bounds(s);
  return x >= b.x - 4 && x <= b.x + b.w + 4 && y >= b.y - 4 && y <= b.y + b.h + 4;
}
function translate(s: VectorShape, dx: number, dy: number): VectorShape {
  if (s.type === "rect") return { ...s, x: s.x + dx, y: s.y + dy };
  if (s.type === "ellipse") return { ...s, cx: s.cx + dx, cy: s.cy + dy };
  if (s.type === "line") return { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy };
  return { ...s, points: s.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
}
