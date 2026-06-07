-- =============================================================================
-- Exercícios criativos (2/2): colunas, governança e Storage
-- =============================================================================
-- Colunas de entrega/config, toggles de ferramenta (admin liga/desliga) e o
-- bucket privado do Storage com policies. Enum em 0027.
--
-- Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Colunas de entrega/configuração
-- -----------------------------------------------------------------------------
alter table public.submissions
  add column if not exists submission_image_url text,   -- caminho no Storage do PNG
  add column if not exists submission_project jsonb;     -- projeto editável (reabrir)

alter table public.exercises
  add column if not exists canvas_config jsonb;          -- largura/altura/paleta (prof.)

-- -----------------------------------------------------------------------------
-- 2. Governança: toggles de ferramenta na config institucional
-- -----------------------------------------------------------------------------
alter table public.institution_settings
  add column if not exists tool_pixel_art boolean not null default true,
  add column if not exists tool_vetor boolean not null default true,
  add column if not exists tool_arte_digital boolean not null default true;

-- -----------------------------------------------------------------------------
-- 3. Storage: bucket privado para as entregas de arte
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('submissoes', 'submissoes', false)
on conflict (id) do nothing;

-- Caminho usado pelo app: submissoes/{auth.uid}/{arquivo}.png
-- O aluno escreve/lê só na própria pasta.
drop policy if exists "aluno gerencia propria pasta de submissoes" on storage.objects;
create policy "aluno gerencia propria pasta de submissoes" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'submissoes'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'submissoes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Professor que ensina o dono do arquivo e admin podem LER as entregas.
-- Guard de uuid válido antes do cast (foldername pode não ser uuid).
drop policy if exists "professor e admin leem submissoes" on storage.objects;
create policy "professor e admin leem submissoes" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'submissoes'
    and (
      public.is_admin(auth.uid())
      or (
        (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
        and public.teaches_student(auth.uid(), ((storage.foldername(name))[1])::uuid)
      )
    )
  );

-- -----------------------------------------------------------------------------
-- Verificação
-- -----------------------------------------------------------------------------
select
  exists (select 1 from information_schema.columns
          where table_name = 'submissions' and column_name = 'submission_image_url') as col_ok,
  exists (select 1 from information_schema.columns
          where table_name = 'institution_settings' and column_name = 'tool_pixel_art') as toggle_ok,
  exists (select 1 from storage.buckets where id = 'submissoes') as bucket_ok;
