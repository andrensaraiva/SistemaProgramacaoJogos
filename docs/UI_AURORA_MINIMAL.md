# UI — Celeste Academy “Aurora Minimal”

Guia vivo do redesign visual da plataforma. **Objetivo:** interface simples,
elegante, celestial e premium — profissional para o instrutor, inspiradora e
gamificada para o aluno. Evitar estética genérica de dashboard de IA, excesso de
cards, gradientes e enfeites.

- **Instrutor / Coordenador** → tema **claro**, calmo e eficiente (clareza tipo
  Khan Academy, pouca gamificação).
- **Aluno** → tema **escuro**, imersivo e gamificado (organização tipo Discord,
  engajamento, mais colorido — sem neon excessivo).

> **Regra de ouro do redesign:** só mudar aparência. Não alterar lógica de
> negócio, rotas, banco, auth nem contratos de API. Refatorar **em estágios**,
> checando a cada passo. Se um componente já funciona, redesenhe o visual e
> **preserve o comportamento**.

---

## Como o tema funciona

Tailwind v4 com `@theme inline` em [`web/src/app/globals.css`](../web/src/app/globals.css).
**Todos os componentes consomem tokens** (`bg-card`, `text-primary`,
`border-border`, `text-success/danger/warning`, `bg-muted`,
`text-muted-foreground`, `bg-accent`, `bg-gold`…). Trocar o valor de um token
re-veste o app inteiro sem tocar em componente.

- Tema claro = bloco `:root`. Tema escuro = bloco `.dark` no `<html>`.
- **Escolha do usuário** (não por papel): o `ThemeToggle` no rodapé da sidebar
  alterna claro/escuro e persiste em `localStorage`; um script anti-flash no
  `layout.tsx` raiz aplica a preferência (ou a do SO) antes da pintura. Cada
  pessoa — aluno ou instrutor — escolhe o tema que preferir; o estilo Aurora
  Minimal vale nos dois.

**Ao criar UI nova, use sempre os tokens** (nunca hex cru), assim ela nasce
correta nos dois temas.

---

## Design tokens

### Cores base
| Token | Light (instrutor) | Dark (aluno) |
| --- | --- | --- |
| `--background` | `#F7F2FF` | `#100B24` |
| `--card` | `#FFFFFF` | `#17102F` |
| `--card-2` (elevado) | `#F1E8FF` | `#201642` |
| `--muted` | `#F1E8FF` | `#201642` |
| `--foreground` | `#17112B` | `#F3F0FF` |
| `--muted-foreground` | `#6F6684` | `#A99FC7` |
| `--border` | `#E5DCF3` | `#3C2A68` |

### Roxo celestial + acentos
| Token | Light | Dark | Uso |
| --- | --- | --- | --- |
| `--primary` | `#7B4DFF` | `#B89BFF` | ação principal, links, destaque ativo |
| `--accent` | `#6CB6FF` | `#6CB6FF` | azul aurora (realces) |
| `--gold` / `--gold-soft` | `#D9A84E` / `#F3D89B` | `#E6BD6A` / `#F3D89B` | **só** recompensas/premium |
| `--success` | `#1FA576` | `#46D69C` | aprovado/presente |
| `--warning` | `#D6841F` | `#F7B15C` | atraso/atenção |
| `--danger` | `#E0546A` | `#F5798A` | reprovado/falta |
| `--deep-purple` | `#20133D` | — | selo da marca |
| `--moon-cream` | `#FFF8EA` | — | faísca da marca |

> Os status foram **aprofundados no tema claro** para terem contraste como texto
> sobre branco. Ao redesenhar, não use os hex “puros” do spec como texto claro.

### Gradientes (usar com parcimônia)
- **XP** (`.xp-fill`): `linear-gradient(90deg, #7B4DFF 0%, #B86CFF 50%, #F3D89B 100%)`
- **Aluno (fundo imersivo):** `linear-gradient(135deg, #20133D 0%, #2A1B55 55%, #103A4A 100%)`
- **Selo da marca:** `linear-gradient(135deg, var(--deep-purple) 0%, var(--primary) 100%)`

---

## Tipografia

Carregadas em [`web/src/app/layout.tsx`](../web/src/app/layout.tsx) via `next/font`:

| Papel | Fonte | Utilitário Tailwind |
| --- | --- | --- |
| Marca “Celeste Academy” / títulos display | **Cormorant Garamond** | `font-serif` |
| Títulos de seção / números de dashboard | **Sora** | `font-display` |
| UI (padrão: labels, botões, texto) | **Inter** | `font-sans` (default) |
| Código | **Geist Mono** | `font-mono` |

---

## Componentes

### Marca — [`components/logo.tsx`](../web/src/components/logo.tsx)
Lua crescente + faísca num selo celestial; “Celeste” em serifa (Cormorant) maior
e “Academy” menor com `tracking`. Prop `compact` mostra só o selo. Premium, não
infantil.

### Botão — [`components/ui/button.tsx`](../web/src/components/ui/button.tsx)
Raio `rounded-xl` (~12px). Variantes: `primary` (roxo/branco), `secondary`
(lavanda/borda), `ghost`, `danger`, **`gold`** (ouro — só ações especiais /
recompensas / destaque premium).

### Card — [`components/ui/card.tsx`](../web/src/components/ui/card.tsx)
`rounded-2xl`, `border-border`, `bg-card`, sombra `shadow-e1`. `interactive`
adiciona hover elevado; `tone` pinta faixa de severidade à esquerda (estado em
**forma**, não só cor — acessibilidade).

### Modal / Diálogo — [`components/ui/modal.tsx`](../web/src/components/ui/modal.tsx)
`Modal` (primitivo) e `ConfirmDialog` (helper). Theme-aware pelos tokens
(superfície clara no instrutor / escura no aluno; borda lavanda no claro / roxa
no escuro), raio 20px, acessível (role=dialog, aria-modal, fecha no Esc e no
backdrop, trava scroll, foca ao abrir), com ícone celestial opcional. O
[`ConfirmForm`](../web/src/components/confirm-form.tsx) usa o `ConfirmDialog` no
lugar do `confirm()` nativo — mesma API (`action`, `message`, `children` + opções
`title`/`danger`), então todos os ~10 pontos de confirmação já herdam o visual.

### Toast — [`components/reward-toast.tsx`](../web/src/components/reward-toast.tsx)
Toast de recompensa do aluno (celebrativo): confete e destaques na paleta Aurora
(roxo/ouro/azul/teal), borda dourada, XP em roxo e moedas em ouro. Entra do topo,
some sozinho, respeita `prefers-reduced-motion`.

### Detalhe celestial — [`components/constellation.tsx`](../web/src/components/constellation.tsx)
`Constellation` — SVG decorativo sutil (estrelas + linhas + faíscas), `aria-hidden`
e sem eventos; cor por `currentColor` (defina `text-*`/opacity) e tamanho por
`w/h`. Usado atrás do hero do aluno (ouro suave) e do cartão de login (roxo/ouro).
Usar com parcimônia, só onde reforça a marca.

### Sombras / elevação
`.shadow-e1/e2/e3` → tokens `--shadow-sm/md/lg` (tinta roxa no light; quase nulas
no dark, onde a hierarquia vem da luminância do `--card-2`).

---

## Acessibilidade
- Bom contraste; não comunicar status só por cor (usar ícone/texto/forma).
- Respeitar `prefers-reduced-motion` (já feito nas animações de globals.css).
- Manter navegação por teclado e responsividade dos componentes existentes.

---

## Roadmap por estágios

- [x] **Estágio 1 — Fundação:** tokens de cor (light/dark), tokens de ouro/marca,
  fontes (Inter/Sora/Cormorant), gradiente XP, variante `gold` no botão.
- [x] **Estágio 2 — Marca:** logo Celeste Academy (crescente + faísca + serifa);
  sidebar herda a paleta via tokens.
- [x] **Estágio 3 — Cards do dashboard:** hierarquia tipográfica Aurora aplicada
  via primitivos — números em `font-display` (Sora) no `StatCard`, títulos em
  `font-display` no `CardHeader` e `PageHeader`; números do painel do aluno
  (StatLink, streak, moedas, saudação) em Sora tabular. Propaga a todos os cards
  dos dois dashboards sem mudar estrutura/comportamento.
- [x] **Estágio 4 — Modais / Toasts / Dialogs:** `Modal` + `ConfirmDialog`
  (`components/ui/modal.tsx`) theme-aware 20px acessível; `ConfirmForm` migrado do
  `confirm()` nativo para o diálogo da marca (mesma API); `RewardToast` alinhado à
  paleta Aurora (confete/ouro/roxo).
- [x] **Estágio 5 — Tema:** ~~por papel~~ **revertido a pedido** — cada usuário
  escolhe claro/escuro pelo `ThemeToggle` (mantido no rodapé da sidebar). O estilo
  Aurora Minimal vale nos dois temas.
- [x] **Estágio 6 — Detalhes celestiais + refino tipográfico:** componente
  `Constellation` atrás do hero do aluno e do login; título do login em
  `font-display` com a marca em `font-serif`.

**Redesign Aurora Minimal concluído (estágios 1–6).** Próximos passos possíveis
(fora do escopo original): refinar telas internas específicas (turmas, correção,
relatórios) e a landing pública. Ao continuar em outra sessão: leia este arquivo
e valide com `npm run typecheck && npm run build`.
