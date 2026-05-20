# Bolao Copa do Mundo 2026

Plataforma full-stack para gerenciamento de palpites corporativos da Copa do Mundo
2026. O sistema oferece cadastro de participantes, painel administrativo, registro de
palpites, calculo automatico das tabelas da fase de grupos e chaveamento dinamico do
mata-mata.

O projeto foi desenhado para operar de forma 100% manual, sem depender de APIs externas
de futebol para resultados, jogos ou classificacoes.

## Stack

| Camada | Tecnologias |
| --- | --- |
| Frontend | React, Vite, TailwindCSS |
| UI | Dark Mode Minimalist |
| Backend | Python, FastAPI |
| Banco de dados | MySQL |
| Auth | JWT com senhas criptografadas |
| Deploy sugerido | Vercel + Railway |

## Funcionalidades Principais

- Painel Admin exclusivo para controle do torneio.
- Lancamento manual de resultados reais.
- Edicao de confrontos do mata-mata quando as selecoes forem definidas.
- Banco populado via script com os 104 jogos da Copa do Mundo 2026.
- Cadastro de participantes via tela de Sign Up.
- Trava inteligente de apostas:
  - jogos do mata-mata so liberam palpite quando os placeholders sao trocados por times reais;
  - todos os palpites fecham 30 minutos antes do inicio de cada partida.
- Calculo automatico das tabelas da fase de grupos.
- Criterios de desempate da tabela:
  - pontos;
  - saldo de gols;
  - gols marcados;
  - confronto direto quando aplicavel.
- Ranking dos melhores terceiros colocados.
- Arvore visual do mata-mata com layout simetrico.
- Bandeiras circulares das selecoes via FlagCDN.
- Rankings separados para Admin:
  - Ranking Geral;
  - Ranking Bolao Pago.
- Usuario comum ve apenas a experiencia de palpites, sem informacoes financeiras.

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

Em producao, o frontend pode ser publicado na Vercel, enquanto o backend e o MySQL
podem rodar na Railway. O backend usa CORS para liberar apenas as origens configuradas.

## Estrutura do Projeto

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
  requirements.txt

frontend/
  src/
    components/
    context/
    pages/
    services/
  package.json

seed.sql
README.md
```

## Variaveis de Ambiente

Crie os arquivos `.env` com base nos templates `.env.example`.

### Backend

Copie o template:

```powershell
Copy-Item backend\.env.example .env
```

Preencha as variaveis:

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

Em deploy, configure essas variaveis diretamente no painel da plataforma.

### Frontend

Crie o arquivo local do Vite:

```powershell
Copy-Item frontend\.env.example frontend\.env
```

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

Para limpar apostas e jogos antes de recarregar a tabela oficial:

```sql
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE bets;
TRUNCATE TABLE matches;
SET FOREIGN_KEY_CHECKS = 1;
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

### 3. Popular os 104 Jogos da Copa 2026

Com o ambiente virtual ativo e o `.env` configurado, rode os dois arquivos de carga:

```powershell
python backend\seed_matches_2026.py backend\matches_2026.json
python backend\seed_matches_2026.py backend\knockout_matches_2026.json
```

O primeiro comando insere os 72 jogos da fase de grupos. O segundo insere os 32 jogos
do mata-mata, totalizando 104 partidas.

O arquivo `seed.sql` da raiz e opcional para ambiente local/demo, pois cria usuarios e
partidas ficticias. Nao use esse arquivo em producao.

### 4. Frontend

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

## Fluxo de Uso

1. Admin acessa o painel administrativo.
2. Admin confere os 104 jogos carregados pelo seed.
3. Participantes criam conta e registram palpites da fase de grupos.
4. Durante o mata-mata, confrontos com placeholders ficam bloqueados.
5. Quando o Admin troca o placeholder por selecoes reais, aquele jogo fica liberado
   imediatamente para palpite.
6. Palpites encerram automaticamente 30 minutos antes da partida.
7. Admin lanca o placar real.
8. O sistema recalcula rankings, tabelas e chaveamento visual.

## Regras de Negocio

- Cada usuario pode registrar um palpite por partida.
- Palpites podem ser editados ate 30 minutos antes do inicio do jogo.
- Jogos com nomes como `Vencedor Jogo 73`, `Perdedor Jogo 101` ou `3o Grupo A/B/C`
  ficam bloqueados ate os times reais serem definidos.
- O usuario comum nao ve informacoes financeiras.
- O Admin controla participantes do Bolao Pago e pagamentos.
- Ranking Geral e Ranking Bolao Pago sao separados na visao administrativa.

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

## Observacoes de Seguranca

- Nunca versionar arquivos `.env` reais.
- Trocar `JWT_SECRET_KEY` antes de publicar.
- Nao usar credenciais demo em producao.
- Rodar seeds oficiais apenas em bancos preparados para receber a carga.
- Conferir `CORS_ALLOW_ORIGINS` antes do deploy publico.

## Status

Projeto finalizado como MVP funcional para Bolao da Copa do Mundo 2026, com backend,
frontend, banco relacional, painel administrativo, fluxo de usuarios, tabelas oficiais
e chaveamento dinamico.
