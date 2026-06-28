-- =============================================================================
-- Exemplo do professor visível ao aluno (exercises.example)
-- =============================================================================
-- Diferente de `solution` (referência INTERNA do professor, nunca mostrada): o
-- `example` é um texto/código que o professor escreve PARA o aluno ver — um
-- modelo resolvido, dica guiada ou exemplo de uso. Aparece na jornada do
-- exercício quando preenchido. Markdown/código livre.
--
-- A RLS de exercises já expõe os campos do exercício ao aluno da turma; este
-- campo entra junto. Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

alter table public.exercises
  add column if not exists example text;
