import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { DEFAULT_THRESHOLDS, type Thresholds } from "./grading";
import type { ToolToggles } from "@/lib/canvas/tools";

// Leitura das configurações institucionais (limiares + nome + ferramentas).
// Singleton id=true. Cai nos defaults se a linha ainda não existir (resiliência).

export type InstitutionSettings = {
  institutionName: string;
  thresholds: Thresholds;
  tools: ToolToggles;
  senhaSufixo: string; // sufixo da senha inicial derivada (ex.: "@2026")
};

const DEFAULT_TOOLS: ToolToggles = {
  tool_pixel_art: true,
  tool_vetor: true,
  tool_arte_digital: true,
  tool_blocos: true,
};

export async function getInstitutionSettings(): Promise<InstitutionSettings> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("institution_settings")
    .select(
      "institution_name, nota_aprovacao, nota_recuperacao_min, frequencia_minima_pct, tool_pixel_art, tool_vetor, tool_arte_digital, tool_blocos, senha_sufixo",
    )
    .eq("id", true)
    .maybeSingle();

  if (!data) {
    return {
      institutionName: "Celeste Academy",
      thresholds: DEFAULT_THRESHOLDS,
      tools: DEFAULT_TOOLS,
      senhaSufixo: "@2026",
    };
  }

  return {
    institutionName: data.institution_name ?? "Celeste Academy",
    thresholds: {
      aprovacao: Number(data.nota_aprovacao ?? DEFAULT_THRESHOLDS.aprovacao),
      recuperacaoMin: Number(data.nota_recuperacao_min ?? DEFAULT_THRESHOLDS.recuperacaoMin),
      freqMinPct: Number(data.frequencia_minima_pct ?? DEFAULT_THRESHOLDS.freqMinPct),
    },
    tools: {
      tool_pixel_art: data.tool_pixel_art ?? true,
      tool_vetor: data.tool_vetor ?? true,
      tool_arte_digital: data.tool_arte_digital ?? true,
      tool_blocos: data.tool_blocos ?? true,
    },
    senhaSufixo: data.senha_sufixo ?? "@2026",
  };
}
