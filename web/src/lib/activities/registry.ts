// =============================================================================
// Registro central de TIPOS DE ATIVIDADE — fonte única de verdade.
// =============================================================================
// Antes, cada tela ramificava por `exercise_type` com `if`/ternários espalhados
// (render do aluno, form do professor, correção/XP no servidor). Adicionar um
// tipo novo exigia caçar todos esses pontos — e era fácil esquecer um e quebrar.
//
// Aqui cada tipo é declarado UMA vez com seus metadados e a qual "família" de
// comportamento pertence. As telas leem deste registro em vez de comparar
// strings. Para ADICIONAR UM TIPO: adicione uma entrada (ou, se for criativo,
// um item em CREATIVE_TOOLS) e, se precisar de UI própria de entrega, um caso
// no componente de entrega. Nada mais quebra.
//
// Famílias:
//   - "code"     → resolve no editor (Monaco + Piston), testes automáticos, XP automático.
//   - "creative" → editores de arte/blocos (pixel/vetor/arte digital/blocos), correção manual.
//   - "delivery" → entrega simples (link ou texto), correção manual.
//
// Pure TS (sem React) para poder ser importado por server e client.

import { CREATIVE_TOOLS } from "@/lib/canvas/tools";
import type { CreativeKind } from "@/lib/canvas/types";

export type ActivityKind =
  | "codigo"
  | "apresentacao"
  | "modelo_resposta"
  | CreativeKind;

export type ActivityFamily = "code" | "creative" | "delivery";

/** Para a família "delivery": qual campo o aluno preenche. */
export type DeliveryInput = "link" | "text";

export type ActivityMeta = {
  kind: ActivityKind;
  /** Rótulo amigável (ex.: "Código", "Apresentação (link)"). */
  label: string;
  /** Dica curta exibida ao professor ao escolher o tipo. */
  hint: string;
  family: ActivityFamily;
  /** Ganha XP automático ao passar nos testes (só código). */
  autoXp: boolean;
  /** Corrigido automaticamente por testes (vs. correção manual). */
  autoGraded: boolean;
  /** O aluno resolve numa página dedicada (/exercicios/[id]) e não inline. */
  dedicatedPage: boolean;
  /** Para "delivery": o que o aluno envia (link OU texto). */
  deliveryInput?: DeliveryInput;
};

// Tipos não-criativos: sempre disponíveis (não dependem de toggle da instituição).
const NON_CREATIVE: ActivityMeta[] = [
  {
    kind: "codigo",
    label: "Código",
    hint: "Aluno resolve no editor; testado automaticamente.",
    family: "code",
    autoXp: true,
    autoGraded: true,
    dedicatedPage: true,
  },
  {
    kind: "apresentacao",
    label: "Apresentação (link)",
    hint: "Aluno entrega um link (slides, Drive); você corrige a nota.",
    family: "delivery",
    autoXp: false,
    autoGraded: false,
    dedicatedPage: false,
    deliveryInput: "link",
  },
  {
    kind: "modelo_resposta",
    label: "Modelo de resposta",
    hint: "Aluno preenche um texto a partir de um modelo; você corrige.",
    family: "delivery",
    autoXp: false,
    autoGraded: false,
    dedicatedPage: false,
    deliveryInput: "text",
  },
];

// Tipos criativos derivam de CREATIVE_TOOLS (label/hint vêm de lá — não duplica).
const CREATIVE: ActivityMeta[] = CREATIVE_TOOLS.map((t) => ({
  kind: t.kind,
  label: t.label,
  hint: t.hint,
  family: "creative" as const,
  autoXp: false,
  autoGraded: false,
  dedicatedPage: false,
}));

/** Todos os tipos conhecidos, na ordem de exibição. */
export const ACTIVITY_TYPES: ActivityMeta[] = [...NON_CREATIVE, ...CREATIVE];

/**
 * Slugs de todos os tipos, como tupla — para `z.enum(ACTIVITY_KINDS)` na
 * validação de criação. Adicionar um tipo aqui (via ACTIVITY_TYPES/CREATIVE_TOOLS)
 * já estende o whitelist do schema automaticamente.
 */
export const ACTIVITY_KINDS = ACTIVITY_TYPES.map((a) => a.kind) as [
  ActivityKind,
  ...ActivityKind[],
];

/** Tipos base (não-criativos) que o professor sempre pode criar. */
export const BASE_ACTIVITY_TYPES: ActivityMeta[] = NON_CREATIVE;

const BY_KIND = new Map<string, ActivityMeta>(
  ACTIVITY_TYPES.map((a) => [a.kind, a]),
);

// Fallback para registros antigos sem tipo (tratados como código).
const FALLBACK = NON_CREATIVE[0];

/** Metadados de um tipo. Aceita string/null e cai no fallback ("codigo"). */
export function activityMeta(kind: string | null | undefined): ActivityMeta {
  return (kind ? BY_KIND.get(kind) : undefined) ?? FALLBACK;
}

export function activityLabel(kind: string | null | undefined): string {
  return activityMeta(kind).label;
}

export function activityFamily(kind: string | null | undefined): ActivityFamily {
  return activityMeta(kind).family;
}

export function isCodeKind(kind: string | null | undefined): boolean {
  return activityFamily(kind) === "code";
}

export function isCreativeKind(
  kind: string | null | undefined,
): kind is CreativeKind {
  return activityFamily(kind) === "creative";
}

export function isDeliveryKind(kind: string | null | undefined): boolean {
  return activityFamily(kind) === "delivery";
}
