import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com `service_role` — **bypassa RLS**.
 *
 * Use APENAS em código server-side onde você precisa:
 *  - ler dados sensíveis (ex: testes ocultos de um exercício)
 *  - escrever em tabelas que o usuário não tem permissão direta (ex: profiles.xp)
 *
 * NUNCA importe esse arquivo num client component — o build do Next vai
 * marcar como erro graças ao `import "server-only"`.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no ambiente",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
