// Tipos compartilhados para exercicios, execucao e julgamento.

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
