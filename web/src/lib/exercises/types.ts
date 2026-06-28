// Tipos compartilhados para exercicios, execucao e julgamento.

// Linguagem agora é dinâmica (slug vindo da tabela `languages`). Mantemos o
// alias como `string` para compatibilidade com o código existente.
export type Language = string;
export type Difficulty = "facil" | "medio" | "dificil" | "desafio";

// Tipo de exercício: código (Piston + testes), apresentação (entrega de link)
// ou modelo de resposta (aluno preenche um texto). Os dois últimos são
// corrigidos manualmente.
export type ExerciseType = "codigo" | "apresentacao" | "modelo_resposta";

export type Exercise = {
  id: string;
  title: string;
  description: string;
  starter_code: string;
  language: Language;
  // Rótulo amigável da linguagem (ex: "C#", "Python") e modo do Monaco.
  // Opcionais para compatibilidade com chamadas antigas.
  language_label?: string;
  monaco_language?: string;
  difficulty: Difficulty;
  xp_reward: number;
  exercise_type?: ExerciseType;
  is_group?: boolean;
  response_template?: string | null;
  /** Exemplo do professor mostrado ao aluno (não é a solução interna). */
  example?: string | null;
};

export type SampleTest = {
  id: string;
  ord: number;
  stdin: string;
  expected_stdout: string;
  weight: number;
};

export type RunResult = {
  stdout: string;
  stderr: string;
  exit_code: number;
  timed_out: boolean;
  language_version?: string;
};

export type IntegritySignals = {
  paste_event_count: number;
  time_to_solve_ms: number | null;
  keystroke_count: number;
};

export type SubmissionResult =
  | { ok: false; message: string }
  | {
      ok: true;
      status: "aprovado" | "reprovado";
      passed: number;
      total: number;
      xp_earned: number;
      badges_awarded: string[];
      first_fail: {
        ord: number;
        stdin: string;
        expected: string;
        got: string;
        stderr: string;
      } | null;
    };
