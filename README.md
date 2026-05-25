# Bolao Copa do Mundo 2026

Plataforma full-stack para administrar um bolao da Copa do Mundo 2026 com
cadastro de participantes, palpites, painel administrativo, tabelas da fase de
grupos, chaveamento do mata-mata e exportacoes visuais para compartilhamento.

O sistema foi desenhado para operar de forma 100% manual: jogos, confrontos e
placares oficiais sao controlados pelo Admin, sem dependencia de APIs externas
de futebol.

## Stack

| Camada | Tecnologias |
| --- | --- |
| Frontend | React, Vite, TailwindCSS |
| UI | Dark Mode Minimalist, layout responsivo |
| Exportacao de imagens | html2canvas |
| Backend | Python, FastAPI |
| Banco de dados | MySQL com PyMySQL |
| Auth | JWT + bcrypt |
| Deploy sugerido | Vercel + Railway |

## Funcionalidades

- Cadastro e login com JWT.
- Emojis unicos por usuario, protegidos tambem no MySQL com `UNIQUE`.
- Painel Admin para placares reais, usuarios, pagamentos e edicao de confrontos.
- Banco populavel por script com os 104 jogos da Copa do Mundo 2026.
- Palpites por data, com filtro de jogos pendentes.
- Salvamento hibrido de palpites:
  - salvar um jogo individualmente pelo card;
  - salvar todos os rascunhos pendentes em lote.
- Trava de palpites:
  - jogos com placeholders do mata-mata ficam bloqueados;
  - palpites fecham 30 minutos antes do inicio da partida.
- Historico de palpites com edicao ate o limite de bloqueio.
- Recibo de palpites em PNG para o usuario comum.
- Ranking Geral e Ranking Bolao Pago na visao Admin.
- Ranking Misterioso em PNG para compartilhamento, mostrando apenas posicao,
  emoji e pontos.
- Tabelas da fase de grupos com criterios de desempate:
  - pontos;
  - saldo de gols;
  - gols marcados;
  - confronto direto quando aplicavel.
- Ranking dos melhores terceiros colocados.
- Arvore visual do mata-mata com bandeiras via FlagCDN.

## Arquitetura

```text
Frontend React/Vite
        |
        | VITE_API_BASE_URL
        v
Backend FastAPI
        |
        | PyMySQL
        v
MySQL
```

Em producao, o frontend pode rodar na Vercel, enquanto backend e MySQL podem
rodar na Railway. O backend usa CORS e variaveis de ambiente para controlar as
origens permitidas.

## Estrutura

```text
backend/
  app/
    db.py
    main.py
    security.py
  database/
    schema.sql
  matches_2026.json
  knockout_matches_2026.json
  seed_matches_2026.py
  seed_test_data.py
  seed_match_results.py
  reset_match_results.py
  setup_unique_emojis.py
  requirements.txt

frontend/
  public/
  src/
    components/
    context/
    pages/
    services/
  package.json

README.md
```

## Variaveis de Ambiente

Crie arquivos `.env` a partir dos templates `.env.example`.

### Backend

Exemplo:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=SUA_SENHA_AQUI
DB_NAME=bolao_copa
CORS_ALLOW_ORIGINS=http://localhost:5173
JWT_SECRET_KEY=SUA_CHAVE_SECRETA_AQUI
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480
```

### Frontend

Exemplo:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Em producao, `VITE_API_BASE_URL` deve apontar para a URL publica do backend.

## Como Rodar Localmente

### 1. Banco de Dados

Crie o banco:

```sql
CREATE DATABASE IF NOT EXISTS bolao_copa
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Execute o schema:

```powershell
mysql -u root -p bolao_copa -e "source backend/database/schema.sql"
```

### 2. Backend

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

URLs uteis:

```text
API:     http://localhost:8000
Swagger: http://localhost:8000/docs
```

### 3. Popular os 104 Jogos

Com o ambiente virtual ativo e o `.env` configurado:

```powershell
python backend\seed_matches_2026.py backend\matches_2026.json
python backend\seed_matches_2026.py backend\knockout_matches_2026.json
```

O primeiro comando insere os 72 jogos da fase de grupos. O segundo insere os 32
jogos do mata-mata, totalizando 104 partidas.

### 4. Configurar Emojis Unicos

Para limpar emojis atuais e criar a restricao `UNIQUE` no banco:

```powershell
python backend\setup_unique_emojis.py
```

Esse script zera `users.emoji`, remove um indice antigo chamado `emoji` caso
exista, ajusta a coluna para `utf8mb4_bin` e recria a restricao unica.

### 5. Frontend

Em outro terminal:

```powershell
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Frontend local:

```text
http://localhost:5173
```

## Scripts Uteis

| Script | Funcao |
| --- | --- |
| `backend/seed_matches_2026.py` | Insere jogos a partir dos JSONs oficiais do projeto |
| `backend/setup_unique_emojis.py` | Recria a regra de emojis unicos no banco |
| `backend/seed_test_data.py` | Cria usuarios de teste e palpites para carga |
| `backend/seed_match_results.py` | Simula placares reais da fase de grupos |
| `backend/reset_match_results.py` | Limpa placares simulados da fase de grupos |

## Fluxo de Uso

1. Admin carrega ou confere os 104 jogos.
2. Participantes criam conta, escolhem emoji unico e fazem login.
3. Usuario seleciona uma data, registra palpites e pode salvar individualmente
   ou em lote.
4. Jogos do mata-mata com placeholders ficam bloqueados ate o Admin definir os
   times reais.
5. Admin lanca placares reais a qualquer momento.
6. Sistema recalcula rankings, tabelas e chaveamento.
7. Admin pode exportar o Ranking Misterioso em PNG.
8. Usuario comum pode exportar o recibo dos proprios palpites em PNG.

## Regras de Negocio

- Cada usuario pode ter apenas um palpite por partida.
- Palpites podem ser editados ate 30 minutos antes do inicio do jogo.
- Jogos com `Grupo`, `Jogo`, `Vencedor` ou `Perdedor` no nome dos times ficam
  bloqueados para palpite.
- Usuario comum nao ve informacoes financeiras.
- Admin controla quem participa do Bolao Pago e quem pagou.
- Ranking Geral e Ranking Bolao Pago sao separados na visao administrativa.
- Emoji de usuario e unico no banco, nao apenas na validacao do frontend.

## Deploy

Configuracao recomendada:

| Servico | Responsabilidade |
| --- | --- |
| Vercel | Frontend React/Vite |
| Railway | Backend FastAPI |
| Railway MySQL | Banco de dados |

Variaveis essenciais no backend:

```env
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
CORS_ALLOW_ORIGINS=
JWT_SECRET_KEY=
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480
```

Variavel essencial no frontend:

```env
VITE_API_BASE_URL=
```

## Seguranca e Higiene

- Nunca versionar `.env` reais.
- Trocar `JWT_SECRET_KEY` antes de publicar.
- Nao usar dados de seed em producao real.
- Conferir `CORS_ALLOW_ORIGINS` antes do deploy publico.
- Rodar scripts de reset/setup apenas no banco correto.
- Revisar dados exportados antes de compartilhar imagens publicamente.

## Status

MVP funcional com backend FastAPI, frontend React, banco MySQL, fluxo de
participantes, painel administrativo, tabelas da Copa, mata-mata visual, emojis
unicos e exportacao de imagens para compartilhamento.
