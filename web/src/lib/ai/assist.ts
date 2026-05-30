import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";

// -----------------------------------------------------------------------------
// Ajuda de IA no editor (free-tier).
//
// Dois modos pensados para NÃO entregar a resposta pronta (o aluno aprende):
//   - "explain": explica em português o erro/saída errada, sem reescrever o código.
//   - "hint":    dá uma dica progressiva, conceitual, sem mostrar a solução.
//
// Reutiliza GEMINI_API_KEY / GEMINI_MODEL já configurados no projeto.
// -----------------------------------------------------------------------------

export type AssistMode = "explain" | "hint";

export type AssistInput = {
  mode: AssistMode;
  language: string; // rótulo amigável (ex: "C#")
  exerciseTitle: string;
  exerciseDescription: string;
  code: string;
  stderr?: string;
  stdout?: string;
  expected?: string;
};

const SYSTEM_RULES = `Você é um tutor de programação para alunos iniciantes, em português do Brasil.
REGRAS IMPORTANTES:
- NUNCA escreva a solução completa nem trechos prontos para copiar.
- Seja breve (no máximo 6 linhas), claro e encorajador.
- Use linguagem simples; explique o conceito, não dê o código.
- Se o aluno estiver perto, aponte só o próximo passo.`;

function buildPrompt(input: AssistInput): string {
  const parts: string[] = [SYSTEM_RULES, ""];

  parts.push(`Linguagem: ${input.language}`);
  parts.push(`Exercício: ${input.exerciseTitle}`);
  parts.push(`Enunciado: ${input.exerciseDescription}`);
  parts.push("");
  parts.push("Código atual do aluno:");
  parts.push("```");
  parts.push(input.code.slice(0, 6000));
  parts.push("```");

  if (input.stderr) {
    parts.push("");
    parts.push("Erro/saída de erro:");
    parts.push("```");
    parts.push(input.stderr.slice(0, 2000));
    parts.push("```");
  }

  if (input.expected !== undefined && input.stdout !== undefined) {
    parts.push("");
    parts.push(`Saída esperada: ${input.expected.slice(0, 1000)}`);
    parts.push(`Saída obtida: ${input.stdout.slice(0, 1000)}`);
  }

  parts.push("");
  if (input.mode === "explain") {
    parts.push(
      "Explique em português, de forma simples, O QUE está dando errado e POR QUÊ. Não corrija o código por ele.",
    );
  } else {
    parts.push(
      "Dê UMA dica curta para o aluno avançar sozinho. Não revele a solução nem escreva código.",
    );
  }

  return parts.join("\n");
}

export async function aiAssist(input: AssistInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada no .env.local");
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
    generationConfig: { temperature: 0.5, maxOutputTokens: 400 },
  });

  const text = result.response.text().trim();
  return text || "Não consegui gerar uma dica agora. Tente novamente.";
}
