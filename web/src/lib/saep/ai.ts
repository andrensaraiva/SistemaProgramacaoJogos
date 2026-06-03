import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import * as z from "zod";

// -----------------------------------------------------------------------------
// Geração de questão SAEP por IA (assistente — o instrutor revisa antes de salvar).
// Formato oficial: Contexto + Comando + 5 alternativas (A-E) + justificativa de
// cada uma + resolução comentada. Reutiliza GEMINI_API_KEY / GEMINI_MODEL.
// -----------------------------------------------------------------------------

const GeneratedQuestionSchema = z.object({
  contexto: z.string().min(10).max(2000),
  comando: z.string().min(5).max(600),
  resolucao: z.string().min(10).max(4000),
  options: z
    .array(
      z.object({
        label: z.string().min(1).max(2),
        text: z.string().min(1).max(600),
        is_correct: z.boolean(),
        justification: z.string().min(1).max(1000),
      }),
    )
    .length(5),
});

export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;

export async function generateSaepQuestion({
  tema,
  competencia,
  objeto,
  difficulty,
}: {
  tema: string;
  competencia?: string;
  objeto?: string;
  difficulty: "facil" | "medio" | "dificil" | "desafio";
}): Promise<GeneratedQuestion> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY nao configurada no .env.local");

  const modelName = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: buildPrompt({ tema, competencia, objeto, difficulty }) }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.5 },
  });

  const text = result.response.text();
  const parsed = GeneratedQuestionSchema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error("A IA retornou uma questao em formato invalido");

  // Garante exatamente uma alternativa correta.
  const corrects = parsed.data.options.filter((o) => o.is_correct).length;
  if (corrects !== 1) throw new Error("A IA nao marcou exatamente uma alternativa correta");

  return parsed.data;
}

function buildPrompt({
  tema,
  competencia,
  objeto,
  difficulty,
}: {
  tema: string;
  competencia?: string;
  objeto?: string;
  difficulty: string;
}) {
  return `Você cria questões de múltipla escolha no formato oficial do SAEP (Sistema de
Avaliação da Educação Profissional - SENAI), em português do Brasil.

FORMATO OBRIGATÓRIO (estilo "Contexto" + "Comando"):
- "contexto": uma situação-problema curta e realista (2-5 linhas).
- "comando": a pergunta objetiva derivada do contexto.
- 5 alternativas rotuladas A, B, C, D, E. APENAS UMA correta.
- Cada alternativa tem uma "justification" explicando por que está certa ou errada.
- "resolucao": explicação comentada do raciocínio até a resposta correta.

Tema da questão: ${tema}
${competencia ? `Capacidade avaliada: ${competencia}` : ""}
${objeto ? `Objeto de conhecimento: ${objeto}` : ""}
Dificuldade: ${difficulty}

Regras:
- Conteúdo técnico correto e inequívoco; uma única resposta defensável.
- Distratores plausíveis (erros comuns), não absurdos.
- Não numere as alternativas no texto; use o campo "label".

Responda SOMENTE JSON neste formato:
{
  "contexto": "string",
  "comando": "string",
  "resolucao": "string",
  "options": [
    { "label": "A", "text": "string", "is_correct": false, "justification": "string" },
    { "label": "B", "text": "string", "is_correct": false, "justification": "string" },
    { "label": "C", "text": "string", "is_correct": true,  "justification": "string" },
    { "label": "D", "text": "string", "is_correct": false, "justification": "string" },
    { "label": "E", "text": "string", "is_correct": false, "justification": "string" }
  ]
}`;
}
