import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { homeDe } from "@/lib/auth/permissions";
import { isAdminAllowedPath, isCoordenadorAllowedPath, type Role } from "@/lib/features";

const PUBLIC_ROUTES = ["/", "/entrar", "/esqueci-senha", "/auth"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: sempre chamar getUser() entre createServerClient e a resposta
  // — isso revalida o token e atualiza os cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_ROUTES.some(
    (p) => path === p || path.startsWith(p + "/"),
  );

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("proximo", path);
    return NextResponse.redirect(url);
  }

  if (user) {
    const isPrimeiroAcesso = path === "/primeiro-acesso";
    const isAuthFlow = path.startsWith("/auth");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, must_change_password, profile_completed, disabled_at")
      .eq("id", user.id)
      .single();

    // Conta suspensa: encerra a sessão e manda para o login com aviso.
    if (profile?.disabled_at && !isAuthFlow) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/entrar";
      url.search = "?suspenso=1";
      return NextResponse.redirect(url);
    }

    // Primeiro acesso (trocar senha / completar perfil): mantém em
    // /primeiro-acesso até concluir.
    if (
      !isPrimeiroAcesso &&
      !isAuthFlow &&
      profile &&
      (profile.must_change_password || !profile.profile_completed)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/primeiro-acesso";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Admin é administrativo: bloqueia rotas de aluno/professor (acesso direto
    // por URL) e o joga para o painel admin.
    if (
      profile?.role === "admin" &&
      !isAuthFlow &&
      !isAdminAllowedPath(path)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Coordenador é gestão: bloqueia as áreas de ALUNO (exercícios/duelos/
    // ranking/painel de aluno) e o joga para o painel de coordenação.
    if (
      profile?.role === "coordenador" &&
      !isAuthFlow &&
      !isCoordenadorAllowedPath(path)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/coordenador";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Já logado entrando no /entrar → manda para a home do papel.
    if (path === "/entrar") {
      const url = request.nextUrl.clone();
      url.pathname = homeDe((profile?.role ?? "aluno") as Role);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
