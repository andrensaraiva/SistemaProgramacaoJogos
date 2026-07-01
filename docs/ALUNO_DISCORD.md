# Experiência do aluno estilo Discord — spec e roadmap

Redesign da área do **aluno** inspirado no Discord (turma = servidor), mantendo a
marca/cores atuais. Documento vivo: atualize ao concluir cada fase.

> O **staff** (professor/coordenador/admin) continua com o painel atual. Só a
> experiência do **aluno** muda. A navegação por papel já é isolada em
> [`lib/features.ts`](../web/src/lib/features.ts), o que permite trocar o shell do
> aluno sem afetar o staff.

## Decisões travadas (jun/2026)

| Tema | Decisão |
|---|---|
| **Shell** | Discord completo só do aluno: rail de turmas (servidores) → canais → conteúdo → painel de membros. |
| **Visual** | Padrões de UX do Discord, **com a marca atual** (não o roxo do Discord). |
| **Canais por turma** | `#avisos` (só prof posta; aluno **reage** = confirma leitura), `#geral`, e por UC: `#atividades` (feed) + `#dúvidas`. |
| **Social** | Chat em tempo real (Supabase Realtime) + **DMs entre todos** (aluno↔aluno e aluno↔staff). Prof/coord moderam. |
| **Membros** | Lista com **cargos** visíveis: Professor, Coordenador, Monitor, Líder de grupo, Destaque. |
| **XP** | **Permanente** (atravessa cursos). Fontes: entregas avaliadas (**nota→XP**), desafios, duelos e **"boa ajuda"** (responder dúvida e o autor/professor marcar como útil). |
| **Moedas** | Subir de nível → **moedas Celeste 🪙**. Gastas na **loja** por cosméticos à escolha. |
| **Avatar** | Galeria de **skins compráveis** (sem upload). Upload real fica para muito depois. |
| **Ícone da turma** | Gerado (iniciais + cor) agora; upload pelo staff depois. |

### Defaults de balanceamento (ajustáveis em código)
- Moedas: **10 🪙/nível** + bônus de marco (nível 5 → +20, 10 → +50, 20 → +100, e +150 a cada 25). Ver [`lib/cosmetics/coins.ts`](../web/src/lib/cosmetics/coins.ts).
- Preços: moldura/banner 60–600 🪙, avatar 80–450 🪙; itens de prestígio têm `minLevel`. Ver [`lib/cosmetics/registry.ts`](../web/src/lib/cosmetics/registry.ts).
- Nota→XP (a definir na Fase 3): `XP = nota × peso` da atividade.
- "Boa ajuda" (a definir na Fase 4): só o autor da dúvida ou o professor marca, 1× por resposta, com teto diário (anti-farm).

## Faseamento

- [x] **Fase 1 — Economia + Loja + Avatares** *(concluída)*
  - `profiles.coins_spent/coins_bonus/avatar_skin_id`, tabela `user_cosmetics` (migration 0041).
  - Saldo **derivado do nível** (`coinsForLevel`) — não precisa hookar fontes de XP.
  - Loja em `/perfil`: comprar (valida preço/nível/saldo **no servidor**, service role) e equipar (valida posse). 3 tipos: molduras, banners, avatares.
  - `AvatarWithFrame` aplica moldura + skin; a sidebar usa.
- [ ] **Fase 2 — Shell do aluno**
  - Layout dedicado (só `role === 'aluno'`): rail de turmas (servidores) → lista de canais → conteúdo → painel de membros.
  - Ícone de turma gerado (iniciais+cor). Membros com cargos.
  - Reutiliza dados de turmas/UCs/`class_members` já existentes; sem chat ainda.
- [ ] **Fase 3 — Feed de atividades (`#atividades`)**
  - Atividades da UC como **cards** (prazo, dificuldade, status, avatares de quem entregou).
  - **Reações** (`activity_reactions`) e **comentários** (`activity_comments`) — tabelas novas + RLS por turma.
  - Aplicar **nota→XP** nas entregas avaliadas (estende o trigger/grading).
- [ ] **Fase 4 — Chat em tempo real**
  - `channels` + `messages` por turma (Realtime). Canais: `#avisos` (read-receipt via reação), `#geral`, `#dúvidas` por UC.
  - **DMs** (1:1) entre quaisquer usuários. Moderação: prof/coord apagam/fixam.
  - **"Boa ajuda"**: marcar resposta em `#dúvidas` como útil → XP pro autor.
- [ ] **Fase 5 — Engajamento**
  - **Presença/status** (online/estudando/em duelo) via Realtime Presence.
  - **Cargos visíveis** (roles) derivados de badges/desempenho.
  - **Menções @** + inbox. **Streak diário** + **missões** (dão XP/moedas via `coins_bonus`).

## Modularidade (manter)

- Tipos de atividade: registro único em [`lib/activities/registry.ts`](../web/src/lib/activities/registry.ts) — ver seção **Modularidade** de [ARCHITECTURE.md](ARCHITECTURE.md). Adicionar tipo = 1 entrada.
- Cosméticos: registro único em [`lib/cosmetics/registry.ts`](../web/src/lib/cosmetics/registry.ts). Adicionar cosmético = 1 entrada (id + preço + estilo CSS).
- Navegação por papel: [`lib/features.ts`](../web/src/lib/features.ts).

## Ideias futuras (não priorizadas)

- **Temporadas / passe de bimestre** (trilha sazonal de cosméticos) — casa com o calendário escolar.
- **Soundboard / emojis customizados** como recompensa (cria `class_emojis`).
- **Sala de estudo com voz** (LiveKit, tier grátis) — só se a sala de estudo pegar; presença primeiro.
- Upload real de **foto de avatar** e **ícone de turma** (precisa Supabase Storage + moderação).
