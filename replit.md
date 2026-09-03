# Language Tracker Pocket

Aplicativo pessoal para acompanhar a evolução no inglês por meio de registros diários, metas, vocabulário, streak, gráficos e jornada CAIZ.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/language-tracker-pocket` — frontend React/Vite, rotas e componentes da aplicação.
- `artifacts/api-server/src/routes/tracker.ts` — endpoints do tracker e validação das entradas.
- `artifacts/api-server/src/lib/tracker.ts` — cálculos de dashboard, streak, estimativa, gráficos e CAIZ.
- `lib/db/src/schema/` — tabelas persistentes de estudos, configurações e resumos mensais.
- `lib/api-spec/openapi.yaml` — fonte de verdade dos contratos da API.

## Architecture decisions

- O vocabulário atual é calculado como vocabulário inicial + palavras registradas; o valor inicial padrão é 4.242 e a meta diária padrão é fixa em 12.
- Datas de estudo são armazenadas como datas de calendário (`YYYY-MM-DD`) para evitar deslocamentos de fuso; timestamps continuam sendo instantes.
- Todas as métricas visíveis no frontend vêm dos endpoints agregados do servidor, evitando gráficos ou streaks calculados apenas no navegador.
- O frontend usa hooks gerados a partir do OpenAPI e invalida consultas relacionadas depois de cada mutação.

## Product

O produto oferece dashboard, registro diário com CRUD, progresso com gráficos, jornada CAIZ, histórico com filtros, resumo mensal com reflexões persistentes, playlists e configurações com dark mode. O layout preserva a identidade clara e laranja do projeto de referência e se adapta para navegação mobile.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
