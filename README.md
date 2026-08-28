# Quiz Semana do Cliente DM

Jogo de quiz full-stack sobre **Experiência do Cliente, Voz do Cliente e NPS**: **React (Vite)** no frontend, **Node.js/Express** no backend, **PostgreSQL** no banco. Testado ponta a ponta localmente.

## Como funciona

- **5 fases**, cada uma com **3 perguntas de múltipla escolha** (15 perguntas no total), extraídas do material de CX/NPS da empresa.
- **Sem dicas** — o jogador responde e já vê na hora se acertou, com uma explicação educativa logo em seguida. Acertou, ganha os pontos (100 pts por pergunta).
- **Calendário de 4 dias:**
  - **Dia 1** → Fase 1 — Mentalidade Cliente no Centro 🎯
  - **Dia 2** → Fase 2 — Decifrando a Voz do Cliente 💬 (a do Dia 1 continua aberta)
  - **Dia 3** → Fase 3 — Investigador de Pesquisas 🔍 (as anteriores continuam abertas)
  - **Dia 4** → Fase 4 — Especialista em NPS 📊 **e** Fase 5 — Mestre da Experiência 🏆 (todas as fases ficam abertas)
- **Pódio de 3 vencedores** no Ranking Geral, por: 1º maior pontuação → 2º menor tempo total → 3º conclusão mais antiga.
- Cada fase mostra um **ícone temático** (emoji) em vez de foto de pessoa, já que o conteúdo agora é sobre CX/NPS e não sobre personas.

## Como a liberação das fases funciona (automática ou manual)

Isso é controlado pela variável de ambiente `EVENTO_DATA_INICIO` no backend (arquivo `.env`), que define a data e hora exatas do **Dia 1** do evento. A partir dela, o sistema calcula sozinho em qual dia do evento estamos e libera as fases automaticamente — você não precisa fazer nada manualmente no dia do evento.

```
EVENTO_DATA_INICIO=2026-09-08T08:00:00-03:00
```

**Antes de ir para produção, edite essa data para o dia real em que o Dia 1 do evento vai começar.**

Se, por qualquer motivo, você quiser **forçar manualmente** uma fase a abrir antes ou depois do previsto (por exemplo, adiantar por causa de um imprevisto), duas opções:

1. **Pelo Painel Admin** (mais fácil, sem precisar mexer em código): aba "Liberação de Fases" → troque o "Dia de liberação" daquela fase, ou desative-a temporariamente com o checkbox "Ativo".
2. **Testando localmente**: defina `EVENTO_DIA_ATUAL=2` (por exemplo) no `.env` do backend para simular que hoje é o Dia 2, sem depender da data real — útil para testar antes do evento.

## Painel Admin

Acessível em `/admin` (só aparece/funciona para e-mails cadastrados em `ADMIN_EMAILS`). Tem 3 abas:

- **Liberação de Fases** — controla o dia de liberação e se cada fase está ativa.
- **Ranking Geral** — a mesma visão de pontuação, tempo e fases concluídas que aparece para os jogadores, mas com o e-mail de cada um também visível.
- **Quem Jogou** — lista todo mundo que já fez login, mostrando fase a fase o status (não iniciou / em andamento / concluída), pontuação e tempo. Isso permite ver inclusive quem entrou no jogo mas ainda não respondeu nada.

## Estrutura

```
dm-escape-room/
├── backend/        # API Node.js/Express
│   └── src/
│       ├── db/schema.sql         # schema + banco de perguntas das 5 fases (15 perguntas)
│       ├── routes/               # auth, fases (hub + perguntas), ranking, admin
│       └── server.js
├── frontend/       # SPA React (Vite)
│   ├── public/
│   │   └── logo-dm.png           # logo oficial DM
│   └── src/
│       ├── pages/  # Login, Hub, Fase (quiz), Ranking (com pódio), Admin (3 abas)
│       └── styles/theme.css      # paleta oficial DM
└── docker-compose.yml   # ambiente de desenvolvimento local
```

> Nota: a pasta `frontend/public/personas/` ainda tem as ilustrações da versão anterior do jogo (baseada em personas), mas não é mais usada pelo código — pode ser removida com segurança se quiser deixar o projeto mais limpo.

## Banco de perguntas (onde editar/adicionar perguntas)

As perguntas ficam na tabela `perguntas`, alimentada pelo seed em `backend/src/db/schema.sql`. Para adicionar mais perguntas em qualquer fase, insira mais linhas seguindo o mesmo padrão (o jogo aceita qualquer quantidade ≥ 3 por fase):

```sql
INSERT INTO perguntas (fase_id, ordem, enunciado, opcoes, resposta_correta_id, explicacao, pontos)
SELECT id, 4,
  'Sua nova pergunta aqui?',
  '[{"id":"a","texto":"Opção A"},{"id":"b","texto":"Opção B"},{"id":"c","texto":"Opção C"},{"id":"d","texto":"Opção D"}]'::jsonb,
  'b',
  'Explicação que aparece depois de responder.',
  100
FROM fases WHERE chave = 'fase1';
```
A resposta correta (`resposta_correta_id`) nunca é enviada ao frontend antes de o jogador responder.

## Rodando localmente (dev)

Pré-requisito: Docker instalado.

```bash
docker compose down -v   # se já rodou uma versão anterior, isso limpa o banco antigo
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000/api
- Login: e-mail terminado no domínio configurado em `ALLOWED_EMAIL_DOMAIN` (hoje `@vocedm.com.br` no `docker-compose.yml`)
- Admin: cadastre o e-mail em `ADMIN_EMAILS`

Sem Docker, também dá para rodar manualmente:

```bash
# Backend
cd backend
cp .env.example .env      # edite com seus dados locais
npm install
npm run migrate           # cria as tabelas e o banco de perguntas no Postgres
npm run dev

# Frontend (em outro terminal)
cd frontend
cp .env.example .env      # aponte VITE_API_URL para o backend
npm install
npm run dev
```

## Deploy na AWS

Sugestão de arquitetura simples, dentro do padrão de contas AWS corporativas (VPC própria, sem exposição pública do banco):

```
Route53 (DNS) → CloudFront → S3 (frontend estático)
                                     │
                          API Gateway / ALB → ECS Fargate (backend, container do Dockerfile)
                                     │
                              RDS PostgreSQL (subnet privada)
```

### 1. Banco de dados — Amazon RDS (PostgreSQL)
1. Crie uma instância RDS PostgreSQL 16 em subnet privada da VPC da empresa.
2. Anote o endpoint, porta, usuário e senha.
3. Rode a migração apontando para o RDS (a partir de uma máquina com acesso à VPC, ex. bastion ou pipeline de CI/CD):
   ```bash
   DATABASE_URL=postgresql://usuario:senha@seu-endpoint.rds.amazonaws.com:5432/dm_escape_room \
   DATABASE_SSL=true \
   npm run migrate
   ```
4. Security Group do RDS: liberar entrada **apenas** do Security Group do backend (ECS), nunca `0.0.0.0/0`.

### 2. Backend — Amazon ECS (Fargate) + ECR
1. Build e push da imagem:
   ```bash
   cd backend
   docker build -t dm-quiz-backend .
   aws ecr create-repository --repository-name dm-quiz-backend
   docker tag dm-quiz-backend:latest <conta>.dkr.ecr.<regiao>.amazonaws.com/dm-quiz-backend:latest
   aws ecr get-login-password --region <regiao> | docker login --username AWS --password-stdin <conta>.dkr.ecr.<regiao>.amazonaws.com
   docker push <conta>.dkr.ecr.<regiao>.amazonaws.com/dm-quiz-backend:latest
   ```
2. Crie uma **ECS Task Definition** (Fargate) usando essa imagem, porta `4000`.
3. Variáveis de ambiente da task = as mesmas do `.env.example` do backend, com os valores reais de produção, incluindo `EVENTO_DATA_INICIO` com a data real do Dia 1. **Recomendado:** guardar `JWT_SECRET` e a senha do banco no **AWS Secrets Manager**.
4. Crie um **ECS Service** atrás de um **Application Load Balancer** (ALB), em subnets privadas, com o ALB em subnets públicas.
5. Configure o ALB com HTTPS (certificado via **AWS Certificate Manager**) e aponte um domínio via Route53.
6. Auto scaling do ECS Service por CPU/memória — 2 tasks mínimas para alta disponibilidade durante os 4 dias do evento.

### 3. Frontend — Amazon S3 + CloudFront
1. Build apontando para a URL real da API:
   ```bash
   cd frontend
   VITE_API_URL=https://api-semanadocliente.vocedm.com.br/api npm run build
   ```
2. Suba o conteúdo de `dist/` para um bucket S3 configurado como site estático (ou origem privada do CloudFront).
3. Crie uma distribuição **CloudFront** na frente do bucket, com HTTPS (ACM) e **error pages customizadas apontando 403/404 para `/index.html`** (necessário para o React Router).
4. Aponte o domínio final via Route53 para o CloudFront.

### 4. Segurança e LGPD (produção)
- HTTPS obrigatório em todas as camadas.
- `JWT_SECRET` forte, armazenado no Secrets Manager.
- Security Groups restritivos (RDS só aceita conexão do backend; backend só aceita conexão do ALB).
- Logs centralizados no CloudWatch, retenção definida.
- Backup automático do RDS ativado.
- Apenas nome e e-mail corporativo do colaborador são coletados; política de retenção definida (ex. anonimizar 90 dias após o evento).

### 5. Ajustar antes de ir para produção
- `ALLOWED_EMAIL_DOMAIN` → confirme `@vocedm.com.br`.
- `ADMIN_EMAILS` → e-mails reais da equipe de Experiência do Cliente/RH.
- `EVENTO_DATA_INICIO` → data e hora reais do Dia 1 do evento (fuso `-03:00` já configurado no exemplo).

## Testes realizados (ambiente local)
- Login com domínio corporativo válido/inválido ✅
- Hub respeitando o calendário de 4 dias (Dia 1 → fase 1; Dia 4 → todas as 5 abertas) ✅
- Fluxo completo de perguntas com explicação exibida após responder ✅
- Bloqueio de responder a mesma pergunta duas vezes ✅
- Resposta correta nunca exposta no payload antes de o jogador responder ✅
- Ranking geral com pódio dos 3 primeiros colocados, ordenado por pontuação → tempo → data ✅
- Painel admin: liberação de fases, ranking e lista de participantes (inclusive quem ainda não jogou nada) ✅
- Build de produção do frontend sem erros ✅
