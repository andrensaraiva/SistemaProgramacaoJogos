import "server-only";

import { createHash } from "node:crypto";

import type { GeneratedExercise } from "@/lib/ai/gemini";
import { createAdminClient } from "@/lib/supabase/admin";

export function aiCacheKey(parts: {
  kind: string;
  difficulty: string;
  prompt: string;
}) {
  return createHash("sha256")
    .update(`${parts.kind}:${parts.difficulty}:${parts.prompt.trim()}`)
    .digest("hex");
}

export async function readAiCache(cacheKey: string) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("ai_generation_cache")
      .select("payload")
      .eq("cache_key", cacheKey)
      .maybeSingle();

    if (error || !data) return null;
    return data.payload as GeneratedExercise;
  } catch {
    return null;
  }
}

export async function writeAiCache({
  cacheKey,
  kind,
  prompt,
  difficulty,
  payload,
  createdBy,
}: {
  cacheKey: string;
  kind: string;
  prompt: string;
  difficulty: string;
  payload: GeneratedExercise;
  createdBy: string;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("ai_generation_cache").upsert(
      {
        cache_key: cacheKey,
        kind,
        prompt,
        difficulty,
        payload,
        created_by: createdBy,
      },
      { onConflict: "cache_key" },
    );
  } catch {
    // Cache e opcional; se a tabela ainda nao foi aplicada, a geracao continua.
  }
}
