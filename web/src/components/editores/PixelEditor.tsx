"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_PALETTE,
  makeId,
  type CanvasConfig,
  type PixelLayer,
  type PixelProject,
} from "@/lib/canvas/types";

import { EditorShell, LayersPanel, Palette, ToolButton, Toolbar } from "./_base/ui";

type Tool = "lapis" | "borracha" | "balde" | "conta-gotas";

function emptyLayer(name: string, size: number): PixelLayer {
  return { id: makeId(), name, visible: true, pixels: new Array(size).fill(null) };
}

function initialProject(config: CanvasConfig): PixelProject {
  const w = config.width;
  const h = config.height;
  return {
    kind: "pixel_art",
    width: w,
    height: h,
    palette: config.palette?.length ? config.palette : DEFAULT_PALETTE(),
    layers: [emptyLayer("Camada 1", w * h)],
  };
}

// Flood fill (pura): troca todas as células conectadas da mesma cor.
function floodFill(pixels: (string | null)[], w: number, h: number, idx: number, color: string) {
  const target = pixels[idx];
  if (target === color) return pixels;
  const out = pixels.slice();
  const stack = [idx];
  while (stack.length) {
    const i = stack.pop()!;
    if (out[i] !== target) continue;
    out[i] = color;
    const x = i % w;
    const y = Math.floor(i / w);
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - w);
    if (y < h - 1) stack.push(i + w);
  }
  return out;
}

export function PixelEditor({
  config,
  initial,
  onChange,
}: {
  config: CanvasConfig;
  initial?: PixelProject | null;
  onChange: (project: PixelProject, pngBlob: () => Promise<Blob>) => void;
}) {
  const [project, setProject] = useState<PixelProject>(() => initial ?? initialProject(config));
  const [tool, setTool] = useState<Tool>("lapis");
  const [color, setColor] = useState<string>(project.palette[0] ?? "#000000");
  const [activeLayer, setActiveLayer] = useState<string>(project.layers[0].id);
  const [zoom, setZoom] = useState<number>(Math.max(6, Math.floor(384 / project.width)));
  const painting = useRef(false);

  const { width: w, height: h } = project;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Render do canvas (composição das camadas + grade).
  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    // Xadrez de transparência.
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#2a2a2a" : "#222";
        ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
      }
    }
    for (const layer of project.layers) {
      if (!layer.visible) continue;
      for (let i = 0; i < layer.pixels.length; i++) {
        const c = layer.pixels[i];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect((i % w) * zoom, Math.floor(i / w) * zoom, zoom, zoom);
      }
    }
    // Grade.
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    for (let x = 0; x <= w; x++) {
      ctx.beginPath();
      ctx.moveTo(x * zoom, 0);
      ctx.lineTo(x * zoom, h * zoom);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * zoom);
      ctx.lineTo(w * zoom, y * zoom);
      ctx.stroke();
    }
  }, [project, zoom, w, h]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Gera o PNG no tamanho real (1px por célula), sem grade.
  const pngBlob = useCallback(async (): Promise<Blob> => {
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const ctx = off.getContext("2d")!;
    for (const layer of project.layers) {
      if (!layer.visible) continue;
      for (let i = 0; i < layer.pixels.length; i++) {
        const c = layer.pixels[i];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(i % w, Math.floor(i / w), 1, 1);
      }
    }
    return await new Promise<Blob>((resolve) => off.toBlob((b) => resolve(b!), "image/png"));
  }, [project, w, h]);

  // Avisa o pai a cada mudança (para o botão "Entregar" ter o estado atual).
  useEffect(() => {
    onChange(project, pngBlob);
  }, [project, pngBlob, onChange]);

  function cellFromEvent(e: React.MouseEvent): number | null {
    const cv = canvasRef.current;
    if (!cv) return null;
    const rect = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / zoom);
    const y = Math.floor((e.clientY - rect.top) / zoom);
    if (x < 0 || y < 0 || x >= w || y >= h) return null;
    return y * w + x;
  }

  function applyAt(idx: number) {
    setProject((prev) => {
      const layers = prev.layers.map((l) => {
        if (l.id !== activeLayer) return l;
        if (tool === "balde") {
          return { ...l, pixels: floodFill(l.pixels, w, h, idx, color) };
        }
        const pixels = l.pixels.slice();
        pixels[idx] = tool === "borracha" ? null : color;
        return { ...l, pixels };
      });
      return { ...prev, layers };
    });
  }

  function handleDown(e: React.MouseEvent) {
    const idx = cellFromEvent(e);
    if (idx == null) return;
    if (tool === "conta-gotas") {
      const layer = project.layers.find((l) => l.id === activeLayer);
      const c = layer?.pixels[idx];
      if (c) setColor(c);
      return;
    }
    painting.current = true;
    applyAt(idx);
  }
  function handleMove(e: React.MouseEvent) {
    if (!painting.current || tool === "balde" || tool === "conta-gotas") return;
    const idx = cellFromEvent(e);
    if (idx != null) applyAt(idx);
  }
  function stop() {
    painting.current = false;
  }

  // Camadas.
  const layerInfos = useMemo(
    () => project.layers.map((l) => ({ id: l.id, name: l.name, visible: l.visible })),
    [project.layers],
  );
  function addLayer() {
    setProject((p) => {
      const nl = emptyLayer(`Camada ${p.layers.length + 1}`, w * h);
      setActiveLayer(nl.id);
      return { ...p, layers: [...p.layers, nl] };
    });
  }
  function removeLayer(id: string) {
    setProject((p) => {
      if (p.layers.length <= 1) return p;
      const layers = p.layers.filter((l) => l.id !== id);
      if (id === activeLayer) setActiveLayer(layers[layers.length - 1].id);
      return { ...p, layers };
    });
  }
  function toggleLayer(id: string) {
    setProject((p) => ({
      ...p,
      layers: p.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    }));
  }
  function moveLayer(id: string, dir: -1 | 1) {
    setProject((p) => {
      const idx = p.layers.findIndex((l) => l.id === id);
      const to = idx + dir;
      if (to < 0 || to >= p.layers.length) return p;
      const layers = p.layers.slice();
      [layers[idx], layers[to]] = [layers[to], layers[idx]];
      return { ...p, layers };
    });
  }

  function addToPalette(c: string) {
    setProject((p) => (p.palette.includes(c) ? p : { ...p, palette: [...p.palette, c] }));
  }

  return (
    <EditorShell
      toolbar={
        <Toolbar>
          <ToolButton active={tool === "lapis"} onClick={() => setTool("lapis")} title="Lápis">✏️</ToolButton>
          <ToolButton active={tool === "borracha"} onClick={() => setTool("borracha")} title="Borracha">🧽</ToolButton>
          <ToolButton active={tool === "balde"} onClick={() => setTool("balde")} title="Balde (preencher)">🪣</ToolButton>
          <ToolButton active={tool === "conta-gotas"} onClick={() => setTool("conta-gotas")} title="Conta-gotas">💧</ToolButton>
          <div className="mx-1 h-6 w-px bg-border" />
          <ToolButton onClick={() => setZoom((z) => Math.max(2, z - 2))} title="Diminuir zoom">−</ToolButton>
          <span className="text-xs text-muted-foreground">{zoom}×</span>
          <ToolButton onClick={() => setZoom((z) => Math.min(40, z + 2))} title="Aumentar zoom">+</ToolButton>
          <span className="ml-2 text-xs text-muted-foreground">{w}×{h}</span>
        </Toolbar>
      }
      side={
        <div className="flex flex-col gap-4">
          <Palette colors={project.palette} current={color} onPick={setColor} onAdd={addToPalette} />
          <LayersPanel
            layers={layerInfos}
            activeId={activeLayer}
            onSelect={setActiveLayer}
            onToggle={toggleLayer}
            onAdd={addLayer}
            onRemove={removeLayer}
            onMove={moveLayer}
          />
        </div>
      }
    >
      <canvas
        ref={canvasRef}
        width={w * zoom}
        height={h * zoom}
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={stop}
        onMouseLeave={stop}
        className="cursor-crosshair touch-none"
        style={{ imageRendering: "pixelated" }}
      />
    </EditorShell>
  );
}
