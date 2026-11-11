# GS Instalações

Ordens de serviço para instalação de carregadores de carro elétrico, com fotos de antes e depois. O app Android funciona sem internet e sincroniza sozinho quando a conexão volta. A versão web tem as mesmas funções e só funciona online.

À parte das OS, o gestor monta orçamentos em PDF para os clientes e mantém o cadastro de clientes. Essa parte é só online, no app (menu da conta) e no site (trilho lateral).

- `backend/`: API em .NET 10, SQLite e Cloudflare R2, publicada no Railway
- `mobile/`: app Expo (SDK 58) com Expo Router, React Query e Material 3
- `web/`: site em React 19, Vite, React Router e React Query, publicado na Vercel

## Rodar localmente

API:

```bash
dotnet run --project backend/OrdemServico.Api --launch-profile http
```

Entre com o gestor inicial definido em `appsettings.Development.json`. As demais contas nascem no app, em Conta > Equipe, com a senha padrão `1234`, e cada pessoa escolhe outra no primeiro acesso.

App, depois de copiar `mobile/.env.example` para `mobile/.env.local` com o IP da sua máquina:

```bash
npm --prefix mobile install
```

```bash
npm --prefix mobile start
```

Abra no Expo Go pelo QR code. O celular precisa estar na mesma rede da API.

Site, que usa `http://localhost:5202` por padrão. Para outra API, copie `web/.env.example` para `web/.env.local`:

```bash
npm --prefix web install
```

```bash
npm --prefix web run dev
```

Abra http://localhost:5173. Em desenvolvimento a API aceita qualquer origem.

## Configurar o Cloudflare R2

Sem isso a API sobe e as OS funcionam, mas as fotos ficam paradas na fila do app.

No bucket, ative o acesso público (r2.dev ou domínio próprio) e copie a URL para `PublicUrl`. Configure com variáveis de ambiente:

```
CloudflareR2__AccountId
CloudflareR2__AccessKey
CloudflareR2__SecretKey
CloudflareR2__BucketName
CloudflareR2__PublicUrl
```

Em desenvolvimento, crie `backend/OrdemServico.Api/.env`, que fica fora do git e só é lido nesse ambiente. Reinicie a API depois de mudar o arquivo:

```ini
[CloudflareR2]
AccountId="seu-valor"
AccessKey="seu-valor"
SecretKey="seu-valor"
BucketName="seu-valor"
PublicUrl="seu-valor"
```

O app nativo não precisa de CORS, mas o site envia as fotos direto do navegador para o bucket. Em R2 > bucket > Settings > CORS Policy, inclua a origem do site, mantendo as que já existem:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173", "https://seu-site.vercel.app"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"]
  }
]
```

## Produção

### API no Railway

O `backend/Dockerfile` publica a API em Release na imagem `aspnet:10.0`, com a biblioteca de fontes que o PDF usa, e escuta na porta que o Railway passa em `PORT`.

1. Crie um serviço a partir do repositório com Root Directory `backend`. O `backend/railway.json` manda usar o Dockerfile.
2. Adicione um volume montado em `/data`. O banco SQLite fica em `/data/ordens.db`; sem o volume, cada deploy apaga tudo. Mantenha uma única réplica, porque o SQLite não é compartilhado entre instâncias.
3. Preencha as variáveis abaixo e gere o domínio em Settings > Networking.

Obrigatório, sem valor padrão:

```
Auth__GestorInicial__Usuario  usuário do primeiro gestor, usado só enquanto não existir nenhuma conta
Auth__GestorInicial__Senha    senha dele; o app não obriga a trocar, use uma senha forte
Auth__JwtKey                  ao menos 32 bytes aleatórios
CloudflareR2__AccountId, AccessKey, SecretKey, BucketName e PublicUrl, como na seção do R2
Cors__Origens                 endereço do site, ex.: https://seu-site.vercel.app; vários separados por vírgula
```

`ConnectionStrings__Db` já vem no Dockerfile como `Data Source=/data/ordens.db`. Fora do Railway, aponte para um volume persistente. Sem `Cors__Origens`, a API de produção recusa o site; o app nativo não depende dela.

Trocar `Auth__JwtKey` encerra a sessão de todos os aparelhos; a fila de cada um continua guardada. O app precisa de `EXPO_PUBLIC_API_URL` apontando para a API em HTTPS na hora do build.

### Site na Vercel

1. Importe o repositório com Root Directory `web`. A Vercel reconhece o Vite: build `npm run build`, saída `dist`.
2. Em Environment Variables, defina `VITE_API_URL` com o domínio da API no Railway, sem barra no fim, ex.: `https://sua-api.up.railway.app`. A variável entra no build, então mudar exige novo deploy.
3. Depois do primeiro deploy, coloque o domínio do site em `Cors__Origens` no Railway e na política CORS do bucket.

O `web/vercel.json` manda toda rota para o `index.html`, para que links como `/ordens/…` abram direto. Os deploys de prévia da Vercel ganham endereços próprios: só funcionam se também estiverem em `Cors__Origens` e no CORS do bucket.

O relatório da OS e o orçamento em PDF usam o QuestPDF na licença Community, gratuita para empresas com receita bruta anual de até US$ 1 milhão.

## Testes

```bash
dotnet test backend
```

```bash
npm --prefix mobile test
```

```bash
npm --prefix mobile run typecheck
```

```bash
npm --prefix web test
```

```bash
npm --prefix web run lint
```

```bash
npm --prefix web run build
```

Testes de tela do site, que sobem uma API e um Vite temporários com banco próprio e percorrem tudo num Chrome sem janela (outro navegador vai em `NAVEGADOR`). Pare o `npm run dev` antes: o de OS usa a porta 5173 e envia fotos de teste ao R2 do `.env`, apagando no fim.

```bash
npm --prefix web run e2e
```

## Como o offline funciona

Toda escrita entra primeiro em uma fila persistida no aparelho (`mobile/src/sync/`), com ids gerados no app. A tela mostra os dados do servidor com a fila sobreposta, então nada some enquanto não foi enviado. As rotas da API são idempotentes, então repetir um envio depois de uma resposta perdida não duplica nada.
