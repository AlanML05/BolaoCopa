# Bolao Copa OST MVP

Estrutura inicial do MVP do bolao da Copa do Mundo de 2026 para a OST.

## Stack

- `backend/`: FastAPI com dados mockados em memoria
- `frontend/`: React + Tailwind CSS

## Como rodar

### Backend

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Usuarios mockados

- Admin: `admin@ost.com.br` / `admin123`
- Usuarios: `ana@ost.com.br`, `bruno@ost.com.br`, `carla@ost.com.br`, `diego@ost.com.br`, `elisa@ost.com.br`, `felipe@ost.com.br`
- Senha padrao dos usuarios: `123456`

## Regras aplicadas no backend

- Dados inteiramente em memoria com listas e dicionarios
- Usuario comum so cadastra palpite em jogo futuro e sem edicao posterior
- Admin ve ranking, pote, detalhamento dos palpites e pode alternar a flag de pagamento
- Ranking ordenado por:
  1. Pontos totais
  2. Placares exatos
  3. Empates acertados na tendencia
  4. Vencedores acertados
- Pote considera apenas usuarios com `paid = true`
