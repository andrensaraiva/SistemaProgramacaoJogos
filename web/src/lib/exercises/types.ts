// Tipos compartilhados pra exercícios, execução e julgamento.

export type Language = "csharp" | "python" | "javascript";
export type Difficulty = "facil" | "medio" | "dificil" | "desafio";

export type Exercise = {
  id: string;
  title: string;
  description: string;
  starter_code: string;
  language: Language;
  difficulty: Difficulty;
  xp_reward: number;
};

export type SampleTest = {
  id: string;
  ord: number;
  stdin: string;
  expected_stdout: string;
  weight: number;
};

// Resposta crua de uma execução no Piston (o que o /api/run retorna)
export type RunResult = {
  stdout: string;
  stderr: string;
  exit_code: number;
  timed_out: boolean;
  language_version?: string;
};

// Resultado de uma submissão completa (Server Action)
export type SubmissionResult =
  | { ok: false; message: string }
  | {
      ok: true;
      status: "aprovado" | "reprovado";
      passed: number;
      total: number;
      xp_earned: number;
      first_fail: {
        ord: number;
        stdin: string;
        expected: string;
        got: string;
        stderr: string;
      } | null;
    };
