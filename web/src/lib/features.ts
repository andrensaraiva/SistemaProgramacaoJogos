// =============================================================================
// Registro central de features — fonte única da navegação lateral.
// =============================================================================
// Cada feature que aparece no menu lateral é declarada aqui. Para LIGAR/DESLIGAR
// uma feature do menu, mude `enabled` (ou remova a entrada) — num lugar só, sem
// caçar links espalhados pela sidebar.
//
// `audience` decide QUEM vê o item, por papel exato:
//   - "all"         → aluno + professor (NÃO admin/coordenador, que são gestão)
//   - "aluno"       → só aluno (ex.: Duelos, Ranking — experiência do aluno)
//   - "professor"   → só professor
//   - "admin"       → só admin
//   - "coordenador" → só coordenador
// O admin é deliberadamente enxuto: ele só vê itens "admin". Itens "all"/
// "professor" não aparecem para ele (e o middleware bloqueia o acesso direto).
//
// Observação: atalhos contextuais ENTRE features (ex.: botão "SAEP" na lista de
// UCs) NÃO ficam aqui — são específicos da tela. Ver docs/MODULOS.md.

export type IconKey =
  | "painel"
  | "perfil"
  | "code"
  | "duelo"
  | "trofeu"
  | "turma"
  | "curso"
  | "saep"
  | "unity"
  | "admin"
  | "relatorio"
  | "config"
  | "sala"
  | "coordenacao";

export type Audience = "all" | "aluno" | "professor" | "admin" | "coordenador";

export type FeatureNavItem = {
  /** id estável da feature (para testes/telemetria). */
  id: string;
  href: string;
  label: string;
  icon: IconKey;
  /** Em qual grupo do menu aparece. */
  group: "Aprender" | "Turmas" | "Coordenação" | "Administração";
  /** Quem vê este item (por papel exato). */
  audience: Audience;
  /** Liga/desliga a feature no menu. */
  enabled: boolean;
};

// Ordem aqui = ordem no menu (dentro de cada grupo).
export const FEATURES: FeatureNavItem[] = [
  { id: "painel", href: "/painel", label: "Painel", icon: "painel", group: "Aprender", audience: "all", enabled: true },
  // Perfil estilo Discord (avatar+banner+cosméticos por XP) — só aluno.
  { id: "perfil", href: "/perfil", label: "Meu perfil", icon: "perfil", group: "Aprender", audience: "aluno", enabled: true },
  // Perfil do professor (identidade + impacto de ensino + reputação) — mesma rota.
  { id: "prof-perfil", href: "/perfil", label: "Meu perfil", icon: "perfil", group: "Aprender", audience: "professor", enabled: true },
  // Exercícios: rótulo por papel (mesma rota). Aluno pratica; professor cria/gerencia.
  { id: "exercicios", href: "/exercicios", label: "Exercícios", icon: "code", group: "Aprender", audience: "aluno", enabled: true },
  { id: "prof-exercicios", href: "/exercicios", label: "Meus exercícios", icon: "code", group: "Aprender", audience: "professor", enabled: true },
  // Duelos e Ranking são da experiência do ALUNO (competição/XP); fora do menu do professor.
  { id: "duelos", href: "/duelos", label: "Duelos", icon: "duelo", group: "Aprender", audience: "aluno", enabled: true },
  { id: "ranking", href: "/ranking", label: "Ranking", icon: "trofeu", group: "Aprender", audience: "aluno", enabled: true },
  { id: "aluno-turmas", href: "/turmas", label: "Turmas", icon: "turma", group: "Aprender", audience: "aluno", enabled: true },
  { id: "desempenho", href: "/desempenho", label: "Meu desempenho", icon: "relatorio", group: "Aprender", audience: "aluno", enabled: true },

  { id: "turmas", href: "/turmas", label: "Turmas", icon: "turma", group: "Turmas", audience: "professor", enabled: true },
  { id: "cursos", href: "/cursos", label: "Cursos", icon: "curso", group: "Turmas", audience: "professor", enabled: true },
  { id: "saep", href: "/saep/questoes", label: "SAEP", icon: "saep", group: "Turmas", audience: "professor", enabled: true },
  // Unity sai do menu lateral do professor (continua acessível dentro da UC).

  // Coordenação — visível ao coordenador (gestão de qualquer turma).
  { id: "coord-painel", href: "/coordenador", label: "Painel", icon: "coordenacao", group: "Coordenação", audience: "coordenador", enabled: true },
  { id: "coord-turmas", href: "/turmas", label: "Turmas", icon: "turma", group: "Coordenação", audience: "coordenador", enabled: true },
  { id: "coord-relatorios", href: "/admin/relatorios", label: "Relatórios", icon: "relatorio", group: "Coordenação", audience: "coordenador", enabled: true },
  { id: "coord-salas", href: "/salas", label: "Salas", icon: "sala", group: "Coordenação", audience: "coordenador", enabled: true },
  { id: "coord-ocupacao", href: "/salas/ocupacao", label: "Ocupação", icon: "sala", group: "Coordenação", audience: "coordenador", enabled: true },

  { id: "admin", href: "/admin", label: "Painel admin", icon: "admin", group: "Administração", audience: "admin", enabled: true },
  { id: "admin-relatorios", href: "/admin/relatorios", label: "Relatórios", icon: "relatorio", group: "Administração", audience: "admin", enabled: true },
  { id: "admin-cursos", href: "/cursos", label: "Cursos", icon: "curso", group: "Administração", audience: "admin", enabled: true },
  { id: "admin-salas", href: "/salas", label: "Salas", icon: "sala", group: "Administração", audience: "admin", enabled: true },
  { id: "admin-ocupacao", href: "/salas/ocupacao", label: "Ocupação", icon: "sala", group: "Administração", audience: "admin", enabled: true },
  { id: "admin-feriados", href: "/admin/feriados", label: "Feriados", icon: "config", group: "Administração", audience: "admin", enabled: true },
  { id: "admin-config", href: "/admin/configuracoes", label: "Configurações", icon: "config", group: "Administração", audience: "admin", enabled: true },
];

export type Role = "aluno" | "professor" | "admin" | "coordenador";

export type NavGroup = { title: string; items: FeatureNavItem[] };

function seesItem(role: Role, audience: Audience): boolean {
  // admin e coordenador são "gestão": não veem itens "all" (área de aluno).
  if (audience === "all") return role !== "admin" && role !== "coordenador";
  return audience === role;
}

// Rotas que o ADMIN pode acessar (ele é administrativo; o resto da app é de
// aluno/professor). Usado pelo middleware para bloquear o acesso direto por URL.
const ADMIN_ALLOWED_PREFIXES = ["/admin", "/cursos", "/salas", "/sem-acesso", "/primeiro-acesso", "/auth"];

export function isAdminAllowedPath(path: string): boolean {
  if (ADMIN_ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) {
    return true;
  }
  // Exceção administrativa pontual: o calendário do curso de uma turma
  // (planejamento institucional) — /turmas/<id>/calendario.
  if (/^\/turmas\/[^/]+\/calendario(\/.*)?$/.test(path)) return true;
  return false;
}

// Rotas do COORDENADOR: gestão de qualquer turma + salas + relatórios. É podado
// das áreas de ALUNO (exercícios/duelos/ranking/painel de aluno).
const COORD_ALLOWED_PREFIXES = [
  "/coordenador",
  "/turmas",
  "/salas",
  "/cursos",
  "/saep",
  "/unity",
  "/admin/relatorios",
  "/sem-acesso",
  "/primeiro-acesso",
  "/auth",
];

export function isCoordenadorAllowedPath(path: string): boolean {
  return COORD_ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

/** Monta os grupos visíveis para o papel atual, respeitando `enabled`. */
export function getNavGroups(role: Role): NavGroup[] {
  const titles: NavGroup["title"][] = ["Aprender", "Turmas", "Coordenação", "Administração"];
  return titles
    .map((title) => ({
      title,
      items: FEATURES.filter(
        (f) => f.enabled && f.group === title && seesItem(role, f.audience),
      ),
    }))
    .filter((g) => g.items.length > 0);
}
