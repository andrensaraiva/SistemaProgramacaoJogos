"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_PALETTE,
  makeId,
  type CanvasConfig,
  type RasterLayer,
  type RasterProject,
} from "@/lib/canvas/types";

import { EditorShell, LayersPanel, Palette, ToolButton, Toolbar } from "./_base/ui";

type Tool = "pincel" | "borracha" | "conta-gotas";

function blankDataUrl(w: number, h: number): string {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c.toDataURL("image/png");
}

export function ArteEditor({
  config,
  initial,
  onChange,
}: {
  config: CanvasConfig;
  initial?: RasterProject | null;
  onChange: (project: RasterProject, pngBlob: () => Promise<Blob>) => void;
}) {
  const { width: w, height: h } = config;
  const palette = config.palette?.length ? config.palette : DEFAULT_PALETTE();

  // Cada camada tem um canvas offscreen vivo; o dataUrl é a serialização.
  const layerCanvases = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const [layers, setLayers] = useState<RasterLayer[]>(() => {
    if (initial?.layers.length) return initial.layers;
    return [{ id: makeId(), name: "Camada 1", visible: true, opacity: 1, dataUrl: "" }];
  });
  const [activeLayer, setActiveLayer] = useState<string>(() => layers[0].id);
  const [tool, setTool] = useState<Tool>("pincel");
  const [color, setColor] = useState(palette[0] ?? "#000000");
  const [size, setSize] = useState(8);
  const [opacity, setOpacity] = useState(1);

  const viewRef = useRef<HTMLCanvasElement>(null);
  const painting = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  // Bump para re-compor quando um dataUrl de camada terminar de carregar.
  const [version, setVersion] = useState(0);

  // Garante um canvas offscreen por camada (carregando o dataUrl inicial).
  // Função pura sobre refs — não chama composite (evita ciclo); ao carregar uma
  // imagem, incrementa `version` para disparar o efeito de composição.
  const ensureCanvas = useCallback(
    (layer: RasterLayer): HTMLCanvasElement => {
      let cv = layerCanvases.current.get(layer.id);
      if (!cv) {
        cv = document.createElement("canvas");
        cv.width = w;
        cv.height = h;
        layerCanvases.current.set(layer.id, cv);
        if (layer.dataUrl) {
          const img = new Image();
          img.onload = () => {
            cv!.getContext("2d")!.drawImage(img, 0, 0);
            setVersion((v) => v + 1);
          };
          img.src = layer.dataUrl;
        }
      }
      return cv;
    },
    [w, h],
  );

  const composite = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const ctx = view.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    for (const l of layers) {
      if (!l.visible) continue;
      const cv = ensureCanvas(l);
      ctx.globalAlpha = l.opacity;
      ctx.drawImage(cv, 0, 0);
    }
    ctx.globalAlpha = 1;
    void version; // recompõe quando uma imagem termina de carregar
  }, [layers, w, h, ensureCanvas, version]);

  useEffect(() => {
    composite();
  }, [composite]);

  // Serializa as camadas (dataUrl) e gera o projeto + PNG achatado.
  const buildProject = useCallback((): RasterProject => {
    const out = layers.map((l) => {
      const cv = layerCanvases.current.get(l.id);
      return { ...l, dataUrl: cv ? cv.toDataURL("image/png") : l.dataUrl || blankDataUrl(w, h) };
    });
    return { kind: "arte_digital", width: w, height: h, palette, layers: out };
  }, [layers, w, h, palette]);

  const pngBlob = useCallback(async (): Promise<Blob> => {
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const ctx = off.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    for (const l of layers) {
      if (!l.visible) continue;
      const cv = layerCanvases.current.get(l.id);
      if (cv) {
        ctx.globalAlpha = l.opacity;
        ctx.drawImage(cv, 0, 0);
      }
    }
    ctx.globalAlpha = 1;
    return await new Promise<Blob>((resolve) => off.toBlob((b) => resolve(b!), "image/png"));
  }, [layers, w, h]);

  // Avisa o pai (debounced leve via rAF não necessário aqui).
  const notify = useCallback(() => {
    onChange(buildProject(), pngBlob);
  }, [buildProject, pngBlob, onChange]);

  useEffect(() => {
    notify();
  }, [notify]);

  function pos(e: React.MouseEvent) {
    const rect = viewRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function stroke(x: number, y: number) {
    const layer = layers.find((l) => l.id === activeLayer);
    if (!layer || !layer.visible) return;
    const cv = ensureCanvas(layer);
    const ctx = cv.getContext("2d")!;
    ctx.globalCompositeOperation = tool === "borracha" ? "destination-out" : "source-over";
    ctx.globalAlpha = tool === "borracha" ? 1 : opacity;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    if (last.current) {
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    last.current = { x, y };
    composite();
  }

  function handleDown(e: React.MouseEvent) {
    const { x, y } = pos(e);
    if (tool === "conta-gotas") {
      const ctx = viewRef.current!.getContext("2d")!;
      const d = ctx.getImageData(x, y, 1, 1).data;
      setColor(`#${[d[0], d[1], d[2]].map((n) => n.toString(16).padStart(2, "0")).join("")}`);
      return;
    }
    painting.current = true;
    last.current = null;
    stroke(x, y);
  }
  function handleMove(e: React.MouseEvent) {
    if (!painting.current) return;
    const { x, y } = pos(e);
    stroke(x, y);
  }
  function stop() {
    if (painting.current) {
      painting.current = false;
      last.current = null;
      notify();
    }
  }

  const layerInfos = useMemo(
    () => layers.map((l) => ({ id: l.id, name: l.name, visible: l.visible })),
    [layers],
  );
  function addLayer() {
    const nl: RasterLayer = { id: makeId(), name: `Camada ${layers.length + 1}`, visible: true, opacity: 1, dataUrl: "" };
    setLayers((p) => [...p, nl]);
    setActiveLayer(nl.id);
  }
  function removeLayer(id: string) {
    setLayers((p) => {
      if (p.length <= 1) return p;
      layerCanvases.current.delete(id);
      const next = p.filter((l) => l.id !== id);
      if (id === activeLayer) setActiveLayer(next[next.length - 1].id);
      return next;
    });
  }
  function toggleLayer(id: string) {
    setLayers((p) => p.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  }
  function moveLayer(id: string, dir: -1 | 1) {
    setLayers((p) => {
      const idx = p.findIndex((l) => l.id === id);
      const to = idx + dir;
      if (to < 0 || to >= p.length) return p;
      const next = p.slice();
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });
  }

  return (
    <EditorShell
      toolbar={
        <Toolbar>
          <ToolButton active={tool === "pincel"} onClick={() => setTool("pincel")} title="Pincel">🖌️</ToolButton>
          <ToolButton active={tool === "borracha"} onClick={() => setTool("borracha")} title="Borracha">🧽</ToolButton>
          <ToolButton active={tool === "conta-gotas"} onClick={() => setTool("conta-gotas")} title="Conta-gotas">💧</ToolButton>
          <div className="mx-1 h-6 w-px bg-border" />
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            Tamanho
            <input type="range" min={1} max={64} value={size} onChange={(e) => setSize(Number(e.target.value))} />
            {size}
          </label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            Opacidade
            <input type="range" min={5} max={100} value={Math.round(opacity * 100)} onChange={(e) => setOpacity(Number(e.target.value) / 100)} />
            {Math.round(opacity * 100)}%
          </label>
        </Toolbar>
      }
      side={
        <div className="flex flex-col gap-4">
          <Palette colors={palette} current={color} onPick={setColor} />
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
        ref={viewRef}
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
