# VoyceLink Full-Stack Take-Home

## Objective

Implement the missing business logic for a distributed call-center system.

The repository includes a dashboard shell plus scaffolding for the backend and realtime services.

## Architecture

```text
┌─────────────────┐    REST     ┌──────────────────┐    ┌────────────┐
│    frontend     │◄───────────►│   call-service   │───►│ PostgreSQL │
│  (Next.js :3000)│             │  (Express :3001) │    └────────────┘
└────────┬────────┘             └────────┬─────────┘
         │ Socket.io                     │ Redis pub/sub
         │                               ▼
         │                    ┌──────────────────────┐
         └────────────────────│   realtime-service   │
                              │  (Express+WS :3002)  │
                              └──────────────────────┘
```

| Package | Purpose |
|---|---|
| `packages/frontend` | Dashboard UI for live calls and event history |
| `packages/call-service` | REST API, business rules, persistence, event publishing |
| `packages/realtime-service` | Redis subscriber and Socket.io fan-out layer |
| `packages/contracts` | Shared TypeScript types and Zod schemas |

Infrastructure for PostgreSQL and Redis is provided through Docker Compose.

## Scaffolding

The repo ships with:
- Express skeletons for `call-service` and `realtime-service` — routes, middleware, DB pool, and Redis client wired up but service logic unimplemented
- Next.js dashboard shell — components, hooks, and API/socket client stubs in place, currently rendering mock data
- Shared types and Zod validation in `packages/contracts`
- PostgreSQL schema at `packages/call-service/src/db/schema.sql`

## What to implement

VoyceLink operates a medical interpretation platform. Calls move through a lifecycle and should appear in the dashboard in near real time.

Call lifecycle:

```text
call_initiated -> call_routed -> call_answered -> [call_hold] -> call_ended
```

| Event | Rules |
|---|---|
| `call_initiated` | Validate `queueId` exists. Start SLA timer with 30 second max wait. |
| `call_routed` | Assign an agent. Re-route if unanswered after 15 seconds. |
| `call_answered` | Flag or notify when `waitTime > 30`. Update agent-facing metadata as needed. |
| `call_hold` | Enforce max hold time of 60 seconds. Flag or notify when exceeded. |
| `call_ended` | Mark the call as ended. Flag calls with duration under 10 seconds. |

1. Implement the business logic in `call-service`: event processing, state transitions, persistence, and Redis publishing.
2. Complete the Redis subscriber and Socket.io room fan-out in `realtime-service`.
3. Replace mock data in the frontend hooks with real API calls and Socket.io updates.
4. Write unit tests around the business logic and at least one integration test for event ingestion.

Constraints:
- TypeScript throughout.
- Keep the multi-service architecture and PostgreSQL + Redis in the flow.
- No full auth system needed.
- You may refactor existing scaffolding if it improves clarity or correctness.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Start infrastructure
npm run infra:up

# 3. Copy env files
cp packages/call-service/.env.example packages/call-service/.env
cp packages/realtime-service/.env.example packages/realtime-service/.env
cp packages/frontend/.env.local.example packages/frontend/.env.local

# 4. Initialize the database schema
cd packages/call-service
npm run db:init
cd ../..

# 5. Start the app
npm run dev
```

| Service | URL |
|---|---|
| Dashboard | http://localhost:3000 |
| call-service API | http://localhost:3001 |
| realtime-service WS | http://localhost:3002 |

## API

- `POST /api/events` ingests lifecycle events safely
- `GET /api/calls` returns current calls, with filtering
- `GET /api/calls/:id/events` returns ordered event history
- realtime updates are pushed only to interested clients, not broadcast blindly to everyone

## Testing

Vitest and Supertest are already installed in `call-service`. Run tests with:

```bash
npm test --workspace=packages/call-service
# or from inside the package
npm test
npm run test:watch
```

Placeholder test files are in `src/services/CallService.test.ts` and `src/routes/events.test.ts`.

## Submission

- working code across the relevant packages
- unit tests around the business logic layer
- at least one integration test that exercises event ingestion
- a short PR description that explains what you changed, your tradeoffs or assumptions, and what you would do next with more time

## Evaluation

| Area | What strong signals look like |
|---|---|
| Ownership | Improves the system intentionally, not just the happy path |
| Domain modeling | Clean event handling, sensible state transitions, clear contracts |
| Distributed systems | Correct pub/sub flow, targeted realtime fan-out, reasonable failure thinking |
| Frontend integration | Real data wired end-to-end, loading and error states handled sensibly |
| Quality | Validation, error handling, maintainable structure, consistent naming |
| Testing | Tests cover meaningful behavior, not just implementation details |
| Communication | PR explains decisions and remaining tradeoffs clearly |

## Bonus

- pagination on `GET /api/calls`
- retry or dead-letter handling for failed event publishing
- idempotent event ingestion
- Dockerfiles per service
- stronger contract sharing between packages
- better observability for local debugging
