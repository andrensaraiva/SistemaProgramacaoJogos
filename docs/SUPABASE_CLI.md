# Supabase CLI — aplicar migrations por comando

Configuração para aplicar mudanças no banco com `supabase db push`, em vez de
colar SQL no painel. **Você só precisa fazer isto uma vez.**

> Por que a configuração é em duas etapas: seu banco foi criado pelo
> `SETUP_COMPLETO.sql` (não pela CLI), então a CLI ainda não sabe quais
> migrations já estão aplicadas. Precisamos "ensinar" isso a ela uma vez
> (`migration repair`) antes do primeiro `push`.

## Pré-requisitos (uma vez)

1. **Access token** da sua conta Supabase:
   - Acesse https://supabase.com/dashboard/account/tokens → **Generate new token**.
   - Copie o token e rode no PowerShell, dentro de `web` ou na raiz:
     ```powershell
     npx supabase login --token COLE_O_TOKEN_AQUI
     ```

2. **Linkar ao projeto** (pede a senha do banco — a que você definiu ao criar o
   projeto no Supabase):
   ```powershell
   npx supabase link --project-ref vfksyhzletgpdjaxdzag
   ```
   Se não lembra a senha do banco: Supabase Dashboard → Settings → Database →
   **Reset database password**.

## Sincronizar o histórico (uma vez)

Todas as migrations atuais (0001–0010) já estão aplicadas no seu banco — as
0001–0007 via `SETUP_COMPLETO.sql` e as 0008–0010 você rodou no painel. Diga isso
à CLI de uma vez, para o próximo `push` não tentar recriá-las. Os IDs são os
14 dígitos do início de cada arquivo:

```powershell
npx supabase migration repair --status applied `
  20250101000001 20250101000002 20250101000003 20250101000004 20250101000005 `
  20250101000006 20250101000007 20250101000008 20250101000009 20250101000010
```

Confira que o histórico bate:
```powershell
npx supabase migration list
```
Local e Remote devem mostrar a mesma lista, todas aplicadas.

## Uso no dia a dia

A partir daqui, quando eu (ou você) criar um arquivo novo em
`supabase/migrations/NNNN_descricao.sql`, basta:

```powershell
npx supabase db push
```

Ele aplica só as migrations novas no banco remoto. Sem colar SQL no painel.

## Observações

- `supabase/config.toml` e os arquivos de migration são versionados (já estão no
  git). O **access token** e a **senha do banco** NÃO — ficam só na sua máquina.
- O `db push` atua no banco **remoto** linkado. Não precisa de Docker para isso
  (Docker só é necessário para `supabase start`, que sobe um Supabase local —
  não usamos aqui).
