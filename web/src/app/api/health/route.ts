export const dynamic = "force-dynamic";

function configured(name: string) {
  return Boolean(process.env[name]?.trim());
}

export function GET() {
  const pistonUrl = process.env.PISTON_API_URL ?? "";
  const checks = {
    supabaseUrl: configured("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: configured("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    supabaseServiceRole: configured("SUPABASE_SERVICE_ROLE_KEY"),
    pistonApiUrl: configured("PISTON_API_URL"),
    pistonLooksPublic:
      configured("PISTON_API_URL") && !/localhost|127\.0\.0\.1/i.test(pistonUrl),
    geminiApiKey: configured("GEMINI_API_KEY"),
    githubToken: configured("GITHUB_PERSONAL_ACCESS_TOKEN"),
  };

  const requiredOk =
    checks.supabaseUrl &&
    checks.supabaseAnonKey &&
    checks.supabaseServiceRole &&
    checks.pistonApiUrl &&
    checks.pistonLooksPublic;

  return Response.json(
    {
      ok: requiredOk,
      app: "sistema-jogos-programacao",
      checks,
    },
    { status: requiredOk ? 200 : 503 },
  );
}
