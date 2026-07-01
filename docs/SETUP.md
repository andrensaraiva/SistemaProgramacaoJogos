# Setup completo — do zero até testar o projeto inteiro

Guia único e atualizado para configurar **tudo** e testar a plataforma de ponta a
ponta: login, exercícios em C#/Python, correção do professor, gamificação,
duelos, IA e a **nova camada curricular** (PPC → plano de ensino → frequência).

> Estes passos substituem o antigo fluxo de rodar migrations `0001`…`0004` uma a
> uma. Hoje há **um único arquivo de reset** (`SETUP_COMPLETO.sql`) que cria o
> banco inteiro já com todas as fases, incluindo o currículo.

---

## 0. Pré-requisitos

| Ferramenta | Para quê | Como conferir |
|---|---|---|
| **Node.js 20+** | rodar o site e o seed | `node -v` |
| **Docker Desktop** | rodar o Piston (executa o código C#/Python dos alunos) | `docker --version` |
| Conta no **Supabase** | banco de dados + login | — |
| Chave do **Google Gemini** *(opcional)* | gerar exercícios e importar PPC por IA | — |

Sem o Gemini, **tudo funciona** menos os dois recursos de IA (gerar exercício e
importar PPC). O curso técnico já vem populado pelo seed, então dá pra testar a
camada curricular inteira sem IA.

---

## 1. Criar o projeto no Supabase

1. Acesse https://supabase.com/dashboard → **New project**.
2. Nome `sistema-jogos-programacao`, região **South America (São Paulo)**, defina
   e anote a senha do banco.
3. Espere ~2 min subir.
4. Em **Settings → API**, copie três valores:
   - **Project URL**
   - **anon / publishable key** (a pública)
   - **service_role / secret key** (a secreta — só no servidor)

> O projeto aceita tanto o formato novo de chaves (`sb_publishable_…` /
> `sb_secret_…`) quanto o legado (`eyJ…`). Use o que o seu painel mostrar.

---

## 2. Variáveis de ambiente (`web/.env.local`)

Crie o arquivo `web/.env.local` (há um modelo em `web/.env.example`):

```env
# --- Supabase (passo 1) ---
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-ou-publishable-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-ou-secret-key

# --- Gemini (opcional — IA) ---
GEMINI_API_KEY=sua-key-do-gemini
GEMINI_MODEL=gemini-flash-latest

# --- Piston self-hosted (passo 4) ---
PISTON_API_URL=http://localhost:2000/api/v2

# --- GitHub Classroom (opcional) ---
GITHUB_PERSONAL_ACCESS_TOKEN=
```

> ⚠️ Nunca commite o `.env.local`. A `SUPABASE_SERVICE_ROLE_KEY` dá acesso total
> ao banco (o seed e as server actions a usam no servidor).

A chave do Gemini sai de https://aistudio.google.com/app/apikey (plano gratuito
serve).

---

## 3. Criar o banco inteiro (SETUP_COMPLETO.sql)

No painel do Supabase, abra **SQL Editor → New query**, cole **todo** o conteúdo
de [`supabase/SETUP_COMPLETO.sql`](../supabase/SETUP_COMPLETO.sql) e **Run**.

Esse único script:
- **apaga** as tabelas do app (reset — não apaga os usuários de login);
- recria perfis, turmas, exercícios, listas, submissões;
- gamificação (XP, nível, badges) + antifraude;
- cache de IA, duelos/ELO, GitHub Classroom;
- linguagens dinâmicas (`languages`) e correção manual do professor;
- a **camada curricular**: cursos, módulos, UCs, habilidades, conhecimentos,
  bibliografia, planos de ensino, vínculo turma↔UC e frequência.

No fim ele roda uma **verificação** — confira que a última linha mostra algo como
`linguagens_ativas` ≥ 1, `correcao_manual_ok = true`, `language_id_ok = true` e
`tabelas_curriculo = 11`.

> Para um teste limpo do zero, use o `SETUP_COMPLETO.sql` acima. Para aplicar só
> mudanças incrementais num banco que já existe, use a Supabase CLI
> (`npx supabase db push`) — a configuração da CLI está na seção
> **[Supabase CLI](#supabase-cli--aplicar-migrations-por-comando)** no fim deste
> guia. As migrations ficam em `supabase/migrations/` (nomeadas com timestamp,
> ex.: `20250101000007_curriculum.sql`).

---

## 4. Subir o Piston (executa o código dos alunos)

A API pública da emkc.org virou whitelist-only em 15/02/2026, então rodamos um
Piston local em Docker. No **PowerShell**:

```powershell
# Cria o volume e sobe o container (reinicia sozinho com o Docker)
docker volume create piston_data
docker run -d --name piston_api --privileged --restart unless-stopped `
  -v piston_data:/piston -p 2000:2000 ghcr.io/engineer-man/piston:latest

# Instala os pacotes das linguagens (uma vez — ficam no volume)
$dotnet = '{"language":"dotnet","version":"5.0.201"}'
Invoke-RestMethod -Uri "http://localhost:2000/api/v2/packages" -Method Post `
  -ContentType "application/json" -Body $dotnet

$python = '{"language":"python","version":"3.12.0"}'
Invoke-RestMethod -Uri "http://localhost:2000/api/v2/packages" -Method Post `
  -ContentType "application/json" -Body $python
```

Confirme as linguagens instaladas:

```powershell
Invoke-RestMethod -Uri "http://localhost:2000/api/v2/runtimes"
```

Deve listar `csharp.net` (dotnet) e `python`. Se a versão do Python `3.12.0` não
existir na sua imagem, liste as disponíveis e instale uma:

```powershell
Invoke-RestMethod -Uri "http://localhost:2000/api/v2/packages"  # ver versões
```

---

## 5. Instalar dependências e popular dados demo

No **PowerShell**, dentro de `web`:

```powershell
cd web
npm install

# Cria os usuários demo + Turma Demo + exercícios + curso técnico + frequência
npm run seed:demo:reset
```

O `seed:demo:reset` recria os usuários demo do zero. (Use `npm run seed:demo`,
sem `:reset`, para repovoar os dados mantendo os usuários existentes.)

Ao final ele imprime as credenciais:

```text
Professor: prof.demo@codequest.dev / password123
Aluno 1:   aluno1.demo@codequest.dev / password123
Aluno 2:   aluno2.demo@codequest.dev / password123
Código da turma: DEMO2026
```

O seed também cria:
- o curso **Técnico em Jogos Digitais (parte técnica)** com 6 UCs reais;
- um **plano de ensino** demo do professor para a UC de Codificação (3 blocos de
  aulas);
- a UC vinculada à **Turma Demo** com **frequência de exemplo** (3 aulas, com um
  atraso e uma falta do Aluno 2).

---

## 6. Rodar o site

```powershell
cd web
npm run dev
```

Abra **http://127.0.0.1:3000** (o dev sobe nesse host). Faça login com as contas
demo acima.

---

## 7. Roteiro de teste de ponta a ponta

### 7.1 Aluno — exercício + gamificação
1. Entre como **Aluno 1**.
2. `/exercicios` → abra **Demo: Ola Mundo**.
3. Clique **Testar** com o código abaixo, depois **Enviar**.
4. Confira o XP somado, a badge **Primeira Vitória** e o `/ranking`.

```csharp
using System;
class Program {
    static void Main() {
        Console.WriteLine("Ola, Mundo!");
    }
}
```

5. Abra **Demo: Soma em Python** e confirme que o Piston roda Python também.

### 7.2 Professor — correção (SpeedGrader)
1. Entre como **Professor**.
2. **Turmas → Turma Demo → Lista Demo**.
3. A submissão do Aluno 1 já vem **corrigida** (nota + feedback). Abra a correção
   para ver o editor read-only e o formulário de nota.

### 7.3 IA — gerar exercício *(precisa do Gemini)*
1. Como professor, `/exercicios` → **Gerar com IA**.
2. Peça algo como *"exercício sobre calcular dano de ataque em RPG"* e confirme o
   redirecionamento para o exercício criado.

### 7.4 Camada curricular — o diferencial

**Ver o que o seed criou:**
1. Como professor, menu **Cursos** → abra **Técnico em Jogos Digitais (parte
   técnica)**.
2. Navegue pelos módulos → abra a UC **Codificação de Sistemas de Jogos
   Digitais**: veja objetivo, habilidades (H301…), objetos de conhecimento e
   bibliografia.

**Importar um PPC por IA** *(precisa do Gemini)*:
3. **Cursos → + Importar PPC (IA)** → cole o texto do PDF do seu PPC → **Analisar
   com IA**. Ele extrai só a parte técnica (ignora a formação geral básica).
4. Revise/edite o rascunho (módulos, UCs, cargas) → **Salvar curso**.

**Plano de ensino + clonar:**
5. Na UC, em **Planos de ensino**, você verá o plano demo. Crie um novo plano
   (**+ Criar plano de ensino**) e adicione blocos de aulas com conteúdo,
   apresentação e atividade.
6. Entre como **Aluno 2**? Não — para testar a clonagem, use uma **segunda conta
   de professor**. Crie outro professor pelo cadastro (papel "professor"), abra a
   mesma UC e clique **Clonar** num plano de colega: vira cópia editável sua e o
   original não muda.

**Vincular UC à turma + frequência:**
7. Como professor dono, **Turma Demo → Gerenciar UCs e frequência**. A UC de
   Codificação já vem vinculada; clique **Frequência**.
8. Veja a grade **aluno × aula** já preenchida pelo seed. Clique numa célula para
   alternar **Presente → Atraso → Falta**; crie uma **+ Nova aula** e marque a
   presença. A coluna **F / A** soma faltas/atrasos por aluno.

### 7.5 Duelos (opcional)
1. Aluno 1 cria um duelo em `/duelos` com **Demo: Ola Mundo** e copia o código.
2. Aluno 2 entra com o código, alguém resolve, e em `/duelos` clique **Atualizar
   vencedor** para ver o delta de ELO.

### 7.6 Antifraude (opcional)
1. Como **Aluno 2**, abra o mesmo exercício e **cole** o código no editor; envie.
2. Como **professor**, abra **Turma Demo → Lista Demo**: a tabela de progresso
   mostra os alertas antifraude (paste, tempo, edições) e a similaridade alta
   entre códigos recentes da turma.

### 7.7 Unity / GitHub Classroom (opcional)
1. Abra `/unity` e confira os templates (`classroom-templates/csharp-basico` e
   `unity-projeto`).
2. Em `/unity/github`, informe um repositório `dono/repositorio` e **Sincronizar**:
   ele puxa a última execução do GitHub Actions (status, nota estimada, commit,
   link). Repositório público não precisa de token; privado precisa de
   `GITHUB_PERSONAL_ACCESS_TOKEN` com leitura de Actions.
3. Para o template C#: `cd classroom-templates/csharp-basico; dotnet test` (passa
   com a implementação de exemplo).

---

## 8. Checar a saúde do projeto (código)

Para garantir que tudo compila/linta/builda:

```powershell
cd web
npm run verify   # = typecheck + lint + build
```

E o health-check da API: abra `http://127.0.0.1:3000/api/health`.

---

## Resolução de problemas

| Sintoma | Causa provável | Solução |
|---|---|---|
| "Falta NEXT_PUBLIC_SUPABASE_URL em .env.local" ao rodar o seed | `.env.local` ausente/incompleto | Refaça o **passo 2** dentro de `web/` |
| Exercício fica "executando" e falha | Piston fora do ar ou sem o pacote da linguagem | Refaça o **passo 4**; veja `runtimes` |
| Aluno envia mas nada acontece | Linguagem não habilitada na tabela `languages` | Confira a verificação do **passo 3** (`linguagens_ativas`) |
| "Apenas professores podem importar PPCs" | Logado como aluno | Use a conta `prof.demo@…` ou outra com papel professor |
| Importar PPC retorna erro 502 | `GEMINI_API_KEY` ausente/ inválida ou texto muito curto | Confira a chave no **passo 2**; cole ≥ 200 caracteres |
| Curso não aparece em **Cursos** | Seed não rodou ou banco sem as tabelas do currículo | Rode o **passo 3** e depois o **passo 5** |

---

## Resumo dos comandos

```powershell
# 1) Banco: cole supabase/SETUP_COMPLETO.sql no SQL Editor do Supabase e Run

# 2) Piston
docker volume create piston_data
docker run -d --name piston_api --privileged --restart unless-stopped `
  -v piston_data:/piston -p 2000:2000 ghcr.io/engineer-man/piston:latest
Invoke-RestMethod -Uri "http://localhost:2000/api/v2/packages" -Method Post `
  -ContentType "application/json" -Body '{"language":"dotnet","version":"5.0.201"}'

# 3) App
cd web
npm install
npm run seed:demo:reset
npm run dev
# http://127.0.0.1:3000
```

---

## Supabase CLI — aplicar migrations por comando

Configuração para aplicar mudanças no banco com `supabase db push`, em vez de
colar SQL no painel. **Você só precisa fazer isto uma vez.**

> Por que a configuração é em duas etapas: seu banco foi criado pelo
> `SETUP_COMPLETO.sql` (não pela CLI), então a CLI ainda não sabe quais migrations
> já estão aplicadas. Precisamos "ensinar" isso a ela uma vez (`migration repair`)
> antes do primeiro `push`.

### Pré-requisitos (uma vez)

1. **Access token** da sua conta Supabase
   (https://supabase.com/dashboard/account/tokens → **Generate new token**):
   ```powershell
   npx supabase login --token COLE_O_TOKEN_AQUI
   ```
2. **Linkar ao projeto** (pede a senha do banco definida ao criar o projeto):
   ```powershell
   npx supabase link --project-ref SEU_PROJECT_REF
   ```
   Sem a senha? Dashboard → Settings → Database → **Reset database password**.

### Sincronizar o histórico (uma vez)

Diga à CLI que as migrations já aplicadas (via `SETUP_COMPLETO.sql`) estão
aplicadas, para o próximo `push` não tentar recriá-las. Os IDs são os 14 dígitos
do início de cada arquivo em `supabase/migrations/`:

```powershell
npx supabase migration repair --status applied 20250101000001 20250101000002 ...
npx supabase migration list   # Local e Remote devem bater
```

### Uso no dia a dia

Criou um arquivo novo em `supabase/migrations/`? Basta:

```powershell
npx supabase db push          # aplica só as migrations novas no banco remoto
```

- `supabase/config.toml` e as migrations são versionados; o **access token** e a
  **senha do banco** NÃO — ficam só na sua máquina.
- O `db push` atua no banco **remoto** linkado (não precisa de Docker).
