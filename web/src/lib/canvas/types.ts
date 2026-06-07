// Tipos compartilhados dos editores criativos (pixel / vetor / arte digital).
// O "projeto" é o estado editável salvo em submissions.submission_project (jsonb),
// para o aluno reabrir e continuar. O PNG renderizado vai para o Storage.

export type CreativeKind = "pixel_art" | "vetor" | "arte_digital" | "blocos";

/** Configuração que o professor define ao criar a atividade. */
export type CanvasConfig = {
  width: number; // em pixels (pixel art: nº de células; vetor/arte: px do canvas)
  height: number;
  palette?: string[]; // cores sugeridas (hex)
};

export const DEFAULT_CONFIG: Record<CreativeKind, CanvasConfig> = {
  pixel_art: { width: 32, height: 32, palette: DEFAULT_PALETTE() },
  vetor: { width: 640, height: 480 },
  arte_digital: { width: 800, height: 600, palette: DEFAULT_PALETTE() },
  blocos: { width: 480, height: 360 },
};

export function DEFAULT_PALETTE(): string[] {
  return [
    "#000000", "#ffffff", "#e74c3c", "#e67e22", "#f1c40f",
    "#2ecc71", "#1abc9c", "#3498db", "#9b59b6", "#34495e",
    "#7f8c8d", "#d35400", "#27ae60", "#2980b9", "#8e44ad",
  ];
}

// ---- Pixel art ----
export type PixelLayer = {
  id: string;
  name: string;
  visible: boolean;
  /** width*height células; cada uma é hex "#rrggbb" ou null (transparente). */
  pixels: (string | null)[];
};
export type PixelProject = {
  kind: "pixel_art";
  width: number;
  height: number;
  palette: string[];
  layers: PixelLayer[];
};

// ---- Vetor ----
export type VectorShape =
  | { id: string; type: "rect"; x: number; y: number; w: number; h: number; fill: string; stroke: string; strokeWidth: number }
  | { id: string; type: "ellipse"; cx: number; cy: number; rx: number; ry: number; fill: string; stroke: string; strokeWidth: number }
  | { id: string; type: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; strokeWidth: number }
  | { id: string; type: "path"; points: { x: number; y: number }[]; stroke: string; strokeWidth: number };
export type VectorProject = {
  kind: "vetor";
  width: number;
  height: number;
  shapes: VectorShape[];
};

// ---- Arte digital (raster por camadas) ----
export type RasterLayer = {
  id: string;
  name: string;
  visible: boolean;
  opacity: number; // 0..1
  /** dataURL PNG da camada (mesmo tamanho do canvas). */
  dataUrl: string;
};
export type RasterProject = {
  kind: "arte_digital";
  width: number;
  height: number;
  palette: string[];
  layers: RasterLayer[];
};

// Projeto de blocos vive em lib/blocks/types.ts (evita acoplar canvas a blocks).
import type { BlocksProject } from "@/lib/blocks/types";
export type { BlocksProject };

export type CreativeProject = PixelProject | VectorProject | RasterProject | BlocksProject;

/** Cria um id curto e único o suficiente para itens do projeto (cliente). */
export function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}
