import type { SupabaseClient } from "@supabase/supabase-js";

// Opção de UC achatada a partir da árvore Curso › Módulo › UC. Usada no catálogo
// de exercícios (vincular exercício a UC) e nos filtros por curso/UC.
export type UcOption = {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  moduleName: string;
  /** "Curso › Módulo › UC" — rótulo pronto para <option>. */
  label: string;
};

type CourseRow = {
  id: string;
  name: string;
  modules: {
    name: string;
    ord: number;
    units: { id: string; title: string; ord: number }[];
  }[];
};

// Lê todos os cursos visíveis ao usuário (RLS: professor vê todos) e devolve as
// UCs achatadas e ordenadas por curso › módulo › UC. Usa o client passado para
// respeitar a sessão/RLS de quem chamou.
export async function getUcOptions(
  supabase: SupabaseClient,
): Promise<UcOption[]> {
  const { data } = await supabase
    .from("courses")
    .select(
      "id, name, modules:course_modules(name, ord, units:curricular_units(id, title, ord))",
    )
    .order("name");

  const courses = (data ?? []) as CourseRow[];

  return courses.flatMap((c) =>
    c.modules
      .slice()
      .sort((a, b) => a.ord - b.ord)
      .flatMap((m) =>
        m.units
          .slice()
          .sort((a, b) => a.ord - b.ord)
          .map((u) => ({
            id: u.id,
            title: u.title,
            courseId: c.id,
            courseName: c.name,
            moduleName: m.name,
            label: `${c.name} › ${m.name} › ${u.title}`,
          })),
      ),
  );
}
