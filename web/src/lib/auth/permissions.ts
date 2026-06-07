// =============================================================================
// Mapa central de permissões por papel (capacidades nomeadas).
// =============================================================================
// Fonte ÚNICA de "quem pode o quê". Em vez de espalhar `role === "admin"` pelas
// telas, declare uma capacidade aqui e pergunte `pode(role, "ver_relatorios")`.
// Puro (sem I/O) e testado. Os guards (lib/auth/guard.ts) usam isto.
//
// Master é uma FLAG (profiles.is_master), não um papel — entra via opts.isMaster.

import type { Role } from "@/lib/features";

export type Capability =
  // Gestão de turma (professor/coordenador)
  | "gerenciar_turma" // editar a turma, ver painel de gestão
  | "cadastrar_aluno"
  | "alocar_professor" // co-docência
  | "montar_calendario"
  | "corrigir_entregas"
  | "gerenciar_curso" // CRUD de curso/UC/plano
  // Supervisão (coordenador)
  | "supervisionar_turmas" // ver/entrar em QUALQUER turma
  | "ver_relatorios" // relatórios institucionais/turma/aluno
  // Institucional (admin/coordenador)
  | "gerenciar_salas"
  | "gerenciar_feriados"
  // Administrativo (admin)
  | "gerenciar_config" // institution_settings
  | "gerenciar_contas" // criar professor/coordenador, suspender etc.
  | "gerenciar_admins" // criar/promover outros admins (SÓ master)
  // Aluno
  | "ver_area_aluno"; // exercícios, duelos, ranking, painel de aluno

const GESTAO_TURMA: Capability[] = [
  "gerenciar_turma",
  "cadastrar_aluno",
  "alocar_professor",
  "montar_calendario",
  "corrigir_entregas",
  "gerenciar_curso",
];

// O que cada PAPEL pode. (gerenciar_admins fica fora — depende da flag master.)
const MATRIX: Record<Role, Capability[]> = {
  aluno: ["ver_area_aluno"],
  professor: [...GESTAO_TURMA, "ver_area_aluno"],
  coordenador: [
    ...GESTAO_TURMA,
    "supervisionar_turmas",
    "ver_relatorios",
    "gerenciar_salas",
    "gerenciar_feriados",
  ],
  admin: [
    "ver_relatorios",
    "gerenciar_curso",
    "gerenciar_salas",
    "gerenciar_feriados",
    "gerenciar_config",
    "gerenciar_contas",
  ],
};

/** O papel `role` tem a capacidade `cap`? `isMaster` libera gerenciar_admins. */
export function pode(
  role: Role,
  cap: Capability,
  opts: { isMaster?: boolean } = {},
): boolean {
  if (cap === "gerenciar_admins") {
    return role === "admin" && opts.isMaster === true;
  }
  return MATRIX[role]?.includes(cap) ?? false;
}

/** Home de cada papel — fonte única (middleware, guards, redirects). */
export function homeDe(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "coordenador":
      return "/coordenador";
    default:
      return "/painel";
  }
}
