// =============================================================================
// Registro central de features — fonte única da navegação lateral.
// =============================================================================
// Cada feature que aparece no menu lateral é declarada aqui. Para LIGAR/DESLIGAR
// uma feature do menu, mude `enabled` (ou remova a entrada) — num lugar só, sem
// caçar links espalhados pela sidebar.
//
// Observação: atalhos contextuais ENTRE features (ex.: botão "SAEP" na lista de
// UCs, "Duelo de quiz" na página de duelos) NÃO ficam aqui — são específicos da
// tela. Ver docs/MODULOS.md ("pontos de junção"). Este registro cobre o menu
// global, que é o principal ponto de injeção de navegação.

export type IconKey =
  | "painel"
  | "code"
  | "duelo"
  | "trofeu"
  | "turma"
  | "curso"
  | "saep"
  | "unity";

export type FeatureNavItem = {
  /** id estável da feature (para testes/telemetria). */
  id: string;
  href: string;
  label: string;
  icon: IconKey;
  /** Em qual grupo do menu aparece. */
  group: "Aprender" | "Turmas";
  /** Só professores/admin veem? */
  professorOnly?: boolean;
  /** Liga/desliga a feature no menu. */
  enabled: boolean;
};

// Ordem aqui = ordem no menu (dentro de cada grupo).
export const FEATURES: FeatureNavItem[] = [
  { id: "painel", href: "/painel", label: "Painel", icon: "painel", group: "Aprender", enabled: true },
  { id: "exercicios", href: "/exercicios", label: "Exercícios", icon: "code", group: "Aprender", enabled: true },
  { id: "duelos", href: "/duelos", label: "Duelos", icon: "duelo", group: "Aprender", enabled: true },
  { id: "ranking", href: "/ranking", label: "Ranking", icon: "trofeu", group: "Aprender", enabled: true },

  { id: "turmas", href: "/turmas", label: "Turmas", icon: "turma", group: "Turmas", enabled: true },
  { id: "cursos", href: "/cursos", label: "Cursos", icon: "curso", group: "Turmas", professorOnly: true, enabled: true },
  { id: "saep", href: "/saep/questoes", label: "SAEP", icon: "saep", group: "Turmas", professorOnly: true, enabled: true },
  { id: "unity", href: "/unity", label: "Unity", icon: "unity", group: "Turmas", enabled: true },
];

export type NavGroup = { title: string; items: FeatureNavItem[] };

/** Monta os grupos visíveis para o papel atual, respeitando `enabled`. */
export function getNavGroups(isProf: boolean): NavGroup[] {
  const titles: NavGroup["title"][] = ["Aprender", "Turmas"];
  return titles
    .map((title) => ({
      title,
      items: FEATURES.filter(
        (f) => f.enabled && f.group === title && (!f.professorOnly || isProf),
      ),
    }))
    .filter((g) => g.items.length > 0);
}
