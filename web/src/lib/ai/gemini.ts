import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import * as z from "zod";

const GeneratedExerciseSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(20).max(4000),
  starter_code: z.string().min(20).max(8000),
  solution: z.string().min(20).max(12000),
  tests: z
    .array(
      z.object({
        stdin: z.string(),
        expected_stdout: z.string(),
        is_hidden: z.boolean(),
      }),
    )
    .min(2)
    .max(8),
});

export type GeneratedExercise = z.infer<typeof GeneratedExerciseSchema>;

export async function generateCsharpExercise({
  prompt,
  difficulty,
}: {
  prompt: string;
  difficulty: "facil" | "medio" | "dificil" | "desafio";
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY nao configurada no .env.local");
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: buildPrompt(prompt, difficulty),
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
    },
  });

  const text = result.response.text();
  const parsed = GeneratedExerciseSchema.safeParse(JSON.parse(text));

  if (!parsed.success) {
    throw new Error("A IA retornou um exercicio em formato invalido");
  }

  return parsed.data;
}

function buildPrompt(prompt: string, difficulty: string) {
  return `
Voce cria exercicios de programacao C# para alunos iniciantes em uma plataforma escolar.

Crie UM exercicio em portugues do Brasil com dificuldade "${difficulty}" a partir deste pedido:

${prompt}

Regras:
- A linguagem deve ser C# console app.
- O aluno deve resolver lendo stdin com Console.ReadLine e escrevendo stdout com Console.WriteLine.
- Nao use arquivos, rede, threads, reflection, unsafe ou bibliotecas externas.
- A descricao deve explicar claramente entrada e saida.
- starter_code deve compilar, mas deixar a parte principal para o aluno implementar.
- solution deve compilar e resolver todos os testes.
- Gere entre 3 e 6 testes, com pelo menos 1 visivel e 1 oculto.
- expected_stdout deve incluir quebras de linha finais quando fizer sentido.

Responda SOMENTE JSON neste formato:
{
  "title": "string",
  "description": "string markdown",
  "starter_code": "string",
  "solution": "string",
  "tests": [
    { "stdin": "string", "expected_stdout": "string", "is_hidden": false }
  ]
}
`;
}
