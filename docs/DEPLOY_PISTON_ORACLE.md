# Hospedar o Piston na Oracle Cloud (Always Free)

O Piston executa o código C# dos alunos isolado em container `--privileged`.
A Vercel não roda Docker, então ele fica numa VPS. A Oracle Cloud dá uma VPS
ARM (Ampere A1) gratuita pra sempre — capaz o bastante pra compilar C#.

Arquivos de infra: [infra/piston/](../infra/piston/).

---

## 1. Criar a conta e a VM (no navegador, console da Oracle)

1. Crie conta em https://www.oracle.com/cloud/free/ (pede cartão só pra
   verificação — a tier "Always Free" não cobra).
2. No console: **Compute > Instances > Create Instance**.
3. **Image and shape**:
   - Image: **Ubuntu 22.04** (Canonical Ubuntu).
   - Shape: **Ampere (ARM) — VM.Standard.A1.Flex**. Sugestão: 2 OCPU / 12 GB
     (dentro do Always Free). *Não* use o micro AMD de 1 GB (pouca RAM).
4. **SSH keys**: faça upload da sua chave pública, ou deixe a Oracle gerar e
   **baixe a chave privada** (guarde bem).
5. **Create**. Anote o **IP público** da instância quando ela ficar "Running".

## 2. Liberar a porta 80 (firewall da Oracle)

A Oracle bloqueia tudo por padrão. Abra a porta HTTP:

1. Na instância, clique na **Subnet** > **Default Security List**.
2. **Add Ingress Rules**:
   - Source CIDR: `0.0.0.0/0`
   - IP Protocol: `TCP`
   - Destination Port Range: `80`
3. Salve.

> O Ubuntu da Oracle também tem `iptables` interno. O script do passo 4 não
> mexe nisso; se o `curl` externo não responder, rode na VPS:
> `sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT && sudo netfilter-persistent save`

## 3. Conectar via SSH

No seu PC (PowerShell):

```powershell
ssh -i C:\caminho\sua-chave.key ubuntu@SEU_IP_PUBLICO
```

## 4. Subir o Piston

Já conectado na VPS, copie o compose e rode o setup:

```bash
sudo mkdir -p /opt/piston
# Cole o conteúdo de infra/piston/docker-compose.yml:
sudo nano /opt/piston/docker-compose.yml
# Cole o conteúdo de infra/piston/setup-server.sh:
nano setup-server.sh
sudo bash setup-server.sh
```

(ou use `scp` do seu PC pra enviar os dois arquivos pra VPS antes.)

O script instala Docker + Nginx, sobe o Piston, instala o runtime dotnet e
configura o proxy na porta 80.

### Fallback ARM (se o `docker compose pull` falhar)

Se a imagem oficial não tiver tag ARM, builde do fonte na própria VPS:

```bash
sudo apt-get install -y git
git clone https://github.com/engineer-man/piston /opt/piston-src
cd /opt/piston-src/api
docker build -t piston-local .
# Edite /opt/piston/docker-compose.yml: troque a linha 'image:' por
#   image: piston-local
sudo bash ~/setup-server.sh
```

## 5. Validar

Na VPS:

```bash
curl http://127.0.0.1:2000/api/v2/runtimes   # deve listar 'dotnet'
```

Do seu PC:

```powershell
Invoke-RestMethod http://SEU_IP_PUBLICO/api/v2/runtimes
```

Se listar o runtime `dotnet`, o Piston está público e pronto.

## 6. Usar no Vercel

No deploy da Vercel (ver [DEPLOY.md](DEPLOY.md)), defina:

```env
PISTON_API_URL=http://SEU_IP_PUBLICO/api/v2
```

O `/api/health` da plataforma deve mostrar `pistonLooksPublic: true`.

---

## Segurança (importante)

Esse Piston fica **público** e executa código arbitrário — alvo de abuso
(mineração, etc.). Mitigações já aplicadas pelo setup:

- Piston escuta só em `127.0.0.1`; o Nginx expõe apenas `/api/v2/*`.
- O endpoint `/api/v2/packages` (instalar runtimes) é **bloqueado** de fora.

Reforço recomendado (próximo passo, opcional): exigir um header secreto
compartilhado entre a plataforma e o Nginx, pra só a Vercel conseguir executar.
Isso precisa de um pequeno ajuste em `web/src/lib/exercises/piston.ts` (enviar
o header) — me peça quando quiser fechar isso.
