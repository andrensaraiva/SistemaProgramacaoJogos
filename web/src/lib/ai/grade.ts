import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { parseSuggestion, type GradeSuggestion } from "./grade-parse";

export { parseSuggestion, type GradeSuggestion } from "./grade-parse";

// -----------------------------------------------------------------------------
// Sugestão de NOTA + FEEDBACK por IA para o professor (free-tier).
//
// Diferente do tutor do aluno (ai/assist.ts): aqui a IA AJUDA O PROFESSOR a
// corrigir. Ela SUGERE uma nota (0–10) e um feedback construtivo com base no
// enunciado e na entrega do aluno. NÃO grava nada — o professor confirma/edita.
//
// Reutiliza GEMINI_API_KEY / GEMINI_MODEL já configurados no projeto.
// -----------------------------------------------------------------------------

export type GradeSuggestionInput = {
  /** Tipo da atividade: código, apresentação (link) ou modelo de resposta (texto). */
  kind: string;
  exerciseTitle: string;
  exerciseDescription: string;
  /** Modelo/gabarito de resposta, se o professor definiu. */
  responseTemplate?: string;
  /** Exemplo do professor (referência), se houver. */
  example?: string;
  /** Entrega do aluno (código, texto ou o link). */
  submission: string;
  /** Só para código: testes passados / total. */
  passed?: number;
  total?: number;
};

const SYSTEM_RULES = `Você é um instrutor experiente de programação de jogos do SENAI, corrigindo entregas em português do Brasil.
Sua tarefa: SUGERIR uma nota de 0 a 10 e um feedback curto e construtivo para o aluno.
REGRAS:
- Seja justo e objetivo. Baseie a nota no enunciado e na entrega.
- Feedback: 2 a 4 frases, encorajador, apontando o que está bom e o que melhorar.
- Fale direto com o aluno ("você fez...", "tente...").
- Responda SOMENTE em JSON válido: {"grade": <número 0-10>, "feedback": "<texto>"}.
- Nada de markdown, nada de texto fora do JSON.`;

function buildPrompt(input: GradeSuggestionInput): string {
  const parts: string[] = [SYSTEM_RULES, ""];
  parts.push(`Tipo da atividade: ${input.kind}`);
  parts.push(`Título: ${input.exerciseTitle}`);
  parts.push(`Enunciado: ${input.exerciseDescription.slice(0, 4000)}`);

  if (input.responseTemplate) {
    parts.push(`Modelo/gabarito esperado: ${input.responseTemplate.slice(0, 2000)}`);
  }
  if (input.example) {
    parts.push(`Exemplo de referência: ${input.example.slice(0, 2000)}`);
  }
  if (input.total && input.total > 0) {
    parts.push(`Testes automáticos: ${input.passed ?? 0} de ${input.total} passaram.`);
  }

  parts.push("");
  parts.push("Entrega do aluno:");
  parts.push("```");
  parts.push(input.submission.slice(0, 8000));
  parts.push("```");
  parts.push("");
  parts.push('Responda só o JSON: {"grade": N, "feedback": "..."}.');
  return parts.join("\n");
}

export async function aiSuggestGrade(
  input: GradeSuggestionInput,
): Promise<GradeSuggestion> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada no .env.local");

  const modelName = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
  });

  const suggestion = parseSuggestion(result.response.text());
  if (!suggestion) {
    throw new Error("A IA não retornou uma sugestão válida. Tente de novo.");
  }
  return suggestion;
}
