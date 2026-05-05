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

## Implementation Notes (Luis Noriega)

# VoyceLink Call Center Dashboard

This project implements a real-time call monitoring system using a microservices-based architecture. It processes call events, persists them in a relational database, and propagates updates through a real-time streaming layer to a web-based dashboard.

The system is composed of three main services:

- A backend service responsible for business logic and persistence
- A real-time service responsible for event distribution via WebSockets
- A frontend application responsible for data visualization and user interaction

## Architecture

The system follows an event-driven architecture in which the backend service publishes domain events to a message broker, and a separate real-time service consumes those events and distributes them to connected clients.

Data flow:

External clients send call events to the backend API
- The backend processes and persists the event
- The event is published to Redis using a Pub/Sub channel
- The real-time service subscribes to that channel
- Incoming events are broadcast to frontend clients via WebSockets
- The frontend reacts to these updates and refreshes its state
- Backend Service (call-service)

## Responsibilities

The backend service handles:

Validation and processing of incoming call events
Enforcement of business rules and state transitions
Persistence of calls and events in PostgreSQL
Exposure of REST endpoints for querying data
Publication of events to Redis for real-time propagation
Event Processing

The system supports the following event types:

- call_initiated
- call_answered
- call_hold
- call_ended

Each event triggers state transitions and may generate derived metadata based on defined business rules.

## Business Rules

The following conditions are enforced during event processing:

A call must exist before transitioning to subsequent states
Valid state transitions are required (e.g., waiting → active)
Additional flags are generated when thresholds are exceeded:
WAIT_TIME_EXCEEDED when waitTime is greater than 30 seconds
HOLD_TIME_EXCEEDED when holdDuration is greater than 60 seconds
SHORT_CALL when call duration is less than 10 seconds
Persistence Layer

Two primary tables are used:

- calls: stores the current state and metadata of each call
- call_events: stores the historical sequence of events per call
All events are stored with associated metadata, allowing reconstruction of call history.

## API Endpoints

The backend exposes the following endpoints:

- POST /api/events
Accepts and processes incoming call events
- GET /api/calls
Retrieves calls with optional filtering by status and queue
- GET /api/calls//events
Retrieves the event history for a specific call

## Redis Integration

A Redis Pub/Sub mechanism is used to propagate events to the real-time service.
After persisting an event, the backend publishes it to a Redis channel:

await redis.publish('call_events', JSON.stringify(event));
This decouples the backend from the real-time layer and allows for horizontal scalability.

## Real-time Service

The real-time service is responsible for:

- Subscribing to Redis channels
- Receiving and parsing incoming events
- Broadcasting updates to connected clients via WebSockets

## Redis Subscription

The service subscribes to the call_events channel and invokes a handler for each message received. The message payload is parsed and transformed into a format suitable for client consumption.

## WebSocket Layer

Socket.io is used to maintain persistent connections with frontend clients.
Clients can subscribe to specific call identifiers, allowing the system to emit updates only to relevant consumers.

socket.join(callId);
Event Broadcasting

# Frontend Application

The frontend application is responsible for:

- Fetching and displaying call data
- Allowing filtering and selection of calls
- Displaying event history for individual calls
- Reacting to real-time updates via WebSockets

## Data Integration

All mock data has been replaced with real API calls.
The application interacts with the backend using HTTP requests and maintains synchronization through WebSocket events.
Call List Management

## Event History Management

The event history for a selected call is handled by a dedicated hook that:

    Fetches the full event history on selection
    Subscribes to real-time updates for that specific call
    Appends new events as they are received
    WebSocket Client

A singleton Socket.io client is implemented to manage the connection lifecycle and subscriptions. Clients subscribe and unsubscribe from call-specific channels dynamically.

## Testing

Unit and integration tests were implemented for the backend using Vitest.

Test coverage includes:
    Event processing and persistence
    State transitions and validation rules
    Flag generation logic
    API response validation
    Error handling scenarios
    Design Considerations

The system was designed with the following principles:

- Separation of concerns between services
- Event-driven communication using Redis
- Backend as the single source of truth
- Scalable real-time communication via WebSockets
- Minimal coupling between components
- Trade-offs

Some trade-offs were made to balance simplicity and correctness:

The frontend performs a full refetch on real-time updates rather than partial state mutation
Authentication is limited to API key validation
State management in the frontend is kept simple without a global store
Running the System
    Start infrastructure services (PostgreSQL and Redis) using Docker
    Start the backend service
    Start the real-time service
    Start the frontend application

Events can be sent to the backend via HTTP requests, and the system will process and propagate updates in real time.

## Path video
https://drive.google.com/file/d/1usn9aCGOl-cZBBaeA1mr-SUPlYW9G_Ne/view?usp=drive_link