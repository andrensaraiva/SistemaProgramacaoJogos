import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16: "middleware" passou a se chamar Proxy (mesma função, novo nome de
// arquivo: proxy.ts na raiz/src). Roda antes de cada request: revalida a sessão
// Supabase, força primeiro acesso, bloqueia conta suspensa e roteia por papel
// (home de cada perfil). A AUTORIZAÇÃO de fato fica nos guards de página
// (requireCapability/getAcessoTurma) — aqui é só o gate otimista, como o doc do
// Next recomenda.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Roda em tudo, menos assets estáticos e imagens.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
