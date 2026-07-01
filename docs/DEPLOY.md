# Deploy na Vercel

Checklist para publicar a plataforma.

## 1. Banco

Banco novo: no Supabase SQL Editor, cole e rode **todo** o
`supabase/SETUP_COMPLETO.sql` (reset + schema completo + seed base). Para aplicar
migrations incrementais depois, use a CLI (`npx supabase db push`) — setup da CLI
em [SETUP.md](SETUP.md). O schema atual vai de `0001` a `0046`.

Em Authentication > Providers > Email, deixe o provedor de e-mail **habilitado**
(a plataforma usa e-mail + senha para login) e a confirmacao de e-mail **desligada**
(as contas sao criadas pelo admin/professor, nao por cadastro aberto).

## 2. Piston publico

A Vercel nao executa Docker. Antes do deploy final, hospede o Piston fora dela
e configure `PISTON_API_URL` com uma URL publica terminando em `/api/v2`. O host
recomendado e a **Oracle Cloud Always Free** — passo a passo no
**[Apendice](#apendice--hospedar-o-piston-na-oracle-cloud-always-free)** no fim
deste guia.

Exemplo:

```env
PISTON_API_URL=http://SEU_IP_PUBLICO/api/v2
```

## 3. Vercel

1. Importe o repositorio em https://vercel.com/new.
2. Em `Root Directory`, selecione `web`.
3. Framework preset: `Next.js`.
4. Build command: `npm run build`.
5. Install command: `npm install`.
6. Output directory: deixe vazio.

## 4. Variaveis

Use `web/.env.example` como referencia e preencha estes valores na tela
Environment Variables da Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PISTON_API_URL=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
GITHUB_PERSONAL_ACCESS_TOKEN=
```

`GEMINI_API_KEY` e `GITHUB_PERSONAL_ACCESS_TOKEN` sao opcionais se voce nao for
usar IA ou repositorios privados.

## 5. Validacao

Antes de publicar:

```powershell
cd web
npm run verify
```

Depois do deploy, abra:

```text
https://SEU-DOMINIO.vercel.app/api/health
```

O campo `ok` deve estar `true`. Se `pistonLooksPublic` estiver `false`, a
plataforma abre, mas execucao de codigo dos alunos nao funcionara em producao.

---

## Apendice — hospedar o Piston na Oracle Cloud (Always Free)

O Piston executa o codigo C# dos alunos isolado em container `--privileged`. A
Vercel nao roda Docker, entao ele fica numa VPS. A Oracle Cloud da uma VPS ARM
(Ampere A1) gratuita pra sempre — capaz o bastante pra compilar C#.

Arquivos de infra: [infra/piston/](../infra/piston/).

### 1. Criar a conta e a VM (console da Oracle)

1. Crie conta em https://www.oracle.com/cloud/free/ (pede cartao so pra
   verificacao — a tier "Always Free" nao cobra).
2. **Compute > Instances > Create Instance**.
3. **Image and shape**: Image **Ubuntu 22.04**; Shape **Ampere (ARM)
   VM.Standard.A1.Flex** (sugestao 2 OCPU / 12 GB, dentro do Always Free). *Nao*
   use o micro AMD de 1 GB (pouca RAM).
4. **SSH keys**: suba sua chave publica, ou deixe a Oracle gerar e **baixe a
   privada** (guarde bem).
5. **Create** e anote o **IP publico** quando ficar "Running".

### 2. Liberar a porta 80 (firewall da Oracle)

1. Na instancia, **Subnet > Default Security List > Add Ingress Rules**:
   Source `0.0.0.0/0`, Protocol `TCP`, Destination Port `80`. Salve.

> O Ubuntu tambem tem `iptables` interno. Se o `curl` externo nao responder, rode
> na VPS: `sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT && sudo netfilter-persistent save`

### 3. Conectar e subir o Piston

```powershell
ssh -i C:\caminho\sua-chave.key ubuntu@SEU_IP_PUBLICO
```

Na VPS, envie (`scp`) ou cole os dois arquivos de `infra/piston/` e rode o setup:

```bash
sudo mkdir -p /opt/piston
sudo nano /opt/piston/docker-compose.yml   # cole infra/piston/docker-compose.yml
nano setup-server.sh                        # cole infra/piston/setup-server.sh
sudo bash setup-server.sh
```

O script instala Docker + Nginx, sobe o Piston, instala o runtime dotnet e
configura o proxy na porta 80.

> **Fallback ARM** (se `docker compose pull` nao achar tag ARM): builde do fonte —
> `git clone https://github.com/engineer-man/piston /opt/piston-src`, `cd
> /opt/piston-src/api`, `docker build -t piston-local .`, troque a linha `image:`
> do compose por `image: piston-local` e rode o setup de novo.

### 4. Validar e usar no Vercel

```bash
curl http://127.0.0.1:2000/api/v2/runtimes    # na VPS: deve listar 'dotnet'
```
```powershell
Invoke-RestMethod http://SEU_IP_PUBLICO/api/v2/runtimes   # do seu PC
```

No deploy da Vercel, defina `PISTON_API_URL=http://SEU_IP_PUBLICO/api/v2`. O
`/api/health` da plataforma deve mostrar `pistonLooksPublic: true`.

### Seguranca (importante)

Esse Piston fica **publico** e executa codigo arbitrario — alvo de abuso
(mineracao, etc.). Mitigacoes ja aplicadas pelo setup: Piston escuta so em
`127.0.0.1`; o Nginx expoe apenas `/api/v2/*` e **bloqueia** `/api/v2/packages`
(instalar runtimes) de fora. Reforco opcional: exigir um header secreto entre a
plataforma e o Nginx (ajuste em `web/src/lib/exercises/piston.ts`).
