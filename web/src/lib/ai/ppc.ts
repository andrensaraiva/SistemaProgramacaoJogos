import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import * as z from "zod";

// -----------------------------------------------------------------------------
// Extração estruturada de um PPC (Plano Pedagógico de Curso) via Gemini.
//
// O professor cola o texto do PDF; o modelo devolve a árvore
// Curso → Módulos → Unidades Curriculares → habilidades/conhecimentos/bibliografia,
// IGNORANDO a Formação Geral Básica (ensino médio) e extraindo só a parte técnica.
//
// O resultado é um RASCUNHO revisável — nada é gravado aqui.
// Reutiliza GEMINI_API_KEY / GEMINI_MODEL já configurados no projeto.
// -----------------------------------------------------------------------------

const KnowledgeSchema = z.object({
  text: z.string().min(1).max(500),
  children: z.array(z.string().min(1).max(500)).max(40).optional().default([]),
});

const CapabilitySchema = z.object({
  code: z.string().max(20).optional().default(""),
  description: z.string().min(1).max(800),
  kind: z.enum(["tecnica", "socioemocional", "basica"]).default("tecnica"),
});

const UnitSchema = z.object({
  title: z.string().min(2).max(200),
  carga_horaria_h: z.number().int().min(0).max(2000).nullable().optional(),
  objetivo_geral: z.string().max(2000).optional().default(""),
  capabilities: z.array(CapabilitySchema).max(60).optional().default([]),
  knowledge: z.array(KnowledgeSchema).max(60).optional().default([]),
  bibliography: z
    .array(
      z.object({
        reference: z.string().min(1).max(600),
        tipo: z.enum(["basica", "complementar"]).default("basica"),
      }),
    )
    .max(40)
    .optional()
    .default([]),
});

const ModuleSchema = z.object({
  name: z.string().min(1).max(120),
  units: z.array(UnitSchema).max(40),
});

const PpcSchema = z.object({
  name: z.string().min(2).max(200),
  eixo: z.string().max(200).optional().default(""),
  carga_horaria_total: z.number().int().min(0).max(20000).nullable().optional(),
  modules: z.array(ModuleSchema).min(1).max(20),
});

export type PpcDraft = z.infer<typeof PpcSchema>;

const PROMPT = `Você extrai a estrutura curricular de um Plano Pedagógico de Curso (PPC) do SENAI/SESI.

REGRAS CRÍTICAS:
- Extraia SOMENTE a Formação Técnica e Profissional (Módulo Introdutório técnico, Específico I, Específico II, etc.).
- IGNORE COMPLETAMENTE a Formação Geral Básica do ensino médio (Linguagens, Matemática, Ciências da Natureza, Ciências Humanas, Projeto de Vida) e o Módulo Básico da Indústria, se não forem técnicos da área.
- Para cada Unidade Curricular (UC) técnica, capture: título, carga horária em horas, objetivo geral, habilidades/capacidades (com código tipo "H117" quando houver e o tipo: tecnica/socioemocional/basica), objetos de conhecimento (a lista hierárquica — itens e subitens) e a bibliografia (básica/complementar).
- Mantenha os textos fiéis ao documento; não invente conteúdo.

Responda SOMENTE JSON neste formato:
{
  "name": "Técnico em ...",
  "eixo": "Informação e Comunicação",
  "carga_horaria_total": 1200,
  "modules": [
    {
      "name": "Específico I",
      "units": [
        {
          "title": "Nome da UC",
          "carga_horaria_h": 40,
          "objetivo_geral": "string",
          "capabilities": [ { "code": "H117", "description": "string", "kind": "tecnica" } ],
          "knowledge": [ { "text": "Tópico", "children": ["Subtópico 1", "Subtópico 2"] } ],
          "bibliography": [ { "reference": "AUTOR. Título. Editora, ano.", "tipo": "basica" } ]
        }
      ]
    }
  ]
}`;

export async function extractPpc(rawText: string): Promise<PpcDraft> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada no .env.local");
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  // PPCs são longos; limita a entrada para caber no contexto e no free-tier.
  const text = rawText.slice(0, 120_000);

  const result = await model.generateContent({
    contents: [
      { role: "user", parts: [{ text: `${PROMPT}\n\n=== TEXTO DO PPC ===\n${text}` }] },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.response.text());
  } catch {
    throw new Error("A IA retornou um formato inválido. Tente colar um trecho menor do PPC.");
  }

  const validated = PpcSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("A IA não conseguiu estruturar este PPC. Revise o texto e tente novamente.");
  }
  return validated.data;
}
