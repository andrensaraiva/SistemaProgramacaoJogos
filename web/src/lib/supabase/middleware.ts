import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Usuário logado que precisa de primeiro acesso (trocar senha / completar
  // perfil) é mantido em /primeiro-acesso até concluir. Logout e callbacks de
  // auth ficam de fora para não criar laço.
  if (user) {
    const isPrimeiroAcesso = path === "/primeiro-acesso";
    const isAuthFlow = path.startsWith("/auth");
    if (!isPrimeiroAcesso && !isAuthFlow) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("must_change_password, profile_completed")
        .eq("id", user.id)
        .single();
      if (profile && (profile.must_change_password || !profile.profile_completed)) {
        const url = request.nextUrl.clone();
        url.pathname = "/primeiro-acesso";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  }

  if (user && path === "/entrar") {
    const url = request.nextUrl.clone();
    url.pathname = "/painel";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
