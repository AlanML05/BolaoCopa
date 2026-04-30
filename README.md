# Bolao Copa do Mundo

MVP web generico para bolao da Copa do Mundo. O sistema usa React no frontend, FastAPI no backend e MySQL como persistencia oficial.

## Stack

- `frontend/`: React + Vite + Tailwind CSS
- `backend/`: Python + FastAPI + JWT + bcrypt
- `database/`: scripts SQL de schema e seed para MySQL
- Integracao opcional: API-Football para sincronizar resultados de partidas

## Requisitos

- Python 3.11+
- Node.js 20+
- MySQL 8+
- Chave JWT configurada no `.env`

## Configuracao

Crie um arquivo `.env` na raiz do projeto usando `.env.example` como base:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=bolao_copa
CORS_ALLOW_ORIGINS=http://localhost:5173
API_FOOTBALL_KEY=
API_FOOTBALL_USE_LOCAL_FALLBACK=false
JWT_SECRET_KEY=change-me-in-development
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480
VITE_API_BASE_URL=http://localhost:8000
```

`API_FOOTBALL_KEY` pode ficar vazio em desenvolvimento. Se quiser testar a sincronizacao com resultados locais de 2022, use `API_FOOTBALL_USE_LOCAL_FALLBACK=true` apenas em ambiente local. Em producao, mantenha `false`. Troque `JWT_SECRET_KEY` por um valor forte no seu `.env` real.

No deploy do frontend, configure a URL publica da API. O codigo aceita `VITE_API_BASE_URL` e tambem `VITE_API_URL` por compatibilidade:

```env
VITE_API_BASE_URL=https://sua-api.example.com
```

## Banco De Dados

Crie o banco e carregue a estrutura:

```sql
CREATE DATABASE IF NOT EXISTS bolao_copa
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Se o banco ja existia antes da migracao para JWT/bcrypt, ajuste o tamanho do campo de senha uma vez:

```powershell
mysql -u root -p bolao_copa -e "ALTER TABLE users MODIFY password_hash VARCHAR(255) NOT NULL;"
```

Depois execute os scripts:

```powershell
mysql -u root -p bolao_copa -e "source backend/database/schema.sql"
mysql -u root -p bolao_copa -e "source backend/database/seed.sql"
```

Observacao: o `seed.sql` usa `ON DUPLICATE KEY UPDATE`. Rodar o seed novamente atualiza usuarios, partidas, palpites, pagamentos e resultados para os valores do arquivo. Depois da migracao para JWT/bcrypt, rode o seed novamente para substituir os hashes SHA-256 antigos por hashes bcrypt.

## Como Rodar

### Backend

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

API local:

- `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

### Frontend

Em outro terminal:

```powershell
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Frontend local:

- `http://localhost:5173`

## Usuarios De Teste

- Admin: `admin` ou `admin@example.com` / `123456`
- Usuarios: `ana.silva`, `bruno.costa`, `carla.souza`, `diego.lima`, `elisa.almeida`, `felipe.rocha`
- Senha padrao dos usuarios: `123456`

## Regras Principais

- Cada participante paga R$ 100.
- Apenas usuarios com `pagou = true` entram no calculo do pote e da premiacao.
- Premiacao: 1o lugar 60%, 2o lugar 30%, 3o lugar 10%.
- Placar exato vale 2 pontos.
- Tendencia correta, vencedor ou empate, vale 1 ponto.
- A pontuacao maxima por jogo e 2 pontos.
- Usuario comum so cadastra palpite em jogos futuros, sem edicao depois do envio.
- Palpites fecham 30 minutos antes do kickoff.
- Jogos de Mata-Mata ficam bloqueados ate a Fase de Grupos estar completa.
- Admin ve ranking, todos os palpites, pagamentos e pode inserir resultados.

## Desempates Do Ranking

1. Maior pontuacao total.
2. Maior numero de placares exatos.
3. Maior numero de empates acertados na tendencia.
4. Maior numero de vencedores acertados.

## Sincronizacao De Resultados

O backend possui o endpoint admin `POST /admin/sync-matches`.

Ele tenta buscar jogos finalizados na API-Football usando `API_FOOTBALL_KEY`. Se a chave nao estiver configurada e o fallback estiver ativo, usa resultados locais de teste definidos em `backend/app/services/api_football.py`.

Tambem e possivel inserir ou atualizar placares manualmente pelo Dashboard do Admin.
