# Bolao Copa do Mundo

Sistema full-stack para gerenciamento de bolao da Copa do Mundo. O projeto permite cadastro de participantes, registro de palpites, controle manual de pagamentos, cadastro manual de partidas, insercao manual de placares e ranking automatico com criterios de desempate.

## Visao Geral

Este MVP foi desenhado para operar sem dependencia de APIs externas de futebol. O administrador controla manualmente a agenda de jogos e os resultados pelo painel administrativo, enquanto participantes criam conta, acessam jogos disponiveis e registram seus palpites antes do bloqueio configurado.

## Stack

- Frontend: React, Vite, Tailwind CSS
- Backend: Python, FastAPI, PyMySQL
- Banco de dados: MySQL
- Autenticacao: JWT com senha criptografada via bcrypt
- Deploy validado: Vercel para frontend, Railway para backend e MySQL

## Arquitetura

```text
Usuario
  -> Frontend React/Vite na Vercel
  -> Backend FastAPI na Railway
  -> MySQL na Railway
```

O frontend consome a API por meio da variavel `VITE_API_BASE_URL`. O backend libera origens via CORS e usa variaveis de ambiente para acessar o MySQL e assinar tokens JWT.

## Funcionalidades

- Cadastro de novos participantes.
- Login com token JWT.
- Palpites por partida com bloqueio 30 minutos antes do kickoff.
- Painel admin protegido.
- CRUD manual de partidas futuras.
- Insercao e atualizacao manual de placares.
- Controle manual de pagamento dos participantes.
- Ranking automatico com pote e distribuicao de premios.
- Sem API-Football ou qualquer integracao de terceiros para resultados.

## Regras Do Bolao

- Cada participante paga R$ 100.
- Apenas participantes com pagamento confirmado entram na distribuicao do pote.
- Premiacao: 1o lugar 60%, 2o lugar 30%, 3o lugar 10%.
- Placar exato vale 2 pontos.
- Tendencia correta, vencedor ou empate, vale 1 ponto.
- Palpites fecham 30 minutos antes do jogo.
- Jogos de mata-mata ficam bloqueados ate a fase de grupos estar completa.

## Desempates

1. Maior pontuacao total.
2. Maior numero de placares exatos.
3. Maior numero de empates acertados na tendencia.
4. Maior numero de vencedores acertados.

## Estrutura Do Projeto

```text
backend/
  app/
    db.py
    main.py
    security.py
  database/
    schema.sql
  requirements.txt

frontend/
  src/
    components/
    context/
    pages/
    services/
  package.json

seed.sql
.env.example
```

## Variaveis De Ambiente

Crie um arquivo `.env` na raiz do projeto com base em `.env.example`.

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=bolao_copa
CORS_ALLOW_ORIGINS=http://localhost:5173
JWT_SECRET_KEY=change-me
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480
```

No frontend, configure:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Em producao, `VITE_API_BASE_URL` deve apontar para a URL publica do backend.

## Rodando Localmente

### 1. Banco De Dados

Crie o banco:

```sql
CREATE DATABASE IF NOT EXISTS bolao_copa
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Execute o schema e o seed demonstrativo:

```powershell
mysql -u root -p bolao_copa -e "source backend/database/schema.sql"
mysql -u root -p bolao_copa -e "source seed.sql"
```

O `seed.sql` da raiz contem apenas dados ficticios para desenvolvimento: um admin demo, um participante demo e duas partidas de fase de grupos.

Credenciais locais do seed:

- Admin: `admin.demo` / `123456`
- Participante: `participante.demo` / `123456`

### 2. Backend

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Endpoints uteis:

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

### 3. Frontend

```powershell
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Frontend local:

- `http://localhost:5173`

## Deploy

Arquitetura validada:

- Vercel hospeda o frontend React/Vite.
- Railway hospeda o backend FastAPI.
- Railway hospeda o MySQL.

Variaveis principais:

- Backend Railway: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET_KEY`, `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`.
- Frontend Vercel: `VITE_API_BASE_URL`.

## Observacoes De Producao

- Nao use o `seed.sql` em producao.
- Troque sempre o `JWT_SECRET_KEY`.
- As credenciais reais devem ficar apenas em variaveis de ambiente.
- O projeto nao depende de API externa para cadastrar jogos ou resultados.
