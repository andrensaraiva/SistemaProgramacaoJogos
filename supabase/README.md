# Supabase — esquema do banco

Aqui ficam as migrations SQL que definem as tabelas da plataforma.

## Como aplicar

1. Abra a [Dashboard do Supabase](https://supabase.com/dashboard) → seu projeto → **SQL Editor**
2. Crie um **New query**
3. Cole o conteúdo de [migrations/0001_init.sql](migrations/0001_init.sql)
4. **Run** (Ctrl+Enter)
5. Pronto. Vai criar 11 tabelas + RLS + seed inicial de badges.

## O que tem aqui

| Tabela | Propósito |
|---|---|
| `profiles` | Perfil do usuário (estende `auth.users`) — papel (aluno/professor), XP, level |
| `classes` | Turmas criadas pelos professores |
| `class_members` | Inscrição de alunos em turmas (via invite code) |
| `exercises` | Exercícios de programação (descrição, código inicial, dificuldade, XP) |
| `exercise_tests` | Casos de teste por exercício (stdin → expected stdout) |
| `assignments` | Listas / desafios / provas atribuídos a uma turma |
| `assignment_exercises` | Quais exercícios estão em cada assignment |
| `submissions` | Cada submissão de código de aluno + métricas antifraude |
| `badges` | Catálogo de conquistas |
| `user_badges` | Conquistas que cada aluno já ganhou |
| `duels` | Duelos X1 (PvP) |

## Row Level Security (RLS)

Todas as tabelas têm RLS habilitado. Resumo da política:

- **Aluno** só vê o que é dele ou da sua turma
- **Professor** vê tudo das suas turmas (alunos, submissões, duelos)
- **Exercícios públicos** (`is_public=true`) qualquer um vê

## Reparar banco existente

Se o Supabase ja tem a `0001_init.sql` aplicada, nao rode a migration inicial
de novo. Para habilitar gamificacao/antifraude em um banco existente, rode no
SQL Editor:

```text
supabase/migrations/0002_gamification_repair_idempotent.sql
```

Essa query e idempotente: pode rodar mais de uma vez sem erro de tipo/tabela ja
existente.

## Migrations futuras

Numere em sequência (`0002_*.sql`, `0003_*.sql`). Nunca edite uma migration já aplicada — crie uma nova com o `ALTER`.
