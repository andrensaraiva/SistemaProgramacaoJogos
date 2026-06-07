// Registro das ferramentas criativas (puro, testável) — fonte única de quais
// editores existem e quais estão habilitados pela instituição.

import { DEFAULT_CONFIG, type CanvasConfig, type CreativeKind } from "./types";

export type CreativeTool = {
  kind: CreativeKind;
  label: string;
  hint: string;
  /** chave do toggle em institution_settings. */
  settingKey: "tool_pixel_art" | "tool_vetor" | "tool_arte_digital" | "tool_blocos";
  defaultConfig: CanvasConfig;
};

export const CREATIVE_TOOLS: CreativeTool[] = [
  {
    kind: "pixel_art",
    label: "Pixel Art",
    hint: "Editor de sprites em pixel (paleta, balde, camadas) — entrega PNG.",
    settingKey: "tool_pixel_art",
    defaultConfig: DEFAULT_CONFIG.pixel_art,
  },
  {
    kind: "vetor",
    label: "Vetor",
    hint: "Formas e caminhos vetoriais (retângulo, elipse, linha) — entrega PNG.",
    settingKey: "tool_vetor",
    defaultConfig: DEFAULT_CONFIG.vetor,
  },
  {
    kind: "arte_digital",
    label: "Arte Digital",
    hint: "Pincel raster com camadas e opacidade — entrega PNG.",
    settingKey: "tool_arte_digital",
    defaultConfig: DEFAULT_CONFIG.arte_digital,
  },
  {
    kind: "blocos",
    label: "Blocos (Celeste)",
    hint: "Programação visual por blocos (variáveis, repetição, listas) com a Celeste.",
    settingKey: "tool_blocos",
    defaultConfig: DEFAULT_CONFIG.blocos,
  },
];

export type ToolToggles = {
  tool_pixel_art: boolean;
  tool_vetor: boolean;
  tool_arte_digital: boolean;
  tool_blocos: boolean;
};

/** Ferramentas que o admin deixou ligadas para a instituição. */
export function ferramentasHabilitadas(toggles: ToolToggles): CreativeTool[] {
  return CREATIVE_TOOLS.filter((t) => toggles[t.settingKey]);
}

/** A ferramenta `kind` está habilitada? (usado para revalidar no servidor). */
export function ferramentaHabilitada(kind: string, toggles: ToolToggles): boolean {
  const tool = CREATIVE_TOOLS.find((t) => t.kind === kind);
  return tool ? toggles[tool.settingKey] : false;
}

/** É um dos tipos criativos? */
export function isCreativeKind(kind: string): kind is CreativeKind {
  return CREATIVE_TOOLS.some((t) => t.kind === kind);
}
